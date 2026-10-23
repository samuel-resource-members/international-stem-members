import { test } from 'node:test';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:8798';

test('the public guide is readable without a login or JavaScript',async()=>{
  const response=await fetch(base+'/guide',{redirect:'manual'});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/html/);
  const html=await response.text();
  assert.match(html,/<h1[^>]*>会员使用指南<\/h1>/);
  assert.match(html,/接受邀请/);
  assert.match(html,/gh repo clone samuel-resource-members\/international-stem-members/);
  assert.doesNotMatch(html,/<script\b|library-data|better-auth\.session_token|BEGIN PRIVATE KEY/i);
});

test('plain Markdown provides the full public onboarding and download instructions',async()=>{
  const response=await fetch(base+'/guide.md',{redirect:'manual'});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/^text\/markdown;\s*charset=utf-8/i);
  assert.equal(response.headers.get('content-disposition'),null);
  const body=await response.text();
  assert.match(body,/^# 会员使用指南/m);
  assert.match(body,/绑定/);
  assert.match(body,/接受邀请/);
  assert.match(body,/gh auth status/);
  assert.match(body,/materialize --course amc8 --dry-run/);
  assert.doesNotMatch(body,/BEGIN (?:RSA )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20}|\.admin\/|客户名单/);
});

test('the entry page and discovery document lead to public instructions',async()=>{
  const response=await fetch(base+'/');
  assert.match(await response.text(),/href="\/guide"/);
  assert.match(response.headers.get('link'),/<\/guide\.md>; rel="alternate"; type="text\/markdown"/);
  const discovery=await fetch(base+'/llms.txt');
  assert.equal(discovery.status,200);
  assert.match(discovery.headers.get('content-type'),/^text\/plain;\s*charset=utf-8/i);
  assert.match(await discovery.text(),/\[会员使用指南\]\(https:\/\/stem-member-library\.xpartara\.workers\.dev\/guide\.md\)/);
});

for(const path of ['/README.md','/guide/README.md','/guide.html','/data/questions.json','/catalogue/manifest.json','/api/admin/codes']){
  test(`publishing the guide does not expose ${path}`,async()=>{
    const response=await fetch(base+path,{redirect:'manual'});
    assert.equal(response.status,401);
  });
}
