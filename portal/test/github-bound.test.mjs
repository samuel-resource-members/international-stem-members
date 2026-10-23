import {test} from 'node:test';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8798';
const post=(path,body)=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('an activation code cannot create an email/password account',async()=>{
 const r=await post('/api/register',{email:'code-only@example.test',password:'Strong Test Password 29!',code:'test-injection-activation'});
 assert.equal(r.status,403);
});
test('email/password login is unavailable',async()=>{
 assert.equal((await post('/api/auth/sign-in/email',{email:'code-only@example.test',password:'Strong Test Password 29!'})).status,403);
});
test('a claimed GitHub username cannot replace provider authentication',async()=>{
 assert.equal((await post('/api/activate',{code:'test-owner-activation',githubUsername:'owner',githubId:'1000'})).status,401);
});
test('GitHub sign-in starts the provider flow with state and the exact callback',async()=>{
 const r=await post('/api/auth/sign-in/social',{provider:'github'});assert.equal(r.status,200);
 const data=await r.json(),url=new URL(data.url);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/login/oauth/authorize');assert.equal(url.searchParams.get('redirect_uri'),base+'/api/auth/callback/github');assert.ok(url.searchParams.get('state'));assert.ok(r.headers.getSetCookie().length);
 assert.ok(url.searchParams.get('scope').includes('user:email'));
 const forged=await fetch(base+'/api/auth/callback/github?code=forged&state=forged',{redirect:'manual',headers:{Cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')}});
 assert.equal(forged.status,302);assert.equal(new URL(forged.headers.get('Location'),base).origin,base);
});
test('provider token injection, email recovery and arbitrary providers are unavailable',async()=>{
 for(const body of [{provider:'google'},{provider:'github',idToken:{token:'forged'}},{provider:'github',callbackURL:'https://attacker.example'}])assert.equal((await post('/api/auth/sign-in/social',body)).status,400);
 for(const path of ['/api/auth/change-password','/api/auth/request-password-reset','/api/auth/reset-password','/api/auth/link-social'])assert.equal((await post(path,{})).status,403);
});
