'use strict';
const app=document.getElementById('app');
const messages={INVALID_INPUT:'请检查必填信息。',CODE_UNAVAILABLE:'激活码无效、已使用、已停用或与当前 GitHub 账号不符。',TOO_MANY_ATTEMPTS:'尝试次数较多，请稍后再试。',ACCOUNT_SUSPENDED:'会员访问已停用，请联系管理员。',ACTIVATION_REQUIRED:'请先激活会员。',FILE_SIZE_MISMATCH:'文件大小不符，请重新提交。',SUBMISSION_LIMIT:'今天提交的资料较多，请明天继续。',SIGN_IN_REQUIRED:'请重新登录。',RESOURCE_SERVICE_UNAVAILABLE:'资料暂时无法下载，请稍后重试。',GITHUB_REQUIRED:'请使用自己的 GitHub 账号登录。',GITHUB_UNAVAILABLE:'暂时无法登录，请稍后再试。',GITHUB_USER_NOT_FOUND:'没有找到这个 GitHub 账号，请核对用户名。',OWNER_ALREADY_ENABLED:'你的 GitHub 账号已经拥有管理权限。',MEMBER_ALREADY_ENABLED:'这个 GitHub 账号已经开通，请在会员列表管理。'};
let me=null;
function h(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(v===false||v==null)continue;if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else n.setAttribute(k,v===true?'':String(v));}for(const child of children.flat(Infinity)){if(child==null||child===false)continue;n.append(child instanceof Node?child:document.createTextNode(String(child)));}return n;}
const field=(label,name,type='text',attrs={})=>h('label',{},label,h('input',{name,type,required:true,...attrs}));
const notice=(text,error=false)=>h('div',{class:'message'+(error?' error':''),role:error?'alert':'status'},text);
const formatDate=value=>value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'不限';
const formatSize=value=>value>1024**3?(value/1024**3).toFixed(2)+' GB':(value/1024**2).toFixed(1)+' MB';
async function api(path,body,method='POST'){const r=await fetch(path,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401&&path!=='/api/me'){location.replace('/');}throw new Error(messages[data.error||data.code]||'操作未完成，请检查输入后重试。');}return data;}
function controlled(form,action){form.addEventListener('submit',async e=>{e.preventDefault();form.querySelector('.message')?.remove();const button=form.querySelector('button[type=submit]');button.disabled=true;try{await action(new FormData(form));}catch(error){form.append(notice(error.message,true));}finally{button.disabled=false;}});return form;}
function page(title,description){const body=h('div',{class:'page'}),heading=h('div',{class:'page-heading'},h('div',{},h('span',{class:'eyebrow'},'MEMBER LIBRARY'),h('h1',{},title),h('p',{},description)));body.append(heading);app.replaceChildren(body);return body;}
function configureNavigation(){document.getElementById('navigation').hidden=!me;document.getElementById('owner-link').hidden=me?.role!=='admin';document.querySelectorAll('#navigation a').forEach(a=>{if(new URL(a.href).pathname===location.pathname)a.setAttribute('aria-current','page');});}
document.getElementById('signout').addEventListener('click',async()=>{await api('/api/auth/sign-out',{});location.replace('/');});
function enter(){location.replace(me?.role==='admin'?'/admin':'/library');}

