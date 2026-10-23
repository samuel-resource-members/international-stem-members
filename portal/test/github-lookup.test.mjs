import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveGitHubUser} from '../src/github.ts';
test('GitHub account binding uses the service-verified immutable ID',async()=>{
 const result=await resolveGitHubUser('old-name',{fetch:async url=>{assert.equal(url,'https://resources.internal/github-user/old-name');return Response.json({id:42,login:'current-name',email:'private@example.test'});}});
 assert.deepEqual(result,{id:'42',login:'current-name'});
});
test('missing or invalid provider identities cannot be used for binding',async()=>{
 assert.equal(await resolveGitHubUser('missing',{fetch:async()=>new Response(null,{status:404})}),null);
 await assert.rejects(resolveGitHubUser('invalid',{fetch:async()=>Response.json({id:0,login:'invalid'})}));
 await assert.rejects(resolveGitHubUser('unavailable',{fetch:async()=>new Response(null,{status:503})}));
});
