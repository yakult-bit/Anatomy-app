import {create} from 'zustand';
export type Profile={email:string|null;display_name:string;avatar_url:string|null};
export const useAccount=create<{profile:Profile|null;ready:boolean;available:boolean;open:boolean;error:string|null;set:(v:Partial<{profile:Profile|null;ready:boolean;available:boolean;open:boolean;error:string|null}>)=>void}>(set=>({profile:null,ready:false,available:false,open:false,error:null,set}));
export class ApiError extends Error{constructor(message:string,public status:number){super(message)}}
export async function api<T>(path:string,data?:unknown,retry=true,signal?:AbortSignal):Promise<T>{
 const response=await fetch('/api/'+path,{signal,method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json','X-Forma-Request':'1'},body:data===undefined?undefined:JSON.stringify(data)});
 const value=response.headers.get('Content-Type')?.includes('application/json')?await response.json():null;
 if(response.status===409&&value?.code==='retry'&&retry){await new Promise(r=>setTimeout(r,1000));return api<T>(path,data,false,signal)}
 if(!response.ok||value===null){if(response.status===401){useAccount.getState().set({profile:null});window.dispatchEvent(new Event('forma-signed-out'))}throw new ApiError(value?.error||'This request could not be completed. Please try again.',response.status)}
 return value;
}
export function accountError(error:unknown){useAccount.getState().set({error:error instanceof Error?error.message:'This request could not be completed. Please try again.'})}
