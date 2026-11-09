import {test,expect} from '@playwright/test';
import {mockMedia} from './mock-media';
async function inSettings(page,action){
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await action();
 await page.getByRole('button',{name:'Close',exact:true}).click();
}
test.beforeEach(async({page})=>mockMedia(page));
test('selection, reveal, retry, completion and persistence',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.rhythm-row')).toHaveCount(43);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true}).check());
 await inSettings(page,()=>page.getByRole('button',{name:'Clear',exact:true}).click());
 await expect(page.getByText('Select at least one rhythm')).toBeVisible();
 await inSettings(page,()=>page.getByRole('checkbox',{includeHidden:true,name:'Maqsum 4/4',exact:true}).check());
 await expect(page.getByRole('heading',{name:'Which iqa‘ is this?'})).toBeVisible();
 await expect.poll(()=>page.locator('.notation img').evaluate((img: HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await expect(page.getByRole('heading',{name:'Maqsum',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Again',exact:true}).click();
 await expect(page.locator('#again-count')).toHaveText('1');
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.getByText('ROUND COMPLETE',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.locator('.rhythm-row input[type=checkbox]:checked')).toHaveCount(9);
 await expect(page.getByRole('checkbox',{includeHidden:true,name:'Maqsum 4/4',exact:true})).toBeChecked();
 await inSettings(page,()=>page.getByRole('button',{name:'All',exact:true}).click());
 await expect(page.locator('.rhythm-row input[type=checkbox]:checked')).toHaveCount(43);
 await inSettings(page,()=>page.getByRole('searchbox').fill('10/8'));
 await expect(page.locator('.rhythm-row')).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('every rhythm has local, loadable notation and unique identity',async({page})=>{
 await page.goto('/');
 const data=await (await page.request.get('/rhythms.json')).json();
 expect(new Set(data.map(r=>r.id)).size).toBe(43);
 for(const rhythm of data){expect(rhythm.notationSources).toHaveLength(rhythm.notations.length);for(const image of rhythm.notationSources){expect(image).toMatch(/^https:\/\/www\.maqamworld\.com\/note\/iqaa\/[^/]+\.png$/);}}
});

test('multiple choice grades once and repeats missed rhythms',async({page})=>{
 await page.goto('/#rhythms=maqsum,baladi&mode=choice');
 await expect(page.locator('.choices button')).toHaveCount(2);
 const src=await page.locator('.notation img').getAttribute('src');
 const correct=src!.includes('maqsum')?'Maqsum':'Baladi';
 const wrong=correct==='Maqsum'?'Baladi':'Maqsum';
 await page.locator('.choices').getByRole('button',{name:wrong,exact:true}).click();
 await expect(page.getByText('Incorrect, try again',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Which iqa‘ is this?'})).toBeVisible();
 await expect(page.locator('#again-count')).toHaveText('1');
 await expect(page.locator('.choices').getByRole('button',{name:wrong,exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Next',exact:true})).toHaveCount(0);
 await expect(page.locator('.notation img')).toHaveAttribute('src',src!);
 for(let i=0;i<3;i++){
  const image=await page.locator('.notation img').getAttribute('src');
  await page.locator('.choices').getByRole('button',{name:image!.includes('maqsum')?'Maqsum':'Baladi',exact:true}).click();
  await expect(page.getByText('Correct.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();
 }
 await expect(page.getByText('ROUND COMPLETE',{exact:true})).toBeVisible();
 await expect(page.locator('#reviewed')).toHaveText('4');
});
test('custom selections are shareable without saving named presets',async({page})=>{
 await page.goto('/#rhythms=maqsum,baladi');
 await expect(page.locator('.rhythm-row input[type=checkbox]:checked')).toHaveCount(2);
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('');
 for(const name of ['Load','Delete','Save selection'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 await inSettings(page,()=>page.getByRole('button',{name:'Copy selection link',exact:true}).click());
 const link=await page.getByLabel('Selection link',{exact:true}).inputValue();
 await inSettings(page,()=>page.getByRole('button',{name:'All',exact:true}).click());
 await page.goto(link);
 await expect(page.locator('.rhythm-row input[type=checkbox]:checked')).toHaveCount(2);
 await expect(page.locator('.choices button')).toHaveCount(2);
 await page.goto('/#rhythms=maqsum,invalid');
 await expect(page.getByText('Select at least two rhythms for multiple choice, or use Recall.')).toBeVisible();
 await page.goto('/#rhythms=');
 await expect(page.locator('.rhythm-row input[type=checkbox]:checked')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('alternate names appear only after correct answers, including Hard mode',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&mode=choice');
 await expect(page.locator('.choices button')).toHaveCount(2);
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 const src=await page.locator('.notation img').getAttribute('src');
 await page.locator('.choices').getByRole('button',{name:src!.includes('baladi')?'Malfuf':'Baladi',exact:true}).click();
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await expect(page.getByText('Incorrect, try again',{exact:true})).toBeVisible();
 const nextSrc=await page.locator('.notation img').getAttribute('src');
 const isBaladi=nextSrc!.includes('baladi');
 await page.locator('.choices').getByRole('button',{name:isBaladi?'Baladi':'Malfuf',exact:true}).click();
 await expect(page.locator('#alternate-names')).toContainText(isBaladi?'Masmudi Saghir':'Laff');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await page.goto('/#rhythms=baladi&mode=hard');
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('#alternate-names')).toContainText('Masmudi Saghir');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.getByText('ROUND COMPLETE',{exact:true})).toBeVisible();
 await expect(page.locator('#known')).toHaveText('1');
});

test('audio playback, correct-only notation reveal, shared mode and collapsible settings',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&mode=audio');
 await expect(page.locator('audio')).toHaveCount(1);
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.readyState)).toBeGreaterThan(0);
 await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.play());
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 const source=await page.locator('audio').getAttribute('src');
 await page.locator('.choices').getByRole('button',{name:source!.includes('baladi')?'Malfuf':'Baladi',exact:true}).click();
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('#alternate-names')).toHaveCount(0);
 await expect(page.getByText('Incorrect, try again',{exact:true})).toBeVisible();
 await expect(page.locator('audio')).toHaveAttribute('src',source!);
 const second=await page.locator('audio').getAttribute('src');
 await page.locator('.choices').getByRole('button',{name:second!.includes('baladi')?'Baladi':'Malfuf',exact:true}).click();
 await expect(page.locator('.notation img')).toBeVisible();
 await expect(page.locator('#alternate-names')).toBeVisible();
 await inSettings(page,()=>page.getByRole('button',{name:'Copy selection link',exact:true}).click());
 expect(await page.getByLabel('Selection link',{exact:true}).inputValue()).toContain('audio=1');
 await expect(page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true})).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Next',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Show',exact:true}).check());
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'None',exact:true}).check());
 await expect(page.locator('audio')).toHaveCount(0);
 await expect(page.locator('.notation img')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('audio catalog uses only attributed demonstrations and handles missing tracks',async({page})=>{
 await page.goto('/');
 const rows=await (await page.request.get('/rhythms.json')).json();
 const audioRows=rows.filter(r=>r.audio);
 expect(audioRows).toHaveLength(37);
 for(const row of audioRows){expect(row.audio.performer).toBe('Faisal Zedan');expect(row.audio.source).toContain('/demo/iqaa/tabla/');expect(new URL(row.audio.source).origin).toBe('https://www.maqamworld.com');}
 const missing=rows.find(r=>!r.audio);
 await page.goto('/#rhythms=baladi,'+missing.id+'&mode=audio');
 await expect(page.getByText('Select at least two rhythms with tabla demonstrations. Open Settings to change the selection.')).toBeVisible();
 await expect(page.locator('#audio-availability')).toContainText(missing.name);
 await page.goto('/#rhythms=baladi,malfuf&mode=audio');
 await page.locator('audio').evaluate(a=>a.dispatchEvent(new Event('error')));
 await expect(page.getByText('Audio could not load. Try restarting the round or select Audio: None.')).toBeVisible();
});

test('independent toggles support combined cues, audio recall and URL persistence',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&transcription=1&audio=1&hard=0');
 await expect(page.locator('.notation img')).toBeVisible();
 await expect(page.locator('audio')).toBeVisible();
 await expect(page.locator('.choices button')).toHaveCount(2);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true}).check());
 await expect(page.locator('.choices button')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Reveal answer'})).toBeVisible();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Hide',exact:true}).check());
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('audio')).toBeVisible();
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await expect(page.locator('.notation')).toHaveCount(0);
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('.notation img')).toBeVisible();
 await expect(page.locator('#alternate-names')).toBeVisible();
 await inSettings(page,()=>page.getByRole('button',{name:'Copy selection link',exact:true}).click());
 const url=await page.getByLabel('Selection link',{exact:true}).inputValue();
 expect(url).toContain('transcription=0');expect(url).toContain('audio=1');expect(url).toContain('hard=1');
 await page.goto(url);
 await expect(page.getByRole('radio',{includeHidden:true,name:'Show',exact:true})).not.toBeChecked();
 await expect(page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true})).toBeChecked();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'None',exact:true}).check());
 await expect(page.getByText('Show transcription or select audio in Settings.')).toBeVisible();
 await expect(page.locator('audio')).toHaveCount(0);
 await page.goto('/');
 await expect(page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true})).not.toBeChecked();
 await expect(page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true})).toBeChecked();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Show',exact:true}).check());
 await expect(page.locator('.notation img')).toBeVisible();
 await page.goto('/#rhythms=maqsum&transcription=0&audio=1&hard=1');
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('.notation img')).toBeVisible();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.getByText('ROUND COMPLETE',{exact:true})).toBeVisible();
});

