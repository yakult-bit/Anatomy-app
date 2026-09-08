import {api,useAccount,accountError,type Profile} from './account-state';
import {useStore,type Stat} from './store';
export type SavedData={profile:Profile|null;bookmarks:string[];stats:Record<string,Stat>;studyDays:string[];reviewDue:string[]};
let generation=0;
export const accountGeneration=()=>generation;
export function clearAccount(){generation++;useAccount.getState().set({profile:null});useStore.setState({bookmarks:[],stats:{},studyDays:[],reviewDue:[],quiz:null,quizBusy:false})}
export function applySaved(data:SavedData){useAccount.getState().set({profile:data.profile});useStore.setState({bookmarks:data.bookmarks,stats:data.stats,studyDays:data.studyDays,reviewDue:data.reviewDue||[]})}
export async function loadAccount(){const g=generation;try{const data=await api<SavedData>('session');if(g===generation)applySaved(data)}catch(e){if(e instanceof Error&&'status' in e&&e.status!==401)accountError(e)}finally{useAccount.getState().set({ready:true})}}
export function initializeAccount(){
 // Earlier versions stored unverified scores. They are never imported as earned
 // progress or assigned to the next person to sign in on this browser.
 try{localStorage.removeItem('forma-anatomy-v1')}catch{/* local preferences only */}
 const signedOut=()=>clearAccount();window.addEventListener('forma-signed-out',signedOut);
 const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('forma-account'):null;
 if(channel)channel.onmessage=()=>{clearAccount();void loadAccount()};
 let lastFocus=0;const focus=()=>{if(Date.now()-lastFocus>60000){lastFocus=Date.now();if(useAccount.getState().profile)void loadAccount()}};
 window.addEventListener('focus',focus);
 void api<{signInAvailable:boolean}>('config').then(c=>{useAccount.getState().set({available:c.signInAvailable});return loadAccount()}).catch(()=>useAccount.getState().set({ready:true,available:false}));
 return ()=>{window.removeEventListener('forma-signed-out',signedOut);window.removeEventListener('focus',focus);channel?.close()};
}
export function notifyAccountChange(){const c=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('forma-account'):null;c?.postMessage('changed');c?.close()}
