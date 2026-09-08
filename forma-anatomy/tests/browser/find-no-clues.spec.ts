import {test,expect,type Page} from '@playwright/test';

async function hoverOne(page:Page){
 const rect=(await page.locator('canvas').boundingBox())!;
 for(let y=2;y<10;y++)for(let x=2;x<10;x++){
  const point={x:rect.x+rect.width*x/12,y:rect.y+rect.height*y/12};
  await page.mouse.move(point.x,point.y);await page.waitForTimeout(40);
  const name=await page.evaluate(async()=>{const {useHoverStore,anatomy}=await import('/src/store.ts');const id=useHoverStore.getState().hovered;return id?anatomy[id].displayName:null});
  if(name)return {...point,name};
 }
 throw Error('No visible structure could be hovered');
}

test('ten Find starts have identical unmarked canvases and no selection residue',async({page})=>{
 test.setTimeout(180000);
 await page.goto('/learn');
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({mode:'quiz',settings:{format:'click',system:'all',region:'all',count:10,timer:0}});void useStore.getState().startQuiz()});
 let first:Buffer|undefined;
 for(let i=0;i<10;i++){
  await expect(page.locator('.question-count')).toContainText(`QUESTION ${i+1} OF 10`,{timeout:20000});
  await expect(page.locator('.quiz-panel')).toHaveAttribute('aria-busy','false',{timeout:20000});
  await expect(page.locator('.find-reveal-label,.recognition-marker,.hover-label,.model-label,.find-hover-readout')).toHaveCount(0);
  await expect(page.locator('.anatomy-search input').first()).toBeDisabled();
  // Compare actual rendered pixels after each reset, not just store settings.
  const canvas=await page.locator('canvas').screenshot();
  if(first)expect(canvas.equals(first),`question ${i+1} changed the neutral scene`).toBe(true);else first=canvas;
  await page.getByRole('button',{name:'I’m not sure — show the region'}).click();
  await expect(page.locator('.find-region-hint')).toContainText('Region hint:');
  await expect(page.locator('.find-reveal-label')).toHaveCount(0);
  await page.getByRole('button',{name:'Reveal the answer',exact:true}).click();
  await expect(page.locator('.feedback')).toContainText('Answer revealed.');
  await expect(page.locator('.find-reveal-label.is-correct')).toBeVisible();
  await page.getByRole('button',{name:i===9?'See my results':'Next question'}).click();
 }
 await expect(page.getByText('PRACTICE COMPLETE',{exact:true})).toBeVisible();
});

test('Find layer/system controls never navigate to or force the target visible',async({page})=>{
 await page.goto('/learn');
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({mode:'quiz',settings:{format:'click',system:'all',region:'all',count:10,timer:0}});void useStore.getState().startQuiz(['heart'])});
 await expect(page.getByRole('heading',{name:'Find the heart.'})).toBeVisible({timeout:20000});
 const controls=page.locator('.find-controls');
 await controls.getByRole('button',{name:'Organs',exact:true}).click();
 await controls.getByRole('checkbox',{name:'Find: show cardiovascular',exact:true}).check();
 await controls.getByRole('checkbox',{name:'Find: show cardiovascular',exact:true}).uncheck();
 const result=await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');const {requiredSystems}=await import('/src/model-runtime.ts');const s=useStore.getState();return {depth:s.depth,selected:s.selected,part:s.camera.part,loaded:requiredSystems(s)}});
 expect(result.depth).toBe(4);expect(result.selected).toBeNull();expect(result.part).toBeNull();expect(result.loaded).not.toContain('cardiovascular');
 await expect(page.getByRole('slider',{name:'Find visible system opacity',exact:true})).toBeVisible();
 await expect(page.locator('.camera-bar')).toBeVisible();
 await expect(page.locator('.find-reveal-label,.find-hover-readout,.hover-label')).toHaveCount(0);
});

test('Learn hover still names the structure under the pointer',async({page})=>{
 await page.goto('/learn');
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({mode:'learn',quiz:null,selected:null,view:'body'});useStore.getState().peel(0)});
 await expect(page.locator('.model-loading')).toHaveCount(0,{timeout:30000});
 const hovered=await hoverOne(page);
 await expect(page.locator('.hover-label')).toHaveText(hovered.name);
});

test.describe('Find on touch devices',()=>{
 test.use({hasTouch:true});
 test('first tap highlights anonymously; second tap commits',async({page})=>{
  await page.goto('/learn');
  await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({mode:'quiz',settings:{format:'click',system:'all',region:'all',count:10,timer:0}});void useStore.getState().startQuiz(['heart'])});
  await expect(page.locator('.quiz-panel')).toHaveAttribute('aria-busy','false',{timeout:30000});
  const point=await hoverOne(page);
  await page.mouse.move(0,0);
  await page.touchscreen.tap(point.x,point.y);
  await expect(page.locator('.feedback,.find-reveal-label,.hover-label,.find-hover-readout')).toHaveCount(0);
  const first=await page.evaluate(async()=>{const {useStore,useHoverStore}=await import('/src/store.ts');return {hovered:useHoverStore.getState().hovered,feedback:useStore.getState().quiz?.feedback}});
  expect(first.hovered).toBeTruthy();expect(first.feedback).toBeNull();
  await page.touchscreen.tap(point.x,point.y);
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('.picked-answer')).toContainText(point.name);
 });
});
