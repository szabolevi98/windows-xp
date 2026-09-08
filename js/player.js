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
    const w=XP.createWindow({title:t("text_windows_media_player"),icon:'player',app:'player',className:'player-window',width:760,height:540,minWidth:450,minHeight:340});
    const preferences=state.playerSettings||{};
    let tracks=['startup','shutdown','notify','ding'].map((name,index)=>({id:index,title:`Windows XP ${name[0].toUpperCase()+name.slice(1)}`,artist:'Microsoft Windows XP',album:'Windows rendszerhangok',src:`assets/sounds/${name}.wav`,video:false,duration:NaN}));
    let current=0,mode='now',repeat=!!preferences.repeat,shuffle=!!preferences.shuffle,visual=preferences.visual==='bars'?'bars':'waves',query='',disposed=false,muted=false,raf=0,analyser,context;
    const urls=[];
    const media=document.createElement('video');media.preload='metadata';media.playsInline=true;media.className='wmp-video';media.setAttribute('aria-label',t("text_video_playback"));
    const input=document.createElement('input');input.type='file';input.accept='audio/*,video/*,.mp3,.wav,.ogg,.m4a,.mp4,.webm';input.multiple=true;input.hidden=true;
    const savePreferences=()=>{state.playerSettings={repeat,shuffle,visual};XP.persist();};
    function stop(){media.pause();media.currentTime=0;sync();}
    // Somebody else's session should not have to listen to this account's music.
    let playingWhenParked=false;
    w.onPark=()=>{playingWhenParked=!media.paused&&!media.ended;media.pause();};
    w.onUnpark=()=>{if(playingWhenParked)play();};
    async function play(){
      try{await media.play();if(disposed){media.pause();return;}startVisualization();}
      catch{if(!disposed)XP.notify('Windows Media Player',t("text_the_file_cannot_be_played_try_a_wav_mp3_ogg_mp4_or_webm_file"));}
    }
    function toggle(){if(media.paused)play();else media.pause();}
    function next(ended=false){const index=nextTrack(current,tracks.length,{repeat,shuffle,ended});if(index<0){sync();return;}load(index,true);}
    function previous(){if(media.currentTime>3){media.currentTime=0;return;}load((current+tracks.length-1)%tracks.length,true);}
    function toggleRepeat(){repeat=!repeat;savePreferences();sync();}
    function toggleShuffle(){shuffle=!shuffle;savePreferences();sync();}
    function setVisual(value){visual=value;savePreferences();draw();}
    XP.menubar(w,{
      [t("text_file")]:[{label:t("text_open_6eca8a50"),shortcut:'Ctrl+O',action:()=>input.click()},{label:t("text_add_to_playlist"),action:()=>input.click()},null,{label:t("text_exit"),action:()=>w.close()}],
      [t("text_view")]:()=>[{label:t("text_now_playing"),checked:mode==='now',action:()=>show('now')},{label:t("text_media_library"),checked:mode==='library',action:()=>show('library')},null,{label:t("text_visualization_alchemy"),checked:visual==='waves',action:()=>setVisual('waves')},{label:t("text_visualization_bars_and_waves"),checked:visual==='bars',action:()=>setVisual('bars')}],
      [t("text_play")]:()=>[{label:media.paused?t("text_play"):t("text_pause"),shortcut:'Ctrl+P',action:toggle},{label:t("text_shut_down"),shortcut:'Ctrl+S',action:stop},{label:t("text_previous"),action:previous},{label:t("text_next"),action:()=>next()},null,{label:t("text_shuffle"),checked:shuffle,action:toggleShuffle},{label:t("text_repeat"),checked:repeat,action:toggleRepeat}],
      [t("text_tools")]:[{label:t("text_sounds_and_audio_devices"),action:()=>XP.open('sounds')},{label:t("text_file_properties"),action:()=>{const track=tracks[current];XP.dialog(t("text_media_file_properties"),t("text_title_title_artist_artist_album_album_length_length_type_kind",{title:track.title,artist:track.artist,album:track.album,length:duration(track.duration),kind:track.video?t("text_video"):t("text_audio")}));}}],
      [t("text_help")]:[{label:t("text_windows_media_player_help"),action:()=>XP.dialog(t("text_windows_media_player_help_1869acbc"),t("text_open_picks_your_own_music_or_video_and_a_click_in_the_list_starts_it_c_ab713698"))},{label:t("text_about_windows_media_player"),action:()=>XP.dialog('Windows Media Player',t("text_windows_media_player_9_series_version_9_00_00_4503_copyright_1992_2003_23efbdc1")) }]
    });
    const shell=document.createElement('div');shell.className='wmp-shell';
    const tabs=[['now',t("text_now_playing")],['guide',t("text_media_guide")],['rip',t("text_copy_from_cd")],['library',t("text_media_library")],['radio',t("text_radio_tuner")],['burn',t("text_copy_to_cd")]];
    shell.innerHTML=`<aside class="wmp-sidebar"><div class="wmp-brand">${icon('player')}<span>Windows<br><b>${esc(t("text_media_player"))}</b><small>9 SERIES</small></span></div><nav aria-label="${esc(t("text_media_player_views"))}">${tabs.map(([id,label])=>`<button data-mode="${id}"><span>›</span>${label}</button>`).join('')}</nav><button class="wmp-open xp-button" data-open-media>${esc(t("text_open_file"))}</button></aside><section class="wmp-main"><header class="wmp-heading"><b>${esc(t("text_now_playing"))}</b><span>Windows Media Player</span></header><div class="wmp-now"><div class="wmp-screen"><canvas aria-label="${esc(t("text_music_visualisation"))}"></canvas><div class="wmp-idle">${icon('player')}<span>Windows Media Player<small>9 SERIES</small></span></div><div class="wmp-screen-caption"></div></div><aside class="wmp-list"><header>${esc(t("text_playlist"))}</header><div class="wmp-track-list"></div></aside></div><div class="wmp-page" hidden></div></section>`;
    w.body.append(input,shell);$('.wmp-screen',shell).prepend(media);
    const controls=document.createElement('footer');controls.className='wmp-controls';
    controls.innerHTML=`<div class="wmp-seek"><input type="range" min="0" max="1000" value="0" aria-label="${esc(t("text_playback_position"))}"><span class="wmp-time">0:00 / 0:00</span></div><div class="wmp-transport"><div class="wmp-transport-buttons"><button data-media="play" class="wmp-play" aria-label="${esc(t("text_play"))}" title="${esc(t("text_play"))}"></button><button data-media="stop" class="wmp-stop" aria-label="${esc(t("text_shut_down"))}" title="${esc(t("text_shut_down"))}"></button><button data-media="prev" class="wmp-prev" aria-label="${esc(t("text_previous"))}" title="${esc(t("text_previous"))}"></button><button data-media="next" class="wmp-next" aria-label="${esc(t("text_next"))}" title="${esc(t("text_next"))}"></button><button data-media="mute" class="wmp-mute" aria-label="${esc(t("text_mute"))}" title="${esc(t("text_mute"))}"></button></div><input class="wmp-volume" type="range" min="0" max="100" aria-label="${esc(t("text_player_volume"))}"><div class="wmp-track-caption"></div><button class="wmp-small" data-media="shuffle" title="${esc(t("text_shuffle"))}" aria-label="${esc(t("text_shuffle"))}">⇄</button><button class="wmp-small" data-media="repeat" title="${esc(t("text_repeat"))}" aria-label="${esc(t("text_repeat"))}">↻</button></div><div class="wmp-status" role="status">${esc(t("text_done"))}</div>`;
    w.body.append(controls);
    const now=$('.wmp-now',shell),page=$('.wmp-page',shell),canvas=$('canvas',shell),ctx=canvas.getContext('2d'),seek=$('.wmp-seek input',controls);
    function renderList(){
      $('.wmp-track-list',shell).innerHTML=tracks.map((track,i)=>`<button data-track="${i}" class="${i===current?'selected':''}"><span>${i+1}.</span><b>${esc(track.title)}</b><small>${duration(track.duration)}</small></button>`).join('');
    }
    function library(){
      const found=tracks.map((track,i)=>({track,i})).filter(({track})=>`${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')));
      return `<div class="wmp-library-tools"><label>${esc(t("text_search_f2e38fbf"))} <input data-library-query aria-label="${esc(t("text_search_the_media_library"))}" value="${esc(query)}"></label><button class="xp-button" data-open-media>${esc(t("text_add"))}</button></div><table class="wmp-library"><thead><tr><th>${esc(t("text_address"))}</th><th>${esc(t("text_time"))}</th><th>${esc(t("text_artist"))}</th></tr></thead><tbody>${found.map(({track,i})=>`<tr class="${i===current?'selected':''}"><td><button data-track="${i}">${esc(track.title)}</button></td><td>${duration(track.duration)}</td><td>${esc(track.artist)}</td></tr>`).join('')}</tbody></table><p>${esc(t("text_count_items_in_the_library",{count:found.length}))}</p>`;
    }
    function show(value){
      mode=value;now.hidden=mode!=='now';page.hidden=mode==='now';
      $$('.wmp-sidebar [data-mode]',shell).forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
      $('.wmp-heading b',shell).textContent=tabs.find(tab=>tab[0]===mode)?.[1]||t("text_now_playing");
      if(mode==='library')page.innerHTML=library();
      if(mode==='guide')page.innerHTML=`<div class="wmp-guide"><h1>${esc(t("text_welcome_to_the_media_guide"))}</h1><p>${esc(t("text_music_video_and_your_favourite_playlists"))}</p><h2>${esc(t("text_the_sounds_of_windows"))}</h2><p>${esc(t("text_familiar_tunes_from_a_familiar_desktop_listen_to_the_windows_xp_system_sounds"))}</p><button class="xp-button" data-system-sounds>${esc(t("text_play"))}</button><h2>${esc(t("text_your_own_music"))}</h2><p>${esc(t("text_open_the_music_and_video_on_your_machine_and_put_a_list_together"))}</p><button class="xp-button" data-open-media>${esc(t("text_open_media_files"))}</button><hr><button class="web-link" data-music-site>${esc(t("text_zeneszoba_albums_and_music_history"))}</button></div>`;
      if(mode==='radio')page.innerHTML=`<div class="wmp-guide"><h1>${esc(t("text_radio_tuner"))}</h1><p>${esc(t("text_sort_the_stations_out_and_explore_the_zeneszoba_guide"))}</p><table class="wmp-library"><tr><th>${esc(t("text_station"))}</th><th>${esc(t("text_genre"))}</th><th>${esc(t("text_status"))}</th></tr><tr><td>Retro FM</td><td>${esc(t("text_hits"))}</td><td>${esc(t("text_the_broadcast_is_not_available"))}</td></tr><tr><td>${esc(t("text_jazz_cafe"))}</td><td>Jazz</td><td>${esc(t("text_the_broadcast_is_not_available"))}</td></tr><tr><td>Classic Radio</td><td>${esc(t("text_classic"))}</td><td>${esc(t("text_the_broadcast_is_not_available"))}</td></tr></table><p><button class="xp-button" data-music-site>${esc(t("text_open_the_media_guide"))}</button></p></div>`;
      if(mode==='rip'||mode==='burn')page.innerHTML=`<div class="wmp-disc">${icon('cd')}<h2>${mode==='rip'?t("text_copy_from_cd"):t("text_copy_to_cd_or_device")}</h2><label>${esc(t("text_drive_2a84af67"))} <select aria-label="${esc(t("text_cd_drive"))}"><option>${esc(t("text_dvd_drive_d"))}</option></select></label><p class="wmp-disc-status">${esc(t("text_please_insert_a_kind_disc_into_drive_d",{kind:mode==='rip'?t("text_music"):t("text_writable")}))}</p><button class="xp-button" data-disc-refresh>${esc(t("text_refresh"))}</button>${mode==='burn'?`<p>${esc(t("text_count_files_in_the_library_are_waiting_to_be_played",{count:tracks.length}))}</p>`:''}</div>`;
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
      $('[data-media=play]',controls).setAttribute('aria-label',playing?t("text_pause"):t("text_play"));
      $('[data-media=play]',controls).title=playing?t("text_pause"):t("text_play");
      $('.wmp-time',controls).textContent=`${duration(media.currentTime)} / ${Number.isFinite(media.duration)?duration(media.duration):'0:00'}`;
      seek.value=Number.isFinite(media.duration)&&media.duration>0?media.currentTime/media.duration*1000:0;seek.disabled=!Number.isFinite(media.duration);
      $('.wmp-track-caption',controls).textContent=track.title;
      $('.wmp-screen-caption',shell).textContent=playing?track.artist+' — '+track.title:'';
      $('.wmp-idle',shell).hidden=playing||track.video;
      $('.wmp-status',controls).textContent=(playing?t("text_play"):media.ended?t("text_playback_finished"):media.currentTime?t("text_pause"):t("text_stopped"))+' · '+track.title;
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
      for(const file of input.files){const src=URL.createObjectURL(file);urls.push(src);tracks.push({id:tracks.length,title:file.name,artist:t("text_unknown_artist"),album:t("text_my_media_files"),src,video:file.type.startsWith('video/')||/\.(mp4|webm|ogv)$/i.test(file.name),duration:NaN});}
      input.value='';if(tracks.length>first){show('now');load(first,true);}
    };
    shell.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.mode)show(b.dataset.mode);
      if(b.hasAttribute('data-open-media'))input.click();
      if(b.hasAttribute('data-system-sounds')){show('now');load(0,true);}
      if(b.hasAttribute('data-music-site'))XP.open('ie','www.zeneszoba.hu');
      if(b.hasAttribute('data-track'))load(Number(b.dataset.track),true);
      if(b.hasAttribute('data-disc-refresh'))$('.wmp-disc-status',page).textContent=t("text_there_is_no_disc_in_the_drive_insert_one_in_drive_d");
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
