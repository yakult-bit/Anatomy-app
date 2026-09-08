import {test,expect} from '@playwright/test';

for(const [format,id] of [['recall','z_detail_brain_postcentral_gyrusr'],['function','foot_left']]){
 test(`${format}: screenshot target has A, context, and stays clear after answering`,async({page},info)=>{
  await page.goto('/learn');
  await page.evaluate(async({format,id})=>{
   const {useStore}=await import('/src/store.ts');useStore.getState().set({mode:'quiz',settings:{format,system:'all',region:'all',count:10,timer:0,difficulty:'guided'}});
   void useStore.getState().startQuiz([id]);
  },{format,id});
  await expect(page.locator('.recognition-marker')).toHaveText('A',{timeout:20000});
  await expect(page.locator('.quiz-panel')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.recognition-region')).toBeVisible();
  await expect(page.locator('.viewport')).toHaveClass(/identify-question/);
  await info.attach('target-with-context',{body:await page.screenshot(),contentType:'image/png'});
  const rect=(await page.locator('canvas').boundingBox())!;
  await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.55);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.5,{steps:20});await page.mouse.up();
  await expect(page.locator('.recognition-marker')).toBeVisible();
  if(format==='recall'){await page.getByLabel('Structure name',{exact:true}).fill('Right Postcentral gyrus');await page.getByRole('button',{name:'Check answer'}).click()}
  else await page.locator('.answer-options button').first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('.feedback')).not.toContainText(/Z-Anatomy|anatomical position|atlas/);
  await expect(page.locator('.recognition-marker')).toBeVisible();
  await info.attach('target-after-answer',{body:await page.screenshot(),contentType:'image/png'});
 });
}

test('Find: anonymous pointer hover, wrong pick and simultaneous labelled reveal',async({page},info)=>{
 await page.goto('/learn');
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');useStore.getState().showAll(true);
  useStore.getState().set({mode:'quiz',settings:{format:'click',system:'all',region:'all',count:10,timer:0,clickDifficulty:'beginner'}});
  void useStore.getState().startQuiz(['heart']);
 });
 await expect(page.getByRole('heading',{name:'Find the heart.',exact:true})).toBeVisible({timeout:30000});
 const canvas=page.locator('canvas'),rect=(await canvas.boundingBox())!;
 let picked=false;
 // Scan genuine projected geometry, not DOM answer buttons or store.answer.
 for(let y=2;y<10&&!picked;y++)for(let x=2;x<10&&!picked;x++){
  await page.mouse.move(rect.x+rect.width*x/12,rect.y+rect.height*y/12);
  await page.waitForTimeout(40);
  const hovered=await page.evaluate(async()=>{
   const {useHoverStore,anatomy}=await import('/src/store.ts');const id=useHoverStore.getState().hovered;
   return id?{id,name:anatomy[id].displayName,parent:anatomy[id].parentId}:null;
  });
  if(!hovered)continue;
  await expect(page.locator('.find-hover-readout,.hover-label,.model-label')).toHaveCount(0);
  await expect(canvas).toHaveCSS('cursor','pointer');
  if(hovered.id==='heart'||hovered.parent==='heart')continue;
  await page.mouse.click(rect.x+rect.width*x/12,rect.y+rect.height*y/12);picked=true;
 }
 expect(picked,'Find needs a real, pickable neighbouring structure').toBe(true);
 await expect(page.locator('.find-reveal-label.is-correct')).toContainText('✓ Heart');
 await expect(page.locator('.picked-answer')).toContainText('You selected');
 await expect(page.locator('.find-reveal-label.is-wrong')).toContainText('✕');
 await expect(page.locator('.feedback')).not.toContainText(/Z-Anatomy|anatomical position/);
 await expect(page.locator('.find-hover-readout')).toHaveCount(0);
 await info.attach('simultaneous-wrong-and-correct',{body:await page.screenshot(),contentType:'image/png'});
});

test('peel controls are reachable without the sidebar',async({page})=>{
 await page.goto('/learn');
 const controls=page.locator('.viewport-layers');
 await controls.getByRole('button',{name:'Skin',exact:true}).click();
 await expect(controls.getByRole('button',{name:'Skin',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const [label,depth] of [['Muscles',2],['Deep muscle',3],['Organs',4],['Skeleton',5]] as const){
  await controls.getByRole('button',{name:label,exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');return useStore.getState().depth})).toBe(depth);
  await expect(controls.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
 }
});
