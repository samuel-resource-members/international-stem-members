import {createAppAuth} from '@octokit/auth-app';
import {request as octokitRequest} from '@octokit/request';
import {repositoryStatus, type RepositoryAccessStatus} from './github-access.ts';

export type AccessEnv={DB:D1Database;OWNER_GITHUB_ID:string;MEMBER_GITHUB_APP_ID:string;MEMBER_GITHUB_INSTALLATION_ID:string;MEMBER_GITHUB_APP_KEY:string};
type Dependencies={fetch?:typeof fetch;getToken?:(env:AccessEnv,deadline:number)=>Promise<string>};
type Membership={user_id:string;github_id:string;role:string;status:string};
type Job={version:number;lease_id:string;attempts:number};
type MutationReceipt={cleanup_invitation_id:number|null;cleanup_github_id:string|null;cleanup_login:string|null};
type Invitation={id:number;invitee:{id:number;login:string}|null;permissions:string};
const REPO='samuel-resource-members/international-stem-members',PATH='/repos/'+REPO,OWNER='237370912';
const loginPattern=/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
class AccessError extends Error {
 code:string;
 constructor(code:string){super(code);this.code=code;}
}
class StaleOperation extends Error {}
const positiveId=(id:unknown)=>typeof id==='string'&&/^[1-9]\d*$/.test(id)&&Number.isSafeInteger(Number(id));
function validMember(member:Membership|null,env:AccessEnv):asserts member is Membership {
 if(!member||member.role!=='member'||!positiveId(member.github_id)||member.github_id===OWNER||member.github_id===env.OWNER_GITHUB_ID)throw new AccessError('member_required');
}
async function membership(env:AccessEnv,userId:string) {
 return env.DB.prepare('SELECT user_id,github_id,role,status FROM memberships WHERE user_id=?').bind(userId).first<Membership>();
}
function controlledFetch(fetcher:typeof fetch,deadline:number):typeof fetch {
 return async(input,init={})=>{
  const time=Math.min(8000,deadline-Date.now());if(time<=0)throw new AccessError('github_timeout');
  try{return await fetcher(input,{...init,redirect:'error',signal:AbortSignal.timeout(time)});}
  catch{throw new AccessError('github_unavailable');}
 };
}
async function installationToken(env:AccessEnv,deadline:number) {
 if(!positiveId(env.MEMBER_GITHUB_APP_ID)||!positiveId(env.MEMBER_GITHUB_INSTALLATION_ID)||!env.MEMBER_GITHUB_APP_KEY)throw new AccessError('configuration_required');
 const auth=createAppAuth({appId:env.MEMBER_GITHUB_APP_ID,privateKey:env.MEMBER_GITHUB_APP_KEY,installationId:env.MEMBER_GITHUB_INSTALLATION_ID,
  request:octokitRequest.defaults({request:{fetch:controlledFetch(fetch,deadline)},headers:{'x-github-api-version':'2022-11-28'}}),log:{warn:()=>{}}});
 try {
  const token=await auth({type:'installation',repositoryNames:['international-stem-members'],permissions:{administration:'write',metadata:'read'}});
  if(token.repositoryNames?.length!==1||token.repositoryNames[0]!=='international-stem-members'||token.permissions.administration!=='write'||Object.entries(token.permissions).some(([name,permission])=>name!=='administration'&&(name!=='metadata'||permission!=='read')))throw new AccessError('installation_scope');
  return token.token;
 } catch(e){if(e instanceof AccessError)throw e;throw new AccessError('github_authentication');}
}
function github(token:string,fetcher:typeof fetch,deadline:number) {
 const controlled=controlledFetch(fetcher,deadline);
 return async(path:string,method='GET',body?:unknown):Promise<{status:number;data:any}>=>{
  if(!/^\/user\/[1-9]\d*$/.test(path)&&!/^\/users\/[a-z\d-]{1,39}$/i.test(path)&&!path.startsWith(PATH+'/')&&path!=='/installation/repositories?per_page=100')throw new AccessError('invalid_operation');
  const response=await controlled('https://api.github.com'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'stem-member-access','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(![200,201,204,404].includes(response.status))throw new AccessError(response.status===401?'github_authentication':response.status===403||response.status===429?'github_rate_limited':'github_unavailable');
  if(response.status===204||response.status===404)return {status:response.status,data:null};
  try{return {status:response.status,data:await response.json()};}catch{throw new AccessError('github_response');}
 };
}
type GitHub=ReturnType<typeof github>;
async function profile(api:GitHub,id:string) {
 const result=await api('/user/'+id),data=result.data;
 if(result.status!==200||!data||String(data.id)!==id||!Number.isSafeInteger(data.id)||!loginPattern.test(data.login||'')||data.id===Number(OWNER))throw new AccessError('identity_mismatch');
 return data.login as string;
}
async function loginIdentity(api:GitHub,login:string) {
 if(!loginPattern.test(login))throw new AccessError('identity_mismatch');
 const result=await api('/users/'+login),id=String(result.data?.id);
 if(result.status!==200||!positiveId(id)||String(result.data?.login).toLowerCase()!==login.toLowerCase())throw new AccessError('identity_resolution_required');
 return id;
}
async function assertLogin(api:GitHub,login:string,id:string) {
 if(await loginIdentity(api,login)!==id)throw new AccessError('identity_mismatch');
}
async function permission(api:GitHub,login:string,id:string) {
 const result=await api(PATH+'/collaborators/'+login+'/permission');
 if(result.status===404)return null;
 if(result.status!==200||String(result.data?.user?.id)!==id||typeof result.data?.permission!=='string')throw new AccessError('github_response');
 if(result.data.permission==='none')return null;
 return result.data.permission==='read'&&result.data.role_name==='read'?'read':'elevated';
}
async function invitations(api:GitHub,id:string) {
 const matches:Invitation[]=[];
 for(let page=1;page<=10;page++) {
  const result=await api(PATH+'/invitations?per_page=100&page='+page),rows=result.data;
  if(result.status!==200||!Array.isArray(rows))throw new AccessError('github_response');
  for(const row of rows)if(String(row.invitee?.id)===id){if(!Number.isSafeInteger(row.id)||row.id<=0)throw new AccessError('github_response');matches.push(row);}
  if(rows.length<100)return matches;
 }
 throw new AccessError('invitation_page_limit');
}
async function saveReceipt(env:AccessEnv,userId:string,leaseId:string,receipt:MutationReceipt) {
 const result=await env.DB.prepare('UPDATE repository_access SET cleanup_invitation_id=?,cleanup_github_id=?,cleanup_login=? WHERE user_id=? AND lease_id=?').bind(receipt.cleanup_invitation_id,receipt.cleanup_github_id,receipt.cleanup_login,userId,leaseId).run();
 if(result.meta.changes!==1)throw new StaleOperation();
}
async function cleanMutation(api:GitHub,env:AccessEnv,userId:string,leaseId:string,boundId:string) {
 const receipt=await env.DB.prepare('SELECT cleanup_invitation_id,cleanup_github_id,cleanup_login FROM repository_access WHERE user_id=? AND lease_id=?').bind(userId,leaseId).first<MutationReceipt>();
 if(!receipt)throw new StaleOperation();
 if(!receipt.cleanup_invitation_id&&!receipt.cleanup_github_id&&!receipt.cleanup_login)return;
 if(receipt.cleanup_invitation_id)await api(PATH+'/invitations/'+receipt.cleanup_invitation_id,'DELETE');
 let wrongId=receipt.cleanup_github_id;
 if(!wrongId&&receipt.cleanup_login) {
  const candidate=await loginIdentity(api,receipt.cleanup_login);
  if(candidate!==boundId){wrongId=candidate;await saveReceipt(env,userId,leaseId,{...receipt,cleanup_github_id:wrongId});}
 }
 if(wrongId) {
  const administrator=await env.DB.prepare("SELECT user_id FROM memberships WHERE github_id=? AND role='admin'").bind(wrongId).first();
  if(wrongId===OWNER||wrongId===env.OWNER_GITHUB_ID||administrator)throw new AccessError('protected_identity');
  const login=await profile(api,wrongId),current=await permission(api,login,wrongId);
  if(current){await assertLogin(api,login,wrongId);await api(PATH+'/collaborators/'+login,'DELETE');}
  if(await permission(api,login,wrongId))throw new AccessError('cleanup_access_remains');
 }
 await saveReceipt(env,userId,leaseId,{cleanup_invitation_id:null,cleanup_github_id:null,cleanup_login:null});
}
async function reconcile(api:GitHub,member:Membership,guard:()=>Promise<void>,env:AccessEnv,leaseId:string) {
 const login=await profile(api,member.github_id),path=PATH+'/collaborators/'+login;
 let current=await permission(api,login,member.github_id),pending=await invitations(api,member.github_id);
 if(member.status!=='active') {
  if(current){await guard();await assertLogin(api,login,member.github_id);await api(path,'DELETE');}
  for(const invite of pending){await guard();await api(PATH+'/invitations/'+invite.id,'DELETE');}
  current=await permission(api,login,member.github_id);pending=await invitations(api,member.github_id);
  return {state:current?'blocked':pending.length?'retry':'revoked',login,invitationId:null,lastError:current?'inherited_access':pending.length?'revocation_pending':null} as const;
 }
 for(const invite of pending)if(invite.permissions!=='read') {await guard();await api(PATH+'/invitations/'+invite.id,'DELETE');}
 pending=pending.filter(invite=>invite.permissions==='read');
 if(current==='read')return {state:'ready',login,invitationId:null,lastError:null} as const;
 if(!current&&pending.length)return {state:'invited',login,invitationId:pending[0].id,lastError:null} as const;
 await guard();await assertLogin(api,login,member.github_id);
 await saveReceipt(env,member.user_id,leaseId,{cleanup_invitation_id:null,cleanup_github_id:null,cleanup_login:login});
 const changed=await api(path,'PUT',{permission:'pull'});
 if(changed.status!==201&&changed.status!==204)throw new AccessError('github_response');
 if(changed.status===201) {
  const invitation=changed.data,recipientId=String(invitation?.invitee?.id),validInvitationId=Number.isSafeInteger(invitation?.id)&&invitation.id>0;
  if(!validInvitationId||recipientId!==member.github_id||invitation.permissions!=='read'||invitation.repository?.full_name!==REPO) {
   await saveReceipt(env,member.user_id,leaseId,{cleanup_invitation_id:validInvitationId?invitation.id:null,cleanup_github_id:positiveId(recipientId)?recipientId:null,cleanup_login:login});
   await cleanMutation(api,env,member.user_id,leaseId,member.github_id);
   throw new AccessError('identity_mismatch');
  }
 }else {
  const recipientId=await loginIdentity(api,login);
  if(recipientId!==member.github_id) {
   await saveReceipt(env,member.user_id,leaseId,{cleanup_invitation_id:null,cleanup_github_id:recipientId,cleanup_login:login});
   await cleanMutation(api,env,member.user_id,leaseId,member.github_id);
   throw new AccessError('identity_mismatch');
  }
 }
 current=await permission(api,login,member.github_id);pending=await invitations(api,member.github_id);
 await saveReceipt(env,member.user_id,leaseId,{cleanup_invitation_id:null,cleanup_github_id:null,cleanup_login:null});
 if(current==='read')return {state:'ready',login,invitationId:null,lastError:null} as const;
 if(current)return {state:'blocked',login,invitationId:null,lastError:'inherited_access'} as const;
 const invite=pending.find(i=>i.permissions==='read');
 if(!invite)throw new AccessError('invitation_unconfirmed');
 return {state:'invited',login,invitationId:invite.id,lastError:null} as const;
}
export async function runRepositorySync(env:AccessEnv,userId:string,deps:Dependencies={}):Promise<RepositoryAccessStatus|null> {
 const first=await membership(env,userId);validMember(first,env);
 const now=Date.now(),leaseId=crypto.randomUUID(),deadline=now+45000;
 await env.DB.prepare("INSERT INTO repository_access(user_id,github_id,state,updated_at) VALUES(?,?,'pending',?) ON CONFLICT(user_id) DO NOTHING").bind(userId,first.github_id,now).run();
 const claimed=await env.DB.prepare('UPDATE repository_access SET lease_id=?,lease_until=? WHERE user_id=? AND github_id=? AND lease_until<? RETURNING version,lease_id,attempts').bind(leaseId,now+90000,userId,first.github_id,now).first<Job>();
 if(!claimed)return repositoryStatus(env.DB,userId);
 try {
  const token=await (deps.getToken||installationToken)(env,deadline),api=github(token,deps.fetch||fetch,deadline);
  await cleanMutation(api,env,userId,leaseId,first.github_id);
  for(let attempt=0;attempt<4;attempt++) {
   const member=await membership(env,userId);validMember(member,env);
   const job=await env.DB.prepare('SELECT version,lease_id,attempts FROM repository_access WHERE user_id=?').bind(userId).first<Job>();
   if(!job||job.lease_id!==leaseId)throw new StaleOperation();
   const guard=async()=>{
    const latest=await membership(env,userId);validMember(latest,env);
    const lease=await env.DB.prepare('SELECT version,lease_id,lease_until FROM repository_access WHERE user_id=?').bind(userId).first<{version:number;lease_id:string;lease_until:number}>();
    if(latest.github_id!==member.github_id||latest.status!==member.status||lease?.lease_id!==leaseId||lease.version!==job.version||lease.lease_until<=Date.now()+10000)throw new StaleOperation();
   };
   let result;
   try{result=await reconcile(api,member,guard,env,leaseId);}catch(error){if(error instanceof StaleOperation)continue;throw error;}
   const finished=Date.now(),next=finished+(result.state==='ready'||result.state==='revoked'?3600000:300000);
   const write=await env.DB.prepare(`UPDATE repository_access SET state=?,github_login=?,invitation_id=?,last_error=?,updated_at=?,next_attempt_at=?,attempts=0,lease_id=NULL,lease_until=0
    WHERE user_id=? AND version=? AND lease_id=? AND EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=repository_access.user_id AND m.github_id=? AND m.role='member' AND m.status=?)`).bind(result.state,result.login,result.invitationId,result.lastError,finished,next,userId,job.version,leaseId,member.github_id,member.status).run();
   if(write.meta.changes)return repositoryStatus(env.DB,userId);
  }
  throw new AccessError('membership_changed');
 }catch(error){
  const code=error instanceof AccessError?error.code:error instanceof StaleOperation?'membership_changed':'github_unavailable';
  const retry=Date.now()+Math.min(3600000,30000*2**Math.min(claimed.attempts,7));
  const state=['identity_resolution_required','protected_identity','cleanup_access_remains'].includes(code)?'blocked':'retry';
  await env.DB.prepare(`UPDATE repository_access SET state=?,last_error=?,updated_at=?,next_attempt_at=CASE WHEN version=? THEN ? ELSE 0 END,attempts=attempts+1,lease_id=NULL,lease_until=0 WHERE user_id=? AND lease_id=?`).bind(state,code,Date.now(),claimed.version,retry,userId,leaseId).run();
  console.warn(JSON.stringify({event:'repository_sync_retry',code}));
  return repositoryStatus(env.DB,userId);
 }finally{
  await env.DB.prepare('UPDATE repository_access SET lease_id=NULL,lease_until=0 WHERE user_id=? AND lease_id=?').bind(userId,leaseId).run();
 }
}
export async function retryRepositoryAccess(env:AccessEnv,deps:Dependencies={}) {
 const now=Date.now();
 await env.DB.prepare(`INSERT INTO repository_access(user_id,github_id,state,updated_at)
 SELECT user_id,github_id,'pending',? FROM memberships WHERE role='member' AND github_id IS NOT NULL AND github_id<>? AND github_id<>?
 ON CONFLICT(user_id) DO NOTHING`).bind(now,OWNER,env.OWNER_GITHUB_ID).run();
 const due=await env.DB.prepare(`SELECT a.user_id FROM repository_access a JOIN memberships m ON m.user_id=a.user_id AND m.github_id=a.github_id
 WHERE m.role='member' AND m.github_id<>? AND m.github_id<>? AND a.next_attempt_at<=? AND a.lease_until<? ORDER BY CASE WHEN m.status='active' THEN 1 ELSE 0 END,a.next_attempt_at LIMIT 8`).bind(OWNER,env.OWNER_GITHUB_ID,now,now).all<{user_id:string}>();
 for(const member of due.results)try{await runRepositorySync(env,member.user_id,deps);}catch{console.warn(JSON.stringify({event:'repository_sync_rejected'}));}
}
async function health(env:AccessEnv) {
 const deadline=Date.now()+20000,token=await installationToken(env,deadline),api=github(token,fetch,deadline);
 const result=await api('/installation/repositories?per_page=100'),repositories=result.data?.repositories;
 if(result.status!==200||result.data.total_count!==1||!Array.isArray(repositories)||repositories.length!==1||repositories[0].full_name!==REPO||repositories[0].private!==true)throw new AccessError('installation_scope');
 await api(PATH+'/collaborators?per_page=1');
 await api(PATH+'/invitations?per_page=1&page=1');
 return {ok:true,repository:REPO,permission:'administration:write',scope:'single-private-repository'};
}
export default {
 async fetch(request:Request,env:AccessEnv):Promise<Response> {
  const url=new URL(request.url),match=url.pathname.match(/^\/sync\/([a-z\d_-]{1,160})$/i);
  try {
   if(url.pathname==='/health'&&request.method==='GET')return Response.json(await health(env));
   if(match&&request.method==='POST')return Response.json({repositoryAccess:await runRepositorySync(env,decodeURIComponent(match[1]))});
   return new Response(null,{status:404});
  }catch(error){return Response.json({error:error instanceof AccessError?error.code:'unavailable'},{status:error instanceof AccessError&&error.code==='member_required'?403:503});}
 },
 async scheduled(_event:ScheduledController,env:AccessEnv,context:ExecutionContext){context.waitUntil(retryRepositoryAccess(env));}
};
