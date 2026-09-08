import {test,expect} from '@playwright/test';

test('female switch loads separate real assets and exposes only available layers',async({page},info)=>{
 const failures:string[]=[];
 page.on('response',r=>{if(r.url().includes('/models/')&&!r.ok())failures.push(r.url())});
 await page.goto('/learn');
 await page.locator('.viewport-model-switch').getByRole('button',{name:'Female reproductive anatomy',exact:true}).click();
 await expect(page.locator('.viewport-model-switch').getByRole('button',{name:'Female reproductive anatomy',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.model-selector')).toContainText('Visible Human Female');
 await expect(page.getByRole('checkbox',{name:'Show muscular system',exact:true})).toBeDisabled();
 await expect(page.locator('.viewport-layers').getByRole('button',{name:'Pelvic bones',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');
  return useStore.getState().loaded.filter(id=>id.startsWith('female-')).length;
 }),{timeout:30000}).toBe(3);
 expect(failures).toEqual([]);
 await info.attach('female-reference-organs',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByLabel('Search anatomy structures').fill('Ovary (left)');
 await page.getByRole('option',{name:'Ovary (left)',exact:false}).click();
 await expect(page.locator('.structure-name')).toHaveText('Ovary (left)');
 await expect.poll(()=>page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');return useStore.getState().selected})).toBe('female_ovary_l');
});

for(const format of ['identify','recall','function','click']){
 test(`female ${format}: finish all ten questions without changing donor`,async({page},info)=>{
  await page.goto('/learn');
  await page.locator('.viewport-model-switch').getByRole('button',{name:'Female reproductive anatomy',exact:true}).click();
  await page.evaluate(async format=>{
   const {useStore}=await import('/src/store.ts');
   useStore.getState().set({mode:'quiz',settings:{format,system:'all',region:'all',count:10,timer:0,difficulty:'guided',clickDifficulty:'beginner'}});
   void useStore.getState().startQuiz();
  },format);
  for(let i=0;i<10;i++){
   await expect(page.locator('.quiz-panel')).toContainText(`QUESTION ${i+1} OF 10`,{timeout:30000});
   await expect(page.locator('.quiz-panel')).toHaveAttribute('aria-busy','false',{timeout:30000});
   if(format==='click'){
    await expect(page.locator('.recognition-marker,.find-reveal-label,.hover-label')).toHaveCount(0);
    await expect(page.locator('.find-controls')).toBeVisible();
   }else await expect(page.locator('.recognition-marker')).toHaveText('A');
   if(!i)await info.attach(`${format}-female-question`,{body:await page.screenshot(),contentType:'image/png'});
   const target=await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');return useStore.getState().quiz!.questions[useStore.getState().quiz!.index].id});
   expect(target).toMatch(/^female_/);
   // Revealing through the real UI exercises rendering/feedback without
   // assuming a random target's exact projected click coordinates.
   await page.locator('.skip-question').click();
   if(format==='click')await page.locator('.skip-question').click();
   await expect(page.locator('.feedback')).toBeVisible();
   await page.locator('.next-button').click();
  }
  await expect(page.locator('.result-panel')).toContainText('of 10 correct');
 });
}
