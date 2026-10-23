import type { AppEnv } from './auth';

export const normalizeCode = (value: string) => value.replace(/[\s-]/g,'').toUpperCase();
export async function codeHash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeCode(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function validCode(env: AppEnv, value: string, email: string) {
  return env.DB.prepare('SELECT id FROM activation_codes WHERE code_hash=? AND used_by IS NULL AND revoked=0 AND (expires_at IS NULL OR expires_at>?) AND (bound_email IS NULL OR lower(bound_email)=?)')
    .bind(await codeHash(value),Date.now(),email.toLowerCase()).first();
}
export async function redeemCode(env: AppEnv, value: string, userId: string, email: string) {
  const hash=await codeHash(value),now=Date.now();
  const result=await env.DB.batch([
    env.DB.prepare('UPDATE activation_codes SET used_by=?,redeemed_at=? WHERE code_hash=? AND used_by IS NULL AND revoked=0 AND (expires_at IS NULL OR expires_at>?) AND (bound_email IS NULL OR lower(bound_email)=?) AND NOT EXISTS (SELECT 1 FROM memberships WHERE user_id=?)').bind(userId,now,hash,now,email.toLowerCase(),userId),
    env.DB.prepare("INSERT INTO memberships(user_id,role,status,code_id,activated_at) SELECT ?,role,'active',id,? FROM activation_codes WHERE code_hash=? AND used_by=? ON CONFLICT(user_id) DO NOTHING").bind(userId,now,hash,userId),
  ]);
  return result[1].meta.changes===1;
}
export function newCode() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const value=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>alphabet[b&31]).join('');
  return 'STEM-'+value.match(/.{4}/g)!.join('-');
}
export async function rateLimit(env: AppEnv, request: Request) {
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  const id=await codeHash(env.BETTER_AUTH_SECRET+':'+ip),window=Math.floor(Date.now()/60000);
  const row=await env.DB.prepare('INSERT INTO request_limits(id,window,hits) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET hits=CASE WHEN window=excluded.window THEN hits+1 ELSE 1 END,window=excluded.window RETURNING hits').bind(id,window).first<{hits:number}>();
  return row!.hits<=60;
}
