import {Checkbox} from '@/components/ui/checkbox';
import {Slider} from '@/components/ui/slider';
import {useUiStore,SYSTEMS,LAYERS} from './store';
import {hasSystem} from '../shared/atlas';

export default function FindControls(){
 const s=useUiStore(),ids=SYSTEMS.filter(([id])=>s.active[id]).map(([id])=>id);
 const opacity=ids.length?Math.round(ids.reduce((n,id)=>n+s.opacity[id],0)/ids.length):100;
 const choices=s.sex==='female'?[[0,'All available'],[4,'Organs'],[5,'Pelvic bones']] as const:LAYERS.map((label,depth)=>[depth,label] as const);
 return <details className="find-controls" open>
  <summary>Explore layers &amp; systems</summary>
  <div className="find-control-body">
   <label>Layer depth <strong>{choices.find(([depth])=>depth===s.depth)?.[1]||LAYERS[s.depth]}</strong></label>
   {s.sex==='male'&&<Slider aria-label="Find layer depth: skin to skeleton" min={0} max={5} step={1} value={[s.depth]} onValueChange={([depth])=>s.set({depth})}/>}
   <div className="find-depth-buttons" role="group" aria-label="Find layer presets">{choices.map(([depth,label])=><button key={depth} aria-pressed={s.depth===depth} onClick={()=>s.set({depth})}>{label}</button>)}</div>
   {s.sex==='male'&&s.depth===1&&<p className="fine-print">This atlas has no separate fat layer; skin is removed at this step.</p>}
   <div className="find-system-toggles" role="group" aria-label="Find body systems">{SYSTEMS.map(([id,name])=><label key={id}><Checkbox disabled={!hasSystem(s.sex,id)} checked={s.active[id]} aria-label={`Find: show ${name.toLowerCase()}`} onCheckedChange={()=>s.toggleSystem(id)}/>{name}{!hasSystem(s.sex,id)&&' (not included)'}</label>)}</div>
   <label>Visible system opacity <strong>{opacity}%</strong></label>
   <Slider aria-label="Find visible system opacity" min={10} max={100} step={5} value={[opacity]} disabled={!ids.length} onValueChange={([alpha])=>s.set({opacity:{...s.opacity,...Object.fromEntries(ids.map(id=>[id,alpha]))}})}/>
   <p className="fine-print">Rotate, zoom and pan freely. Names and structure search are hidden until you answer.</p>
  </div>
 </details>;
}
