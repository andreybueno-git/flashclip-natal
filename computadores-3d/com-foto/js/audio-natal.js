/* Trilha e efeitos originais, sintetizados localmente. Sem áudio ou serviços externos. */
(() => {
  let context, musicBus, musicOutput, effectsBus, master, timer=0, unlocked=false;
  let music=true, effects=true, step=0, nextNote=0, revision=0, effectsRevision=0;
  let lifecycle=Promise.resolve(), pageInactive=false;
  const voices=new Set();
  const musicButtons=[...document.querySelectorAll('[data-audio-music]')];
  const effectsButtons=[...document.querySelectorAll('[data-audio-effects]')];
  const beat=60/104, subdivision=beat/2;
  // Melodia original de oito compassos: sinos sobre D, G, Bm e A.
  const melody=[74,null,78,81,null,78,76,null,74,78,81,86,null,81,78,null,79,null,83,86,null,83,81,null,79,78,76,74,null,76,78,null,78,null,81,83,null,81,78,null,76,78,81,78,null,74,73,null,76,null,81,85,null,81,78,null,76,73,69,73,76,null,null,null];
  const chords=[[50,57,62,66],[43,55,59,62],[47,54,59,62],[45,57,61,64]];
  const hz=midi=>440*Math.pow(2,(midi-69)/12);
  function label(){
    for(const b of musicButtons){b.setAttribute('aria-pressed',String(music));b.textContent=music?'♫ Música ligada':'♫ Música desligada';}
    for(const b of effectsButtons){b.setAttribute('aria-pressed',String(effects));b.textContent=effects?'♪ Efeitos ligados':'♪ Efeitos desligados';}
  }
  function init(){
    if(context)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){[...musicButtons,...effectsButtons].forEach(b=>{b.disabled=true;b.textContent='Áudio indisponível';});return;}
    context=new Audio();
    master=context.createGain();master.gain.value=.55;
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=3;compressor.connect(context.destination);master.connect(compressor);
    musicOutput=context.createGain();musicOutput.gain.value=music?1:0;musicOutput.connect(master);
    musicBus=context.createGain();musicBus.gain.value=.22;musicBus.connect(musicOutput);
    effectsBus=context.createGain();effectsBus.gain.value=.2;effectsBus.connect(master);
    // Uma cauda discreta de sino; feedback inferior a 1 não cresce com o tempo.
    const delay=context.createDelay(1);delay.delayTime.value=.24;
    const feedback=context.createGain();feedback.gain.value=.18;
    const lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=3500;
    musicBus.connect(delay);delay.connect(lowpass);lowpass.connect(feedback);feedback.connect(delay);
    const wet=context.createGain();wet.gain.value=.14;lowpass.connect(wet);wet.connect(musicOutput);
  }
  function track(source,bus,nodes=[]){
    const item={source,bus,cleanup:null};
    item.cleanup=()=>{
      if(!voices.delete(item))return;
      source.onended=null;
      for(const node of [source,...nodes]){try{node.disconnect();}catch{}}
    };
    voices.add(item);source.onended=item.cleanup;return item;
  }
  function tone(freq,at,duration,volume,bus=musicBus,type='sine'){
    if(!context)return;
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=freq;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.014);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(bus);track(oscillator,bus,[gain]);oscillator.start(at);oscillator.stop(at+duration+.025);
  }
  function bell(note,at,volume=.3,bus=musicBus){const f=hz(note);tone(f,at,1.5,volume,bus);tone(f*2.01,at,.7,volume*.16,bus);tone(f*3.98,at,.33,volume*.055,bus);}
  function stopVoices(bus){for(const item of [...voices])if(!bus||item.bus===bus){try{item.source.stop();}catch{}item.cleanup();}}
  function stopMusic(){clearInterval(timer);timer=0;stopVoices(musicBus);}
  function wantsRunning(){return !pageInactive&&!document.hidden&&(music||effects);}
  function schedule(){
    if(!context||!music||!wantsRunning()||context.state!=='running')return;
    // Se a thread ficou bloqueada, não despeje todas as notas perdidas de uma vez.
    if(nextNote<context.currentTime-subdivision)nextNote=context.currentTime+.03;
    while(nextNote<context.currentTime+.3){
      const index=step%melody.length,note=melody[index];
      if(note!==null)bell(note,nextNote,step%4===0?.24:.17);
      if(step%16===0)for(const midi of chords[Math.floor(index/16)])tone(hz(midi),nextNote,beat*5,.09,musicBus,'triangle');
      nextNote+=subdivision;step++;
    }
    document.body.dataset.audio=context.state;
  }
  function reconcile(){
    const current=++revision;
    if(!context||!unlocked)return lifecycle;
    // A saída da música reúne sinal direto e eco: o mute cobre os dois.
    musicOutput.gain.value=music?1:0;
    effectsBus.gain.value=effects?.2:0;
    if(!wantsRunning()||!music)stopMusic();
    if(!wantsRunning()||!effects){effectsRevision++;stopVoices(effectsBus);}
    // Serializa transições para um suspend atrasado nunca vencer o último resume.
    lifecycle=lifecycle.catch(()=>{}).then(async()=>{
      if(current!==revision)return;
      if(wantsRunning()){
        if(context.state!=='running')await context.resume();
      }else if(context.state!=='suspended'&&context.state!=='closed')await context.suspend();
      if(current!==revision)return;
      if(wantsRunning()&&music&&context.state==='running'&&!timer){
        nextNote=context.currentTime+.06;timer=setInterval(schedule,100);schedule();
      }
      document.body.dataset.audio=context.state;
    }).catch(error=>{
      if(current===revision){stopMusic();document.body.dataset.audio=context.state;}
      console.warn('Não foi possível atualizar a reprodução de áudio.',error);
    });
    return lifecycle;
  }
  function activate(event){
    if(!event.isTrusted||unlocked)return;
    if(!event.target.closest('#globo,[data-entry-tap],[data-audio-music],[data-audio-effects],[data-shake-globe]'))return;
    init();if(!context)return;unlocked=true;reconcile();
  }
  document.addEventListener('pointerdown',activate,{capture:true});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')activate(e);},{capture:true});
  musicButtons.forEach(button=>button.addEventListener('click',()=>{music=!music;label();reconcile();}));
  effectsButtons.forEach(button=>button.addEventListener('click',()=>{effects=!effects;if(!effects)stopVoices(effectsBus);label();reconcile();}));
  function noise(duration,frequency,volume){
    if(!context)return;
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
    const source=context.createBufferSource();source.buffer=buffer;
    const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
    const gain=context.createGain(),now=context.currentTime;
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(effectsBus);track(source,effectsBus,[filter,gain]);source.start();source.stop(now+duration);
  }
  function canPlay(){return unlocked&&effects&&context?.state==='running'&&!pageInactive&&!document.hidden;}
  function playEffect(play){
    if(!unlocked||!effects||!context||pageInactive||document.hidden)return;
    if(canPlay()){play();return;}
    // O primeiro Enter pode chegar antes de resume resolver. Preserve esse gesto,
    // mas descarte o efeito se a aba foi ocultada ou o usuário o silenciou.
    const current=effectsRevision;
    reconcile().then(()=>{if(current===effectsRevision&&canPlay())play();});
  }
  window.addEventListener('fc:entry-hit',e=>{
    playEffect(()=>{
      const count=e.detail.count,now=context.currentTime;
      if(count<5){noise(.1,2000+count*550,.38);bell(86+count*2,now,.18,effectsBus);}
      else {noise(.55,3100,.45);[91,95,98,103,107].forEach((n,i)=>bell(n,now+i*.035,.19,effectsBus));}
    });
  });
  window.addEventListener('fc:sleigh-fly',()=>{
    playEffect(()=>{
      const now=context.currentTime;noise(.9,800,.22);
      [86,90,93,98,93,90,86,93].forEach((n,i)=>bell(n,now+i*.16,.18,effectsBus));
    });
  });
  window.addEventListener('fc:shake',()=>playEffect(()=>{noise(.4,1900,.18);bell(93,context.currentTime,.12,effectsBus);}));
  window.addEventListener('fc:entry-complete',()=>playEffect(()=>{const now=context.currentTime;[74,78,81].forEach(n=>bell(n,now,.13,effectsBus));}));
  document.addEventListener('visibilitychange',reconcile);
  window.addEventListener('pagehide',()=>{pageInactive=true;reconcile();});
  window.addEventListener('pageshow',()=>{pageInactive=false;if(unlocked)reconcile();});
  label();
})();
