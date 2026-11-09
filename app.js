const $ = s => document.querySelector(s);
const section=window.quizSection;
const KEY = section?.key||'iqa-practice-v1';
const singular=section?.singular||'rhythm', plural=section?.plural||'rhythms';
const selectionKey=section?.selectionKey||'rhythms';
let rhythms = [], selected = new Set(), queue = [], current, revealed = false;
let stats = {reviewed:0,known:0,again:0};
let history = {};
let roundMissed = new Set(), roundSeen = new Set();
let choices = [], answered = null, wrongChoices = new Set();
let transcription = true, audioEnabled = !!section, hard = false, hardAudio = false, autoplay = false;
let referenceEnabled=!!section;
let activePreset = 'common', autoplayRequested = false, questionNumber = 0;
let currentForm = null, currentTrack = null, questionTracks = {};
const defaultNames = section?.defaults||['Maqsum','Baladi','Malfuf','Ayyub','Fallahi','Sa‘idi','Wahda','Wahda w-Nuss','Masmudi Kabir'];
function builtInPresets(){
 if(section)return section.presets(rhythms);
 const odd=r=>Number(r.meter.split('/')[0])>3&&Number(r.meter.split('/')[0])%2===1;
 return [
  {key:'common',name:'Common rhythms',ids:rhythms.filter(r=>defaultNames.includes(r.name)).map(r=>r.id),note:'9 rhythms across folk, popular and tarab repertoire. Curated from MaqamWorld; not a frequency ranking.'},
  {key:'standard',name:'Even & triple meters',ids:rhythms.filter(r=>!odd(r)).map(r=>r.id),note:'Even beat counts, plus 3/4 and 3/8. Includes long even cycles; based on the index meter.'},
  {key:'odd',name:'Odd meters',ids:rhythms.filter(odd).map(r=>r.id),note:'Odd beat counts above three (5, 7, 9, 11, 13, 17, 19). Based on the index meter.'}
 ];
}
function syncPreset(){
 const match=builtInPresets().find(p=>p.key===activePreset);
 $('#presets').value=match?'builtin:'+match.key:'';
 $('#preset-description').textContent=match?.note||'';
}
function save(){try{localStorage.setItem(KEY,JSON.stringify({selected:[...selected],history,options:{transcription,audioEnabled,hard,hardAudio,autoplay,...(section?{referenceNotes:referenceEnabled,musicalExamples:hardAudio,tone:section.tone()}:{})}}));}catch{$('#storage-note').textContent='Storage unavailable. Changes last for this visit only.';}}
function shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function list(){
 syncPreset();
 const query=$('#search').value.toLowerCase();
 $('#count').textContent=`${selected.size} / ${rhythms.length}`;
 $('#rhythms').replaceChildren();
 rhythms.filter(r=>`${r.name} ${r.meter}`.toLowerCase().includes(query)).forEach(r=>{
  const label=document.createElement('label'); label.className='rhythm-row';
  const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(r.id);
  input.addEventListener('change',()=>{activePreset='';input.checked?selected.add(r.id):selected.delete(r.id);save();list();start();});
  const name=document.createElement('span');name.textContent=r.name;
  const meter=document.createElement('span');meter.className='meter';meter.textContent=r.meter;
  label.append(input,name,meter);$('#rhythms').append(label);
 });
 if(!$('#rhythms').children.length) $('#rhythms').textContent=`No matching ${plural}.`;
}
function availableForms(rhythm){if(section)return rhythm.forms;return rhythm.forms.filter(form=>audioEnabled?(hardAudio?form.examples:form.tabla).length>0:!!form.notation);}
function eligible(){return rhythms.filter(r=>selected.has(r.id)&&availableForms(r).length);}
function pick(items){return items[Math.floor(Math.random()*items.length)];}
function start(){beginRound(eligible());}
function beginRound(items){queue=shuffle([...items]);stats={reviewed:0,known:0,again:0};roundMissed=new Set();roundSeen=new Set();next();}
function showCompletion(card){
 const heading=document.createElement('h2');heading.textContent='ROUND COMPLETE';card.append(heading);
 const summary=document.createElement('p');summary.id='round-summary';summary.textContent=`${roundSeen.size} ${roundSeen.size===1?singular:plural} practiced · ${roundSeen.size-roundMissed.size} without mistakes · ${roundMissed.size} missed`;card.append(summary);
 const missed=rhythms.filter(r=>roundMissed.has(r.id));
 if(missed.length){
  const label=document.createElement('p');label.textContent=`Missed ${plural}:`;card.append(label);
  const list=document.createElement('ul');list.id='missed-rhythms';
  for(const rhythm of missed){const item=document.createElement('li');item.textContent=rhythm.name;list.append(item);}card.append(list);
 }
 const actions=document.createElement('div');actions.className='actions';
 if(missed.length){const retry=document.createElement('button');retry.id='practice-missed';retry.textContent=`Practice missed ${plural}`;retry.disabled=!missed.some(r=>availableForms(r).length);retry.onclick=()=>{beginRound(missed.filter(r=>availableForms(r).length));$('#card button')?.focus();};actions.append(retry);}
 const repeat=document.createElement('button');repeat.id='repeat';repeat.textContent='Practice again';repeat.onclick=start;actions.append(repeat);card.append(actions);
}
function next(){section?.stop();questionNumber++;current=queue.shift();while(current&&!availableForms(current).length)current=queue.shift();revealed=false;answered=null;wrongChoices=new Set();questionTracks={};
 currentForm=current?pick(availableForms(current)):null;
 updateTrack();
 choices=current?shuffle([current,...shuffle(eligible().filter(r=>r.id!==current.id)).slice(0,3)]):[];
 render();}
