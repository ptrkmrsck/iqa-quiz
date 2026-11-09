// Study mappings are separate from the refreshable source catalog.
const pitchPlayer=new PitchPlayer();
window.addEventListener('pagehide',()=>pitchPlayer.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pitchPlayer.stop();});
window.quizSection={
 tone:()=>pitchPlayer.tone,
 setTone:value=>pitchPlayer.setTone(value),
 key:'jins-practice-v1',catalog:'jins.json',selectionKey:'ajnas',singular:'jins',plural:'ajnas',
 prompt:'Which jins is this?',notationLabel:'Notation',audioLabel:'Reference notes',
 defaults:['‘Ajam','Bayati','Hijaz','Kurd','Nahawand','Rast','Saba','Sikah'],
 presets:rows=>[
  {key:'common',name:'Foundations',ids:['ajam','bayati','hijaz','kurd','nahawand','rast','saba','sikah'],note:'Eight starting points for study; a teaching selection, not a popularity ranking.'},
  {key:'all',name:'All ajnas',ids:rows.map(r=>r.id),note:'All 24 ajnas; alternate versions are selected randomly per question.'},
  {key:'d',name:'Compare: D-based ajnas',ids:['bayati','hijaz','kurd','lami','saba','saba_zamzam'],note:'Compare six ajnas notated on D.'},
  {key:'ajam',name:'Compare: ‘Ajam and related',ids:['ajam','ajam_murassaa','upper_ajam','jiharkah'],note:'Includes both versions of ‘Ajam, selected randomly.'},
  {key:'rast',name:'Compare: Rast and related',ids:['rast','upper_rast','sazkar','saba_dalanshin'],note:'Study related pitch material and differences in tonic placement.'},
  {key:'hijaz',name:'Compare: Hijaz and related',ids:['hijaz','hijaz_murassaa','hijazkar'],note:'Listen for the altered fifth and tonic placement.'},
  {key:'nahawand',name:'Compare: Nahawand and related',ids:['nahawand','nahawand_murassaa','nikriz','athar_kurd'],note:'Compare altered fourths and fifths.'},
  {key:'sikah',name:'Compare: Sikah and related',ids:['sikah','mustaar','mukhalif_sharqi','sikah_baladi'],note:'Compare microtonal pitch references with musical examples.'},
  {key:'saba',name:'Compare: Saba and related',ids:['saba','saba_zamzam','saba_dalanshin'],note:'Study altered notes and different tonic placement.'},
  {key:'flexible',name:'Flexible or undefined spans',ids:['hijazkar','mukhalif_sharqi','nahawand_murassaa','saba','saba_dalanshin','saba_zamzam','sikah_baladi'],note:'These do not have one fixed tonic-to-ghammaz span. Reference playback uses an extended study outline.'}
 ],
 prepare:rows=>rows.map(r=>{
  const studies=window.jinsStudy[r.id];if(!studies)throw Error('Missing study mapping: '+r.id);
  const forms=studies.map(study=>{
   const diagram=r.notations[study.diagram||0],core=study.notes.map(i=>diagram.notes[i]);
   const tonic=diagram.notes[study.tonic],ghammaz=study.ghammaz.map(i=>diagram.notes[i]);
   if(!tonic||core.some(n=>!n)||ghammaz.some(n=>!n))throw Error('Invalid study mapping: '+r.id);
   const pivot=core.indexOf(tonic);if(pivot<0)throw Error('Tonic missing from outline: '+r.id);
   const sequence=pivot===core.length-1?[...core].reverse().concat(core.slice(1)):[...core.slice(pivot),...core.slice(0,-1).reverse(),...core.slice(1,pivot+1)];
   const examples=r.examples.filter(t=>!study.audioPath||new URL(t.source).pathname.includes(study.audioPath));
   if(!examples.length)throw Error('No matched examples: '+r.id);
   return {id:diagram.id,label:study.label||'Standard version',meter:study.size?`${study.size} notes`:'Flexible span',notation:diagram.source,notationSource:diagram.source,diagram,core,tonic,ghammaz,sequence,study,tabla:[],examples};
  });
  return {...r,meter:forms.length>1?'2 versions':forms[0].meter,forms};
 }),
 details(form){
  const detail=document.createElement('div');detail.id='pitch-roles';
  const roles=document.createElement('p');roles.textContent=`Tonic: ${form.tonic.label} · Ghammaz: ${form.ghammaz.length?form.ghammaz.map(n=>n.label).join(' or '):'not specified'}.`;detail.append(roles);
  if(form.study.label){const version=document.createElement('p');version.id='form-label';version.textContent=form.label;detail.prepend(version);}
  if(form.study.note){const note=document.createElement('p');note.textContent=form.study.note;detail.append(note);}
  return detail;
 },
 stop:()=>pitchPlayer.stop(),
 notation(form,revealed,correct){
  const wrapper=document.createElement('div');wrapper.className='notation';
  const stage=document.createElement('div');stage.className='pitch-notation';stage.style.maxWidth=form.diagram.width+'px';
  const img=document.createElement('img');img.src=form.notationSource;img.alt='Jins notation';img.width=form.diagram.width;img.height=form.diagram.height;stage.append(img);
  const error=document.createElement('p');error.setAttribute('role','status');
  const highlight=document.createElement('span');highlight.className='pitch-highlight';highlight.hidden=true;highlight.setAttribute('aria-hidden','true');stage.append(highlight);
  let highlightTimer;
  img.onerror=()=>{stage.hidden=true;error.textContent='Notation could not load. You can still use reference-note playback.';};
  const playNote=note=>{
   document.querySelector('#card audio')?.pause();
   clearTimeout(highlightTimer);highlight.style.left=100*note.position.x/form.diagram.width+'%';highlight.style.top=100*note.position.y/form.diagram.height+'%';highlight.hidden=false;
   highlightTimer=setTimeout(()=>{highlight.hidden=true;},550);
   error.textContent='';pitchPlayer.play([note.frequencyHz]).catch(e=>{error.textContent=e.message;});
  };
  let pointerStart;
  stage.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
  stage.addEventListener('pointercancel',()=>{pointerStart=null;});
  stage.addEventListener('pointerup',event=>{
   if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>10)return;
   pointerStart=null;
   const bounds=stage.getBoundingClientRect(),x=(event.clientX-bounds.left)/bounds.width*form.diagram.width;
   const note=form.diagram.notes.reduce((nearest,n)=>Math.abs(n.position.x-x)<Math.abs(nearest.position.x-x)?n:nearest);
   playNote(note);
  });
   for(const [index,note] of form.diagram.notes.entries()){
    const role=correct?(note===form.tonic?'tonic':form.ghammaz.includes(note)?'ghammaz':''):'';
    const button=document.createElement('button');button.className='pitch-note';
    // Midpoints partition the entire image into nearest-note columns, including margins.
    const previous=form.diagram.notes[index-1],next=form.diagram.notes[index+1];
    const left=previous?(previous.position.x+note.position.x)/2:0;
    const right=next?(note.position.x+next.position.x)/2:form.diagram.width;
    button.style.left=100*left/form.diagram.width+'%';
    button.style.width=100*(right-left)/form.diagram.width+'%';
    button.setAttribute('aria-label',`Play ${note.label}${role?' — '+role:''}`);button.title=button.getAttribute('aria-label');
    button.onclick=event=>{if(event.detail===0)playNote(note);};stage.append(button);
   }
  wrapper.append(stage,error);
  const hint=document.createElement('p');hint.className='pitch-caption';hint.textContent='Tap anywhere on the notation to hear the nearest note.';wrapper.append(hint);
  return wrapper;
 },
 audio(card,form){
  const controls=document.createElement('div');controls.className='reference-player';
  const play=document.createElement('button');play.id='reference-play';play.textContent='Play reference notes';
  const stop=document.createElement('button');stop.textContent='Stop';stop.id='reference-stop';stop.disabled=!pitchPlayer.playing;
  pitchPlayer.onchange=playing=>{stop.disabled=!playing;play.setAttribute('aria-pressed',String(playing));};pitchPlayer.onchange(pitchPlayer.playing);
  const error=document.createElement('p');error.setAttribute('role','status');
  const frequencies=form.sequence.map(n=>n.frequencyHz);
  play.onclick=()=>{document.querySelector('#card audio')?.pause();error.textContent='';pitchPlayer.play(frequencies).catch(e=>{error.textContent=e.message;});};
  stop.onclick=()=>pitchPlayer.stop();
  const caption=document.createElement('p');caption.className='pitch-caption';caption.textContent=(form.study.extended?'Extended reference outline':form.core.at(-1)===form.tonic?'Core notes, down and up':'Core notes, up and down')+' · Maqam World reference pitches';
  controls.append(play,stop,caption,error);card.append(controls);
 },
 toggleAudio(){if(pitchPlayer.playing)pitchPlayer.stop();else document.querySelector('#reference-play')?.click();}
};
