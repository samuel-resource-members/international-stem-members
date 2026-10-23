import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
export async function readJson<T>(request: Request,schema: z.ZodType<T>): Promise<T> {
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json')) throw new HTTPException(415,{message:'JSON_REQUIRED'});
  let value;try{value=await request.json();}catch{throw new HTTPException(400,{message:'INVALID_INPUT'});}
  const result=schema.safeParse(value);if(!result.success) throw new HTTPException(400,{message:'INVALID_INPUT'});return result.data;
}
