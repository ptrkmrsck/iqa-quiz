const $ = s => document.querySelector(s);
const KEY = 'iqa-practice-v1';
let rhythms = [], selected = new Set(), queue = [], current, revealed = false;
let stats = {reviewed:0,known:0,again:0};
let history = {};
let roundMissed = new Set(), roundSeen = new Set();
let choices = [], answered = null, wrongChoices = new Set();
let transcription = true, audioEnabled = false, hard = false, hardAudio = false, autoplay = false;
let activePreset = 'common', autoplayRequested = false, questionNumber = 0;
let currentForm = null, currentTrack = null, questionTracks = {};
const defaultNames = ['Maqsum','Baladi','Malfuf','Ayyub','Fallahi','Sa‘idi','Wahda','Wahda w-Nuss','Masmudi Kabir'];
function builtInPresets(){
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
function save(){try{localStorage.setItem(KEY,JSON.stringify({selected:[...selected],history,options:{transcription,audioEnabled,hard,hardAudio,autoplay}}));}catch{$('#storage-note').textContent='Storage unavailable. Changes last for this visit only.';}}
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
 if(!$('#rhythms').children.length) $('#rhythms').textContent='No matching rhythms.';
}
function availableForms(rhythm){return rhythm.forms.filter(form=>audioEnabled?(hardAudio?form.examples:form.tabla).length>0:!!form.notation);}
function eligible(){return rhythms.filter(r=>selected.has(r.id)&&availableForms(r).length);}
function pick(items){return items[Math.floor(Math.random()*items.length)];}
function start(){beginRound(eligible());}
function beginRound(items){queue=shuffle([...items]);stats={reviewed:0,known:0,again:0};roundMissed=new Set();roundSeen=new Set();next();}
function showCompletion(card){
 const heading=document.createElement('h2');heading.textContent='ROUND COMPLETE';card.append(heading);
 const summary=document.createElement('p');summary.id='round-summary';summary.textContent=`${roundSeen.size} rhythm${roundSeen.size===1?'':'s'} practiced · ${roundSeen.size-roundMissed.size} without mistakes · ${roundMissed.size} missed`;card.append(summary);
 const missed=rhythms.filter(r=>roundMissed.has(r.id));
 if(missed.length){
  const label=document.createElement('p');label.textContent='Missed rhythms:';card.append(label);
  const list=document.createElement('ul');list.id='missed-rhythms';
  for(const rhythm of missed){const item=document.createElement('li');item.textContent=rhythm.name;list.append(item);}card.append(list);
 }
 const actions=document.createElement('div');actions.className='actions';
 if(missed.length){const retry=document.createElement('button');retry.id='practice-missed';retry.textContent='Practice missed rhythms';retry.disabled=!missed.some(r=>availableForms(r).length);retry.onclick=()=>{beginRound(missed.filter(r=>availableForms(r).length));$('#card button')?.focus();};actions.append(retry);}
 const repeat=document.createElement('button');repeat.id='repeat';repeat.textContent='Practice again';repeat.onclick=start;actions.append(repeat);card.append(actions);
}
function next(){questionNumber++;current=queue.shift();while(current&&!availableForms(current).length)current=queue.shift();revealed=false;answered=null;wrongChoices=new Set();questionTracks={};
 currentForm=current?pick(availableForms(current)):null;
 updateTrack();
 choices=current?shuffle([current,...shuffle(eligible().filter(r=>r.id!==current.id)).slice(0,3)]):[];
 render();}