function updateTrack(){
 currentTrack=null;
 if((section&&!hardAudio)||!currentForm||!audioEnabled)return;
 const pool=hardAudio?'examples':'tabla';
 if(!(pool in questionTracks))questionTracks[pool]=pick(currentForm[pool])||null;
 currentTrack=questionTracks[pool];
}
function updateOptions(){
 if(section&&!referenceEnabled)section.stop();
 save();
 if(!current&&stats.reviewed===0){queue=shuffle(eligible());next();return;}
 updateTrack();render();
}
function showAlternateNames(card){
 if(!current.alternateNames?.length)return;
 const section=document.createElement('div');section.id='alternate-names';
 const heading=document.createElement('p');heading.textContent='Also known as:';section.append(heading);
 const names=document.createElement('ul');
 for(const alias of current.alternateNames){const item=document.createElement('li');item.textContent=alias.name+(alias.note?` (${alias.note})`:'');names.append(item);}
 section.append(names);card.append(section);
}
function render(){
 $('#reviewed').textContent=stats.reviewed;$('#known').textContent=stats.known;$('#again-count').textContent=stats.again;
 $('#round-status').textContent=current?`${queue.length+1} left in round`:'';
 $('#active-mode').textContent=[transcription?(section?.notationLabel||'Transcription'):null,section?(referenceEnabled?'Reference notes':null):(audioEnabled?(hardAudio?'Musical examples':'Tabla'):null),section&&hardAudio?'Musical examples':null,hard?'Recall':'Multiple choice'].filter(Boolean).join(' · ');
 const missing=rhythms.filter(r=>selected.has(r.id)&&!availableForms(r).length);
 $('#audio-availability').textContent=audioEnabled&&missing.length?`No ${hardAudio?'musical example':'tabla demonstration'}; excluded from audio: ${missing.map(r=>r.name).join(', ')}.`:'';
 const card=$('#card');
 const previousImage=card.querySelector('.notation img');
 const previousPlayer=card.querySelector('audio');
 const reusePlayer=previousPlayer&&audioEnabled&&currentTrack&&previousPlayer.getAttribute('src')===currentTrack.source&&previousPlayer.dataset.question===String(questionNumber);
 if(!reusePlayer||(!hard&&choices.length<2))previousPlayer?.pause();
 card.replaceChildren();
 const correct=current&&(answered===current.id||answered==='known');
 $('.legend').hidden=!!section||(!transcription&&!correct);
 if(!transcription&&!audioEnabled){card.innerHTML=`<p>Show ${section?'notation':'transcription'} or select audio in Settings.</p>`;return;}
 if(!section&&(!current||(!hard&&choices.length<2))&&audioEnabled&&eligible().length<(hard?1:2)){card.innerHTML=`<p>Select at least ${hard?'one rhythm':'two rhythms'} with ${hardAudio?'musical examples':'tabla demonstrations'}. Open Settings to change the selection.</p>`;return;}
 if(!hard&&selected.size===1){card.innerHTML=`<p>Select at least two ${plural} for multiple choice, or use Recall.</p>`;return;}
 if(!current){$('.legend').hidden=true;if(roundSeen.size)showCompletion(card);else card.innerHTML=`<div class="empty"><p class="muted">Select at least one ${singular} to begin practicing.</p></div>`;return;}
 const title=document.createElement('h2');title.textContent=section?.prompt||'Which iqa‘ is this?';
 const notation=section?section.notation(currentForm,revealed,correct):document.createElement('div');notation.className='notation';
 if(!section&&currentForm.notation){
  const img=document.createElement('img');img.src=currentForm.notationSource;img.alt=revealed?`${current.name} rhythm notation`:'Rhythm notation to identify';
  img.addEventListener('error',()=>{notation.textContent='Notation could not load. Check your connection and try restarting the round.';});notation.append(img);
 }else if(!section){notation.textContent=currentForm.notationNote;}
 card.append(title);
 const newImage=notation.querySelector('img');
 if(previousImage?.naturalWidth&&newImage&&previousImage.src===newImage.src){previousImage.alt=newImage.alt;newImage.replaceWith(previousImage);}
 if(transcription)card.append(notation);
 if(section&&referenceEnabled)section.audio(card,currentForm);
 if(!section&&audioEnabled&&!currentTrack){
  const unavailable=document.createElement('p');unavailable.id='audio-unavailable';unavailable.textContent='No recording of this type for the current form. Choose another audio option or show the transcription.';card.append(unavailable);
 }
 if(audioEnabled&&currentTrack){
  const player=reusePlayer?previousPlayer:document.createElement('audio');player.controls=true;player.loop=true;player.preload='metadata';
  if(!reusePlayer)player.src=currentTrack.source;player.dataset.question=String(questionNumber);
  if(section)player.onplay=()=>section.stop();
  player.setAttribute('aria-label',hardAudio?'Musical example':'Tabla demonstration by Faisal Zedan');
  const error=document.createElement('p');error.setAttribute('role','status');
  player.onerror=()=>{error.textContent='Audio could not load. Try restarting the round or select Audio: None.';};
  card.append(player,error);
  if(autoplay&&(autoplayRequested||(!reusePlayer&&!revealed&&answered===null))){
   player.play().catch(()=>{if(player.isConnected)error.textContent='Autoplay was blocked. Press Play to listen.';});
  }
  autoplayRequested=false;
 }
 if(!hard){
  const options=document.createElement('div');options.className='choices';
  for(const [index,choice] of choices.entries()){const button=document.createElement('button');button.textContent=choice.name;button.disabled=answered!==null||wrongChoices.has(choice.id);
   button.setAttribute('aria-keyshortcuts',String(index+1));button.title=`Answer ${index+1}`;
   if(wrongChoices.has(choice.id)){button.classList.add('wrong-answer');button.setAttribute('aria-description','Incorrect answer');}
   if(answered===choice.id)button.classList.add('correct-answer');
   button.onclick=()=>{
    if(answered!==null||wrongChoices.has(choice.id))return;
    if(choice.id===current.id){answered=choice.id;revealed=true;record('known');}
    else{wrongChoices.add(choice.id);record('again',wrongChoices.size===1);}
    render();
    if(answered!==null)$('#next').focus({preventScroll:true});else $('.choices button:not(:disabled)')?.focus();
   };options.append(button);}
  card.append(options);
  if(answered===null){const area=document.createElement('div');area.className='answer-actions';const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.textContent=wrongChoices.size?'Incorrect, try again':'';area.append(feedback);card.append(area);}
  if(answered!==null)showAnswerActions(card,correct,notation);
 }else if(answered!==null){
  showAnswerActions(card,correct,notation);
 }else if(!revealed){const btn=document.createElement('button');btn.className='primary';btn.textContent='Reveal answer';btn.onclick=()=>{revealed=true;render();$('#again').focus();};card.append(btn);}
 else{
  const name=document.createElement('h3');name.textContent=current.name;card.append(name);
  const link=document.createElement('a');link.className='answer-link';link.href=current.source;link.target='_blank';link.rel='noopener';link.textContent='MaqamWorld source';card.append(link);
  const actions=document.createElement('div');actions.className='actions';
  for(const [id,label,cls] of [['again','Again','secondary'],['known','Got it','primary']]){const btn=document.createElement('button');btn.id=id;btn.textContent=label;btn.className=cls;btn.onclick=()=>rate(id);actions.append(btn);}card.append(actions);
 }
}
function showAnswerActions(card,correct,notation){
 const actions=document.createElement('div');actions.className='answer-actions';
 const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.textContent=correct?'Correct.':`Incorrect. Answer: ${current.name}. This ${singular} will repeat.`;
 const button=document.createElement('button');button.id='next';button.textContent='Next';button.onclick=()=>{next();$('#card button')?.focus();};
 actions.append(feedback,button);card.append(actions);
 const name=document.createElement('h3');name.textContent=current.name;card.append(name);
 if(correct&&!transcription)card.append(notation);
 if(correct&&section)card.append(section.details(currentForm));
 if(correct&&!section&&current.forms.length>1){const form=document.createElement('p');form.id='form-label';form.textContent=currentForm.label;card.append(form);}
 if(correct)showAlternateNames(card);
 if(correct&&currentTrack&&hardAudio){const credit=document.createElement('p');credit.id='track-credit';credit.textContent=[currentTrack.title,...currentTrack.credits].filter(Boolean).join(' — ');card.append(credit);}
 const link=document.createElement('a');link.href=current.source;link.target='_blank';link.rel='noopener';link.textContent='MaqamWorld source';card.append(link);
}
function record(result,requeue=true){roundSeen.add(current.id);if(result==='again')roundMissed.add(current.id);stats.reviewed++;stats[result]++;history[current.id]??={known:0,again:0};history[current.id][result]++;if(result==='again'&&requeue)queue.splice(Math.min(3,queue.length),0,current);save();}
function rate(result){record(result);if(result==='known'){answered='known';render();$('#next').focus({preventScroll:true});}else{next();$('#card button')?.focus();}}
document.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||drawer.open)return;
 const target=event.target;
 if(target instanceof Element&&target.closest('input,textarea,select,audio,.pitch-note,[contenteditable="true"]'))return;
 if(/^[1-4]$/.test(event.key)&&!hard){
  const button=$('.choices')?.children[Number(event.key)-1];
  if(button&&!button.disabled){event.preventDefault();button.click();}
 }else if(event.code==='Space'){
  if(section&&referenceEnabled&&!($('#card audio')&&!$('#card audio').paused)){if($('#reference-play')){event.preventDefault();section.toggleAudio();}return;}
  const player=$('#card audio');if(!player)return;
  event.preventDefault();if(player.paused)player.play().catch(()=>{});else player.pause();
 }else if(event.key==='Enter'&&$('#next')&&!(target instanceof Element&&target.closest('a,button:not(#next):not(.choices button),summary'))){event.preventDefault();$('#next').click();}
});
$('#search').addEventListener('input',list);
$('#restart').onclick=start;
for(const id of ['all','none'])$('#'+id).onclick=()=>{applySelection(id==='all'?rhythms.map(r=>r.id):[]);};
$('#random').onclick=()=>{
 const pool=rhythms.filter(r=>availableForms(r).length);
 const count=Math.min(pool.length,Math.max(hard?1:2,selected.size||4));
 applySelection(shuffle(pool).slice(0,count).map(r=>r.id));
};
function presetList(){
 const select=$('#presets');select.replaceChildren(new Option('Custom selection',''));
 builtInPresets().forEach(p=>select.add(new Option(p.name,'builtin:'+p.key)));
 syncPreset();
}
function applySelection(ids,preset=''){activePreset=preset;selected=new Set(ids.filter(id=>rhythms.some(r=>r.id===id)));save();list();start();}
function readLink(){const params=new URLSearchParams(location.hash.slice(1));if(!params.has(selectionKey))return false;
 // Keep older shared mode links working.
 transcription=params.has('transcription')?params.get('transcription')==='1':params.get('mode')!=='audio';
 audioEnabled=params.has('audio')?params.get('audio')==='1':params.get('mode')==='audio';
 hard=params.has('hard')?params.get('hard')==='1':params.get('mode')==='hard';
 hardAudio=params.get('hardAudio')==='1';
 autoplay=!section&&params.get('autoplay')==='1';
 if(section){
  section.setTone(params.get('tone'));
  referenceEnabled=params.has('referenceNotes')?params.get('referenceNotes')==='1':audioEnabled&&!hardAudio;
  hardAudio=params.has('musicalExamples')?params.get('musicalExamples')==='1':audioEnabled&&hardAudio;
  audioEnabled=referenceEnabled||hardAudio;
 }
 syncOptions();
 const ids=params.get(selectionKey).split(',');
 const preset=builtInPresets().find(p=>p.ids.length===ids.length&&p.ids.every(id=>ids.includes(id)));
 applySelection(ids,preset?.key||'');return true;}
