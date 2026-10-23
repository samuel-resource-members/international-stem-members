import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
rmSync('.tmp/test-runtime',{recursive:true,force:true});mkdirSync('.tmp/test-runtime',{recursive:true});mkdirSync('dist',{recursive:true});
const cli=args=>execFileSync(process.execPath,[wrangler,...args],{stdio:['ignore','pipe','pipe'],timeout:120000});
cli(['d1','migrations','apply','DB','--local','--persist-to','.tmp/test-runtime']);
const fixtures=[['owner','admin'],['first','member'],['race','member'],['bound','member'],['expired','member'],['revoked','member'],['injection','member']];
writeFileSync('.tmp/fixtures.sql',fixtures.map(([id,role])=>{
 const hash=createHash('sha256').update(('test-'+id+'-activation').replace(/[\s-]/g,'').toUpperCase()).digest('hex');
 return `INSERT INTO activation_codes(id,code_hash,suffix,role,created_at,bound_email,expires_at,revoked) VALUES('${id}','${hash}','TEST','${role}',${Date.now()},${id==='bound'?"'bound@example.test'":'NULL'},${id==='expired'?Date.now()-10000:'NULL'},${id==='revoked'?1:0});`;
}).join('\n'));
cli(['d1','execute','DB','--local','--persist-to','.tmp/test-runtime','--file','.tmp/fixtures.sql']);
const server=spawn(process.execPath,[wrangler,'dev','--port','8798','--ip','127.0.0.1','--persist-to','.tmp/test-runtime','--var','APP_URL:http://127.0.0.1:8798','--var','BETTER_AUTH_SECRET:local-test-only-secret-with-over-thirty-two-bytes','--log-level','error'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
try {
  let ready=false;
  for(let i=0;i<100;i++) {try {await fetch('http://127.0.0.1:8798/');ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}
  if(!ready)throw new Error('Test server did not start: '+log.slice(-5000));
  const files=readdirSync('test').filter(x=>x.endsWith('.test.mjs')).map(x=>'test/'+x);
  const test=spawn(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit'});
  process.exitCode=await new Promise(resolve=>test.on('exit',resolve));
} finally {server.kill('SIGTERM');await new Promise(resolve=>server.on('exit',resolve));}
