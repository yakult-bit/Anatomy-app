import {femaleInfo} from '../shared/atlas';
export default function FemaleReferenceNote(){
 return <div className="female-reference-note"><p><strong>NIH 3D Human Reference Atlas · Visible Human Female</strong><br/>Separate reference organs, not the body shown in the whole-body atlas.</p><details><summary>Available structures and gaps</summary><p><strong>Available:</strong> {femaleInfo.availableStructures.join('; ')}.</p><p><strong>Not included:</strong> {femaleInfo.unavailableStructures.join('; ')}. An absent mesh does not mean a structure is anatomically absent.</p><a href="/credits/hra-female.html">Individual sources and licences</a></details></div>;
}
