import type {ReactNode} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
export function Picker({value,onChange,options,label}:{value:string;onChange:(v:string)=>void;options:readonly (readonly string[])[];label:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="picker"><SelectValue/></SelectTrigger><SelectContent position="popper">{options.map(([id,name])=><SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>}
export function SectionTitle({children,aside}:{children:ReactNode;aside?:ReactNode}){return <div className="section-title"><h3>{children}</h3>{aside}</div>}
