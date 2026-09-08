import RouteSync from './RouteSync';
import {useDialogFocus} from './dialog-focus';
import SiteLinks from './SiteLinks';
import {useAccount} from './account-state';
import AccountPanel,{AccountButton} from './AccountPanel';
import {initializeAccount} from './account-sync';
import {useEffect,useState} from 'react';
import {BookOpen,Brain,ChartNoAxesCombined,Bookmark,HelpCircle,PanelLeftOpen,SlidersHorizontal,ScanHeart,ChevronRight,Flame} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {useStore,useUiStore,studyStreak,hasStorageError} from './store';
import Viewport from './Viewport';
import Sidebar from './Sidebar';
import LearnPanel from './LearnPanel';
import QuizPanel from './QuizPanel';
import Dialogs from './Dialogs';
import type {Modal} from './Dialogs';
export default function App(){
 const sheetFocus=useDialogFocus();
 useEffect(initializeAccount,[]);
 const account=useAccount();const s=useUiStore();const [collapsed,setCollapsed]=useState(false);const [mobileControls,setMobileControls]=useState(false);const [infoOpen,setInfoOpen]=useState(true);const [modal,setModal]=useState<Modal>(null);
 useEffect(()=>{if(s.selected)setInfoOpen(!(s.view==='inspect'&&window.matchMedia('(max-width:570px)').matches))},[s.selected,s.view]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;if(account.open||modal||mobileControls||target.closest('input,textarea,select,[contenteditable="true"],[role="combobox"],[role="slider"]')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;const state=useStore.getState();if(e.key==='Escape'&&state.view==='inspect'){state.returnToAtlas();return}if(e.key.toLowerCase()==='r')state.reset();if(e.key.toLowerCase()==='l'&&!(state.mode==='quiz'&&state.quiz&&!state.quiz.finished))state.set({labels:!state.labels});if(state.mode==='quiz'&&state.quiz&&!state.quiz.finished){const q=state.quiz;if(e.code==='Space'&&q.feedback){e.preventDefault();state.next()}if(/^[1-4]$/.test(e.key)&&['identify','function'].includes(q.format)&&!q.feedback){e.preventDefault();state.answer(q.questions[q.index].options[Number(e.key)-1])}}};window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey)},[modal,mobileControls,account.open]);
 const sidebar=<Sidebar onCollapse={()=>{setCollapsed(true);setMobileControls(false)}} onList={()=>{setMobileControls(false);setModal('structures')}} onBookmarks={()=>{setMobileControls(false);setModal('bookmarks')}}/>;
 const hasPanel=s.mode==='quiz'||s.view!=='board'&&infoOpen&&!!s.selected;
 return <div className={`app-shell ${collapsed?'sidebar-collapsed':''} ${hasPanel?'detail-open':''} ${s.mode==='quiz'?'quiz-mode':''}`}>
 <RouteSync/><a className="skip-link" href="#main-content">Skip to anatomy explorer</a>
 <header className="app-header"><a className="brand" href="/" aria-label="Forma anatomy lab home"><span className="brand-mark"><ScanHeart size={24} strokeWidth={1.6}/></span><span className="brand-name">forma<span>.</span></span><span className="brand-caption">ANATOMY<br/>FOR NURSING</span></a><div className="workspace-breadcrumb">Your workspace <ChevronRight size={13}/><strong>Anatomy lab</strong></div>
 <Tabs value={s.mode} onValueChange={mode=>s.set({mode:mode as 'learn'|'quiz',labels:mode==='learn'})} className="mode-tabs"><TabsList><TabsTrigger value="learn"><BookOpen size={16}/>Learn</TabsTrigger><TabsTrigger value="quiz"><Brain size={16}/>Quiz</TabsTrigger></TabsList></Tabs>
 <div className="header-actions"><button className="progress-button" onClick={()=>setModal('progress')}><ChartNoAxesCombined size={17}/><span>My progress</span></button><span className="header-divider"/><button className="icon-button" onClick={()=>setModal('bookmarks')} aria-label="Saved structures"><Bookmark size={18}/>{s.bookmarks.length>0&&<span className="bookmark-count">{s.bookmarks.length}</span>}</button><button className="icon-button help-button" onClick={()=>setModal('help')} aria-label="Help, shortcuts, and references"><HelpCircle size={18}/></button><AccountButton/></div></header>
 <div className="app-body"><aside className="desktop-sidebar" aria-label="Anatomy exploration controls">{sidebar}</aside><main className="main-content" id="main-content" tabIndex={-1}><Viewport panelOpen={hasPanel} onOpenInfo={()=>setInfoOpen(true)}/>{collapsed&&<button className="expand-sidebar" aria-label="Expand controls" onClick={()=>window.matchMedia('(max-width:800px)').matches?setMobileControls(true):setCollapsed(false)}><PanelLeftOpen size={19}/><span>All controls</span></button>}{s.mode==='quiz'&&<QuizPanel/>}</main></div>
 <LearnPanel open={s.mode==='learn'&&s.view!=='board'&&infoOpen&&!!s.selected&&!modal} onOpenChange={setInfoOpen}/>
 <div className="mobile-bottom-nav"><button onClick={()=>setMobileControls(true)}><SlidersHorizontal size={17}/>Explore controls</button><button onClick={()=>setModal('structures')}><BookOpen size={17}/>Structures</button>{s.selected&&s.mode==='learn'&&s.view!=='board'&&<button onClick={()=>setInfoOpen(!infoOpen)}>Details <ChevronRight size={15}/></button>}</div>
 <Sheet open={mobileControls} onOpenChange={setMobileControls}><SheetContent {...sheetFocus} side="bottom" className="mobile-controls"><SheetTitle className="sr-only">Anatomy explorer controls</SheetTitle><SheetDescription className="sr-only">Choose systems, adjust layers, and search structures.</SheetDescription>{sidebar}</SheetContent></Sheet>
 <SiteLinks/><AccountPanel/>
 <Dialogs modal={modal} onClose={()=>setModal(null)}/>
 {hasStorageError()&&<div className="storage-warning" role="alert">Device preferences cannot be saved in this browser.</div>}
 </div>
}
