import {test,expect} from '@playwright/test';

test('a wide-view ten-question session reaches its results without returning home',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:1920,height:900});
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 // Fix the random sequence, then exercise the actual Start / answer / Next
 // controls, model loading, framing, and DOM across the complete session.
 await page.evaluate(()=>{let seed=27;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)});
 await page.getByRole('button',{name:'Start practice'}).click();
 for(let index=0;index<10;index++){
  await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:20000});
  await expect(page.locator('.question-count')).toContainText(`QUESTION ${index+1} OF 10`);
  await expect(page.getByRole('button',{name:'Start practice'})).toHaveCount(0);
  await page.locator('.answer-options button').first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await page.getByRole('button',{name:index===9?'See my results':'Next question'}).click();
 }
 await expect(page.getByText('PRACTICE COMPLETE',{exact:true})).toBeVisible();
 await expect(page.locator('.score-ring')).toContainText('of 10 correct');
});

test('repeated preparation failures retain answers and resume the same run',async({page})=>{
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 await page.getByRole('button',{name:'Start practice'}).click();
 await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
 await page.locator('.answer-options button').first().click();
 await page.getByRole('button',{name:'Next question'}).click();
 await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');
  // Inject an exhausted load budget at this exact question; recovery uses the
  // production path rather than mocking a finished screen or scored answers.
  useStore.getState().set({identifyAttempts:3});
  await useStore.getState().rerollIdentify('setup_timeout',1.6);
 });
 await expect(page.getByRole('heading',{name:'Let’s try this question again'})).toBeVisible();
 await expect(page.locator('.question-count')).toContainText('QUESTION 2 OF 10');
 await expect(page.getByText('1 completed answer is still here.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Continue session'}).click();
 await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
 await expect(page.locator('.question-count')).toContainText('QUESTION 2 OF 10');
});

test('the opaque vitreous stays distinct from grey context through feedback',async({page},testInfo)=>{
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');
  useStore.getState().set({settings:{format:'identify',system:'nervous',region:'head-neck',count:5,timer:0,difficulty:'strict'}});
  void useStore.getState().startQuiz(['z_nervous_vitreous_bodyr']);
 });
 await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
 await expect(page.locator('.recognition-marker')).toHaveText('A');
 await expect(page.locator('.viewport')).toHaveClass(/identify-question/);
 await testInfo.attach('vitreous-before-answer',{body:await page.screenshot(),contentType:'image/png'});
 const wrong=page.locator('.answer-options button').filter({hasNotText:'Vitreous body (right)'}).first();
 await wrong.click();
 await expect(page.getByText('Structure A: Right Vitreous body',{exact:true})).toBeVisible();
 await expect(page.locator('.viewport')).toHaveClass(/identify-question/);
 await expect(page.locator('.recognition-marker')).toBeVisible();
 await expect(page.locator('.camera-bar')).toHaveCount(0);
 await expect(page.locator('.feedback')).not.toContainText(/Z-Anatomy|anatomical position/);
 await testInfo.attach('vitreous-after-answer',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect(page.locator('.viewport')).not.toHaveClass(/identify-question/);
 await expect(page.locator('.recognition-marker')).toHaveCount(0);
});

test('ligament, long bone and eye retain anatomical context while orbiting',async({page},testInfo)=>{
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 for(const [id,cue] of [['z_skeletal_dorsal_radio_ulnar_ligamentr','Right wrist'],['femur_right','Right lower limb'],['z_nervous_vitreous_bodyr','Right eye region']]){
  await page.evaluate(async id=>{
   const {useStore}=await import('/src/store.ts');useStore.getState().set({quiz:null,settings:{format:'identify',system:'all',region:'all',count:5,timer:0,difficulty:'guided'}});
   void useStore.getState().startQuiz([id]);
  },id);
  await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
  await expect(page.locator('.recognition-region')).toContainText(cue);
  await expect(page.locator('.recognition-marker')).toHaveText('A');
  await testInfo.attach(id+'-anterior',{body:await page.screenshot(),contentType:'image/png'});
  const rect=await page.locator('canvas').boundingBox();
  await page.mouse.move(rect!.x+rect!.width*.35,rect!.y+rect!.height*.6);
  await page.mouse.down();await page.mouse.move(rect!.x+rect!.width*.65,rect!.y+rect!.height*.55,{steps:30});await page.mouse.up();
  await expect(page.locator('.recognition-marker')).toBeVisible();
  await testInfo.attach(id+'-orbited',{body:await page.screenshot(),contentType:'image/png'});
  await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');const s=useStore.getState();s.set({settings:{...s.settings,difficulty:'strict'}})});
  await expect(page.locator('.recognition-region')).toHaveCount(0);
  await expect(page.locator('.recognition-marker')).toBeVisible();
  await testInfo.attach(id+'-local-context',{body:await page.screenshot(),contentType:'image/png'});
 }
});

