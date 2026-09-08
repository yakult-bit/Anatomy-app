import {test,expect} from '@playwright/test';

test('marketing arrives as readable HTML, with a guest CTA and no model requests',async({page},testInfo)=>{
 await page.setViewportSize({width:375,height:812});
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 const response=await page.goto('/');const html=await response!.text();
 expect(html).toContain('Start exploring');expect(html).toContain('pre-nursing');
 expect(html).not.toMatch(/<script\b/i);
 const cta=page.getByRole('link',{name:'Start exploring',exact:false});
 const rect=(await cta.boundingBox())!;expect(rect.y+rect.height).toBeLessThan(812);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 expect(requests.filter(u=>/\.glb(?:\?|$)|\/assets\/.*\.js/.test(u))).toEqual([]);
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
 await testInfo.attach('home-375',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await cta.click();await expect(page).toHaveURL(/\/learn$/);
 await expect(page.getByRole('tab',{name:'Learn',exact:true})).toHaveAttribute('data-state','active');
 await page.getByRole('tab',{name:'Quiz',exact:true}).click();await expect(page).toHaveURL(/\/quiz$/);
 await expect(page).toHaveTitle(/practice/i);
});

test('public routes and footer links resolve and unknown addresses have a true 404',async({page,request})=>{
 const titles=new Set<string>();
 for(const route of ['/','/learn','/quiz','/about','/privacy','/terms','/credits']){
  const response=await request.get(route);expect(response.status()).toBe(200);
  const html=await response.text(),title=html.match(/<title>(.*?)<\/title>/)?.[1];
  expect(title).toBeTruthy();expect(titles.has(title!)).toBe(false);titles.add(title!);
  for(const tag of ['og:title','og:description','og:image','og:url','og:type','twitter:card'])expect(html).toContain(tag);
 }
 await page.goto('/terms');
 const links=await page.locator('footer a[href^="/"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!));
 for(const link of links)expect((await request.get(link)).status(),link).toBe(200);
 const missing=await page.goto('/this-route-does-not-exist');expect(missing!.status()).toBe(404);
 await expect(page.getByRole('heading',{name:'Let’s get you back to the body.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Open the anatomy lab',exact:false})).toHaveAttribute('href','/learn');
});

test('375px controls remain a keyboard-accessible sheet with a text-only fallback',async({page},testInfo)=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/learn');
 await page.getByRole('button',{name:'Explore controls',exact:true}).click();
 const sheet=page.getByRole('dialog',{name:'Anatomy explorer controls'});await expect(sheet).toBeVisible();
 const bounds=(await sheet.boundingBox())!;expect(bounds.width).toBeLessThanOrEqual(375);expect(bounds.y).toBeGreaterThanOrEqual(0);
 const slider=sheet.getByRole('slider',{name:'Layer depth: skin to skeleton'});
 await slider.focus();const before=Number(await slider.getAttribute('aria-valuenow'));
 await page.keyboard.press('ArrowRight');await expect(slider).toHaveAttribute('aria-valuenow',String(before+1));
 const outline=await slider.evaluate(el=>getComputedStyle(el).outlineWidth);expect(parseFloat(outline)).toBeGreaterThanOrEqual(3);
 await page.keyboard.press('Escape');await expect(sheet).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Explore controls',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Structures',exact:true}).click();
 const library=page.getByRole('dialog',{name:'Structure library'});await expect(library).toBeVisible();
 await library.getByRole('textbox',{name:'Filter structure list'}).fill('femur');
 const first=library.locator('.library-row>button').first();await first.focus();await page.keyboard.press('Enter');
 await expect(library).not.toBeVisible();
 const selection=await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');return useStore.getState().selected});expect(selection).toBeTruthy();
 await testInfo.attach('mobile-keyboard-selection',{body:await page.screenshot(),contentType:'image/png'});
});

test('375px Find leaves a separate orbit area and its hint flow preserves the run',async({page},testInfo)=>{
 test.setTimeout(120000);await page.setViewportSize({width:375,height:812});await page.goto('/learn');
 await page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');useStore.getState().set({settings:{format:'click',system:'all',region:'all',count:10,timer:0}});void useStore.getState().startQuiz(['heart'])});
 await expect(page.locator('.quiz-panel')).toHaveAttribute('aria-busy','false',{timeout:30000});
 const canvas=(await page.locator('canvas').boundingBox())!,panel=(await page.locator('.quiz-panel').boundingBox())!;
 expect(canvas.height).toBeGreaterThan(100);expect(canvas.y+canvas.height).toBeLessThanOrEqual(panel.y);
 expect(panel.x).toBeGreaterThanOrEqual(0);expect(panel.x+panel.width).toBeLessThanOrEqual(375);
 await expect(page.locator('.camera-bar')).toBeVisible();
 await page.getByRole('button',{name:'I’m not sure — show the region'}).click();
 await expect(page.locator('.find-region-hint')).toBeVisible();await expect(page.locator('.find-reveal-label')).toHaveCount(0);
 await page.getByRole('button',{name:'Reveal the answer',exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('Answer revealed.');
 await expect(page.locator('.find-reveal-label.is-correct')).toBeVisible();
 await expect(page.locator('.question-count')).toContainText('QUESTION 1 OF');
 await testInfo.attach('mobile-find-reveal',{body:await page.screenshot(),contentType:'image/png'});
 // Physical pinch/two-tap/thermal behavior needs a real device; this is desktop Chromium layout QA.
});
