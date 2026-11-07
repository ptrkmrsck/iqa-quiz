import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',fullyParallel:true,use:{baseURL:'http://localhost:3000'},
 projects:[
  {name:'desktop',testMatch:'maqam-world.spec.ts',use:{...devices['Desktop Chrome']}},
  {name:'tablet',testMatch:'maqam-world.spec.ts',use:{...devices['iPhone 13'],viewport:{width:768,height:1024},defaultBrowserType:'chromium'}},
  {name:'mobile',testMatch:'mobile-drawer.spec.ts',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
 ],
 webServer:{command:'npm start',url:'http://localhost:3000',reuseExistingServer:true}
});
