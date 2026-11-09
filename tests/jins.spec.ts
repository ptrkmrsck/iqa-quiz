import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const catalog=JSON.parse(readFileSync(resolve(__dirname,'../jins.json'),'utf8'));
const notesFor=id=>catalog.find(r=>r.id===id).notations[0].notes;
const core={bayati:[293.33,320,347.65,391.11],hijaz:[293.33,315,375,391.11],rast:[260.74,293.33,320,347.65,391.11],nahawand:[260.74,293.33,308.25,347.65,391.11]};
test.beforeEach(async({page})=>{
 await page.route('https://www.maqamworld.com/note/jins/*.png',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="664" height="141"/>'}));
 const wave=Buffer.alloc(16044);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVE',8);wave.write('fmt ',12);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(16000,40);
 await page.route('https://www.maqamworld.com/audio/jins/**/*.mp3',async route=>{
  expect(catalog.some(r=>r.examples.some(t=>t.source===route.request().url()))).toBe(true);
  await route.fulfill({contentType:'audio/wav',body:wave});
 });
 await page.route('**/assets/**',()=>{throw Error('Local backup requested');});
 await page.addInitScript(()=>{
  (window as any).played=[];
  const original=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const oscillator=original.call(this);const set=oscillator.frequency.setValueAtTime.bind(oscillator.frequency);oscillator.frequency.setValueAtTime=(value,time)=>{(window as any).played.push(value);return set(value,time);};return oscillator;};
 });
});
async function settings(page,action){await page.getByRole('button',{name:'Settings',exact:true}).click();await action();await page.getByRole('button',{name:'Close',exact:true}).click();}
for(const [id,frequencies] of Object.entries(core))test(`${id} uses exact core pitches and reveals touch targets`,async({page})=>{
 await page.goto(`/jins.html#ajnas=${id}&hard=1&audio=1&transcription=0`);
 await expect(page.getByRole('heading',{name:'Which jins is this?'})).toBeVisible();
 await expect(page.locator('.notation')).toHaveCount(0);
 await page.getByRole('button',{name:'Play reference notes',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).played)).toEqual([...frequencies,...frequencies.slice(0,-1).reverse()]);
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.getByRole('button',{name:'Reveal answer'}).click();
 await expect(page.locator('.pitch-note')).toHaveCount(0);
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await expect(page.locator('.pitch-note')).toHaveCount(notesFor(id).length);
 await page.locator('.pitch-note').first().tap();
 await expect.poll(()=>page.evaluate(()=>(window as any).played.at(-1))).toBe(notesFor(id)[0].frequencyHz);
 await expect(page.locator('#pitch-roles')).toContainText('Tonic:');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('#round-summary')).toHaveText('1 jins practiced · 1 without mistakes · 0 missed');
});
test('retry, settings, missed practice and share links stay within Jins',async({page})=>{
 await page.goto('/jins.html#ajnas=bayati,hijaz&audio=1&transcription=1');
 await expect(page.locator('.choices button')).toHaveCount(2);
 const src=await page.locator('.notation img').getAttribute('src');
 const answer=src!.includes('bayati')?'Bayati':'Hijaz';
 await page.locator('.choices button').filter({hasNotText:answer}).click();
 await expect(page.locator('.wrong-answer')).toHaveAttribute('aria-description','Incorrect answer');
 await expect(page.locator('.pitch-note')).toHaveCount(8);
 await expect(page.locator('.notation')).not.toContainText('Tonic:');
 await settings(page,()=>page.getByRole('checkbox',{name:'Notation',exact:true}).uncheck());
 await expect(page.locator('.notation')).toHaveCount(0);
 await page.locator('.choices').getByRole('button',{name:answer,exact:true}).click();
 await expect(page.locator('.notation img')).toHaveAttribute('src',src!);
 await expect(page.locator('.pitch-note')).toHaveCount(8);
 await settings(page,async()=>{
  await page.getByRole('button',{name:'Copy selection link'}).click();
  await expect(page.locator('#share-url')).toHaveValue(/jins.html#ajnas=bayati%2Chijaz/);
 });
 await page.getByRole('button',{name:'Next',exact:true}).click();
 for(let i=0;i<2;i++){
  await settings(page,()=>page.getByRole('checkbox',{name:'Notation',exact:true}).check());
  const source=await page.locator('.notation img').getAttribute('src');
  await page.locator('.choices').getByRole('button',{name:source!.includes('bayati')?'Bayati':'Hijaz',exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
 }
 await expect(page.locator('#round-summary')).toHaveText('2 ajnas practiced · 1 without mistakes · 1 missed');
 await page.getByRole('button',{name:'Practice missed ajnas'}).click();
 await expect(page.locator('#round-status')).toHaveText('1 left in round');
 await page.getByRole('link',{name:'Iqa',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Maqam World Practice',exact:true})).toBeVisible();
 await expect(page.locator('.choices button')).toHaveCount(4);
 await page.getByRole('link',{name:'Jins',exact:true}).click();
 await expect(page.locator('.choices button')).toHaveCount(2);
 await expect(page.locator('#count')).toHaveText('2 / 24');
});
test('empty selections and audio controls survive drawer and resize',async({page})=>{
 await page.goto('/jins.html#ajnas=bayati,hijaz,rast,nahawand&audio=1');
 await page.getByRole('button',{name:'Play reference notes',exact:true}).click();
 await expect(page.locator('#reference-stop')).toBeEnabled();
 await settings(page,()=>page.getByRole('radio',{name:'Recall',exact:true}).check());
 await expect(page.locator('#reference-stop')).toBeDisabled();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await settings(page,()=>page.getByRole('button',{name:'Clear',exact:true}).click());
 await expect(page.getByText('Select at least one jins to begin practicing.')).toBeVisible();
});

test('fresh Jins enables reference playback and note buttons accept keyboard activation',async({page})=>{
 await page.goto('/jins.html');
 await expect(page.locator('#reference-play')).toBeVisible();
 const source=await page.locator('.notation img').getAttribute('src');
 const row=catalog.find(r=>r.notations.some(n=>n.source===source));
 const id=row.id;
 await page.locator('.choices').getByRole('button',{name:row.name,exact:true}).click();
 await page.locator('.pitch-note').first().focus();
 await page.keyboard.press('Space');
 await expect.poll(()=>page.evaluate(()=>(window as any).played)).toEqual([row.notations.find(n=>n.source===source).notes[0].frequencyHz]);
});

for(const id of Object.keys(core))test(`${id}: every displayed note plays before answering without revealing roles`,async({page})=>{
 await page.goto(`/jins.html#ajnas=${id}&audio=1&transcription=1&hard=1`);
 await expect(page.getByRole('heading',{name:'Which jins is this?'})).toBeVisible();
 const notes=notesFor(id);
 await expect(page.locator('.pitch-note')).toHaveCount(notes.length);
 for(let i=0;i<notes.length;i++){
  const button=page.locator('.pitch-note').nth(i);
  await expect(button).not.toHaveAttribute('aria-label',/tonic|ghammaz/);
  await button.tap();
  await expect.poll(()=>page.evaluate(()=>(window as any).played.at(-1))).toBe(notes[i].frequencyHz);
 }
 await expect(page.getByRole('heading',{name:'Which jins is this?'})).toBeVisible();
 await expect(page.locator('.notation')).not.toContainText('Tonic:');
 const style=await page.locator('.pitch-note').first().evaluate(el=>({border:getComputedStyle(el).borderWidth,background:getComputedStyle(el).backgroundColor}));
 expect(style).toEqual({border:'0px',background:'rgba(0, 0, 0, 0)'});
});

test('whole image maps taps to nearest horizontal note at any height and viewport size',async({page})=>{
 await page.goto('/jins.html#ajnas=nahawand&hard=1&transcription=1');
 const diagram=catalog.find(r=>r.id==='nahawand').notations[0];
 await expect(page.locator('.pitch-note')).toHaveCount(diagram.notes.length);
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:844});
  const box=(await page.locator('.pitch-notation').boundingBox())!;
  for(const [i,note] of diagram.notes.entries()){
   const left=i?(diagram.notes[i-1].position.x+note.position.x)/2:0;
   const right=i<diagram.notes.length-1?(note.position.x+diagram.notes[i+1].position.x)/2:diagram.width;
   // Exercise both sides of each region, including narrow alternative notes and image margins.
   for(const [x,y] of [[left+1,2],[right-1,box.height-2]]){
    await page.touchscreen.tap(box.x+x/diagram.width*box.width,box.y+y);
    await expect.poll(()=>page.evaluate(()=>(window as any).played.at(-1))).toBe(note.frequencyHz);
    await expect(page.locator('.pitch-highlight')).toBeVisible();
   }
  }
 }
 await expect(page.locator('.pitch-highlight')).toBeHidden();
 await expect(page.getByRole('heading',{name:'Which jins is this?'})).toBeVisible();
});

test('musical examples match jins, loop, preserve retries, and reveal credits only when correct',async({page})=>{
 await page.goto('/jins.html#ajnas=bayati,hijaz,rast,nahawand&audio=1&hardAudio=1&transcription=0');
 const player=page.locator('audio');await expect(player).toBeVisible();
 const source=await player.getAttribute('src');
 const row=catalog.find(r=>r.examples.some(t=>t.source===source));
 const track=row.examples.find(t=>t.source===source);
 await expect(page.locator('#reference-play')).toHaveCount(0);
 await expect(page.locator('.notation')).toHaveCount(0);
 await expect(page.locator('#track-credit')).toHaveCount(0);
 await expect(player).toHaveAttribute('loop','');
 await page.keyboard.press('Space');
 await expect.poll(()=>player.evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 await player.evaluate(a=>a.setAttribute('data-reuse-check','yes'));
 await page.locator('.choices button').filter({hasNotText:row.name}).first().click();
 await expect(player).toHaveAttribute('src',source!);
 await expect(player).toHaveAttribute('data-reuse-check','yes');
 await expect(page.locator('#track-credit')).toHaveCount(0);
 await page.locator('.choices').getByRole('button',{name:row.name,exact:true}).click();
 await expect(page.locator('#track-credit')).toContainText(track.title);
 await expect(player).toHaveAttribute('data-reuse-check','yes');
 await page.locator('.pitch-note').first().tap();
 await expect.poll(()=>player.evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await settings(page,async()=>{await page.getByRole('checkbox',{name:'Reference notes',exact:true}).check();await page.getByRole('checkbox',{name:'Musical examples',exact:true}).uncheck();});
 await expect(page.locator('audio')).toHaveCount(0);
 await expect(page.locator('#reference-play')).toBeVisible();
 await settings(page,()=>page.getByRole('checkbox',{name:'Musical examples',exact:true}).check());
 await expect(page.locator('audio')).toHaveAttribute('src',source!);
 await settings(page,async()=>{
  await page.getByRole('button',{name:'Copy selection link'}).click();
  await expect(page.locator('#share-url')).toHaveValue(/hardAudio=1/);
 });
 await page.goto('/jins.html');
 await expect(page.locator('audio')).toBeVisible();
 await settings(page,async()=>{await page.getByRole('checkbox',{name:'Reference notes',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Musical examples',exact:true}).uncheck();});
 await expect(page.locator('audio')).toHaveCount(0);
});

test('cue toggles are independent, preserve the question, and audio sources stop each other',async({page})=>{
 await page.goto('/jins.html#ajnas=bayati,hijaz&transcription=1&referenceNotes=1&musicalExamples=1');
 const image=await page.locator('.notation img').getAttribute('src');
 const source=await page.locator('audio').getAttribute('src');
 await page.getByRole('button',{name:'Play reference notes',exact:true}).click();
 await expect(page.locator('#reference-stop')).toBeEnabled();
 await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.play());
 await expect(page.locator('#reference-stop')).toBeDisabled();
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 await page.getByRole('button',{name:'Play reference notes',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await expect(page.locator('#reference-stop')).toBeEnabled();
 for(const [notation,reference,music] of [[false,false,false],[true,false,false],[false,true,false],[false,false,true],[true,true,false],[true,false,true],[false,true,true],[true,true,true]]){
  await settings(page,async()=>{
   await page.getByRole('checkbox',{name:'Notation',exact:true}).setChecked(notation);
   await page.getByRole('checkbox',{name:'Reference notes',exact:true}).setChecked(reference);
   await page.getByRole('checkbox',{name:'Musical examples',exact:true}).setChecked(music);
  });
  await expect(page.locator('.notation')).toHaveCount(notation?1:0);
  await expect(page.locator('#reference-play')).toHaveCount(reference?1:0);
  await expect(page.locator('audio')).toHaveCount(music?1:0);
  if(notation)await expect(page.locator('.notation img')).toHaveAttribute('src',image!);
  if(music)await expect(page.locator('audio')).toHaveAttribute('src',source!);
 }
 await settings(page,async()=>{
  await page.getByRole('button',{name:'Copy selection link'}).click();
  await expect(page.locator('#share-url')).toHaveValue(/referenceNotes=1&musicalExamples=1/);
 });
 await page.goto('/jins.html');
 await expect(page.locator('#reference-play')).toBeVisible();
 await expect(page.locator('audio')).toBeVisible();
 await expect(page.locator('.notation')).toBeVisible();
});

test('all 24 ajnas have valid outlines, source pitches and matched recordings',async({page})=>{
 await page.goto('/jins.html');
 await expect(page.locator('.rhythm-row')).toHaveCount(24);
 const study=await page.evaluate(()=>rhythms.map(r=>({id:r.id,forms:r.forms.map(f=>({id:f.id,label:f.label,tonic:f.tonic,ghammaz:f.ghammaz,sequence:f.sequence,notes:f.diagram.notes,examples:f.examples}))})));
 expect(study.reduce((sum,r)=>sum+r.forms.length,0)).toBe(25);
 expect(study.flatMap(r=>r.forms.flatMap(f=>f.examples))).toHaveLength(153);
 for(const row of study)for(const form of row.forms){
  expect(form.sequence[0]).toEqual(form.tonic);
  expect(form.sequence.at(-1)).toEqual(form.tonic);
  for(const note of form.sequence)expect(form.notes).toContainEqual(note);
  expect(form.examples.length).toBeGreaterThan(0);
 }
 const ajam=study.find(r=>r.id==='ajam')!;
 expect(ajam.forms.map(f=>f.examples.length)).toEqual([6,3]);
 expect(ajam.forms[0].examples.every(t=>t.source.includes('/ajam/'))).toBe(true);
 expect(ajam.forms[1].examples.every(t=>t.source.includes('/ajam-3note/'))).toBe(true);
 const upper=study.find(r=>r.id==='upper_rast')!.forms[0];
 expect(upper.sequence.map(n=>n.frequencyHz)).toEqual([521.48,482,440,391.11,440,482,521.48]);
 for(const row of study){
  await page.goto(`/jins.html#ajnas=${row.id}&hard=1&referenceNotes=1&musicalExamples=1&transcription=1`);
  await expect(page.locator('#reference-play')).toBeVisible();
  await expect(page.locator('audio')).toBeVisible();
  await page.getByRole('button',{name:'Reveal answer'}).click();
  await page.getByRole('button',{name:'Got it',exact:true}).click();
  await expect(page.locator('#pitch-roles')).toContainText('Tonic:');
 }
});

test('presets apply instantly and both Ajam versions reveal matched version labels',async({page})=>{
 await page.goto('/jins.html');
 await expect(page.locator('#count')).toHaveText('8 / 24');
 await settings(page,()=>page.locator('#presets').selectOption('builtin:all'));
 await expect(page.locator('#count')).toHaveText('24 / 24');
 await settings(page,()=>page.locator('#presets').selectOption('builtin:d'));
 await expect(page.locator('#count')).toHaveText('6 / 24');
 await settings(page,()=>page.getByRole('checkbox',{name:'Lami 4 notes',exact:true}).uncheck());
 await expect(page.locator('#presets')).toHaveValue('');
 for(const [random,label,path] of [[0,'5-note version','/ajam/'],[.99,'3-note version','/ajam-3note/']] as const){
  await page.evaluate(value=>{Math.random=()=>value;},random);
  await page.goto(`/jins.html#ajnas=ajam&hard=1&referenceNotes=1&musicalExamples=1&transcription=1&test=${random}`);
  // Hash navigation retains the injected RNG and creates a fresh question.
  await expect(page.locator('audio')).toHaveAttribute('src',new RegExp(path));
  await expect(page.locator('#form-label')).toHaveCount(0);
  await page.getByRole('button',{name:'Reveal answer'}).click();
  await page.getByRole('button',{name:'Got it',exact:true}).click();
  await expect(page.locator('#form-label')).toHaveText(label);
 }
});

test('interrupting attack, sustain and release fades without a waveform jump or later queued notes',async({page})=>{
 await page.goto('/jins.html');
 await expect(page.locator('#reference-play')).toBeVisible();
 const results=await page.evaluate(async()=>{
  const results=[];
  for(const time of [.04,.2,.51]){
   const offline=new OfflineAudioContext(1,48000,48000);
   const player=new PitchPlayer();
   player.context={get currentTime(){return offline.currentTime;},state:'running',resume:()=>Promise.resolve(),createOscillator:()=>offline.createOscillator(),createGain:()=>offline.createGain(),destination:offline.destination};
   await player.play([440,660]);
   const paused=offline.suspend(time);const rendering=offline.startRendering();
   await paused;const stoppedAt=offline.currentTime;player.stop();player.stop();await offline.resume();
   const data=(await rendering).getChannelData(0);
   const start=Math.floor((stoppedAt-.005)*48000),end=Math.ceil((stoppedAt+.025)*48000);
   let jump=0,tail=0;
   for(let i=start+1;i<end;i++)jump=Math.max(jump,Math.abs(data[i]-data[i-1]));
   for(let i=Math.ceil((stoppedAt+.025)*48000);i<data.length;i++)tail=Math.max(tail,Math.abs(data[i]));
   results.push({jump,tail});
  }
  return results;
 });
 for(const result of results){expect(result.jump).toBeLessThan(.02);expect(result.tail).toBeLessThan(.00001);}
});

test('tone options apply to sequences and tapped notes without changing the question',async({page})=>{
 await page.goto('/jins.html#ajnas=bayati,hijaz&referenceNotes=1&musicalExamples=1&transcription=1');
 const src=await page.locator('.notation img').getAttribute('src');
 const recording=await page.locator('audio').getAttribute('src');
 for(const tone of ['sine','square','sawtooth','triangle']){
  await settings(page,()=>page.getByLabel('Tone',{exact:true}).selectOption(tone));
  await expect(page.locator('.notation img')).toHaveAttribute('src',src!);
  await expect(page.locator('audio')).toHaveAttribute('src',recording!);
  await page.getByRole('button',{name:'Play reference notes',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>[...pitchPlayer.voices].filter(v=>!v.released).map(v=>v.oscillator.type))).toEqual(Array(7).fill(tone));
  await page.locator('.pitch-note').first().tap();
  await expect.poll(()=>page.evaluate(()=>[...pitchPlayer.voices].filter(v=>!v.released).map(v=>v.oscillator.type))).toEqual([tone]);
 }
 await settings(page,async()=>{
  await page.getByRole('button',{name:'Copy selection link'}).click();
  await expect(page.locator('#share-url')).toHaveValue(/tone=triangle/);
 });
 await page.goto('/jins.html');
 await settings(page,()=>expect(page.getByLabel('Tone',{exact:true})).toHaveValue('triangle'));
 await page.goto('/jins.html#ajnas=bayati,hijaz&tone=square');
 await settings(page,()=>expect(page.getByLabel('Tone',{exact:true})).toHaveValue('square'));
 await page.goto('/jins.html#ajnas=bayati,hijaz&tone=invalid');
 await settings(page,()=>expect(page.getByLabel('Tone',{exact:true})).toHaveValue('sine'));
});
