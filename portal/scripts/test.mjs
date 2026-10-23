import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {serializeSignedCookie} from 'better-call';
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),secret='local-test-only-secret-with-over-thirty-two-bytes';
rmSync('.tmp/test-runtime',{recursive:true,force:true});mkdirSync('.tmp/test-runtime',{recursive:true});mkdirSync('dist',{recursive:true});
const cli=args=>execFileSync(process.execPath,[wrangler,...args],{stdio:['ignore','pipe','pipe'],timeout:120000});
cli(['d1','migrations','apply','DB','--local','--persist-to','.tmp/test-runtime']);
const names=['owner','first','wrong','race','expired','revoked','legacy','injection','bound','quota','credential'];
const now=Date.now(),sql=["UPDATE activation_codes SET bound_github_id='1000',bound_github_login='owner' WHERE id='github-owner';"],fixtures={};
for(const [i,name] of names.entries()){
 const id='fixture-'+name,githubId=String(1000+i),login=name==='wrong'?'first':name==='first'?'first-renamed':name,token=randomUUID();
 sql.push(`INSERT INTO user(id,name,email,emailVerified,github_login,createdAt,updatedAt) VALUES('${id}','${login}','${name}@example.test',1,'${login}',${now},${now});`);
 sql.push(`INSERT INTO account(id,accountId,providerId,userId,createdAt,updatedAt) VALUES('${name}-account','${githubId}','${name==='credential'?'credential':'github'}','${id}',${now},${now});`);
 sql.push(`INSERT INTO session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES('${name}-session','${token}','${id}',${now+3600000},${now},${now});`);
 fixtures[name]={id,githubId,login,cookie:(await serializeSignedCookie('better-auth.session_token',token,secret,{path:'/'})).split(';')[0]};
 if(!['owner','wrong','credential'].includes(name)){
  const hash=createHash('sha256').update(('test-'+name+'-activation').replace(/[\s-]/g,'').toUpperCase()).digest('hex');
  sql.push(`INSERT INTO activation_codes(id,code_hash,suffix,bound_github_id,bound_github_login,expires_at,revoked,created_at) VALUES('${name}','${hash}','TEST',${name==='legacy'?'NULL':"'"+githubId+"'"},'${name==='first'?'first':login}',${name==='expired'?now-10000:'NULL'},${name==='revoked'?1:0},${now});`);
 }
}
sql.push(`INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES('history-fixture','History','history@example.test',0,${now},${now});`);
sql.push(`INSERT INTO submissions(id,user_id,title,course,details,status,created_at) VALUES('old-pending','history-fixture','Earlier pending paper','Physics','','pending',${now-864000000});`);
for(let i=0;i<201;i++)sql.push(`INSERT INTO submissions(id,user_id,title,course,details,status,created_at) VALUES('history-${i}','history-fixture','Earlier shared paper','Physics','','approved',${now-86400000+i});`);
writeFileSync('.tmp/fixtures.sql',sql.join('\n'));writeFileSync('.tmp/identities.json',JSON.stringify(fixtures));
cli(['d1','execute','DB','--local','--persist-to','.tmp/test-runtime','--file','.tmp/fixtures.sql']);
const server=spawn(process.execPath,[wrangler,'dev','--port','8798','--ip','127.0.0.1','--persist-to','.tmp/test-runtime','--var','APP_URL:http://127.0.0.1:8798','--var','OWNER_GITHUB_ID:1000','--var','BETTER_AUTH_SECRET:'+secret,'--var','GITHUB_CLIENT_ID:local-test-client','--var','GITHUB_CLIENT_SECRET:local-test-client-secret','--log-level','error'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
try{
 let ready=false;
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:8798/');ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}
 if(!ready)throw new Error('Test server did not start: '+log.slice(-5000));
 const files=readdirSync('test').filter(x=>x.endsWith('.test.mjs')).map(x=>'test/'+x);
 const test=spawn(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit'});
 process.exitCode=await new Promise(resolve=>test.on('exit',resolve));
}finally{server.kill('SIGTERM');await new Promise(resolve=>server.on('exit',resolve));}
