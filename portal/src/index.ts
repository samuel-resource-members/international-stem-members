import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import { createAuth, identity, type AppEnv } from './auth';
import { codeHash, newCode, rateLimit, redeemCode, validCode } from './membership';
import { resources, downloadResource } from './resources';
import { submissionRoutes } from './submissions';
import { readJson as json } from './http';

export type Identity = NonNullable<Awaited<ReturnType<typeof identity>>>;
export type Bindings = {Bindings:AppEnv;Variables:{identity:Identity}};
const app = new Hono<Bindings>();
app.use('*',secureHeaders({contentSecurityPolicy:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:'],connectSrc:["'self'"],fontSrc:["'self'",'data:'],frameAncestors:["'none'"],baseUri:["'none'"],formAction:["'self'"]},referrerPolicy:'no-referrer'}));
app.use('*',async(c,next)=>{
  c.header('Cache-Control','private, no-store');c.header('X-Robots-Tag','noindex, nofollow');
  if(!['GET','HEAD','OPTIONS'].includes(c.req.method)) {
    if(c.req.header('Origin')!==c.env.APP_URL || ['cross-site','same-site'].includes(c.req.header('Sec-Fetch-Site')||'')) return c.json({error:'INVALID_ORIGIN'},403);
  }
  await next();
  c.header('Cache-Control','private, no-store');
});
app.use('/api/*',async(c,next)=>{
  if((c.req.header('Content-Type')||'').startsWith('application/json')) return bodyLimit({maxSize:65536,onError:c=>c.json({error:'REQUEST_TOO_LARGE'},413)})(c,next);
  await next();
});

const publicAssets=new Set(['/portal.js','/portal.css','/pico.min.css','/mathjax.js','/math-config.js','/favicon.svg']);
app.get('*',async(c,next)=>{
  if(publicAssets.has(c.req.path)) return c.env.ASSETS.fetch(c.req.raw);
  if(['/','/activate','/reset-password'].includes(c.req.path)) return c.env.ASSETS.fetch(new Request(new URL('/index.html',c.req.url)));
  await next();
});
const email=z.email().max(254).transform(v=>v.trim().toLowerCase());
const registration=z.object({email,password:z.string().min(10).max(128),code:z.string().min(8).max(128)}).strict();
function cookieResponse(response:Response,body:unknown) {
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'});
  for(const value of response.headers.getSetCookie()) headers.append('Set-Cookie',value);
  return new Response(JSON.stringify(body),{status:response.status,headers});
}
app.post('/api/register',async c=>{
  if(!await rateLimit(c.env,c.req.raw)) return c.json({error:'TOO_MANY_ATTEMPTS'},429);
  const input=await json(c.req.raw,registration);
  if(!await validCode(c.env,input.code,input.email)) return c.json({error:'CODE_UNAVAILABLE'},403);
  const response=await createAuth(c.env).api.signUpEmail({body:{email:input.email,password:input.password,name:input.email.split('@')[0]},headers:c.req.raw.headers,asResponse:true});
  if(!response.ok) return response;
  const result=await response.clone().json() as {user:{id:string}};
  if(!await redeemCode(c.env,input.code,result.user.id,input.email)) return c.json({error:'CODE_ALREADY_USED'},409);
  return cookieResponse(response,{ok:true});
});
const authPosts=new Set(['/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/change-password','/api/auth/reset-password']);
app.all('/api/auth/*',async c=>{
  if(c.req.method==='GET'&&/^\/api\/auth\/reset-password\/[a-zA-Z0-9_-]+$/.test(c.req.path))return createAuth(c.env).handler(c.req.raw);
  if(c.req.method!=='POST'||!authPosts.has(c.req.path)) return c.json({error:'ACTIVATION_REQUIRED'},403);
  if(!await rateLimit(c.env,c.req.raw)) return c.json({error:'TOO_MANY_ATTEMPTS'},429);
  const response=await createAuth(c.env).handler(c.req.raw);
  if(!response.ok) return response;
  return cookieResponse(response,{ok:true});
});
app.get('/api/me',async c=>{
  const who=await identity(c.req.raw,c.env);
  if(!who)return c.json({error:'SIGN_IN_REQUIRED'},401);
  return c.json({id:who.user.id,email:who.user.email,...(who.membership||{status:'inactive',role:'member'})});
});
app.post('/api/activate',async c=>{
  if(!await rateLimit(c.env,c.req.raw)) return c.json({error:'TOO_MANY_ATTEMPTS'},429);
  const who=await identity(c.req.raw,c.env);
  if(!who)return c.json({error:'SIGN_IN_REQUIRED'},401);
  if(who.membership)return c.json({error:who.membership.status==='active'?'ALREADY_ACTIVE':'ACCOUNT_SUSPENDED'},403);
  const input=await json(c.req.raw,z.object({code:z.string().min(8).max(128)}).strict());
  if(!await redeemCode(c.env,input.code,who.user.id,who.user.email))return c.json({error:'CODE_UNAVAILABLE'},409);
  return c.json({ok:true});
});
app.use('*',async(c,next)=>{
  const who=await identity(c.req.raw,c.env);
  if(!who) return ['/library','/resources','/submit','/account','/admin'].includes(c.req.path)?c.redirect('/',303):c.json({error:'SIGN_IN_REQUIRED'},401);
  if(!who.membership||who.membership.status!=='active') return c.json({error:who.membership?'ACCOUNT_SUSPENDED':'ACTIVATION_REQUIRED'},403);
  c.set('identity',who);await next();
});
app.get('/api/resources',c=>c.json({resources}));
app.on(['GET','HEAD'],'/download/:id',c=>downloadResource(c.req.raw,c.req.param('id'),c.env));
app.use('/api/admin/*',async(c,next)=>{if(c.get('identity').membership?.role!=='admin')return c.json({error:'OWNER_ONLY'},403);await next();});
app.get('/api/admin/codes',async c=>{
  const result=await c.env.DB.prepare('SELECT id,suffix,label,bound_email,expires_at,revoked,used_by,redeemed_at,created_at FROM activation_codes WHERE role=\'member\' ORDER BY created_at DESC LIMIT 1000').all();
  return c.json({codes:result.results});
});
app.post('/api/admin/codes',async c=>{
  const input=await json(c.req.raw,z.object({count:z.number().int().min(1).max(100),label:z.string().max(100).default(''),boundEmail:z.union([email,z.literal('')]).optional(),expiresAt:z.number().int().min(Date.now()).nullable().optional()}).strict());
  const codes=await Promise.all(Array.from({length:input.count},async()=>{const value=newCode();return{id:crypto.randomUUID(),code:value,hash:await codeHash(value)};}));
  await c.env.DB.batch(codes.map(row=>c.env.DB.prepare('INSERT INTO activation_codes(id,code_hash,suffix,label,bound_email,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').bind(row.id,row.hash,row.code.slice(-4),input.label,input.boundEmail||null,input.expiresAt||null,Date.now())));
  return c.json({codes:codes.map(row=>({id:row.id,code:row.code}))});
});
app.post('/api/admin/codes/:id/revoke',async c=>{
  const result=await c.env.DB.prepare("UPDATE activation_codes SET revoked=1 WHERE id=? AND role='member' AND used_by IS NULL").bind(c.req.param('id')).run();
  return result.meta.changes?c.json({ok:true}):c.json({error:'CODE_UNAVAILABLE'},409);
});
app.get('/api/admin/members',async c=>{
  const result=await c.env.DB.prepare('SELECT u.id,u.email,m.role,m.status,m.activated_at FROM memberships m JOIN user u ON u.id=m.user_id ORDER BY activated_at DESC LIMIT 1000').all();
  return c.json({members:result.results});
});
app.post('/api/admin/members/:id/status',async c=>{
  const input=await json(c.req.raw,z.object({status:z.enum(['active','suspended'])}).strict());
  const result=await c.env.DB.prepare("UPDATE memberships SET status=? WHERE user_id=? AND role='member'").bind(input.status,c.req.param('id')).run();
  if(!result.meta.changes)return c.json({error:'MEMBER_UNAVAILABLE'},404);
  if(input.status==='suspended')await c.env.DB.prepare('DELETE FROM session WHERE userId=?').bind(c.req.param('id')).run();
  return c.json({ok:true});
});
app.post('/api/admin/members/:id/recovery',async c=>{
  const user=await c.env.DB.prepare('SELECT email FROM user WHERE id=?').bind(c.req.param('id')).first<{email:string}>();
  if(!user)return c.json({error:'MEMBER_UNAVAILABLE'},404);
  let recovery='';
  await createAuth(c.env,async url=>{recovery=url;}).api.requestPasswordReset({body:{email:user.email,redirectTo:c.env.APP_URL+'/reset-password'},headers:c.req.raw.headers});
  if(!recovery)return c.json({error:'RECOVERY_UNAVAILABLE'},503);
  return c.json({url:recovery});
});
app.route('/',submissionRoutes);
app.get('*',async c=>{
  if(c.req.path==='/admin'&&c.get('identity').membership?.role!=='admin')return c.json({error:'OWNER_ONLY'},403);
  if(['/resources','/submit','/account','/admin'].includes(c.req.path)) return c.env.ASSETS.fetch(new Request(new URL('/index.html',c.req.url)));
  if(c.req.path==='/library') return c.env.ASSETS.fetch(new Request(new URL('/library.html',c.req.url)));
  return c.env.ASSETS.fetch(c.req.raw);
});
app.onError((error,c)=>{
  if(error instanceof HTTPException)return c.json({error:error.message},error.status);
  console.error(JSON.stringify({event:'request_failed',type:error.name}));return c.json({error:'SERVICE_UNAVAILABLE'},500);
});
export default app;
