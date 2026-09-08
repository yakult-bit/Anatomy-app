import {test,expect} from '@playwright/test';

for(const width of [1896,1024,375])test(`model switch stays visible with controls collapsed at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/learn');
 if(width<=800)await page.getByRole('button',{name:'Explore controls',exact:true}).click();
 await page.getByRole('button',{name:'Collapse controls',exact:true}).click();
 const controls=page.getByRole('region',{name:'Model and view controls'});
 const female=controls.getByRole('button',{name:'Female reproductive anatomy',exact:true});
 await expect(female).toBeVisible();await expect(female).toBeEnabled();
 const heading=(await controls.locator('.viewport-heading').boundingBox())!;
 const row=(await controls.locator('.viewport-model-row').boundingBox())!;
 const tabs=(await controls.locator('.atlas-toolbar').boundingBox())!;
 expect(row.y).toBeGreaterThanOrEqual(heading.y+heading.height+8);
 expect(tabs.y).toBeGreaterThanOrEqual(row.y+row.height+8);
 const box=(await female.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
 await female.click();await expect(female).toHaveAttribute('aria-pressed','true');
 await expect(controls).toContainText('Visible Human Female');
 await expect.poll(()=>page.evaluate(async()=>{const {useStore}=await import('/src/store.ts');return useStore.getState().loaded.filter(id=>id.startsWith('female-')).length}),{timeout:30000}).toBe(3);
 await info.attach(`collapsed-female-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await controls.getByRole('button',{name:'Whole-body anatomy',exact:true}).click();
 await expect(controls.getByRole('button',{name:'Whole-body anatomy',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('study-board filters follow the wrapped header and stay above the cards',async({page})=>{
 await page.setViewportSize({width:375,height:900});await page.goto('/learn');
 await page.getByRole('region',{name:'Model and view controls'}).getByRole('tab',{name:'Study board',exact:true}).click();
 await expect(page.locator('.board-browser-controls')).toBeVisible();
 const header=(await page.locator('.viewport-exploration-controls').boundingBox())!;
 const filters=(await page.locator('.board-browser-controls').boundingBox())!;
 const canvas=(await page.locator('.canvas-wrap').boundingBox())!;
 expect(filters.y).toBeGreaterThanOrEqual(header.y+header.height+10);
 expect(canvas.y).toBeGreaterThanOrEqual(filters.y+filters.height+10);
});
