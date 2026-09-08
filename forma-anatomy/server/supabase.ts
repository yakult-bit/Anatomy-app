import {createClient} from '@supabase/supabase-js';
import type {Env} from './config';
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
export const admin=(e:Env)=>createClient(e.SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth});
export const userDb=(e:Env,token:string)=>createClient(e.SUPABASE_URL,e.SUPABASE_PUBLISHABLE_KEY,{auth,global:{headers:{Authorization:`Bearer ${token}`}}});
export function oauthClient(e:Env,values:Record<string,string>){return createClient(e.SUPABASE_URL,e.SUPABASE_PUBLISHABLE_KEY,{auth:{...auth,persistSession:true,flowType:'pkce',storageKey:'forma-auth',storage:{getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v},removeItem:k=>{delete values[k]}}}})}