for (const [random,label,file] of [[0,'Form I','aqsaq_f1.png'],[0.99,'Form II','aqsaq_f2.png']] as const) {
 test(`matched ${label} remains fixed until next question`,async({page})=>{
  await page.addInitScript(value=>{Math.random=()=>value;},random);
  await page.goto('/#rhythms=aqsaq_f1&transcription=1&audio=1&hard=1');
  await expect(page.locator('.notation img')).toHaveAttribute('src','https://www.maqamworld.com/note/iqaa/'+file);
  await expect(page.locator('audio')).toHaveAttribute('src',`https://www.maqamworld.com/demo/iqaa/tabla/aqsaq_form${random===0?1:2}.mp3`);
  await expect(page.locator('#form-label')).toHaveCount(0);
  await page.getByRole('button',{name:'Reveal answer'}).click();
  await expect(page.locator('#form-label')).toHaveCount(0);
  await page.getByRole('button',{name:'Got it',exact:true}).click();
  await expect(page.locator('#form-label')).toHaveText(label);
  await expect(page.locator('.notation img')).toHaveAttribute('src','https://www.maqamworld.com/note/iqaa/'+file);
 });
}
test('hard audio uses musical examples paired with the selected form',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.99;});
 await page.goto('/#rhythms=aqsaq_f1,baladi&transcription=0&audio=1&hard=0&hardAudio=1');
 const rows=await (await page.request.get('/rhythms.json')).json();
 const form=rows.find(r=>r.id==='aqsaq_f1').forms[1];
 const source=await page.locator('audio').getAttribute('src');
 expect(form.examples.map(t=>t.source)).toContain(source);
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('#form-label')).toHaveCount(0);
 await expect(page.locator('#track-credit')).toHaveCount(0);
 await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.play());
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await page.locator('.choices').getByRole('button',{name:'Aqsaq',exact:true}).click();
 await expect(page.locator('#form-label')).toHaveText('Form II');
 await expect(page.locator('.notation img')).toHaveAttribute('src',form.notationSource);
 await expect(page.locator('#track-credit')).toBeVisible();
 await expect(page.locator('audio')).toHaveAttribute('src',source!);
 await inSettings(page,()=>page.getByRole('button',{name:'Copy selection link',exact:true}).click());
 expect(await page.getByLabel('Selection link',{exact:true}).inputValue()).toContain('hardAudio=1');
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true}).check());
 await expect(page.locator('audio')).toHaveAttribute('src','https://www.maqamworld.com/demo/iqaa/tabla/aqsaq_form2.mp3');
});
test('every form has valid local assets and separate audio pools',async({page})=>{
 await page.goto('/');
 const rows=await (await page.request.get('/rhythms.json')).json();
 const sources=new Set<string>();
 for(const row of rows)for(const form of row.forms){
  if(form.notation){expect(row.notationSources).toContain(form.notationSource);expect(form.notationSource.split('/').pop()).toBe(form.notation.split('/').pop());}
  else expect(form.notationNote).toBeTruthy();
  for(const t of form.tabla){expect(t.source).toContain('/demo/iqaa/tabla/');expect(t.performer).toBe('Faisal Zedan');sources.add(t.source);}
  for(const t of form.examples){expect(t.source).toContain('/audio/iqaa/');expect(t.source).not.toContain('/demo/');sources.add(t.source);}
 }
 for(const src of sources){expect(new URL(src).origin).toBe('https://www.maqamworld.com');expect(src.endsWith('.mp3')).toBeTruthy();}
 expect(rows.find(r=>r.id==='mudawwar_shami').forms[0].examples.every(t=>t.source.includes('/mudawwar_10_4/'))).toBeTruthy();
});

