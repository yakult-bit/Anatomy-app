import {CheckCircle2,XCircle} from 'lucide-react';
import {teaching} from '../shared/click-quiz';
import {SYSTEMS,REGIONS,type Part,type Answer} from './store';

export default function RecognitionFeedback({part,answer}:{part:Part;answer:Answer}){
 const {data}=teaching(part);
 return <div className={`feedback ${answer.correct?'correct':'incorrect'}`} role="status">
  <h3>{answer.correct?<CheckCircle2 size={19}/>:<XCircle size={19}/>} {answer.correct?'That’s right.':'Here is the structure to review.'}</h3>
  <strong>Structure A: {part.displayName}</strong>
  {data.latin&&<p>{data.latin}</p>}
  <p>{SYSTEMS.find(([id])=>id===part.system)?.[1]} · {REGIONS.find(([id])=>id===part.region)?.[1]}</p>
  {data.location&&<p><b>Location: </b>{data.location}</p>}
  {data.function&&<p><b>Function: </b>{data.function}</p>}
  {data.clinical&&<p><b>Nursing relevance: </b>{data.clinical}</p>}
  {!answer.correct&&answer.chosen==='Time expired'&&<small>Time expired for this question.</small>}
 </div>;
}
