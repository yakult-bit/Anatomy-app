import fs from 'node:fs/promises';
const files=process.argv.slice(2),categories=['performance','accessibility','best-practices','seo'];
if(!files.length)throw Error('Provide Lighthouse JSON exports from Chrome DevTools. No scores are inferred from unit tests.');
let failed=false;
for(const file of files){
 const report=JSON.parse(await fs.readFile(file,'utf8'));
 if(report.runtimeError)throw Error('Lighthouse did not complete: '+report.runtimeError.code);
 const scores={};for(const key of categories){const raw=report.categories?.[key]?.score;if(typeof raw!=='number')throw Error('Missing Lighthouse category: '+key);scores[key]=Math.round(raw*100);if(scores[key]<70)failed=true;}
 console.log(JSON.stringify({url:report.finalDisplayedUrl||report.finalUrl,fetchTime:report.fetchTime,scores,minimum:70}));
}
if(failed)process.exitCode=1;
