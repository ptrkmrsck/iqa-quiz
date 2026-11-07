import {test,expect} from '@playwright/test';
import {mockMedia} from './mock-media';
test.beforeEach(async({page})=>mockMedia(page));
const openSettings=async(page)=>page.getByRole('button',{name:'Settings',exact:true}).click();
const closeSettings=async(page)=>page.getByRole('button',{name:'Close',exact:true}).click();

test('drawer opens closed by default, traps focus and closes with button, Escape or backdrop',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('.choices button')).toHaveCount(4);
 await openSettings(page);
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();
 await page.keyboard.press('Shift+Tab');
 expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
 expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).toBe('hidden');
 await closeSettings(page);
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
 await openSettings(page);await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await openSettings(page);await page.mouse.click(2,400);
 await expect(page.getByRole('dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('presets, selection links and last rhythm stay usable from the scrollable drawer',async({page})=>{
 await page.goto('/');await openSettings(page);
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('builtin:common');
 await page.getByLabel('Preset:',{exact:true}).selectOption('builtin:odd');
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 await page.getByRole('checkbox',{name:'Zaffa 4/4',exact:true}).check();
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Copy selection link',exact:true}).click();
 const link=await page.getByLabel('Selection link',{exact:true}).inputValue();
 expect(link).toContain('zaffa');
 await closeSettings(page);
 await expect(page.getByRole('heading',{name:'Which iqa‘ is this?'})).toBeVisible();
 await page.goto(link);await openSettings(page);
 await expect(page.getByRole('checkbox',{name:'Zaffa 4/4',exact:true})).toBeChecked();
});

test('looping audio keeps rhythm and playback when drawer settings change',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&transcription=1&audio=1');
 const score=await page.locator('.notation img').getAttribute('src');
 await expect(page.locator('audio')).toHaveJSProperty('loop',true);
 await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.play());
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await openSettings(page);
 await page.getByRole('radio',{name:'Hide',exact:true}).check();
 await page.getByRole('radio',{name:'Recall',exact:true}).check();
 await closeSettings(page);
 await expect(page.locator('audio')).toHaveJSProperty('paused',false);
 await expect(page.locator('.notation img')).toHaveCount(0);
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('.notation img')).toHaveAttribute('src',score!);
 await expect(page.locator('#reviewed')).toHaveText('1');
 await openSettings(page);
 await page.getByRole('radio',{name:'Musical examples',exact:true}).check();
 await page.getByRole('checkbox',{name:'Autoplay',exact:true}).check();
 await closeSettings(page);
 await expect(page.locator('audio')).toHaveJSProperty('loop',true);
 await expect(page.locator('audio')).toHaveAttribute('src',/\/audio\/iqaa\//);
 await expect(page.locator('#reviewed')).toHaveText('1');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('audio')).toHaveJSProperty('loop',true);
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
});

test('resizing keeps the drawer open and preserves settings',async({page})=>{
 await page.goto('/');await openSettings(page);
 await page.getByRole('radio',{name:'Recall',exact:true}).check();
 await page.setViewportSize({width:1000,height:900});
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('radio',{name:'Recall',exact:true})).toBeChecked();
 expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).toBe('hidden');
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('radio',{name:'Recall',exact:true})).toBeChecked();
 await closeSettings(page);
 await expect(page.getByRole('button',{name:'Reveal answer'})).toBeVisible();
});

test('wrong answers allow immediate retry without revealing or restarting audio',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&transcription=0&audio=1');
 const audio=page.locator('audio');const src=await audio.getAttribute('src');
 await audio.evaluate((a:HTMLAudioElement)=>a.play());
 const correct=src!.includes('baladi')?'Baladi':'Malfuf';
 const wrong=correct==='Baladi'?'Malfuf':'Baladi';
 await page.locator('.choices').getByRole('button',{name:wrong,exact:true}).click();
 await expect(page.getByText('Incorrect. Try again.',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Which iqa‘ is this?'})).toBeVisible();
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await expect(page.locator('#form-label')).toHaveCount(0);
 await expect(audio).toHaveAttribute('src',src!);
 await expect(audio).toHaveJSProperty('paused',false);
 await openSettings(page);await page.getByRole('radio',{name:'Recall',exact:true}).check();
 await page.getByRole('radio',{name:'Multiple choice',exact:true}).check();await closeSettings(page);
 await expect(page.getByRole('button',{name:wrong+' — Try again',exact:true})).toBeDisabled();
 await page.locator('.choices').getByRole('button',{name:correct,exact:true}).click();
 await expect(page.getByText('Correct.',{exact:true})).toBeVisible();
 await expect(page.locator('.notation img')).toBeVisible();
 await expect(page.locator('#reviewed')).toHaveText('2');
 await expect(page.locator('#known')).toHaveText('1');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('.choices button:disabled')).toHaveCount(0);
});
