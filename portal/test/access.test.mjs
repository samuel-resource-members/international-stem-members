import { test } from 'node:test';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8798';
for (const path of ['/library','/library.html','/catalogue/manifest.json','/catalogue/part-0.json','/api/resources','/api/repository','/api/admin/repository-health','/download/665910606']) {
  test(`anonymous access is denied for ${path}`, async () => {
    const response=await fetch(base+path,{redirect:'manual'});
    assert.ok([401,302,303].includes(response.status),`expected an authentication boundary, received ${response.status}`);
  });
}
test('native sign-up cannot bypass activation',async()=>{
  const response=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'visitor@example.com',password:'correct-horse-battery-staple',name:'Visitor'})});
  assert.equal(response.status,403);
});
test('cross-origin registration requests are rejected',async()=>{
  const response=await fetch(base+'/api/register',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,403);
});
