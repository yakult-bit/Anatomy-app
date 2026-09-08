import {inAtlas,type AtlasSex} from '../shared/atlas';
import {anatomy,parts,type Part,type System} from './store';
export const BOARD_ROWS=3;
const ordered=parts.slice().sort((a,b)=>Number(!!b.quizEligible)-Number(!!a.quizEligible)||a.displayName.localeCompare(b.displayName));
const searchable=new Map(ordered.map(p=>[p.id,`${p.displayName} ${p.latinName} ${p.aliases.join(' ')} ${p.parentId?anatomy[p.parentId].displayName:''}`.toLowerCase()]));
export function filterBoard(system:System,region:string,query:string,sex:AtlasSex='male'){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return ordered.filter(p=>inAtlas(p,sex)&&p.system===system&&(region==='all'||p.region===region)&&terms.every(t=>searchable.get(p.id)!.includes(t)))}
export function boardPage(items:Part[],page:number,columns:number){const pageSize=columns*BOARD_ROWS;const pages=Math.max(1,Math.ceil(items.length/pageSize));const current=Math.max(0,Math.min(pages-1,page));return {items:items.slice(current*pageSize,(current+1)*pageSize),page:current,pages,pageSize,total:items.length}}
export function boardCell(p:Part,index:number,columns:number,width:number,height:number){
 const cellWidth=width/columns,cellHeight=height/BOARD_ROWS;const bounds=p.bounds!;const dims=bounds.max.map((v,i)=>Math.max(.0001,v-bounds.min[i]));
 const scale=Math.min(cellWidth*.75/dims[0],cellHeight*.62/dims[1],1000/dims[2]);
 return {position:[(index%columns+.5)*cellWidth-width/2,height/2-(Math.floor(index/columns)+.37)*cellHeight,0] as [number,number,number],scale,cellWidth,cellHeight};
}
