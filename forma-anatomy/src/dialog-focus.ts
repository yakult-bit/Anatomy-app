import {useRef} from 'react';

// These controlled dialogs open from ordinary buttons, without a Radix Trigger.
// Remember that button before Radix moves focus into the portal.
export function useDialogFocus(){
 const opener=useRef<HTMLElement|null>(null);
 return {
  onOpenAutoFocus(){opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null},
  onCloseAutoFocus(event:Event){
   event.preventDefault();
   if(document.querySelector('[role="dialog"][data-state="open"]'))return;
   const previous=opener.current;
   const target=previous?.isConnected&&previous.getClientRects().length?previous:document.getElementById('main-content');
   target?.focus({preventScroll:true});
  }
 };
}
