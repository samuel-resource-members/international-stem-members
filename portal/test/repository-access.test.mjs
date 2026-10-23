import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker, {runRepositorySync, retryRepositoryAccess} from '../src/access-worker.ts';
import {repositorySyncStatement, repositoryStatus, syncRepositoryAccess} from '../src/github-access.ts';

function database(status='active',role='member',githubId='42') {
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE memberships(user_id TEXT PRIMARY KEY, github_id TEXT, role TEXT, status TEXT);');
 sqlite.exec(readFileSync(new URL('../migrations/0004-repository-access.sql',import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO memberships VALUES(?,?,?,?)').run('member',githubId,role,status);
 const wrap=(sql,values=[])=>({bind(...args){return wrap(sql,args);},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)},success:true};}});
 return {sqlite,prepare:sql=>wrap(sql),async batch(statements){sqlite.exec('BEGIN');try{const values=[];for(const s of statements)values.push(await s.run());sqlite.exec('COMMIT');return values;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
function fixture(options={}) {
 const db=database(options.status,options.role,options.githubId),calls=[];
 let direct=options.direct||false, inherited=options.inherited||false, permission=options.permission||'read',invitations=options.invitations||[],putHook=options.putHook,lookupCalls=0,wrongDirect=false;
 const env={DB:db,OWNER_GITHUB_ID:'237370912',MEMBER_GITHUB_APP_ID:'1',MEMBER_GITHUB_INSTALLATION_ID:'2',MEMBER_GITHUB_APP_KEY:'test'};
 const fetch=async(input,init={})=>{
  const url=new URL(input),method=init.method||'GET';calls.push({path:url.pathname+url.search,method,body:init.body});
  assert.equal(url.origin,'https://api.github.com');
  assert.equal(init.redirect,'manual');
  if(options.redirectResponse)return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/token'}});
  if(url.pathname==='/user/42')return Response.json({id:options.profileId||42,login:'renamed-member'});
  if(url.pathname==='/user/43')return Response.json({id:43,login:'reclaimed-name'});
  if(url.pathname==='/users/renamed-member') {lookupCalls++;return Response.json({id:options.lookupIds?.[Math.min(lookupCalls-1,options.lookupIds.length-1)]||42,login:'renamed-member'});}
  if(url.pathname==='/users/reclaimed-name')return Response.json({id:43,login:'reclaimed-name'});
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/reclaimed-name/permission')return wrongDirect?Response.json({permission:'read',role_name:'read',user:{id:43,login:'reclaimed-name'}}):new Response(null,{status:404});
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/reclaimed-name'&&method==='DELETE'){wrongDirect=false;return new Response(null,{status:204});}
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/renamed-member/permission')return direct||inherited||options.noneResponse?Response.json({permission:direct||inherited?permission:'none',role_name:direct||inherited?permission:'none',user:{id:42,login:'renamed-member'}}):new Response(null,{status:404});
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/invitations') {
   const page=Number(url.searchParams.get('page')||1);return Response.json(invitations.slice((page-1)*100,page*100));
  }
  if(url.pathname.startsWith('/repos/samuel-resource-members/international-stem-members/invitations/')&&method==='DELETE') {if(options.invitationDeleteFailure)return new Response(null,{status:503});invitations=invitations.filter(i=>String(i.id)!==url.pathname.split('/').at(-1));return new Response(null,{status:204});}
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/renamed-member') {
   if(method==='DELETE'){if(options.deleteFailure)return Response.json({message:'secret upstream payload'},{status:503});direct=false;return new Response(null,{status:204});}
   if(method==='PUT') {
    assert.deepEqual(JSON.parse(init.body),{permission:'pull'});
    if(putHook)await putHook(db);
    if(options.wrong204){wrongDirect=true;return new Response(null,{status:204});}
    if(direct){permission='read';return new Response(null,{status:204});}
    const invitation={id:900,invitee:{id:options.wrongInvitation?43:42,login:'renamed-member'},permissions:options.wrongPermission?'write':'read',repository:{full_name:'samuel-resource-members/international-stem-members'}};invitations=[...invitations,invitation];if(options.lostPutResponse)throw new Error('Simulated lost response after GitHub creates invitation');return Response.json(invitation,{status:201});
   }
  }
  throw new Error('Unexpected API call '+method+' '+url.pathname+url.search);
 };
 return {db,env,calls,deps:{fetch,getToken:async()=> 'private-test-token'},get invitations(){return invitations;},get direct(){return direct;},get wrongDirect(){return wrongDirect;}};
}
test('owner, administrators, missing users and invalid identities never trigger GitHub access changes',async()=>{
 for(const spec of [{role:'admin'},{githubId:'237370912'},{githubId:'bad'}]) {
  const f=fixture(spec);await assert.rejects(runRepositorySync(f.env,'member',f.deps));assert.equal(f.calls.length,0);
 }
 const f=fixture();await assert.rejects(runRepositorySync(f.env,'missing',f.deps));assert.equal(f.calls.length,0);
});
test('GET and unrecognized internal routes cannot create invitations',async()=>{
 const f=fixture();for(const [path,method] of [['/sync/member','GET'],['/sync/member/extra','POST'],['/sync/%2F','POST']])assert.equal((await worker.fetch(new Request('https://access.internal'+path,{method}),f.env)).status,404);
 assert.equal(f.calls.length,0);
});
test('active member resolves immutable ID and creates exactly one read-only invitation',async()=>{
 const f=fixture();const status=await runRepositorySync(f.env,'member',f.deps);
 assert.equal(status.state,'invited');assert.equal(status.githubLogin,'renamed-member');assert.equal(status.invitationUrl,'https://github.com/samuel-resource-members/international-stem-members/invitations');
 await runRepositorySync(f.env,'member',f.deps);assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);
 assert.ok(f.calls.every(x=>x.path.startsWith('/user/42')||x.path.startsWith('/users/renamed-member')||x.path.startsWith('/repos/samuel-resource-members/international-stem-members/')));
});
test('mismatched resolved GitHub ID persists a retry without inviting',async()=>{
 const f=fixture({profileId:43});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(result.lastError,'identity_mismatch');assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
});
test('accepted read access is idempotent and excessive direct access is reduced to read',async()=>{
 const f=fixture({direct:true});assert.equal((await runRepositorySync(f.env,'member',f.deps)).state,'ready');assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
 const elevated=fixture({direct:true,permission:'write'});assert.equal((await runRepositorySync(elevated.env,'member',elevated.deps)).state,'ready');assert.equal(elevated.calls.filter(x=>x.method==='PUT').length,1);
});
test('the documented permission=none response means no access, and stale elevated invitations are removed',async()=>{
 const suspended=fixture({status:'suspended',noneResponse:true});assert.equal((await runRepositorySync(suspended.env,'member',suspended.deps)).state,'revoked');assert.equal(suspended.calls.filter(x=>x.method==='DELETE').length,0);
 const active=fixture({direct:true,invitations:[{id:9,invitee:{id:42},permissions:'write'}]});assert.equal((await runRepositorySync(active.env,'member',active.deps)).state,'ready');assert.equal(active.invitations.length,0);
});
test('suspension removes direct access and every matching invitation across pages',async()=>{
 const invitations=Array.from({length:101},(_,i)=>({id:i+1,invitee:{id:i===100?42:1000+i},permissions:'read'}));
 const f=fixture({status:'suspended',direct:true,invitations});assert.equal((await runRepositorySync(f.env,'member',f.deps)).state,'revoked');assert.equal(f.direct,false);assert.equal(f.invitations.length,100);assert.ok(f.calls.some(x=>x.path.includes('page=2')));
});
test('failed removal never reports revoked and raw upstream responses never escape',async()=>{
 const f=fixture({status:'suspended',direct:true,deleteFailure:true});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(result.lastError,'github_unavailable');assert.ok(!JSON.stringify(result).includes('secret upstream'));assert.ok(result.retryAt>Date.now());
});
test('inherited organization or team permissions block a successful revocation claim',async()=>{
 const f=fixture({status:'suspended',inherited:true});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'blocked');assert.equal(result.lastError,'inherited_access');
});
test('a suspension arriving while invitation PUT is in flight is compensated before success',async()=>{
 const f=fixture({putHook:async db=>{db.sqlite.prepare("UPDATE memberships SET status='suspended' WHERE user_id='member'").run();await repositorySyncStatement(db,'member').run();}});
 const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'revoked');assert.equal(f.invitations.length,0);assert.equal(f.direct,false);
});
test('concurrent syncs serialize external writes with a lease',async()=>{
 let release,started;const gate=new Promise(r=>release=r),entered=new Promise(r=>started=r);
 const f=fixture({putHook:async()=>{started();await gate;}});const first=runRepositorySync(f.env,'member',f.deps);await entered;
 const second=await runRepositorySync(f.env,'member',f.deps);assert.equal(second.state,'pending');release();assert.equal((await first).state,'invited');assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);
});
test('scheduled retries pick due members and periodically audit accepted access',async()=>{
 const f=fixture({direct:true});await runRepositorySync(f.env,'member',f.deps);f.db.sqlite.prepare('UPDATE repository_access SET next_attempt_at=0').run();const before=f.calls.length;await retryRepositoryAccess(f.env,f.deps);assert.ok(f.calls.length>before);assert.equal((await repositoryStatus(f.db,'member')).state,'ready');
});
test('pending activation is not starved by completed suspension audits',async()=>{
 const f=fixture();await repositorySyncStatement(f.db,'member').run();
 f.db.sqlite.prepare('UPDATE repository_access SET next_attempt_at=1 WHERE user_id=?').run('member');
 for(let i=0;i<104;i++){
  const id='suspended-'+i,githubId=String(10000+i);
  f.db.sqlite.prepare("INSERT INTO memberships VALUES(?,?,'member','suspended')").run(id,githubId);
  f.db.sqlite.prepare("INSERT INTO repository_access(user_id,github_id,state,updated_at,next_attempt_at) VALUES(?,?,'revoked',0,0)").run(id,githubId);
 }
 await retryRepositoryAccess(f.env,f.deps);
 assert.equal((await repositoryStatus(f.db,'member')).state,'invited');
 assert.equal(f.calls.filter(x=>x.method==='PUT').length,1);
});
test('portal helper retains durable pending state when internal service is unavailable',async()=>{
 const f=fixture();await repositorySyncStatement(f.db,'member').run();const result=await syncRepositoryAccess({...f.env,REPOSITORY_ACCESS:{fetch:async()=>{throw new Error('unavailable');}}},'member');assert.equal(result.state,'pending');
});
test('a renamed or reclaimed login fails the final identity check before invitation PUT',async()=>{
 const f=fixture({lookupIds:[43]});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(result.lastError,'identity_mismatch');assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
});
test('a 201 invitation response with the wrong immutable recipient or elevated permission is cancelled',async()=>{
 for(const options of [{wrongInvitation:true},{wrongPermission:true}]) {
  const f=fixture(options);const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(f.invitations.length,0);assert.ok(f.calls.some(x=>x.method==='DELETE'&&x.path.endsWith('/invitations/900')));
 }
});
test('failed cancellation keeps a durable cleanup receipt and the next retry removes the wrong invitation first',async()=>{
 const options={wrongInvitation:true,invitationDeleteFailure:true},f=fixture(options);await runRepositorySync(f.env,'member',f.deps);assert.equal(f.invitations.length,1);assert.equal(f.db.sqlite.prepare('SELECT cleanup_invitation_id FROM repository_access').get().cleanup_invitation_id,900);
 options.invitationDeleteFailure=false;options.wrongInvitation=false;const before=f.calls.length;await runRepositorySync(f.env,'member',f.deps);const later=f.calls.slice(before);assert.ok(later.findIndex(x=>x.method==='DELETE')<later.findIndex(x=>x.method==='PUT'));assert.equal(f.invitations.some(i=>i.invitee.id===43),false);
});
test('a reclaimed account receiving a 204 grant is resolved by ID and its direct access is removed',async()=>{
 const f=fixture({lookupIds:[42,43],wrong204:true});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(f.wrongDirect,false);assert.ok(f.calls.some(x=>x.path==='/user/43'));assert.ok(f.calls.some(x=>x.method==='DELETE'&&x.path.endsWith('/collaborators/reclaimed-name')));
});
test('scheduled recovery creates jobs for memberships missing a queue row',async()=>{
 const f=fixture();assert.equal(f.db.sqlite.prepare('SELECT count(*) n FROM repository_access').get().n,0);await retryRepositoryAccess(f.env,f.deps);assert.equal((await repositoryStatus(f.db,'member')).state,'invited');
});
test('a lost PUT response retains the username receipt and suspension cancels every wrong-recipient invitation before reporting revoked',async()=>{
 const f=fixture({lookupIds:[42,43],wrongInvitation:true,lostPutResponse:true});
 assert.equal((await runRepositorySync(f.env,'member',f.deps)).state,'retry');assert.equal(f.invitations.length,1);
 const receipt=f.db.sqlite.prepare('SELECT cleanup_login,cleanup_invitation_id FROM repository_access').get();assert.equal(receipt.cleanup_login,'renamed-member');assert.equal(receipt.cleanup_invitation_id,null);
 f.db.sqlite.prepare("UPDATE memberships SET status='suspended' WHERE user_id='member'").run();await repositorySyncStatement(f.db,'member').run();
 const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'revoked');assert.equal(f.invitations.length,0);assert.ok(f.calls.some(x=>x.method==='DELETE'&&x.path.endsWith('/invitations/900')));
 assert.equal(f.db.sqlite.prepare('SELECT cleanup_login FROM repository_access').get().cleanup_login,null);
});
test('an unconfirmed wrong-recipient invitation cancellation keeps the receipt and never reports revoked',async()=>{
 const options={lookupIds:[42,43],wrongInvitation:true,lostPutResponse:true},f=fixture(options);await runRepositorySync(f.env,'member',f.deps);
 f.db.sqlite.prepare("UPDATE memberships SET status='suspended' WHERE user_id='member'").run();await repositorySyncStatement(f.db,'member').run();options.invitationDeleteFailure=true;
 const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(f.invitations.length,1);assert.equal(f.db.sqlite.prepare('SELECT cleanup_github_id FROM repository_access').get().cleanup_github_id,'43');
});
test('GitHub redirects are rejected explicitly with the Workers-supported manual mode',async()=>{
 const f=fixture({redirectResponse:true});const result=await runRepositorySync(f.env,'member',f.deps);assert.equal(result.state,'retry');assert.equal(result.lastError,'github_redirect');assert.equal(f.calls.length,1);assert.equal(f.calls.filter(x=>x.method==='PUT').length,0);
});
