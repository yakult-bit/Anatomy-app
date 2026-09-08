import * as Sentry from '@sentry/cloudflare';
// Allowlist-only monitoring. Do not forward Request, Error.message, breadcrumb,
// arbitrary tags, user objects, URLs, exception values, or stack local variables.
export {scrubEvent} from './privacy';
export function audit(event:string,requestId:string,status:number,stage:string,code?:unknown){
 const safeCode=typeof code==='string'&&/^[A-Z0-9_]{2,32}$/i.test(code)?code:undefined;
 console.info(JSON.stringify({event,requestId,status,stage,code:safeCode}));
}
export function report(code:string){Sentry.withScope(scope=>{scope.setTag('control',code);Sentry.captureMessage('Forma server operation failed','error')})}