test('untranscribed tempo variants are labeled without a mismatched score',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.99;});
 await page.goto('/#rhythms=ciftetelli&transcription=0&audio=1&hard=1&hardAudio=1');
 await expect(page.locator('audio')).toHaveCount(1);
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await expect(page.locator('#form-label')).toHaveCount(0);
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('#form-label')).toHaveText('Faster 4/4 form');
 await expect(page.locator('.notation img')).toHaveCount(0);
 await expect(page.getByText('MaqamWorld does not provide a separate transcription for this tempo variant.')).toBeVisible();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Show',exact:true}).check());
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'None',exact:true}).check());
 await expect(page.locator('.notation img')).toHaveCount(0);
 await expect(page.locator('#form-label')).toHaveText('Faster 4/4 form');
});

test('default selection and random sets respect size, audio availability and persistence',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 for(const name of ['Maqsum 4/4','Baladi 4/4','Malfuf 2/4','Ayyub 2/4'])await expect(page.getByRole('checkbox',{includeHidden:true,name,exact:true})).toBeChecked();
 await expect(page.getByRole('button',{name:'Starter set',exact:true})).toHaveCount(0);
 await inSettings(page,()=>page.getByRole('button',{name:'Random',exact:true}).click());
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 await page.reload();
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('builtin:common');
 await inSettings(page,()=>page.getByRole('button',{name:'Clear',exact:true}).click());
 await inSettings(page,()=>page.getByRole('button',{name:'Random',exact:true}).click());
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(4);
 await page.goto('/#rhythms=maqsum,baladi&audio=1');
 await inSettings(page,()=>page.getByRole('button',{name:'Random',exact:true}).click());
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(2);
 await expect(page.locator('#audio-availability')).toHaveText('');
 await expect(page.locator('.choices button')).toHaveCount(2);
 await inSettings(page,()=>page.getByRole('button',{name:'All',exact:true}).click());
 await inSettings(page,()=>page.getByRole('button',{name:'Random',exact:true}).click());
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(37);
 await expect(page.locator('#audio-availability')).toHaveText('');
});