async function authPage(){
 const intro=h('section',{class:'entry-intro'},h('span',{class:'eyebrow'},'INTERNATIONAL COURSES & COMPETITIONS'),h('h1',{},'让每次练习，',h('br'),'都有章可循。'),h('p',{},'从课程到专题，从原题到评分资料。找到适合当前进度的练习，留下自己的选题清单。'),h('div',{class:'numbers'},h('div',{},h('strong',{},'27,284'),h('small',{},'题目记录')),h('div',{},h('strong',{},'68'),h('small',{},'课程与考试分类'))),h('div',{class:'subjects'},['数学','物理','化学','生物'].map(x=>h('span',{},x))));
 const button=h('button',{class:'full',type:'button'},'使用 GitHub 登录'),card=h('section',{class:'panel auth-panel'},h('span',{class:'eyebrow'},'MEMBER LIBRARY'),h('h2',{},'登录会员题库'),h('p',{},'使用自己的 GitHub 账号登录。首次进入时，输入为你开通的专属激活码。'),button,h('small',{},'会员资格与开通时指定的 GitHub 账号关联。'),h('p',{},h('a',{href:'/guide'},'首次使用？查看使用指南')));
 if(new URLSearchParams(location.search).has('error'))card.append(notice('GitHub 登录未完成，请重试。',true));
 app.replaceChildren(h('div',{class:'entry'},intro,card));
 button.disabled=true;const options=await api('/api/login-options');
 if(!options.github){card.append(notice('会员登录暂不可用，请稍后再试。'));return;}
 button.disabled=false;button.addEventListener('click',async()=>{button.disabled=true;try{const result=await api('/api/auth/sign-in/social',{provider:'github'});location.assign(result.url);}catch(error){card.append(notice(error.message,true));button.disabled=false;}});
}
function activationPage(){const body=page('激活会员','输入为当前 GitHub 账号开通的专属激活码。'),form=h('form',{class:'panel narrow'},h('p',{},'GitHub · @'+me.github.login),field('专属激活码','code','text',{autocomplete:'off',autocapitalize:'characters',maxlength:128}),h('button',{type:'submit',class:'full'},'激活会员'));controlled(form,async values=>{await api('/api/activate',{code:values.get('code')});location.replace('/account?activated=1');});body.append(form);}
function friendlyResource(row){let m=row.name.match(/question-bank-(math|physics|chemistry|biology)-part-(\d+)/);if(m)return({math:'数学',physics:'物理',chemistry:'化学',biology:'生物'}[m[1]])+'题目包 · '+Number(m[2]);m=row.name.match(/^(AMC\d+)_/);if(m)return m[1]+' 题库';return row.group;}
async function resourcePage(){
 const body=page('整套资料','按课程取得题库或试卷资料包。'),{resources}=await api('/api/resources');
 body.append(h('p',{},'本页下载整套资料。单题与原卷请从',h('a',{href:'/library'},'题目检索'),'中选择。'),h('p',{},h('a',{href:'/account#github-access'},'在电脑上按需取用')));
 const packages=resources.filter(row=>row.group!=='题目与评分资料');
 const order=['AMC','IGCSE Physics 0625','IGCSE Co-ordinated Sciences 0654','BBO 2026 试卷','学科题目包'];
 const rank=row=>{const n=order.indexOf(row.group);return n<0?order.length:n;};
 packages.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
 const types=[...new Set(packages.map(row=>row.group))],courses=[...new Set(packages.flatMap(row=>row.courses||[]))].sort();
 const search=h('input',{type:'search',placeholder:'搜索课程或资料名称','aria-label':'搜索资源'}),course=h('select',{'aria-label':'课程'},h('option',{value:''},'全部课程'),courses.map(x=>h('option',{value:x},x))),select=h('select',{'aria-label':'资料分类'},h('option',{value:''},'全部资料类型'),types.map(x=>h('option',{value:x},x))),grid=h('div',{class:'resource-grid'}),pager=h('div',{class:'pager'});let current=0;
 function render(){const rows=packages.filter(x=>(!course.value||(x.courses||[]).includes(course.value))&&(!select.value||x.group===select.value)&&(!search.value||[x.name,x.group,friendlyResource(x),...(x.courses||[])].join(' ').toLowerCase().includes(search.value.toLowerCase())));const count=Math.max(1,Math.ceil(rows.length/18));current=Math.min(current,count-1);grid.replaceChildren(...rows.slice(current*18,(current+1)*18).map(row=>h('article',{class:'panel resource-card'},h('span',{class:'badge'},row.group),h('h3',{},friendlyResource(row)),h('p',{class:'muted'},(row.courses||[]).join(' · ')||'多课程资料'),h('footer',{},h('span',{class:'muted'},formatSize(row.size)),h('a',{href:'/download/'+row.id},'下载资料包')))));if(!rows.length)grid.append(notice('没有符合条件的资料包，请在题目检索中按课程找题。'));pager.replaceChildren(h('button',{class:'secondary compact',disabled:current===0,onclick:()=>{current--;render();}},'上一页'),h('span',{class:'muted'},`${current+1} / ${count} · ${rows.length} 份资料包`),h('button',{class:'secondary compact',disabled:current>=count-1,onclick:()=>{current++;render();}},'下一页'));}
 search.addEventListener('input',()=>{current=0;render();});course.addEventListener('change',()=>{current=0;render();});select.addEventListener('change',()=>{current=0;render();});body.append(h('div',{class:'filters'},search,course,select),grid,pager);render();
 const accepted=await api('/api/contributions');if(accepted.submissions.length)body.append(h('h2',{style:'margin-top:3rem'},'会员共享资料'),...accepted.submissions.map(row=>submissionCard(row)));
}
const statusLabels={draft:'待完成',pending:'待审核',approved:'已收入题库',rejected:'未通过',active:'使用中',suspended:'已停用'};
function submissionCard(row,review=false,onReview=()=>adminPage('review')){const card=h('article',{class:'panel sub-item'},h('span',{class:'badge'},row.course),h('h3',{},row.title),h('p',{},row.details));if(row.url)card.append(h('a',{href:row.url,target:'_blank',rel:'noopener noreferrer'},'打开资料链接'));if(row.file_name)card.append(h('p',{},h('a',{href:'/api/submissions/'+row.id+'/file'},'下载 '+row.file_name)));const actions=h('div',{class:'actions'});if(review)for(const [status,label]of[['approved','收入题库'],['rejected','不予收录']])actions.append(h('button',{class:'secondary compact',onclick:async()=>{try{await api('/api/admin/submissions/'+row.id+'/review',{status});await onReview();}catch(error){card.append(notice(error.message,true));}}},label));card.append(h('footer',{},h('small',{},review?'@'+row.github_login:statusLabels[row.status]||'共享资料'),actions,h('small',{},formatDate(row.created_at))));return card;}
async function submissionPage(){const body=page('提交资料','分享试卷、评分资料或教学练习，经审核后收入题库。'),columns=h('div',{class:'two-column'}),form=h('form',{class:'panel'},field('资料标题','title','text',{maxlength:200}),field('课程与考试','course','text',{placeholder:'例如 IGCSE Physics 0625',maxlength:100}),h('label',{},'资料说明',h('textarea',{name:'details',maxlength:5000})),field('资料链接（可选）','url','url',{required:false,placeholder:'https://'}),field('或上传文件','file','file',{required:false,accept:'.pdf,.zip,.docx,.png,.jpg,.jpeg,.webp'}),h('small',{},'支持 PDF、ZIP、Word 和图片，单份文件不超过 20 MB。'),h('button',{type:'submit',class:'full',style:'margin-top:1rem'},'提交审核')),history=h('section',{},h('h2',{},'我的提交'));columns.append(form,history);body.append(columns);
 controlled(form,async values=>{const file=values.get('file'),url=values.get('url').trim();if(!url&&!file?.size)throw new Error('请提供资料链接或上传文件。');if(file?.size>20*1024*1024)throw new Error('文件不能超过 20 MB。');const created=await api('/api/submissions',{title:values.get('title'),course:values.get('course'),details:values.get('details'),...(url?{url}:{}),...(file?.size?{fileName:file.name,fileSize:file.size}:{})});if(created.uploadRequired){const response=await fetch('/api/submissions/'+created.id+'/file',{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file});if(!response.ok)throw new Error('文件上传未完成，请重新提交。');}form.reset();form.append(notice('资料已提交，等待审核。'));await load();});
 async function load(){const rows=await api('/api/submissions');history.replaceChildren(h('h2',{},'我的提交'),...rows.submissions.map(x=>submissionCard(x)));if(!rows.submissions.length)history.append(h('p',{class:'muted'},'你还没有提交资料。'));}await load();
}
const repositoryLabels={pending:'等待开通',invited:'等待接受邀请',ready:'已开通',revoked:'已撤销',blocked:'需要管理员处理',retry:'等待重新同步'};
async function accountPage(){
 const body=page('账户','查看你的会员账户与 GitHub 访问。');
 if(new URLSearchParams(location.search).has('activated'))body.append(notice('会员已激活，可以开始使用题库。接受下方邀请后，还可通过 GitHub 获取资料。'));
 body.append(h('section',{class:'panel narrow'},h('h2',{},'GitHub · @'+me.github.login),h('p',{},'会员状态：使用中'),h('a',{href:'https://github.com/settings/security',target:'_blank',rel:'noopener noreferrer'},'管理 GitHub 登录安全')));
 const section=h('section',{id:'github-access',class:'panel narrow',style:'margin-top:1.5rem'});body.append(section);
 async function render(){
  const {repository}=await api('/api/repository'),state=repository?.state||'pending';
  section.replaceChildren(h('h2',{},'GitHub 访问'),h('p',{},'仓库访问：'+repositoryLabels[state]));
  if(state==='invited')section.append(h('p',{},'请使用 @'+me.github.login+' 接受一次只读邀请。'),h('a',{href:repository.invitationUrl,target:'_blank',rel:'noopener noreferrer',role:'button'},'接受只读邀请'));
  if(['pending','retry'].includes(state))section.append(notice('GitHub 访问正在开通，稍后会自动重试。网页题库可以正常使用。'));
  if(state==='blocked')section.append(notice('请联系管理员检查仓库访问权限。',true));
  const actions=h('div',{class:'actions',style:'margin-top:1rem'});
  if(me.role==='member'){
   const refresh=h('button',{type:'button',class:'secondary compact',onclick:async()=>{refresh.disabled=true;try{await api('/api/repository/sync',{});await render();}catch(error){section.append(notice(error.message,true));refresh.disabled=false;}}},'检查访问状态');actions.append(refresh);
  }
  if(state==='ready')actions.append(h('a',{href:repository.repositoryUrl,target:'_blank',rel:'noopener noreferrer',role:'button',class:'secondary compact'},'打开会员仓库'));
  section.append(actions);
  if(!['ready','invited'].includes(state))return;
  const instructions='请阅读公开使用指南，按其中步骤使用我的 GitHub 账号获取我指定的课程或题目。需要登录、验证或接受邀请时，请提示我完成：\n'+location.origin+'/guide.md';
  const copy=h('button',{type:'button',class:'secondary compact',onclick:async()=>{try{await navigator.clipboard.writeText(instructions);copy.textContent='已复制';}catch{section.append(notice('请直接复制下方获取说明。'));}}},'复制获取说明');
  section.append(h('h3',{style:'margin-top:2rem'},'批量获取资料'),h('p',{},'接受邀请后，在自己的终端中完成 GitHub 授权，即可按课程或题号获取资料。'),h('p',{},h('a',{href:'/guide',target:'_blank',rel:'noopener noreferrer'},'查看获取方法')),copy,h('pre',{class:'code-box'},instructions));
 }
 await render();
}
function downloadCodes(rows){const csv='\ufeffGitHub账号,专属激活码\r\n'+rows.map(x=>x.githubLogin+','+x.code).join('\r\n')+'\r\n',url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=h('a',{href:url,download:'会员激活码.csv'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function table(headings,rows){return h('div',{class:'table-wrap'},h('table',{},h('thead',{},h('tr',{},headings.map(x=>h('th',{},x)))),h('tbody',{},rows)));}
async function adminPage(tab='codes',flash=''){
 const body=page('会员管理','开通会员、管理访问权限与审核共享资料。');
 if(flash)body.append(notice(flash));
 body.append(h('div',{class:'tabs',role:'tablist'},[['codes','激活码'],['members','会员'],['review','资料审核']].map(([value,label])=>h('button',{type:'button',role:'tab','aria-selected':value===tab,onclick:()=>adminPage(value).catch(e=>body.append(notice(e.message,true)))},label))));
 if(tab==='codes'){
  const form=h('form',{class:'code-form'},field('会员 GitHub 用户名','githubUsername','text',{autocomplete:'off',maxlength:39,placeholder:'例如 octocat'}),field('备注（可选）','label','text',{required:false,maxlength:100}),field('激活期限（可选）','expiresAt','datetime-local',{required:false}),h('button',{type:'submit'},'生成专属激活码')),issued=h('div');body.append(form,issued);
  controlled(form,async values=>{const {codes}=await api('/api/admin/codes',{githubUsername:values.get('githubUsername').trim(),label:values.get('label'),expiresAt:values.get('expiresAt')?new Date(values.get('expiresAt')).getTime():null});issued.replaceChildren(notice('请将此专属激活码发给 @'+codes[0].githubLogin+'。完整激活码仅在生成时显示，请及时保存。'),h('pre',{class:'code-box'},codes.map(x=>'@'+x.githubLogin+' · '+x.code).join('\n')),h('div',{class:'actions'},h('button',{class:'secondary compact',type:'button',onclick:()=>navigator.clipboard.writeText(codes.map(x=>x.code).join('\n'))},'复制激活码'),h('button',{class:'secondary compact',type:'button',onclick:()=>downloadCodes(codes)},'保存激活码')));await list();});
  const listing=h('div',{style:'margin-top:2rem'});body.append(listing);
  async function list(){const {codes}=await api('/api/admin/codes');listing.replaceChildren(table(['激活码','备注','GitHub 账号','状态','激活期限','操作'],codes.map(row=>h('tr',{},h('td',{},'•••• '+row.suffix),h('td',{},row.label||'—'),h('td',{},row.bound_github_login?'@'+row.bound_github_login:'已停用'),h('td',{},row.used_by?'已使用':row.revoked?'已停用':row.expires_at&&row.expires_at<Date.now()?'已过期':'待使用'),h('td',{},formatDate(row.expires_at)),h('td',{},!row.used_by&&!row.revoked?h('button',{class:'secondary compact',onclick:async()=>{try{await api('/api/admin/codes/'+row.id+'/revoke',{});await list();}catch(e){issued.replaceChildren(notice(e.message,true));}}},'停用'):'—')))));}await list();
 }else if(tab==='members'){
  const {members}=await api('/api/admin/members'),message=h('div');
  const rows=members.map(row=>{
   const actions=h('div',{class:'actions'});
   if(row.role!=='admin'){
    const change=h('button',{class:'secondary compact',onclick:async()=>{change.disabled=true;try{const suspended=row.status==='active',result=await api('/api/admin/members/'+row.id+'/status',{status:suspended?'suspended':'active'});await adminPage('members',suspended&&result.repository?.state!=='revoked'?'网站访问已停用；GitHub 撤权尚未完成，将自动重试。':suspended?'网站与 GitHub 访问均已停用。':'会员访问已恢复。');}catch(e){message.replaceChildren(notice(e.message,true));change.disabled=false;}}},row.status==='active'?'停用访问':'恢复访问');actions.append(change);
    if(row.repository_state!==(row.status==='active'?'ready':'revoked')){
     const sync=h('button',{class:'secondary compact',onclick:async()=>{sync.disabled=true;try{await api('/api/admin/members/'+row.id+'/repository/sync',{});await adminPage('members');}catch(e){message.replaceChildren(notice(e.message,true));sync.disabled=false;}}},'同步 GitHub');actions.append(sync);
    }
   }
   return h('tr',{},h('td',{},'@'+row.github_login),h('td',{},row.role==='admin'?'管理员':'会员'),h('td',{},statusLabels[row.status]),h('td',{title:row.repository_error==='inherited_access'?'仍有组织或团队权限，请检查仓库授权。':null},row.role==='admin'?'所有者':repositoryLabels[row.repository_state||'pending']),h('td',{},formatDate(row.activated_at)),h('td',{},row.role==='admin'?'—':actions));
  });
  body.append(message,table(['GitHub 账号','权限','会员状态','仓库访问','开通时间','操作'],rows));

 }else{
  let current=1;const status=h('select',{'aria-label':'审核状态'},[['pending','待审核'],['approved','已收入题库'],['rejected','未通过']].map(([value,label])=>h('option',{value},label))),listing=h('div',{class:'stack'}),pager=h('div',{class:'pager'});body.append(status,listing,pager);
  async function load(){const data=await api('/api/admin/submissions?status='+status.value+'&page='+current);if(current>data.pages){current=data.pages;return load();}listing.replaceChildren(...data.submissions.map(row=>submissionCard(row,true,load)));if(!data.submissions.length)listing.append(notice('暂时没有这一状态的资料。'));pager.replaceChildren(h('button',{class:'secondary compact',disabled:current<=1,onclick:()=>{current--;load();}},'上一页'),h('span',{class:'muted'},`${current} / ${data.pages} · ${data.total} 份资料`),h('button',{class:'secondary compact',disabled:current>=data.pages,onclick:()=>{current++;load();}},'下一页'));}
  status.addEventListener('change',()=>{current=1;load();});await load();
 }
}
async function start(){if(location.pathname==='/reset-password'){location.replace('/');return;}try{me=await api('/api/me');}catch{me=null;}configureNavigation();if(!me){await authPage();return;}if(me.status==='suspended'){page('访问已停用','请联系管理员了解会员状态。');return;}if(me.status!=='active'){activationPage();return;}if(location.pathname==='/'||location.pathname==='/activate'){enter();return;}if(location.pathname==='/admin'){if(me.role!=='admin'){page('无权访问','请从题目检索开始使用会员题库。');return;}await adminPage();}else if(location.pathname==='/resources')await resourcePage();else if(location.pathname==='/submit')await submissionPage();else if(location.pathname==='/account')await accountPage();else location.replace('/library');}
start().catch(error=>{app.replaceChildren(notice(error.message,true));});
