// Populate public catalogue attribution while preserving retired IDs and saved data.
// Create the migration first with `supabase migration new nih_hra_provenance`.
import fs from 'node:fs/promises';
const path=process.argv[2];if(!/^supabase\/migrations\/\d+_nih_hra_provenance\.sql$/.test(path||''))throw Error('Pass the migration path returned by Supabase CLI');
await fs.access(path);
const male=JSON.parse(await fs.readFile('src/data/anatomy.json','utf8')),female=JSON.parse(await fs.readFile('src/data/female-anatomy.json','utf8'));
const legacy=JSON.parse(await fs.readFile('docs/female-audit/v12-content.json','utf8'));
const quote=x=>"'"+String(x).replaceAll("'","''")+"'",json=x=>quote(JSON.stringify(x))+'::jsonb';
let sql=`-- NIH per-model provenance; public educational content only.\n-- Existing RLS (world-readable, service-role-only writes) remains in force.\n-- Retired mesh IDs remain for account export/history foreign keys.\nbegin;\nalter table public.anatomy_structures add column source jsonb;\nalter table public.anatomy_structures add column license jsonb;\nalter table public.anatomy_structures add column available boolean not null default true;\n`;
const all={...Object.fromEntries(Object.entries(male).filter(([,p])=>p.available!==false)),...Object.fromEntries(Object.entries(legacy).map(([id,p])=>[id,{...p,available:false,source:'Anatria3D intermediate HRA female subset; retired after v12 audit',sourceUrl:'/credits/hra-female.html',license:'CC-BY-4.0 declared upstream; individual NIH records not verified in v12',textSource:p.quizEligible?'Legacy lesson references; see v12 audit':'No reviewed lesson',textLicense:p.quizEligible?'Original source terms retained':'No sourced passage'}])),...female};
for(const p of Object.values(all)){
 const source={geometry:{name:p.source,url:p.sourceUrl,...(p.sourceModelId?{modelId:p.sourceModelId}:{})},text:{name:p.textSource||'No reviewed lesson',urls:p.lessonSources||[]}};
 const license={geometry:p.license,text:p.textLicense||'No sourced passage'};
 sql+=`insert into public.anatomy_structures(id,display_name,system,region,source,license,available) values(${[p.id,p.displayName,p.system,p.region].map(quote).join(',')},${json(source)},${json(license)},${p.available!==false}) on conflict(id) do update set display_name=excluded.display_name,source=excluded.source,license=excluded.license,available=excluded.available;\n`;
}
sql+=`alter table public.anatomy_structures alter column source set not null;\nalter table public.anatomy_structures alter column license set not null;\nalter table public.anatomy_structures add constraint anatomy_provenance_components check (jsonb_typeof(source)='object' and source ? 'geometry' and source ? 'text' and jsonb_typeof(license)='object' and license ? 'geometry' and license ? 'text');\ncommit;\n`;
await fs.writeFile(path,sql);console.log('Per-row geometry/text provenance for',Object.keys(all).length,'catalogue rows; active female',Object.keys(female).length);
