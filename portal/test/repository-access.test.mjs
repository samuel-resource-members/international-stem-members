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
 let direct=options.direct||false, inherited=options.inherited||false, permission=options.permission||'read',invitations=options.invitations||[],putHook=options.putHook;
 const env={DB:db,OWNER_GITHUB_ID:'237370912',MEMBER_GITHUB_APP_ID:'1',MEMBER_GITHUB_INSTALLATION_ID:'2',MEMBER_GITHUB_APP_KEY:'test'};
 const fetch=async(input,init={})=>{
  const url=new URL(input),method=init.method||'GET';calls.push({path:url.pathname+url.search,method,body:init.body});
  assert.equal(url.origin,'https://api.github.com');
  if(url.pathname==='/user/42')return Response.json({id:options.profileId||42,login:'renamed-member'});
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/renamed-member/permission')return direct||inherited||options.noneResponse?Response.json({permission:direct||inherited?permission:'none',role_name:direct||inherited?permission:'none',user:{id:42,login:'renamed-member'}}):new Response(null,{status:404});
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/invitations') {
   const page=Number(url.searchParams.get('page')||1);return Response.json(invitations.slice((page-1)*100,page*100));
  }
  if(url.pathname.startsWith('/repos/samuel-resource-members/international-stem-members/invitations/')&&method==='DELETE') {invitations=invitations.filter(i=>String(i.id)!==url.pathname.split('/').at(-1));return new Response(null,{status:204});}
  if(url.pathname==='/repos/samuel-resource-members/international-stem-members/collaborators/renamed-member') {
   if(method==='DELETE'){if(options.deleteFailure)return Response.json({message:'secret upstream payload'},{status:503});direct=false;return new Response(null,{status:204});}
   if(method==='PUT') {
    assert.deepEqual(JSON.parse(init.body),{permission:'pull'});
    if(putHook)await putHook(db);
    if(direct){permission='read';return new Response(null,{status:204});}
    const invitation={id:900,invitee:{id:42,login:'renamed-member'},permissions:'read'};invitations=[...invitations,invitation];return Response.json(invitation,{status:201});
   }
  }
  throw new Error('Unexpected API call '+method+' '+url.pathname+url.search);
 };
 return {db,env,calls,deps:{fetch,getToken:async()=> 'private-test-token'},get invitations(){return invitations;},get direct(){return direct;}};
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
 assert.ok(f.calls.every(x=>x.path.startsWith('/user/42')||x.path.startsWith('/repos/samuel-resource-members/international-stem-members/')));
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
test('portal helper retains durable pending state when internal service is unavailable',async()=>{
 const f=fixture();await repositorySyncStatement(f.db,'member').run();const result=await syncRepositoryAccess({...f.env,REPOSITORY_ACCESS:{fetch:async()=>{throw new Error('unavailable');}}},'member');assert.equal(result.state,'pending');
});
