import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'tests/browser',workers:1,retries:0,timeout:60000,
 use:{browserName:'chromium',baseURL:'http://localhost:5173',viewport:{width:1440,height:1000},
  launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host localhost --port 5173 --strictPort',url:'http://localhost:5173',reuseExistingServer:!process.env.CI,timeout:60000},
});