test('audio choices can be selected directly and remain independent of other groups',async({page})=>{
 await page.goto('/#rhythms=baladi,malfuf&transcription=1&audio=0&hard=0');
 await expect(page.getByRole('radio',{includeHidden:true,name:'None',exact:true})).toBeChecked();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Musical examples',exact:true}).check());
 await expect(page.locator('audio')).toHaveAttribute('src',/\/audio\/iqaa\//);
 await expect(page.getByRole('radio',{includeHidden:true,name:'Show',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{includeHidden:true,name:'Multiple choice',exact:true})).toBeChecked();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'None',exact:true}).check());
 await expect(page.locator('audio')).toHaveCount(0);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true}).check());
 await expect(page.locator('audio')).not.toHaveAttribute('src',/\/audio\/iqaa\//);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true}).check());
 await expect(page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true})).toBeChecked();
 await expect(page.getByRole('button',{name:'Reveal answer'})).toBeVisible();
});

test('settings retain rhythm, form, answer, progress and previously selected recordings',async({page})=>{
 await page.goto('/#rhythms=aqsaq_f1,baladi&transcription=1&audio=1');
 const score=await page.locator('.notation img').getAttribute('src');
 const audio=await page.locator('audio').getAttribute('src');
 const options=await page.locator('.choices button').allTextContents();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true}).check());
 await expect(page.locator('.notation img')).toHaveAttribute('src',score!);
 await expect(page.locator('audio')).toHaveAttribute('src',audio!);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Hide',exact:true}).check());
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Musical examples',exact:true}).check());
 const musical=await page.locator('audio').getAttribute('src');
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'None',exact:true}).check());
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Musical examples',exact:true}).check());
 await expect(page.locator('audio')).toHaveAttribute('src',musical!);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Show',exact:true}).check());
 await expect(page.locator('.notation img')).toHaveAttribute('src',score!);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true}).check());
 await expect(page.locator('audio')).toHaveAttribute('src',audio!);
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Multiple choice',exact:true}).check());
 expect(await page.locator('.choices button').allTextContents()).toEqual(options);
 await page.locator('.choices').getByRole('button',{name:score!.includes('aqsaq')?'Aqsaq':'Baladi',exact:true}).click();
 await expect(page.locator('#reviewed')).toHaveText('1');
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Recall',exact:true}).check());
 await expect(page.locator('#reviewed')).toHaveText('1');
 await expect(page.getByRole('button',{name:'Got it',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Next',exact:true})).toBeVisible();
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Multiple choice',exact:true}).check());
 await expect(page.getByText('Correct.',{exact:true})).toBeVisible();
 await expect(page.locator('.choices button').first()).toBeDisabled();
 await expect(page.locator('.notation img')).toHaveAttribute('src',score!);
});
test('unavailable audio keeps the current form and can be switched back',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.99;});
 await page.goto('/#rhythms=sudasi&transcription=1&audio=0&hard=1');
 await expect(page.locator('.notation img')).toHaveAttribute('src','https://www.maqamworld.com/note/iqaa/sudasi-f2.png');
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Tabla',exact:true}).check());
 await expect(page.locator('#audio-unavailable')).toBeVisible();
 await expect(page.locator('audio')).toHaveCount(0);
 await expect(page.locator('.notation img')).toHaveAttribute('src','https://www.maqamworld.com/note/iqaa/sudasi-f2.png');
 await inSettings(page,()=>page.getByRole('radio',{includeHidden:true,name:'Musical examples',exact:true}).check());
 await expect(page.locator('audio')).toBeVisible();
 await expect(page.locator('.notation img')).toHaveAttribute('src','https://www.maqamworld.com/note/iqaa/sudasi-f2.png');
});

