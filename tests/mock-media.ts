import {Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Keep automated playback checks independent of the remote host and ignored backups.
// A short silent PCM WAV verifies browser playback against the real catalog URLs.
const samples=8000;
const wave=Buffer.alloc(44+samples*2);
wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVE',8);
wave.write('fmt ',12);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);
wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);
wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(samples*2,40);
const rows=JSON.parse(readFileSync(resolve(__dirname,'../rhythms.json'),'utf8'));
const sources=new Set(rows.flatMap(r=>r.forms.flatMap(f=>[...f.tabla,...f.examples].map(t=>t.source))));
const notationSources=new Set(rows.flatMap(r=>r.notationSources));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
export async function mockMedia(page:Page){
 await page.route('https://www.maqamworld.com/note/iqaa/*.png',async route=>{
  if(!notationSources.has(route.request().url()))throw new Error('Unexpected notation URL: '+route.request().url());
  await route.fulfill({status:200,contentType:'image/png',body:png});
 });
 await page.route('**/assets/notation/**',route=>{throw new Error('Display must not request local backups: '+route.request().url());});
 await page.route('https://www.maqamworld.com/**/*.mp3',async route=>{
  if(!sources.has(route.request().url()))throw new Error('Unexpected audio URL: '+route.request().url());
  await route.fulfill({status:200,contentType:'audio/wav',body:wave});
 });
 await page.route('**/assets/audio/**',route=>{throw new Error('Playback must not request local backups: '+route.request().url());});
}
