import {useEffect,useMemo,useState} from 'react';
import {CheckCircle2,XCircle,Bookmark,ArrowRight} from 'lucide-react';
import {anatomy,parts,useUiStore,type Part} from './store';
import {teaching,distinction,logClickGap} from '../shared/click-quiz';
const logged=new Set<string>();
export default function ClickFeedback(){
 const s=useUiStore(),q=s.quiz!,a=q.feedback!,p=anatomy[a.id],picked=anatomy[a.chosen];const note=teaching(p),contrast=!a.correct?distinction(p,picked):'';
 const [gapsOpen,setGapsOpen]=useState(false),[page,setPage]=useState(0),[query,setQuery]=useState('');
 const gaps=useMemo(()=>parts.map(p=>({id:p.id,name:p.displayName,missing:teaching(p).missing})).filter(x=>x.missing.length),[]);
 useEffect(()=>{for(const part of [p,picked]){if(!part||logged.has(part.id))continue;const missing=teaching(part).missing;if(missing.length){logged.add(part.id);logClickGap(part.id,missing)}}},[p.id,picked?.id]);
 function learn(id:string){s.set({mode:'learn'});s.select(id,true)}
 const related=(p.related_ids||[]).filter(id=>!!anatomy[id]).slice(0,5),matches=gaps.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
 return <div className={`feedback click-teaching ${a.correct?'correct':'incorrect'}`} role="status"><h3>{a.correct?<CheckCircle2 size={19}/>:<XCircle size={19}/>} {a.correct?'Correct.':a.revealed?'Answer revealed.':'Incorrect. The correct answer is:'}</h3><h4>{p.displayName}</h4>{note.data.latin&&<p className="latin-name">{note.data.latin}</p>}
 {picked&&<p className="picked-answer">You selected {picked.displayName}.</p>}
 {contrast&&<section><h5>How to tell them apart</h5><p>{contrast}</p></section>}
 {!note.data.location&&!note.data.function&&!note.data.clinical?<p>{p.system} · {p.region.replaceAll('-',' / ')}</p>:<>{note.data.location&&<section><h5>Location & landmarks</h5><p>{note.data.location}</p></section>}{note.data.function&&<section><h5>Function</h5><p>{note.data.function}</p></section>}{note.data.clinical&&<section><h5>Why it matters in nursing</h5><p>{note.data.clinical}</p></section>}</>}
 {related.length>0&&<section><h5>Related structures</h5><div className="click-related">{related.map(id=><button key={id} className="text-link" onClick={()=>learn(id)}>{anatomy[id].displayName}<ArrowRight size={13}/></button>)}</div></section>}
 <button className="secondary-button" onClick={()=>learn(p.id)}>Learn more about this structure</button><button className="secondary-button" disabled={s.reviewDue.includes(p.id)} onClick={()=>s.review(p.id)}><Bookmark size={15}/> {s.reviewDue.includes(p.id)?'Bookmarked for review':'Bookmark for review'}</button><button className="text-link" onClick={()=>setGapsOpen(!gapsOpen)}>Teaching content gaps ({gaps.length})</button>
 {gapsOpen&&<div className="content-gaps"><label>Find missing notes<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label><ul>{matches.slice(page*10,page*10+10).map(x=><li key={x.id}><strong>{x.name}</strong><small>{x.missing.join(', ')}</small></li>)}</ul><div><button disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><span>{page+1} / {Math.max(1,Math.ceil(matches.length/10))}</span><button disabled={(page+1)*10>=matches.length} onClick={()=>setPage(page+1)}>Next</button></div></div>}
 </div>;
}
