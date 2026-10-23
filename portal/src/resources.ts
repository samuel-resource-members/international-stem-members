import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './auth';
import inventory from './resource-manifest.json';
export const resources=inventory;
export async function downloadResource(request:Request,id:string,env:AppEnv) {
  const resource=resources.find(row=>String(row.id)===id);
  if(!resource)throw new HTTPException(404,{message:'RESOURCE_UNAVAILABLE'});
  const headers=new Headers();const range=request.headers.get('Range');if(range)headers.set('Range',range);
  return env.RESOURCES.fetch(new Request('https://resource.internal/download/'+resource.id,{method:request.method,headers}));
}
