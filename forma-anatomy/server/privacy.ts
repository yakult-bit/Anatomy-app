import type {ErrorEvent} from '@sentry/cloudflare';
export function scrubEvent(event:ErrorEvent):ErrorEvent{
 const control=event.tags?.control;
 return {type:undefined,event_id:event.event_id,timestamp:event.timestamp,level:event.level==='fatal'?'fatal':'error',platform:'javascript',message:'Forma server operation failed',tags:{control:typeof control==='string'&&/^[a-z_]{1,64}$/.test(control)?control:'unexpected_failure'}};
}