function updateTrack(){
 currentTrack=null;
 if(!currentForm||!audioEnabled)return;
 const pool=hardAudio?'examples':'tabla';
 if(!(pool in questionTracks))questionTracks[pool]=pick(currentForm[pool])||null;
 currentTrack=questionTracks[pool];
}
function updateOptions(){
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
 $('#active-mode').textContent=[transcription?'Transcription':null,audioEnabled?(hardAudio?'Musical examples':'Tabla'):null,hard?'Recall':'Multiple choice'].filter(Boolean).join(' · ');
 const missing=rhythms.filter(r=>selected.has(r.id)&&!availableForms(r).length);
 $('#audio-availability').textContent=audioEnabled&&missing.length?`No ${hardAudio?'musical example':'tabla demonstration'}; excluded from audio: ${missing.map(r=>r.name).join(', ')}.`:'';
 const card=$('#card');
 const previousPlayer=card.querySelector('audio');
 const reusePlayer=previousPlayer&&audioEnabled&&currentTrack&&previousPlayer.getAttribute('src')===currentTrack.source&&previousPlayer.dataset.question===String(questionNumber);
 if(!reusePlayer||(!hard&&choices.length<2))previousPlayer?.pause();
 card.replaceChildren();
 const correct=current&&(answered===current.id||answered==='known');
 $('.legend').hidden=!transcription&&!correct;
 if(!transcription&&!audioEnabled){card.innerHTML='<p>Show transcription or select audio in Settings.</p>';return;}
 if((!current||(!hard&&choices.length<2))&&audioEnabled&&eligible().length<(hard?1:2)){card.innerHTML=`<p>Select at least ${hard?'one rhythm':'two rhythms'} with ${hardAudio?'musical examples':'tabla demonstrations'}. Open Settings to change the selection.</p>`;return;}
 if(!hard&&selected.size===1){card.innerHTML='<p>Select at least two rhythms for multiple choice, or use Recall.</p>';return;}
 if(!current){$('.legend').hidden=true;if(roundSeen.size)showCompletion(card);else card.innerHTML='<div class="empty"><p class="muted">Select at least one rhythm to begin practicing.</p></div>';return;}
 const title=document.createElement('h2');title.textContent=revealed?current.name:'Which iqa‘ is this?';
 const prompt=document.createElement('p');prompt.textContent=currentForm.meter;
 const notation=document.createElement('div');notation.className='notation';
 if(currentForm.notation){
  const img=document.createElement('img');img.src=currentForm.notationSource;img.alt=revealed?`${current.name} rhythm notation`:'Rhythm notation to identify';
  img.addEventListener('error',()=>{notation.textContent='Notation could not load. Check your connection and try restarting the round.';});notation.append(img);
 }else{notation.textContent=currentForm.notationNote;}
 card.append(title);
 if(revealed) card.append(prompt);
 if(transcription||correct)card.append(notation);
 if(correct){
  const form=document.createElement('p');form.id='form-label';form.textContent=`${currentForm.label} · ${currentForm.meter}`;card.append(form);
  if(currentTrack&&hardAudio){const credit=document.createElement('p');credit.id='track-credit';credit.textContent=[currentTrack.title,...currentTrack.credits].filter(Boolean).join(' — ');card.append(credit);}
 }
 if(audioEnabled&&!currentTrack){
  const unavailable=document.createElement('p');unavailable.id='audio-unavailable';unavailable.textContent='No recording of this type for the current form. Choose another audio option or show the transcription.';card.append(unavailable);
 }
 if(audioEnabled&&currentTrack){
  const player=reusePlayer?previousPlayer:document.createElement('audio');player.controls=true;player.loop=true;player.preload='metadata';
  if(!reusePlayer)player.src=currentTrack.source;player.dataset.question=String(questionNumber);
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
   if(wrongChoices.has(choice.id)){button.classList.add('wrong-answer');const note=document.createElement('span');note.className='choice-feedback';note.textContent=' — Try again';button.append(note);}
   if(answered===choice.id)button.classList.add('correct-answer');
   button.onclick=()=>{
    if(answered!==null||wrongChoices.has(choice.id))return;
    if(choice.id===current.id){answered=choice.id;revealed=true;record('known');}
    else{wrongChoices.add(choice.id);record('again',wrongChoices.size===1);}
    render();
    if(answered!==null)$('#next').focus();else $('.choices button:not(:disabled)')?.focus();
   };options.append(button);}
  card.append(options);
  if(answered===null&&wrongChoices.size){const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.textContent='Incorrect. Try again.';card.append(feedback);}
  if(answered!==null){const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.textContent=correct?'Correct.':`Incorrect. Answer: ${current.name}. This rhythm will repeat.`;card.append(feedback);if(correct)showAlternateNames(card);
   const link=document.createElement('a');link.href=current.source;link.target='_blank';link.rel='noopener';link.textContent='MaqamWorld source';card.append(link);
   const button=document.createElement('button');button.id='next';button.textContent='Next';button.onclick=()=>{next();$('#card button')?.focus();};card.append(button);}
 }else if(answered!==null){
  if(correct)showAlternateNames(card);
  const feedback=document.createElement('p');feedback.textContent=correct?'Correct.':`Incorrect. Answer: ${current.name}. This rhythm will repeat.`;card.append(feedback);
  const button=document.createElement('button');button.id='next';button.textContent='Next';button.onclick=()=>{next();$('#card button')?.focus();};card.append(button);
 }else if(!revealed){const btn=document.createElement('button');btn.className='primary';btn.textContent='Reveal answer';btn.onclick=()=>{revealed=true;render();$('#again').focus();};card.append(btn);}
 else{
  const link=document.createElement('a');link.className='answer-link';link.href=current.source;link.target='_blank';link.rel='noopener';link.textContent='MaqamWorld source';card.append(link);
  const actions=document.createElement('div');actions.className='actions';
  for(const [id,label,cls] of [['again','Again','secondary'],['known','Got it','primary']]){const btn=document.createElement('button');btn.id=id;btn.textContent=label;btn.className=cls;btn.onclick=()=>rate(id);actions.append(btn);}card.append(actions);
 }
}
function record(result,requeue=true){roundSeen.add(current.id);if(result==='again')roundMissed.add(current.id);stats.reviewed++;stats[result]++;history[current.id]??={known:0,again:0};history[current.id][result]++;if(result==='again'&&requeue)queue.splice(Math.min(3,queue.length),0,current);save();}
function rate(result){record(result);if(result==='known'){answered='known';render();$('#next').focus();}else{next();$('#card button')?.focus();}}
document.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||drawer.open)return;
 const target=event.target;
 if(target instanceof Element&&target.closest('input,textarea,select,audio,[contenteditable="true"]'))return;
 if(/^[1-4]$/.test(event.key)&&!hard){
  const button=$('.choices')?.children[Number(event.key)-1];
  if(button&&!button.disabled){event.preventDefault();button.click();}
 }else if(event.code==='Space'){
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
function readLink(){const params=new URLSearchParams(location.hash.slice(1));if(!params.has('rhythms'))return false;
 // Keep older shared mode links working.
 transcription=params.has('transcription')?params.get('transcription')==='1':params.get('mode')!=='audio';
 audioEnabled=params.has('audio')?params.get('audio')==='1':params.get('mode')==='audio';
 hard=params.has('hard')?params.get('hard')==='1':params.get('mode')==='hard';
 hardAudio=params.get('hardAudio')==='1';
 autoplay=params.get('autoplay')==='1';
 syncOptions();
 const ids=params.get('rhythms').split(',');
 const preset=builtInPresets().find(p=>p.ids.length===ids.length&&p.ids.every(id=>ids.includes(id)));
 applySelection(ids,preset?.key||'');return true;}
function syncOptions(){
 $('#autoplay').checked=autoplay;
 $(`input[name="transcription"][value="${transcription?'show':'hide'}"]`).checked=true;
 $(`input[name="audio"][value="${audioEnabled?(hardAudio?'hard':'basic'):'none'}"]`).checked=true;
 $(`input[name="answers"][value="${hard?'recall':'choice'}"]`).checked=true;
}
$('#quiz-options').addEventListener('change',()=>{
 transcription=$('input[name="transcription"]:checked').value==='show';
 const audio=$('input[name="audio"]:checked').value;
 audioEnabled=audio!=='none';hardAudio=audio==='hard';
 hard=$('input[name="answers"]:checked').value==='recall';
 const enabled=$('#autoplay').checked;autoplayRequested=enabled&&!autoplay;autoplay=enabled;
 updateOptions();
});
$('#presets').onchange=()=>{
 const preset=builtInPresets().find(p=>'builtin:'+p.key===$('#presets').value);
 if(preset)applySelection(preset.ids,preset.key);
};
$('#share').onclick=async()=>{
 const url=new URL(location.href);url.hash=new URLSearchParams({rhythms:[...selected].sort().join(','),transcription:transcription?'1':'0',audio:audioEnabled?'1':'0',hard:hard?'1':'0',hardAudio:hardAudio?'1':'0',autoplay:autoplay?'1':'0'}).toString();
 $('#share-url').hidden=false;$('#share-url').value=url.href;
 try{await navigator.clipboard.writeText(url.href);$('#preset-status').textContent='Link copied.';}catch{$('#share-url').focus();$('#share-url').select();$('#preset-status').textContent='Copy the link above.';}
};
window.addEventListener('hashchange',()=>{if(rhythms.length)readLink();});
const drawer=$('#settings-drawer');
$('#open-settings').onclick=()=>{drawer.showModal();$('#open-settings').setAttribute('aria-expanded','true');};
drawer.addEventListener('close',()=>$('#open-settings').setAttribute('aria-expanded','false'));
$('#close-settings').onclick=()=>drawer.close();
drawer.addEventListener('click',event=>{
 const bounds=drawer.getBoundingClientRect();
 if(event.target===drawer&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))drawer.close();
});
fetch('rhythms.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
 rhythms=data;
 let stored;try{stored=JSON.parse(localStorage.getItem(KEY));}catch{}
 selected=new Set(rhythms.filter(r=>defaultNames.includes(r.name)).map(r=>r.id));
 activePreset='common';
 if(stored?.options){transcription=stored.options.transcription!==false;audioEnabled=stored.options.audioEnabled===true;hard=stored.options.hard===true;hardAudio=stored.options.hardAudio===true;autoplay=stored.options.autoplay===true;}
 syncOptions();
 history=stored?.history&&typeof stored.history==='object'?stored.history:{};
 presetList();if(!readLink()){list();start();}
}).catch(()=>{$('#card').innerHTML='<div class="empty error"><h2>Could not load the rhythms.</h2><p>Run npm start, then open the local address. Reload to try again.</p></div>';});
