import {z} from 'zod';
export class HttpError extends Error{constructor(public status:number,public code:string,public retryAfter?:number){super(code)}}
export const fail=(status:number,code:string,retry?:number):never=>{throw new HttpError(status,code,retry)};
export function json(data:unknown,status=200,headers?:HeadersInit){const h=new Headers(headers);h.set('Content-Type','application/json; charset=utf-8');h.set('Cache-Control','no-store');return new Response(JSON.stringify(data),{status,headers:h})}
export function sameOrigin(req:Request,origin:string){
 if(req.headers.get('Origin')!==origin||!['same-origin',null].includes(req.headers.get('Sec-Fetch-Site')))fail(403,'origin_rejected');
 if(req.headers.get('X-Forma-Request')!=='1')fail(403,'csrf_rejected');
}
export async function body<T>(req:Request,schema:z.ZodType<T>):Promise<T>{
 if(req.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')fail(415,'json_required');
 if(req.headers.has('Content-Encoding'))fail(415,'encoding_rejected');
 const limit=8192;
 if(Number(req.headers.get('Content-Length'))>limit)fail(413,'body_too_large');
 if(!req.body)fail(400,'body_required');
 const reader=req.body!.getReader();const chunks:Uint8Array[]=[];let size=0;
 for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>limit){await reader.cancel();fail(413,'body_too_large')}chunks.push(r.value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 let input:unknown;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{fail(400,'invalid_json')}
 const parsed=schema.safeParse(input);if(!parsed.success)fail(400,'invalid_input');return parsed.data!;
}
export function cookie(req:Request,name:string){const values=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));if(values.length!==1)return null;const v=values[0].slice(name.length+1);return /^[A-Za-z0-9_-]{43}$/.test(v)?v:null}
export function cookieName(production:boolean,kind:'session'|'oauth'){return `${production?'__Host-':''}forma_${kind}`}
export function setCookie(h:Headers,name:string,value:string,maxAge:number,secure:boolean){h.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`)}
export function randomToken(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
export const empty=z.object({}).strict();