function syncOptions(){
 $('#autoplay').checked=autoplay;
 if(section){
  $('#note-tone').value=section.tone();
  $('#notation-enabled').checked=transcription;$('#reference-enabled').checked=referenceEnabled;$('#examples-enabled').checked=hardAudio;
 }else{
  $(`input[name="transcription"][value="${transcription?'show':'hide'}"]`).checked=true;
  $(`input[name="audio"][value="${audioEnabled?(hardAudio?'hard':'basic'):'none'}"]`).checked=true;
 }
 $(`input[name="answers"][value="${hard?'recall':'choice'}"]`).checked=true;
}
$('#quiz-options').addEventListener('change',()=>{
 if(section){
  section.setTone($('#note-tone').value);
  transcription=$('#notation-enabled').checked;referenceEnabled=$('#reference-enabled').checked;hardAudio=$('#examples-enabled').checked;audioEnabled=referenceEnabled||hardAudio;
 }else{
 transcription=$('input[name="transcription"]:checked').value==='show';
 const audio=$('input[name="audio"]:checked').value;
 audioEnabled=audio!=='none';hardAudio=audio==='hard';
 }
 hard=$('input[name="answers"]:checked').value==='recall';
 const enabled=$('#autoplay').checked;autoplayRequested=enabled&&!autoplay;autoplay=enabled;
 updateOptions();
});
$('#presets').onchange=()=>{
 const preset=builtInPresets().find(p=>'builtin:'+p.key===$('#presets').value);
 if(preset)applySelection(preset.ids,preset.key);
};
$('#share').onclick=async()=>{
 const url=new URL(location.href);url.hash=new URLSearchParams({[selectionKey]:[...selected].sort().join(','),transcription:transcription?'1':'0',audio:audioEnabled?'1':'0',hard:hard?'1':'0',hardAudio:hardAudio?'1':'0',autoplay:autoplay?'1':'0',...(section?{referenceNotes:referenceEnabled?'1':'0',musicalExamples:hardAudio?'1':'0',tone:section.tone()}:{})}).toString();
 $('#share-url').hidden=false;$('#share-url').value=url.href;
 try{await navigator.clipboard.writeText(url.href);$('#preset-status').textContent='Link copied.';}catch{$('#share-url').focus();$('#share-url').select();$('#preset-status').textContent='Copy the link above.';}
};
window.addEventListener('hashchange',()=>{if(rhythms.length)readLink();});
const drawer=$('#settings-drawer');
$('#open-settings').onclick=()=>{section?.stop();drawer.showModal();$('#open-settings').setAttribute('aria-expanded','true');};
drawer.addEventListener('close',()=>$('#open-settings').setAttribute('aria-expanded','false'));
$('#close-settings').onclick=()=>drawer.close();
drawer.addEventListener('click',event=>{
 const bounds=drawer.getBoundingClientRect();
 if(event.target===drawer&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))drawer.close();
});
fetch(section?.catalog||'rhythms.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
 rhythms=section?section.prepare(data):data;
 let stored;try{stored=JSON.parse(localStorage.getItem(KEY));}catch{}
 selected=new Set(rhythms.filter(r=>defaultNames.includes(r.name)).map(r=>r.id));
 activePreset='common';
 if(stored?.options){transcription=stored.options.transcription!==false;audioEnabled=stored.options.audioEnabled===true;hard=stored.options.hard===true;hardAudio=stored.options.hardAudio===true;autoplay=stored.options.autoplay===true;}
 if(section){section.setTone(stored?.options?.tone);referenceEnabled=stored?.options?.referenceNotes??(audioEnabled&&!hardAudio);hardAudio=stored?.options?.musicalExamples??(audioEnabled&&hardAudio);audioEnabled=referenceEnabled||hardAudio;autoplay=false;if(Array.isArray(stored?.selected)){selected=new Set(stored.selected.filter(id=>rhythms.some(r=>r.id===id)));activePreset=builtInPresets().find(p=>p.ids.length===selected.size&&p.ids.every(id=>selected.has(id)))?.key||'';}}
 syncOptions();
 history=stored?.history&&typeof stored.history==='object'?stored.history:{};
 presetList();if(!readLink()){list();start();}
}).catch(()=>{$('#card').innerHTML=`<div class="empty error"><h2>Could not load the ${plural}.</h2><p>Check your connection and reload to try again.</p></div>`;});