test('Name that structure becomes interactive within 300ms, including the camera approach',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 // Warm the GLBs explicitly; downloading/decoding has a separate cold-load
 // deadline below. Never start the stopwatch after question setup has begun.
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');useStore.getState().showAll(true);
 });
 await expect.poll(()=>page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');return useStore.getState().loaded.length;
 }),{timeout:90000}).toBe(11);
 // Warm the additional shared context GLB and its shader programs before the
 // warm-setup budget; cold network/decoder loading retains the separate timeout.
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({settings:{format:'identify',system:'all',region:'all',count:5,timer:0,difficulty:'guided'}});void useStore.getState().startQuiz(['z_nervous_vitreous_bodyr'])});
 await expect(page.getByRole('heading',{name:'Name that structure',exact:true})).toBeVisible({timeout:10000});
 await page.getByRole('button',{name:'End session',exact:true}).click();
 for(const configuration of ['all','hidden','xray']){
  for(const extent of ['smallest','largest']){
   const result=await page.evaluate(async({configuration,extent})=>{
    const {useStore,parts,SYSTEMS}=await import('/src/store.ts');
    const {recognitionGate,recognitionGeometry}=await import('/shared/recognition.ts');
    const active=Object.fromEntries(SYSTEMS.map(([id],i)=>[id,configuration==='all'||i%2===0]));
    const settings={format:'identify',system:'all',region:'all',count:5,timer:0,difficulty:'strict'};
    useStore.getState().set({mode:'quiz',quiz:null,settings,active,depth:configuration==='xray'?3:0,xray:configuration==='xray',labels:true,overlay:'pulse'});
    // Use conservative eligible extrema across the canvas resize into quiz.
    const candidates=parts.filter(p=>[.6,.8,1,1.3].every(a=>!recognitionGate(p,a))).sort((a,b)=>recognitionGeometry(a).radius-recognitionGeometry(b).radius);
    const target=extent==='smallest'?candidates[0]:candidates.at(-1);
    const before=JSON.stringify({active,depth:useStore.getState().depth,xray:useStore.getState().xray});
    const start=performance.now();let last=start,longestGap=0;
    return await new Promise<{elapsed:number;longestGap:number;id:string;restored:boolean}>((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Question did not become interactive within 300ms')),300);
     const check=()=>{
      const now=performance.now();longestGap=Math.max(longestGap,now-last);last=now;
      const s=useStore.getState(),buttons=[...document.querySelectorAll<HTMLButtonElement>('.answer-options button')];
      if(s.identifyReady&&buttons.length===4&&buttons.every(b=>!b.disabled)){
       const elapsed=performance.now()-start;clearTimeout(timeout);
       s.set({quiz:null});const after=useStore.getState();const restored=JSON.stringify({active:after.active,depth:after.depth,xray:after.xray})===before;
       resolve({elapsed,longestGap,id:target.id,restored});
      }else requestAnimationFrame(check);
     };
     void useStore.getState().startQuiz([target.id]);requestAnimationFrame(check);
    });
   },{configuration,extent});
   expect(result.elapsed,JSON.stringify(result)).toBeLessThan(300);
   expect(result.longestGap,'A blocked main thread still fails even if the question eventually renders').toBeLessThan(150);
   expect(result.restored).toBe(true);
  }
 }
 expect(errors).toEqual([]);
});

test('a stalled model load yields to input, times out and rerolls without scoring',async({page})=>{
 await page.route('**/models/z-anatomy/*',async route=>{await new Promise(r=>setTimeout(r,12000));await route.abort()});
 await page.goto('/learn');await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({settings:{format:'identify',system:'all',region:'all',count:5,timer:0}});void useStore.getState().startQuiz(['skull'])});
 await expect(page.getByRole('heading',{name:'Preparing the structure…'})).toBeVisible();
 const changed=await page.evaluate(async()=>{
  const {useStore}=await import('/src/store.ts');const first=useStore.getState().quiz.questions[0].id;
  return await new Promise<boolean>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Model timeout did not reroll')),9500);
   const unsubscribe=useStore.subscribe(s=>{if(!s.quiz||s.quiz.questions[0].id!==first){clearTimeout(timeout);unsubscribe();resolve(Object.keys(s.stats).length===0)}});
  });
 });
 expect(changed).toBe(true);await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect(page.getByRole('button',{name:'Start practice'})).toBeEnabled();
});
