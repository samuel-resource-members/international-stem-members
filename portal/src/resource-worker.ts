import inventory from './resource-manifest.json';
type ResourceEnv={RESOURCE_GITHUB_TOKEN:string};
export default {
 async fetch(request:Request,env:ResourceEnv){
  const id=new URL(request.url).pathname.match(/^\/download\/(\d+)$/)?.[1];
  const resource=inventory.find(row=>String(row.id)===id);
  if(!resource||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
  const filename=resource.name.replace('_reusable_handoff','').replace('_20261013','');
  const headers=new Headers({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
  if(request.method==='HEAD'){headers.set('Content-Length',String(resource.size));return new Response(null,{headers});}
  if(!env.RESOURCE_GITHUB_TOKEN)return new Response('Unavailable',{status:503});
  const range=request.headers.get('Range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return new Response('Invalid range',{status:416});
  const upstream:Record<string,string>={Authorization:`Bearer ${env.RESOURCE_GITHUB_TOKEN}`,Accept:'application/octet-stream','User-Agent':'stem-member-library','X-GitHub-Api-Version':'2022-11-28'};
  if(range)upstream.Range=range;
  let response=await fetch(`https://api.github.com/repos/samuel-resource-members/international-stem-members/releases/assets/${resource.id}`,{headers:upstream,redirect:'manual'});
  if(response.status===302){
   const target=new URL(response.headers.get('Location')||'');
   if(target.protocol!=='https:'||!['release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(target.hostname))return new Response('Unavailable',{status:502});
   response=await fetch(target,{headers:range?{Range:range}:{},redirect:'manual'});
  }
  if(!response.ok||!response.body)return new Response('Unavailable',{status:response.status===416?416:502});
  for(const key of ['Content-Length','Content-Range','ETag']){const value=response.headers.get(key);if(value)headers.set(key,value);}
  return new Response(response.body,{status:response.status,headers});
 }
};
