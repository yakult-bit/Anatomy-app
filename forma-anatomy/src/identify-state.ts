// Saved exploration preferences are restored on answer. The visual isolation
// lasts through feedback so the learner can still inspect what was asked.
// Its camera/scene snapshot is restored on Next, End session or Learn.
export const explorationKeys=['active','opacity','depth','hidden','solo','xray','overlay','labels','coverings','selected','view','returnView','autoRotate','camera'] as const;
export function explorationSnapshot<T extends Record<string,any>>(s:T):Partial<T>{return Object.fromEntries(explorationKeys.map(k=>[k,s[k]])) as Partial<T>}
import {isVisualFormat} from '../shared/visual-quiz';
// The same renderer now serves every question that shows a subject to identify.
export function isIdentifyQuestion(s:{mode:string;quiz?:{format:string;finished:boolean;feedback:unknown}|null}){return isIdentifySceneActive(s)&&!s.quiz?.feedback}
export function isIdentifySceneActive(s:{mode:string;quiz?:{format:string;finished:boolean}|null}){return s.mode==='quiz'&&!!s.quiz&&isVisualFormat(s.quiz.format)&&!s.quiz.finished}