test('built-in presets apply immediately and track custom selections',async({page})=>{
 await page.goto('/');
 const rows=await (await page.request.get('/rhythms.json')).json();
 const expectedCommon=['Maqsum','Baladi','Malfuf','Ayyub','Fallahi','Sa‘idi','Wahda','Wahda w-Nuss','Masmudi Kabir'];
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 for(const name of expectedCommon){const r=rows.find(r=>r.name===name);await expect(page.getByRole('checkbox',{includeHidden:true,name:`${r.name} ${r.meter}`,exact:true})).toBeChecked();}
 for(const [key,predicate] of [['odd',(r)=>{const n=Number(r.meter.split('/')[0]);return n>3&&n%2===1;}],['standard',(r)=>{const n=Number(r.meter.split('/')[0]);return n===3||n%2===0;}]] as const){
  await inSettings(page,()=>page.getByLabel('Preset:',{exact:true}).selectOption('builtin:'+key));
   await expect(page.locator('.rhythm-row input:checked')).toHaveCount(rows.filter(predicate).length);
  for(const r of rows)await expect(page.getByRole('checkbox',{includeHidden:true,name:`${r.name} ${r.meter}`,exact:true})).toBeChecked({checked:predicate(r)});
 }
 await inSettings(page,()=>page.getByLabel('Preset:',{exact:true}).selectOption('builtin:common'));
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 await inSettings(page,()=>page.getByRole('button',{name:'Clear',exact:true}).click());
 await inSettings(page,()=>page.getByRole('checkbox',{includeHidden:true,name:'Baladi 4/4',exact:true}).check());
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('');
 await page.reload();
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
 await inSettings(page,()=>page.getByLabel('Preset:',{exact:true}).selectOption('builtin:common'));
 await expect(page.locator('.rhythm-row input:checked')).toHaveCount(9);
});

