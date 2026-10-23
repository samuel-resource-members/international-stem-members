import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {serializeSignedCookie} from 'better-call';
const base='http://127.0.0.1:8798',secret='local-test-only-secret-with-over-thirty-two-bytes';
const fixtures=JSON.parse(readFileSync('.tmp/identities.json'));
const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
const get=(path,cookie='')=>fetch(base+path,{headers:{Cookie:cookie},redirect:'manual'});
async function refreshedCookie(name){const now=Date.now(),token=randomUUID(),id=fixtures[name].id;execFileSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB','--local','--persist-to','.tmp/test-runtime','--command',`INSERT INTO session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES('${token}','${token}','${id}',${now+3600000},${now},${now})`],{stdio:'pipe',timeout:120000});return(await serializeSignedCookie('better-auth.session_token',token,secret,{path:'/'})).split(';')[0];}
test('GitHub-bound membership and reviewed contributions',{timeout:90000},async t=>{
 const owner=fixtures.owner.cookie;let member=fixtures.first.cookie,contribution;
 await t.test('only the verified owner GitHub ID receives administrator access',async()=>{
  const me=await(await get('/api/me',owner)).json();assert.equal(me.role,'admin');assert.equal(me.github.id,'1000');assert.ok(!('email' in me));
  assert.equal((await get('/api/admin/codes',owner)).status,200);
  const access=await(await get('/api/repository',owner)).json();assert.equal(access.repository.state,'ready');
  assert.equal((await post('/api/repository/sync',{},owner)).status,403);
 });
 await t.test('legacy credential sessions cannot access or activate membership',async()=>{
  assert.equal((await get('/api/me',fixtures.credential.cookie)).status,401);
  assert.equal((await post('/api/activate',{code:'test-first-activation'},fixtures.credential.cookie)).status,401);
 });
 await t.test('matching display usernames cannot redeem a code for another GitHub ID',async()=>{
  assert.equal((await post('/api/activate',{code:'test-first-activation'},fixtures.wrong.cookie)).status,409);
  assert.equal((await get('/api/resources',fixtures.wrong.cookie)).status,403);
 });
 await t.test('the designated GitHub account can activate and read resources',async()=>{
  assert.equal((await post('/api/activate',{code:'test-first-activation'},member)).status,200);
  const me=await(await get('/api/me',member)).json();assert.equal(me.role,'member');assert.equal(me.github.id,fixtures.first.githubId);
  assert.equal((await get('/api/resources',member)).status,200);
  const reader=await get('/library',member);assert.equal(reader.status,200);assert.match(reader.headers.get('Cache-Control'),/no-store/);assert.equal((await reader.text()).includes("connect-src 'none'"),false);
  const access=await(await get('/api/repository?userId='+fixtures.owner.id,member)).json();assert.ok(['pending','retry','invited','ready'].includes(access.repository.state));assert.notEqual(access.repository.githubLogin,'owner');
  assert.equal((await get('/api/admin/repository-health',member)).status,403);
  assert.equal((await post('/api/admin/members/'+fixtures.owner.id+'/repository/sync',{},member)).status,403);
 });
 await t.test('a used code cannot activate another GitHub account',async()=>{
  assert.equal((await post('/api/activate',{code:'test-first-activation'},fixtures.bound.cookie)).status,409);
 });
 await t.test('only one of concurrent claims can activate membership',async()=>{
  const results=await Promise.all([1,2].map(()=>post('/api/activate',{code:'test-race-activation'},fixtures.race.cookie)));
  assert.equal(results.filter(r=>r.status===200).length,1);assert.ok(results.some(r=>[403,409].includes(r.status)));
 });
 await t.test('expired, revoked and unbound legacy codes cannot activate',async()=>{
  for(const name of ['expired','revoked','legacy'])assert.equal((await post('/api/activate',{code:'test-'+name+'-activation'},fixtures[name].cookie)).status,409);
  assert.equal((await post('/api/activate',{code:'test-bound-activation'},fixtures.bound.cookie)).status,200);
 });
 await t.test('client-supplied usernames, IDs and roles are rejected',async()=>{
  for(const extra of [{role:'admin'},{githubId:fixtures.first.githubId},{githubUsername:'first'}])assert.equal((await post('/api/activate',{code:'test-injection-activation',...extra},fixtures.injection.cookie)).status,400);
  assert.equal((await post('/api/activate',{code:'test-injection-activation'},fixtures.injection.cookie)).status,200);
  assert.equal((await(await get('/api/me',fixtures.injection.cookie)).json()).role,'member');
 });
 await t.test('members cannot issue codes, review files or alter access',async()=>{
  assert.equal((await get('/api/admin/codes',member)).status,403);
  for(const [path,body]of [['/api/admin/codes',{githubUsername:'first'}],['/api/admin/members/'+fixtures.first.id+'/status',{status:'suspended'}],['/api/admin/submissions/unknown/review',{status:'approved'}]])assert.equal((await post(path,body,member)).status,403);
 });
 await t.test('the owner cannot issue unbound or client-selected admin codes',async()=>{
  for(const body of [{count:2},{label:'unbound'},{githubUsername:'first',role:'admin'},{githubUsername:'../user'}])assert.equal((await post('/api/admin/codes',body,owner)).status,400);
  const listed=await(await get('/api/admin/codes',owner)).json();assert.ok(listed.codes.every(x=>!('code' in x)&&!('code_hash' in x)));
 });
 await t.test('the owner can revoke a bound unused code',async()=>{
  assert.equal((await post('/api/admin/codes/quota/revoke',{},owner)).status,200);
  assert.equal((await post('/api/activate',{code:'test-quota-activation'},fixtures.quota.cookie)).status,409);
 });
 await t.test('file submissions remain private until owner approval',async()=>{
  const created=await post('/api/submissions',{title:'Practice paper',course:'IGCSE Physics 0625',details:'Questions and answers',fileName:'practice.pdf',fileSize:14},member);assert.equal(created.status,200);contribution=(await created.json()).id;
  assert.equal((await fetch(base+'/api/submissions/'+contribution+'/file',{method:'PUT',headers:{Origin:base,Cookie:member,'Content-Type':'application/octet-stream'},body:'%PDF-1.4\ntest\n'})).status,200);
  assert.equal((await get('/api/submissions/'+contribution+'/file',fixtures.bound.cookie)).status,404);
  assert.ok(!(await(await get('/api/contributions',member)).json()).submissions.some(x=>x.id===contribution));
  assert.equal((await post('/api/admin/submissions/'+contribution+'/review',{status:'approved'},owner)).status,200);
  assert.ok((await(await get('/api/contributions',member)).json()).submissions.some(x=>x.id===contribution));
  const file=await get('/api/submissions/'+contribution+'/file',fixtures.bound.cookie);assert.equal(file.status,200);assert.equal(await file.text(),'%PDF-1.4\ntest\n');
 });
 await t.test('suspension invalidates sessions and restoration preserves GitHub binding',async()=>{
  const suspension=await post('/api/admin/members/'+fixtures.first.id+'/status',{status:'suspended'},owner);
  assert.equal(suspension.status,202);assert.notEqual((await suspension.json()).repository.state,'revoked');
  assert.equal((await get('/api/resources',member)).status,401);
  assert.equal((await post('/api/admin/members/'+fixtures.first.id+'/status',{status:'active'},owner)).status,200);
  member=await refreshedCookie('first');assert.equal((await get('/api/resources',member)).status,200);
  assert.equal((await get('/api/resources',fixtures.wrong.cookie)).status,403);
 });
 await t.test('earlier pending submissions remain available after long review history',async()=>{
  const queue=await(await get('/api/admin/submissions',owner)).json();assert.ok(queue.submissions.some(x=>x.id==='old-pending'));
  const history=await(await get('/api/admin/submissions?status=approved&page=2',owner)).json();assert.equal(history.page,2);assert.ok(history.pages>=4);
 });
 await t.test('concurrent submissions respect the daily quota',async()=>{
  const results=await Promise.all(Array.from({length:25},(_,i)=>post('/api/submissions',{title:'Resource '+i,course:'Physics',url:'https://example.com/paper'},fixtures.bound.cookie)));
  assert.equal(results.filter(r=>r.status===200).length,20);assert.equal(results.filter(r=>r.status===429).length,5);
 });
});
