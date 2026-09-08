import {useUiStore} from './store';
const layers=[[0,'Skin'],[2,'Muscles'],[3,'Deep muscle'],[4,'Organs'],[5,'Skeleton']] as const;
export default function LayerControls({compact=false}:{compact?:boolean}){
 const s=useUiStore();
 const choices=s.sex==='female'?[[0,'All available'],[4,'Organs'],[5,'Pelvic bones']] as const:layers;
 return <div className={`peel-controls ${compact?'compact':''}`}>
  <span>Peel layers</span>
  <div role="group" aria-label="Visible anatomy layers">{choices.map(([depth,label])=><button key={depth} aria-pressed={s.depth===depth} onClick={()=>s.peel(depth)}>{label}</button>)}</div>
 </div>;
}
