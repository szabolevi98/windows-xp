'use strict';
(() => {
  const {$,$$,esc,icon,state,t}=XP;
  const duration=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'—';
  function nextTrack(index,count,{repeat=false,shuffle=false,ended=false}={},random=Math.random){
    if(!count)return -1;
    if(shuffle&&count>1)return (index+1+Math.floor(random()*(count-1)))%count;
    return index+1<count?index+1:ended&&!repeat?-1:0;
  }
  XP.playerNextTrack=nextTrack;
  XP.register('player',()=>{
    if(XP.singleton('player'))return;
    const w=XP.createWindow({title:t('Windows Media Player'),icon:'player',app:'player',className:'player-window',width:760,height:540,minWidth:450,minHeight:340});
    const preferences=state.playerSettings||{};
    let tracks=['startup','shutdown','notify','ding'].map((name,index)=>({id:index,title:`Windows XP ${name[0].toUpperCase()+name.slice(1)}`,artist:'Microsoft Windows XP',album:'Windows rendszerhangok',src:`assets/sounds/${name}.wav`,video:false,duration:NaN}));
    let current=0,mode='now',repeat=!!preferences.repeat,shuffle=!!preferences.shuffle,visual=preferences.visual==='bars'?'bars':'waves',query='',disposed=false,muted=false,raf=0,analyser,context;
    const urls=[];
    const media=document.createElement('video');media.preload='metadata';media.playsInline=true;media.className='wmp-video';media.setAttribute('aria-label',t('Videólejátszás'));
    const input=document.createElement('input');input.type='file';input.accept='audio/*,video/*,.mp3,.wav,.ogg,.m4a,.mp4,.webm';input.multiple=true;input.hidden=true;
    const savePreferences=()=>{state.playerSettings={repeat,shuffle,visual};XP.persist();};
    function stop(){media.pause();media.currentTime=0;sync();}
    // Somebody else's session should not have to listen to this account's music.
    let playingWhenParked=false;
    w.onPark=()=>{playingWhenParked=!media.paused&&!media.ended;media.pause();};
    w.onUnpark=()=>{if(playingWhenParked)play();};
    async function play(){
      try{await media.play();if(disposed){media.pause();return;}startVisualization();}
      catch{if(!disposed)XP.notify('Windows Media Player',t('A fájl nem játszható le. Próbálj WAV, MP3, OGG, MP4 vagy WebM fájlt.'));}
    }
    function toggle(){if(media.paused)play();else media.pause();}
    function next(ended=false){const index=nextTrack(current,tracks.length,{repeat,shuffle,ended});if(index<0){sync();return;}load(index,true);}
    function previous(){if(media.currentTime>3){media.currentTime=0;return;}load((current+tracks.length-1)%tracks.length,true);}
    function toggleRepeat(){repeat=!repeat;savePreferences();sync();}
    function toggleShuffle(){shuffle=!shuffle;savePreferences();sync();}
    function setVisual(value){visual=value;savePreferences();draw();}
    XP.menubar(w,{
      [t('Fájl')]:[{label:t('Megnyitás…'),shortcut:'Ctrl+O',action:()=>input.click()},{label:t('Hozzáadás a lejátszási listához…'),action:()=>input.click()},null,{label:t('Kilépés'),action:()=>w.close()}],
      [t('Nézet')]:()=>[{label:t('Most játszott'),checked:mode==='now',action:()=>show('now')},{label:t('Médiatár'),checked:mode==='library',action:()=>show('library')},null,{label:t('Vizualizáció: Alkímia'),checked:visual==='waves',action:()=>setVisual('waves')},{label:t('Vizualizáció: Sávok és hullámok'),checked:visual==='bars',action:()=>setVisual('bars')}],
      [t('Lejátszás')]:()=>[{label:media.paused?t('Lejátszás'):t('Szünet'),shortcut:'Ctrl+P',action:toggle},{label:t('Leállítás'),shortcut:'Ctrl+S',action:stop},{label:t('Előző'),action:previous},{label:t('Következő'),action:()=>next()},null,{label:t('Véletlen sorrend'),checked:shuffle,action:toggleShuffle},{label:t('Ismétlés'),checked:repeat,action:toggleRepeat}],
      [t('Eszközök')]:[{label:t('Hangok és audioeszközök…'),action:()=>XP.open('sounds')},{label:t('Fájl tulajdonságai'),action:()=>{const track=tracks[current];XP.dialog(t('Médiafájl tulajdonságai'),t('Cím: {title}\nElőadó: {artist}\nAlbum: {album}\nIdőtartam: {length}\nTípus: {kind}',{title:track.title,artist:track.artist,album:track.album,length:duration(track.duration),kind:track.video?t('Videó'):t('Hang')}));}}],
      [t('Súgó')]:[{label:t('A Windows Media Player súgója'),action:()=>XP.dialog(t('Windows Media Player – Súgó'),t('A Megnyitás gombbal saját zenét vagy videót választhatsz. A listában kattintás indítja a lejátszást.\n\nCtrl+O: megnyitás · Ctrl+P: lejátszás/szünet\nCtrl+S: leállítás\n\nA saját médiafájlok az ablak bezárásáig érhetők el. Az ismétlés, a véletlen sorrend és a vizualizáció megmarad.'))},{label:t('A Windows Media Player névjegye'),action:()=>XP.dialog('Windows Media Player',t('Windows Media Player 9 Series\nVerzió: 9.00.00.4503\n\nCopyright © 1992–2003 Microsoft Corporation.\nMinden jog fenntartva.')) }]
    });
    const shell=document.createElement('div');shell.className='wmp-shell';
    const tabs=[['now',t('Most játszott')],['guide',t('Műsorfüzet')],['rip',t('Másolás CD-ről')],['library',t('Médiatár')],['radio',t('Rádióállomások')],['burn',t('Másolás CD-re')]];
    shell.innerHTML=`<aside class="wmp-sidebar"><div class="wmp-brand">${icon('player')}<span>Windows<br><b>${esc(t('Media Player'))}</b><small>9 SERIES</small></span></div><nav aria-label="${esc(t('Media Player nézetek'))}">${tabs.map(([id,label])=>`<button data-mode="${id}"><span>›</span>${label}</button>`).join('')}</nav><button class="wmp-open xp-button" data-open-media>${esc(t('Fájl megnyitása…'))}</button></aside><section class="wmp-main"><header class="wmp-heading"><b>${esc(t('Most játszott'))}</b><span>Windows Media Player</span></header><div class="wmp-now"><div class="wmp-screen"><canvas aria-label="${esc(t('Zenei vizualizáció'))}"></canvas><div class="wmp-idle">${icon('player')}<span>Windows Media Player<small>9 SERIES</small></span></div><div class="wmp-screen-caption"></div></div><aside class="wmp-list"><header>${esc(t('Lejátszási lista'))}</header><div class="wmp-track-list"></div></aside></div><div class="wmp-page" hidden></div></section>`;
    w.body.append(input,shell);$('.wmp-screen',shell).prepend(media);
    const controls=document.createElement('footer');controls.className='wmp-controls';
    controls.innerHTML=`<div class="wmp-seek"><input type="range" min="0" max="1000" value="0" aria-label="${esc(t('Lejátszási pozíció'))}"><span class="wmp-time">0:00 / 0:00</span></div><div class="wmp-transport"><div class="wmp-transport-buttons"><button data-media="play" class="wmp-play" aria-label="${esc(t('Lejátszás'))}" title="${esc(t('Lejátszás'))}"></button><button data-media="stop" class="wmp-stop" aria-label="${esc(t('Leállítás'))}" title="${esc(t('Leállítás'))}"></button><button data-media="prev" class="wmp-prev" aria-label="${esc(t('Előző'))}" title="${esc(t('Előző'))}"></button><button data-media="next" class="wmp-next" aria-label="${esc(t('Következő'))}" title="${esc(t('Következő'))}"></button><button data-media="mute" class="wmp-mute" aria-label="${esc(t('Némítás'))}" title="${esc(t('Némítás'))}"></button></div><input class="wmp-volume" type="range" min="0" max="100" aria-label="${esc(t('Lejátszó hangereje'))}"><div class="wmp-track-caption"></div><button class="wmp-small" data-media="shuffle" title="${esc(t('Véletlen sorrend'))}" aria-label="${esc(t('Véletlen sorrend'))}">⇄</button><button class="wmp-small" data-media="repeat" title="${esc(t('Ismétlés'))}" aria-label="${esc(t('Ismétlés'))}">↻</button></div><div class="wmp-status" role="status">${esc(t('Kész'))}</div>`;
    w.body.append(controls);
    const now=$('.wmp-now',shell),page=$('.wmp-page',shell),canvas=$('canvas',shell),ctx=canvas.getContext('2d'),seek=$('.wmp-seek input',controls);
    function renderList(){
      $('.wmp-track-list',shell).innerHTML=tracks.map((track,i)=>`<button data-track="${i}" class="${i===current?'selected':''}"><span>${i+1}.</span><b>${esc(track.title)}</b><small>${duration(track.duration)}</small></button>`).join('');
    }
    function library(){
      const found=tracks.map((track,i)=>({track,i})).filter(({track})=>`${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')));
      return `<div class="wmp-library-tools"><label>${esc(t('Keresés:'))} <input data-library-query aria-label="${esc(t('Keresés a médiatárban'))}" value="${esc(query)}"></label><button class="xp-button" data-open-media>${esc(t('Hozzáadás…'))}</button></div><table class="wmp-library"><thead><tr><th>${esc(t('Cím'))}</th><th>${esc(t('Idő'))}</th><th>${esc(t('Előadó'))}</th></tr></thead><tbody>${found.map(({track,i})=>`<tr class="${i===current?'selected':''}"><td><button data-track="${i}">${esc(track.title)}</button></td><td>${duration(track.duration)}</td><td>${esc(track.artist)}</td></tr>`).join('')}</tbody></table><p>${esc(t('{count} elem a médiatárban.',{count:found.length}))}</p>`;
    }
    function show(value){
      mode=value;now.hidden=mode!=='now';page.hidden=mode==='now';
      $$('.wmp-sidebar [data-mode]',shell).forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
      $('.wmp-heading b',shell).textContent=tabs.find(tab=>tab[0]===mode)?.[1]||t('Most játszott');
      if(mode==='library')page.innerHTML=library();
      if(mode==='guide')page.innerHTML=`<div class="wmp-guide"><h1>${esc(t('Üdv a Műsorfüzetben!'))}</h1><p>${esc(t('Zene, videó és a kedvenc lejátszási listáid.'))}</p><h2>${esc(t('A Windows hangjai'))}</h2><p>${esc(t('Ismerős dallamok egy ismerős asztalról. Hallgasd meg a Windows XP rendszerhangjait!'))}</p><button class="xp-button" data-system-sounds>${esc(t('Lejátszás'))}</button><h2>${esc(t('A saját zenéid'))}</h2><p>${esc(t('Nyisd meg a gépeden tárolt zenéket és videókat, majd állíts össze egy listát.'))}</p><button class="xp-button" data-open-media>${esc(t('Médiafájlok megnyitása…'))}</button><hr><button class="web-link" data-music-site>${esc(t('Zeneszoba – albumok és zenetörténet'))}</button></div>`;
      if(mode==='radio')page.innerHTML=`<div class="wmp-guide"><h1>${esc(t('Rádióállomások'))}</h1><p>${esc(t('Rendszerezd az állomásokat, és fedezd fel a ZeneSzoba műsorfüzetét.'))}</p><table class="wmp-library"><tr><th>${esc(t('Állomás'))}</th><th>${esc(t('Műfaj'))}</th><th>${esc(t('Állapot'))}</th></tr><tr><td>Retro FM</td><td>${esc(t('Slágerek'))}</td><td>${esc(t('Az adás nem érhető el'))}</td></tr><tr><td>${esc(t('Jazz Café'))}</td><td>Jazz</td><td>${esc(t('Az adás nem érhető el'))}</td></tr><tr><td>Classic Radio</td><td>${esc(t('Klasszikus'))}</td><td>${esc(t('Az adás nem érhető el'))}</td></tr></table><p><button class="xp-button" data-music-site>${esc(t('Műsorfüzet megnyitása'))}</button></p></div>`;
      if(mode==='rip'||mode==='burn')page.innerHTML=`<div class="wmp-disc">${icon('cd')}<h2>${mode==='rip'?t('Másolás CD-ről'):t('Másolás CD-re vagy eszközre')}</h2><label>${esc(t('Meghajtó:'))} <select aria-label="${esc(t('CD-meghajtó'))}"><option>${esc(t('DVD-meghajtó (D:)'))}</option></select></label><p class="wmp-disc-status">${esc(t('Helyezzen be egy {kind} lemezt a D: meghajtóba.',{kind:mode==='rip'?t('zenei'):t('írható')}))}</p><button class="xp-button" data-disc-refresh>${esc(t('Frissítés'))}</button>${mode==='burn'?`<p>${esc(t('A médiatárban {count} fájl vár lejátszásra.',{count:tracks.length}))}</p>`:''}</div>`;
      if(mode==='now')draw();
    }
    function load(index,start=false){
      if(!tracks[index])return;media.pause();current=index;media.src=tracks[index].src;media.hidden=!tracks[index].video;
      $('.wmp-screen',shell).classList.toggle('video',tracks[index].video);
      renderList();refreshLibrary();sync();if(start)play();
    }
    function sync(){
      const playing=!media.paused&&!media.ended,track=tracks[current];
      $('[data-media=play]',controls).classList.toggle('playing',playing);
      $('[data-media=play]',controls).setAttribute('aria-label',playing?t('Szünet'):t('Lejátszás'));
      $('[data-media=play]',controls).title=playing?t('Szünet'):t('Lejátszás');
      $('.wmp-time',controls).textContent=`${duration(media.currentTime)} / ${Number.isFinite(media.duration)?duration(media.duration):'0:00'}`;
      seek.value=Number.isFinite(media.duration)&&media.duration>0?media.currentTime/media.duration*1000:0;seek.disabled=!Number.isFinite(media.duration);
      $('.wmp-track-caption',controls).textContent=track.title;
      $('.wmp-screen-caption',shell).textContent=playing?track.artist+' — '+track.title:'';
      $('.wmp-idle',shell).hidden=playing||track.video;
      $('.wmp-status',controls).textContent=(playing?t('Lejátszás'):media.ended?t('Lejátszás befejezve'):media.currentTime?t('Szünet'):t('Leállítva'))+' · '+track.title;
      for(const [action,on] of [['shuffle',shuffle],['repeat',repeat],['mute',muted]]){$(`[data-media=${action}]`,controls).classList.toggle('on',on);$(`[data-media=${action}]`,controls).setAttribute('aria-pressed',String(on));}
      if(!playing){cancelAnimationFrame(raf);draw();}
    }
    function draw(){
      if(disposed||!ctx)return;
      const width=canvas.clientWidth||360,height=canvas.clientHeight||240;
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
      if(media.paused||media.ended||tracks[current].video||mode!=='now')return;
      const data=new Uint8Array(analyser?.frequencyBinCount||128);analyser?.getByteFrequencyData(data);
      const phase=media.currentTime*2;
      if(visual==='bars'){
        for(let i=0;i<40;i++){const amount=analyser?data[i*2]/255:(Math.sin(i*.7+phase)+1)*.3;const h=Math.max(2,amount*(height-35));ctx.fillStyle=`hsl(${100+i*2} 90% ${45+amount*20}%)`;ctx.fillRect(i*width/40+2,height-h-20,width/40-3,h);}
      }else{
        for(let ring=0;ring<7;ring++){ctx.beginPath();ctx.lineWidth=1.5;ctx.strokeStyle=`hsla(${195+ring*17} 95% 65% / .75)`;for(let x=0;x<=width;x+=3){const energy=analyser?data[Math.floor(x/width*(data.length-1))]/255:.3;const y=height/2+Math.sin(x/width*Math.PI*3+phase+ring*.38)*(height*.2+energy*height*.22)*Math.sin(x/width*Math.PI);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
      }
    }
    function startVisualization(){
      if(!context)try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){context=new AC();analyser=context.createAnalyser();analyser.fftSize=256;context.createMediaElementSource(media).connect(analyser);analyser.connect(context.destination);}}catch{analyser=null;}
      context?.resume().catch(()=>{});cancelAnimationFrame(raf);
      const tick=()=>{draw();if(!disposed&&!media.paused&&!media.ended)raf=requestAnimationFrame(tick);};tick();
    }
    input.onchange=()=>{
      const first=tracks.length;
      for(const file of input.files){const src=URL.createObjectURL(file);urls.push(src);tracks.push({id:tracks.length,title:file.name,artist:t('Ismeretlen előadó'),album:t('Saját médiafájlok'),src,video:file.type.startsWith('video/')||/\.(mp4|webm|ogv)$/i.test(file.name),duration:NaN});}
      input.value='';if(tracks.length>first){show('now');load(first,true);}
    };
    shell.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.mode)show(b.dataset.mode);
      if(b.hasAttribute('data-open-media'))input.click();
      if(b.hasAttribute('data-system-sounds')){show('now');load(0,true);}
      if(b.hasAttribute('data-music-site'))XP.open('ie','www.zeneszoba.hu');
      if(b.hasAttribute('data-track'))load(Number(b.dataset.track),true);
      if(b.hasAttribute('data-disc-refresh'))$('.wmp-disc-status',page).textContent=t('A meghajtóban nincs lemez. Helyezzen be egy lemezt a D: meghajtóba.');
    });
    function refreshLibrary(){
      if(mode!=='library')return;
      const fresh=document.createElement('div');fresh.innerHTML=library();
      $('.wmp-library',page).replaceWith($('.wmp-library',fresh));$('p',page).textContent=$('p',fresh).textContent;
    }
    shell.addEventListener('input',event=>{if(event.target.matches('[data-library-query]')){query=event.target.value;refreshLibrary();}});
    controls.onclick=event=>{const action=event.target.closest('[data-media]')?.dataset.media;({play:toggle,stop,prev:previous,next:()=>next(),shuffle:toggleShuffle,repeat:toggleRepeat,mute:()=>{muted=!muted;updateVolume();sync();}})[action]?.();};
    seek.oninput=()=>{if(Number.isFinite(media.duration))media.currentTime=Number(seek.value)/1000*media.duration;};
    const volume=$('.wmp-volume',controls);
    function updateVolume(){media.volume=Math.max(0,Math.min(100,Number(state.volume)||0))/100;media.muted=muted||!state.sounds;volume.value=state.volume;}
    volume.oninput=()=>{state.volume=Number(volume.value);XP.persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));};
    document.addEventListener('xp-volume-changed',updateVolume);document.addEventListener('xp-settings-changed',updateVolume);
    for(const event of ['play','pause','timeupdate','ended','loadedmetadata'])media.addEventListener(event,sync);
    media.addEventListener('loadedmetadata',()=>{tracks[current].duration=media.duration;renderList();refreshLibrary();});
    media.addEventListener('ended',()=>next(true));
    w.el.addEventListener('keydown',event=>{if(!event.ctrlKey)return;const key=event.key.toLowerCase();if(['o','p','s'].includes(key)){event.preventDefault();({o:()=>input.click(),p:toggle,s:stop})[key]();}});
    const resize=new ResizeObserver(draw);resize.observe($('.wmp-screen',shell));
    w.cleanup.push(()=>{disposed=true;media.pause();media.removeAttribute('src');media.load();cancelAnimationFrame(raf);resize.disconnect();context?.close().catch(()=>{});urls.forEach(url=>URL.revokeObjectURL(url));document.removeEventListener('xp-volume-changed',updateVolume);document.removeEventListener('xp-settings-changed',updateVolume);});
    updateVolume();show('now');load(0);return w;
  });
})();
