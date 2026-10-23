import {test} from 'node:test';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8798',password='Correct Horse 29! Battery';
const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
const cookies=r=>r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const get=(path,cookie)=>fetch(base+path,{headers:{Cookie:cookie}});
test('one-time membership, account permissions, owner controls, and reviewed uploads',{timeout:60000},async t=>{
 let owner,member,memberId,contribution;
 await t.test('invalid code cannot create an activated account',async()=>{
  assert.equal((await post('/api/register',{email:'unknown@example.test',password,code:'invalid-activation-code'})).status,403);
 });
 await t.test('owner bootstrap code activates an administrator',async()=>{
  const r=await post('/api/register',{email:'owner@example.test',password,code:'test-owner-activation'});assert.equal(r.status,200,await r.clone().text());owner=cookies(r);
  const me=await (await get('/api/me',owner)).json();assert.equal(me.role,'admin');assert.equal(me.status,'active');
 });
 await t.test('a valid code activates a member without GitHub',async()=>{
  const r=await post('/api/register',{email:'first@example.test',password,code:'test-first-activation'});assert.equal(r.status,200,await r.clone().text());member=cookies(r);
  const me=await (await get('/api/me',member)).json();memberId=me.id;assert.equal(me.role,'member');assert.equal(me.status,'active');
  assert.equal((await get('/api/resources',member)).status,200);
  const reader=await get('/library.html',member);assert.equal(reader.status,200);assert.match(reader.headers.get('Cache-Control'),/no-store/);
 });
 await t.test('a consumed code cannot activate another account',async()=>{
  assert.equal((await post('/api/register',{email:'second@example.test',password,code:'test-first-activation'})).status,403);
 });
 await t.test('concurrent claims activate exactly one account',async()=>{
  const results=await Promise.all(['race-a','race-b'].map(x=>post('/api/register',{email:x+'@example.test',password,code:'test-race-activation'})));
  assert.equal(results.filter(r=>r.status===200).length,1);
  assert.ok(results.some(r=>[403,409].includes(r.status)));
 });
 await t.test('expired, revoked, and mismatched-email codes are refused',async()=>{
  for(const kind of ['expired','revoked','bound'])assert.equal((await post('/api/register',{email:kind+'-wrong@example.test',password,code:'test-'+kind+'-activation'})).status,403);
  const bound=await post('/api/register',{email:'BOUND@example.test',password,code:'test-bound-activation'});assert.equal(bound.status,200,await bound.clone().text());
 });
 await t.test('client-supplied roles cannot create an administrator',async()=>{
  assert.equal((await post('/api/register',{email:'inject@example.test',password,code:'test-injection-activation',role:'admin'})).status,400);
 });
 await t.test('members cannot issue codes, review contributions, or modify membership',async()=>{
  assert.equal((await get('/api/admin/codes',member)).status,403);
  assert.equal((await post('/api/admin/codes',{count:1},member)).status,403);
  assert.equal((await post('/api/admin/members/'+memberId+'/status',{status:'suspended'},member)).status,403);
  assert.equal((await post('/api/admin/submissions/unknown/review',{status:'approved'},member)).status,403);
 });
 await t.test('the owner issues codes once and can revoke unused codes',async()=>{
  const issued=await post('/api/admin/codes',{count:2,label:'test batch'},owner);assert.equal(issued.status,200,await issued.clone().text());const {codes}=await issued.json();
  const listed=await (await get('/api/admin/codes',owner)).json();assert.ok(listed.codes.every(x=>!('code' in x)&&!('code_hash' in x)));
  assert.equal((await post('/api/admin/codes/'+codes[0].id+'/revoke',{},owner)).status,200);
  assert.equal((await post('/api/register',{email:'revoked-new@example.test',password,code:codes[0].code})).status,403);
 });
 await t.test('contributions require owner approval before other members see them',async()=>{
  const created=await post('/api/submissions',{title:'Practice paper',course:'IGCSE Physics 0625',details:'Questions and answers',fileName:'practice.pdf',fileSize:14},member);
  assert.equal(created.status,200,await created.clone().text());contribution=(await created.json()).id;
  const uploaded=await fetch(base+'/api/submissions/'+contribution+'/file',{method:'PUT',headers:{Origin:base,Cookie:member,'Content-Type':'application/octet-stream'},body:'%PDF-1.4\ntest\n'});
  assert.equal(uploaded.status,200,await uploaded.clone().text());
  const listed=await (await get('/api/contributions',member)).json();assert.ok(!listed.submissions.some(s=>s.id===contribution));
  assert.equal((await post('/api/admin/submissions/'+contribution+'/review',{status:'approved'},owner)).status,200);
  const accepted=await (await get('/api/contributions',member)).json();assert.ok(accepted.submissions.some(s=>s.id===contribution));
  const file=await get('/api/submissions/'+contribution+'/file',member);assert.equal(file.status,200);assert.equal(await file.text(),'%PDF-1.4\ntest\n');
 });
 await t.test('suspension immediately invalidates existing member access',async()=>{
  assert.equal((await post('/api/admin/members/'+memberId+'/status',{status:'suspended'},owner)).status,200);
  assert.ok([401,403].includes((await get('/api/resources',member)).status));
  assert.equal((await post('/api/admin/members/'+memberId+'/status',{status:'active'},owner)).status,200);
  const login=await post('/api/auth/sign-in/email',{email:'first@example.test',password});assert.equal(login.status,200);member=cookies(login);
  assert.equal((await get('/api/resources',member)).status,200);
 });
 await t.test('owners can deliver a one-use password recovery link',async()=>{
  const reset=await post('/api/admin/members/'+memberId+'/recovery',{},owner);assert.equal(reset.status,200,await reset.clone().text());
  const {url}=await reset.json();assert.ok(url.startsWith(base+'/api/auth/reset-password/'));
  const landing=await fetch(url,{redirect:'manual'});assert.equal(landing.status,302);const destination=new URL(landing.headers.get('Location'));assert.equal(destination.pathname,'/reset-password');assert.ok(destination.searchParams.get('token'));
  const token=destination.searchParams.get('token');
  const changed=await post('/api/auth/reset-password',{token,newPassword:'Changed Password 49!'});assert.equal(changed.status,200,await changed.clone().text());
  assert.notEqual((await post('/api/auth/reset-password',{token,newPassword:'Another Password 49!'})).status,200);
 });
});
