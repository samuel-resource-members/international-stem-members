export const MEMBER_REPOSITORY='https://github.com/samuel-resource-members/international-stem-members';
export type RepositoryAccessStatus={
 state:'pending'|'invited'|'ready'|'revoked'|'blocked'|'retry';
 githubLogin:string|null;
 invitationUrl:string|null;
 repositoryUrl:string;
 updatedAt:number|null;
 retryAt:number|null;
 lastError:string|null;
};
type AccessRow={state:RepositoryAccessStatus['state'];github_login:string|null;updated_at:number;next_attempt_at:number;last_error:string|null;status:string};
export function repositorySyncStatement(db:D1Database,userId:string) {
 return db.prepare(`INSERT INTO repository_access(user_id,github_id,state,updated_at,next_attempt_at)
 SELECT user_id,github_id,'pending',?,0 FROM memberships WHERE user_id=? AND role='member' AND github_id IS NOT NULL AND github_id<>'237370912'
 ON CONFLICT(user_id) DO UPDATE SET github_id=excluded.github_id,state='pending',last_error=NULL,updated_at=excluded.updated_at,next_attempt_at=0,attempts=0,version=repository_access.version+1`).bind(Date.now(),userId);
}
export async function repositoryStatus(db:D1Database,userId:string):Promise<RepositoryAccessStatus|null> {
 const row=await db.prepare(`SELECT a.state,a.github_login,a.updated_at,a.next_attempt_at,a.last_error,m.status
 FROM memberships m LEFT JOIN repository_access a ON a.user_id=m.user_id AND a.github_id=m.github_id
 WHERE m.user_id=? AND m.role='member' AND m.github_id<>'237370912'`).bind(userId).first<AccessRow>();
 if(!row)return null;
 const state=row.state||'pending';
 return {state,githubLogin:row.github_login||null,invitationUrl:state==='invited'&&row.status==='active'?MEMBER_REPOSITORY+'/invitations':null,repositoryUrl:MEMBER_REPOSITORY,updatedAt:row.updated_at||null,retryAt:row.next_attempt_at||null,lastError:row.last_error||null};
}
export async function syncRepositoryAccess(env:{DB:D1Database;REPOSITORY_ACCESS:Pick<Fetcher,'fetch'>},userId:string):Promise<RepositoryAccessStatus|null> {
 try {
  await env.REPOSITORY_ACCESS.fetch('https://access.internal/sync/'+encodeURIComponent(userId),{method:'POST',signal:AbortSignal.timeout(55000)});
 } catch {
  console.warn(JSON.stringify({event:'repository_sync_deferred'}));
 }
 return repositoryStatus(env.DB,userId);
}
