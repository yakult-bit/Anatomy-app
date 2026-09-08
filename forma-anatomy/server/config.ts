import {z} from 'zod';
const https=z.string().url().refine(s=>new URL(s).protocol==='https:','HTTPS required');
const schema=z.object({
 APP_ORIGIN:z.string().url(),APP_ENV:z.enum(['development','production']),
 SUPABASE_URL:https,SUPABASE_PUBLISHABLE_KEY:z.string().min(20),SUPABASE_SERVICE_ROLE_KEY:z.string().min(20),
 TURNSTILE_SITE_KEY:z.string().min(10),TURNSTILE_SECRET_KEY:z.string().min(10),
 UPSTASH_REDIS_REST_URL:https,UPSTASH_REDIS_REST_TOKEN:z.string().min(20),RATE_LIMIT_HMAC_KEY:z.string().min(32),
 SENTRY_DSN:https.optional().or(z.literal('')),SENTRY_ENVIRONMENT:z.string().max(32).optional()
}).superRefine((e,c)=>{
 let u:URL;try{u=new URL(e.APP_ORIGIN)}catch{c.addIssue({code:'custom',path:['APP_ORIGIN'],message:'Valid origin required'});return}
 if(u.origin!==e.APP_ORIGIN||u.username||u.password||u.search||u.hash)c.addIssue({code:'custom',path:['APP_ORIGIN'],message:'APP_ORIGIN must be an exact origin'});
 if(e.APP_ENV==='production'&&(u.protocol!=='https:'||u.hostname.endsWith('.pages.dev')||u.hostname.endsWith('.chatgpt.site')||u.hostname==='localhost'))c.addIssue({code:'custom',path:['APP_ORIGIN'],message:'Production requires a custom HTTPS domain'});
 if(e.APP_ENV==='development'&&!['localhost','127.0.0.1'].includes(u.hostname))c.addIssue({code:'custom',path:['APP_ORIGIN'],message:'Development must use loopback'});
 if(e.APP_ENV==='production'&&!e.SENTRY_DSN)c.addIssue({code:'custom',path:['SENTRY_DSN'],message:'Production monitoring is required'});
 if(e.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')||e.SUPABASE_PUBLISHABLE_KEY===e.SUPABASE_SERVICE_ROLE_KEY)c.addIssue({code:'custom',path:['SUPABASE_PUBLISHABLE_KEY'],message:'Privileged key in public key slot'});
 if(e.SUPABASE_PUBLISHABLE_KEY.startsWith('eyJ')){try{if(JSON.parse(atob(e.SUPABASE_PUBLISHABLE_KEY.split('.')[1])).role!=='anon')throw Error();}catch{c.addIssue({code:'custom',path:['SUPABASE_PUBLISHABLE_KEY'],message:'Expected anon key'});}}
});
export type Env=z.infer<typeof schema>;
export function config(raw:unknown):Env{return schema.parse(raw)}
export function originConfig(raw:Record<string,unknown>){
 const origin=z.string().url().parse(raw.APP_ORIGIN);const u=new URL(origin);
 if(origin!==u.origin||u.username||u.password||u.search||u.hash)throw Error('Invalid origin');
 if(raw.APP_ENV==='production'&&(u.protocol!=='https:'||/\.(pages\.dev|chatgpt\.site)$/.test(u.hostname)))throw Error('Custom HTTPS domain required');
 if(raw.APP_ENV!=='production'&&!(raw.APP_ENV==='development'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('Invalid environment');
 return origin;
}

// Report only schema-owned variable NAMES. Never stringify Zod errors or input
// values: provider credentials can otherwise appear in diagnostics.
export function configurationIssues(raw:unknown,scope:'origin'|'full'='full'){
 const values=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const parsed=schema.safeParse(values);
 const names=new Set(parsed.success?[]:parsed.error.issues.map(i=>String(i.path[0])).filter(n=>/^[A-Z][A-Z_]+$/.test(n)));
 if(scope==='origin'){
  names.clear();
  if(!['development','production'].includes(String(values.APP_ENV)))names.add('APP_ENV');
  try{originConfig(values)}catch{if(!names.size||!values.APP_ORIGIN)names.add('APP_ORIGIN')}
 }
 return {missing:[...names].filter(n=>values[n]===undefined||values[n]===''),invalid:[...names].filter(n=>values[n]!==undefined&&values[n]!=='')};
}
export function configurationFailure(request:Request,raw:unknown,scope:'origin'|'full'='full'){
 const issues=configurationIssues(raw,scope),values=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 console.error(JSON.stringify({event:'service_configuration_invalid',...issues}));
 const local=values.APP_ENV!=='production'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
 const details=[issues.missing.length?`Missing: ${issues.missing.join(', ')}.`:'',issues.invalid.length?`Invalid: ${issues.invalid.join(', ')}.`:''].filter(Boolean).join(' ');
 const error=local?`Local configuration is incomplete. ${details} Set these in .dev.vars beside wrangler.jsonc, then restart npm run dev:full. See LOCAL_DEVELOPMENT.md.`:'Service configuration is incomplete.';
 return Response.json({error,...(local?issues:{})},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
