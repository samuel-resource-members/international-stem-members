import { Hono } from 'hono';
import { z } from 'zod';
import { readJson } from './http';
import type { Bindings } from './index';
export const submissionRoutes=new Hono<Bindings>();
const limit=20*1024*1024;
const input=z.object({title:z.string().trim().min(1).max(200),course:z.string().trim().min(1).max(100),details:z.string().trim().max(5000).default(''),url:z.url().refine(x=>new URL(x).protocol==='https:').optional(),fileName:z.string().min(1).max(180).regex(/\.(pdf|zip|docx|png|jpe?g|webp)$/i).optional(),fileSize:z.number().int().min(1).max(limit).optional()}).strict().refine(v=>Boolean(v.url)||Boolean(v.fileName&&v.fileSize));
submissionRoutes.post('/api/submissions',async c=>{
  const data=await readJson(c.req.raw,input),id=crypto.randomUUID(),userId=c.get('identity').user.id;
  const recent=await c.env.DB.prepare('SELECT count(*) AS count FROM submissions WHERE user_id=? AND created_at>?').bind(userId,Date.now()-86400000).first<{count:number}>();
  if(recent!.count>=20)return c.json({error:'SUBMISSION_LIMIT'},429);
  const key=data.fileName?`submissions/${userId}/${id}`:null;
  await c.env.DB.prepare('INSERT INTO submissions(id,user_id,title,course,details,url,file_name,file_size,object_key,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,userId,data.title,data.course,data.details,data.url||null,data.fileName||null,data.fileSize||null,key,key?'draft':'pending',Date.now()).run();
  return c.json({id,uploadRequired:Boolean(key)});
});
submissionRoutes.put('/api/submissions/:id/file',async c=>{
  const row=await c.env.DB.prepare("SELECT object_key,file_size FROM submissions WHERE id=? AND user_id=? AND status='draft'").bind(c.req.param('id'),c.get('identity').user.id).first<{object_key:string;file_size:number}>();
  if(!row||!c.req.raw.body)return c.json({error:'SUBMISSION_UNAVAILABLE'},404);
  if(Number(c.req.header('Content-Length'))!==row.file_size)return c.json({error:'FILE_SIZE_MISMATCH'},400);
  const fixed=new FixedLengthStream(row.file_size);
  await Promise.all([c.req.raw.body.pipeTo(fixed.writable),c.env.SUBMISSIONS.put(row.object_key,fixed.readable,{httpMetadata:{contentType:'application/octet-stream'},onlyIf:{etagDoesNotMatch:'*'}})]);
  await c.env.DB.prepare("UPDATE submissions SET status='pending' WHERE id=? AND user_id=? AND status='draft'").bind(c.req.param('id'),c.get('identity').user.id).run();
  return c.json({ok:true});
});
submissionRoutes.get('/api/submissions',async c=>{
  const rows=await c.env.DB.prepare('SELECT id,title,course,details,url,file_name,file_size,status,created_at FROM submissions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(c.get('identity').user.id).all();return c.json({submissions:rows.results});
});
submissionRoutes.get('/api/contributions',async c=>{
  const rows=await c.env.DB.prepare("SELECT id,title,course,details,url,file_name,file_size,created_at FROM submissions WHERE status='approved' ORDER BY created_at DESC LIMIT 200").all();return c.json({submissions:rows.results});
});
submissionRoutes.get('/api/submissions/:id/file',async c=>{
  const row=await c.env.DB.prepare('SELECT user_id,status,object_key,file_name FROM submissions WHERE id=?').bind(c.req.param('id')).first<{user_id:string;status:string;object_key:string;file_name:string}>();
  const who=c.get('identity');
  if(!row||!row.object_key||(row.status!=='approved'&&row.user_id!==who.user.id&&who.membership?.role!=='admin'))return c.json({error:'SUBMISSION_UNAVAILABLE'},404);
  const object=await c.env.SUBMISSIONS.get(row.object_key);if(!object)return c.json({error:'SUBMISSION_UNAVAILABLE'},404);
  return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
});
submissionRoutes.get('/api/admin/submissions',async c=>{
  const rows=await c.env.DB.prepare("SELECT s.*,u.email FROM submissions s JOIN user u ON s.user_id=u.id WHERE s.status!='draft' ORDER BY s.created_at DESC LIMIT 200").all();return c.json({submissions:rows.results});
});
submissionRoutes.post('/api/admin/submissions/:id/review',async c=>{
  const data=await readJson(c.req.raw,z.object({status:z.enum(['approved','rejected'])}).strict());
  const result=await c.env.DB.prepare("UPDATE submissions SET status=?,reviewed_at=?,reviewer_id=? WHERE id=? AND status IN ('pending','approved','rejected')").bind(data.status,Date.now(),c.get('identity').user.id,c.req.param('id')).run();
  return result.meta.changes?c.json({ok:true}):c.json({error:'SUBMISSION_UNAVAILABLE'},404);
});