test('autoplay defaults off, plays on enable and next, and does not restart on reveal',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).playCalls=0;
  HTMLMediaElement.prototype.play=function(){(window as any).playCalls++;return Promise.resolve();};
 });
 await page.goto('/#rhythms=baladi,malfuf&transcription=1&audio=1');
 await expect(page.locator('audio')).toBeVisible();
 await expect(page.getByRole('checkbox',{includeHidden:true,name:'Autoplay',exact:true})).not.toBeChecked();
 expect(await page.evaluate(()=>(window as any).playCalls)).toBe(0);
 const src=await page.locator('audio').getAttribute('src');
 await inSettings(page,()=>page.getByRole('checkbox',{includeHidden:true,name:'Autoplay',exact:true}).check());
 expect(await page.evaluate(()=>(window as any).playCalls)).toBe(1);
 await expect(page.locator('audio')).toHaveAttribute('src',src!);
 await page.locator('.choices').getByRole('button',{name:src!.includes('baladi')?'Baladi':'Malfuf',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).playCalls)).toBe(1);
 await page.getByRole('button',{name:'Next',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).playCalls)).toBe(2);
 await inSettings(page,()=>page.getByRole('checkbox',{includeHidden:true,name:'Autoplay',exact:true}).uncheck());
 await page.getByRole('button',{name:'Restart round',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).playCalls)).toBe(2);
});
test('blocked autoplay offers manual playback and preset edits stay custom',async({page})=>{
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('blocked','NotAllowedError'));});
 await page.goto('/');
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('builtin:common');
 for(const preset of ['common','odd','standard']){
  await inSettings(page,()=>page.getByLabel('Preset:',{exact:true}).selectOption('builtin:'+preset));
  const checkbox=page.locator('.rhythm-row input').first();const checked=await checkbox.isChecked();
  await inSettings(page,()=>checkbox.setChecked(!checked));
  await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('');
  await inSettings(page,()=>checkbox.setChecked(checked));
  await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('');
 }
 await page.goto('/#rhythms=baladi,malfuf&audio=1&autoplay=1');
 await expect(page.getByText('Autoplay was blocked. Press Play to listen.')).toBeVisible();
 await expect(page.locator('audio')).toHaveAttribute('controls','');
 await page.goto('/');
 await expect(page.getByLabel('Preset:',{exact:true})).toHaveValue('builtin:common');
});

test('settings overlay opens on the right without moving the quiz',async({page})=>{
 await page.goto('/');
 const before=await page.locator('.practice').boundingBox();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.locator('.practice').boundingBox()).toEqual(before);
 const drawer=await page.getByRole('dialog').boundingBox();
 expect(drawer!.x).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 expect(await page.locator('.practice').boundingBox()).toEqual(before);
});

test('keyboard answers, audio and drawer guards work without double actions',async({page})=>{
 await page.goto('/#rhythms=maqsum,baladi&audio=1&transcription=1');
 await expect(page.locator('.choices button')).toHaveCount(2);
 await page.keyboard.press('Space');
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 await page.keyboard.press('Space');
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('searchbox').fill('');
 await page.getByRole('searchbox').press('1');
 await expect(page.locator('#reviewed')).toHaveText('0');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 const correct=(await page.locator('.notation img').getAttribute('src'))!.includes('maqsum')?'Maqsum':'Baladi';
 const names=await page.locator('.choices button').allTextContents();
 const wrongIndex=names.findIndex(n=>n!==correct);
 await page.keyboard.press(String(wrongIndex+1));
 await expect(page.locator('.wrong-answer')).toHaveAttribute('aria-description','Incorrect answer');
 await expect(page.locator('.wrong-answer')).toBeDisabled();
 await page.keyboard.press(String(wrongIndex+1));
 await expect(page.locator('#again-count')).toHaveText('1');
 await page.keyboard.press(String(names.indexOf(correct)+1));
 await expect(page.locator('#next')).toBeVisible();
 await page.keyboard.press('Enter');
 await expect(page.locator('#next')).toHaveCount(0);
 await expect(page.locator('.choices button:enabled')).toHaveCount(2);
});

test('completion lists unique misses and practices them without changing selection',async({page})=>{
 await page.goto('/#rhythms=maqsum,baladi');
 await expect(page.locator('.choices button')).toHaveCount(2);
 const missed=(await page.locator('.notation img').getAttribute('src'))!.includes('maqsum')?'Maqsum':'Baladi';
 await page.locator('.choices button').filter({hasNotText:missed}).click();
 for(let i=0;i<3;i++){
  const answer=(await page.locator('.notation img').getAttribute('src'))!.includes('maqsum')?'Maqsum':'Baladi';
  await page.locator('.choices').getByRole('button',{name:answer,exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
 }
 await expect(page.locator('#round-summary')).toHaveText('2 rhythms practiced · 1 without mistakes · 1 missed');
 await expect(page.locator('#missed-rhythms li')).toHaveText([missed]);
 await page.getByRole('button',{name:'Practice missed rhythms'}).click();
 await expect(page.locator('#round-status')).toHaveText('1 left in round');
 await expect(page.locator('#count')).toHaveText('2 / 43');
 await expect(page.locator('#reviewed')).toHaveText('0');
 await page.locator('.choices').getByRole('button',{name:missed,exact:true}).click();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('#round-summary')).toHaveText('1 rhythm practiced · 1 without mistakes · 0 missed');
 await expect(page.locator('#practice-missed')).toHaveCount(0);
 await page.getByRole('button',{name:'Practice again'}).click();
 await expect(page.locator('#round-status')).toHaveText('2 left in round');
});
