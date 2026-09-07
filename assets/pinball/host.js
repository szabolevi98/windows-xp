'use strict';
// This document isolates the port's globals, SDL listeners and audio lifetime.
var GAME_SOUND_ENABLED = false;
var Module;
(() => {
  const canvas=document.getElementById('canvas'),loading=document.getElementById('loading');
  const channel='xp-space-cadet',origin=location.origin;
  const iniPath='/libsdl/SpaceCadetPinball/imgui_pb.ini';
  const keys={KeyZ:['z',90],Slash:['/',191],Space:[' ',32],KeyX:['x',88],Period:['.',190],ArrowUp:['ArrowUp',38],F2:['F2',113],F3:['F3',114]};
  const held=new Set();
  let initialized=false,ready=false,paused=false,stopped=false,volume=0,gain,lastIni='',saveTimer;
  const send=(type,extra={})=>parent.postMessage({channel,type,...extra},origin==='null'?'*':origin);
  function fail(){if(stopped)return;loading.hidden=false;loading.textContent='A játék betöltése nem sikerült. Zárd be az ablakot, majd nyisd meg újra.';send('error');}
  function key(code,down){
    if(!ready||!keys[code]||stopped)return;
    if(down){if(held.has(code))return;held.add(code);}else held.delete(code);
    const [name,keyCode]=keys[code];
    const event=new KeyboardEvent(down?'keydown':'keyup',{key:name,code,keyCode,which:keyCode,bubbles:true,cancelable:true});
    Object.defineProperty(event,'pinballForwarded',{value:true});
    canvas.dispatchEvent(event);
  }
  function tap(code){if(held.has(code))key(code,false);key(code,true);setTimeout(()=>key(code,false),80);}
  function release(){for(const code of [...held])key(code,false);}
  function save(){
    if(!ready||typeof FS==='undefined')return;
    try{const ini=FS.readFile(iniPath,{encoding:'utf8'});if(ini!==lastIni&&ini.length<100000){lastIni=ini;send('save',{ini});}}catch{/* ImGui creates the file after its first settings write. */}
  }
  function audio(){
    const sdl=Module?.SDL2,context=sdl?.audioContext;
    if(!context||stopped)return;
    if(!gain&&sdl.audio?.scriptProcessorNode){
      gain=context.createGain();sdl.audio.scriptProcessorNode.disconnect();
      sdl.audio.scriptProcessorNode.connect(gain);gain.connect(context.destination);
    }
    GAME_SOUND_ENABLED=volume>0&&!paused;
    if(gain)gain.gain.value=volume;
    const result=GAME_SOUND_ENABLED?context.resume():context.suspend();
    result?.catch(()=>{});
  }
  function setPaused(value){
    if(!ready||paused===value)return;
    release();paused=value;tap('F3');audio();save();
  }
  function start(config){
    if(initialized)return;initialized=true;
    volume=Math.max(0,Math.min(1,Number(config.volume)||0));
    lastIni=typeof config.ini==='string'&&config.ini.length<100000?config.ini:'';
    Module={canvas,instantiateWasm(imports,success){
      // The upstream bundle stores WASM in a data URL. Decode it directly instead of its streaming fallback.
      const bytes=Uint8Array.from(atob(WASM_FILE.split(',')[1]),character=>character.charCodeAt(0));
      WebAssembly.instantiate(bytes,imports).then(result=>success(result.instance,result.module)).catch(fail);
      return {};
    },preRun:[()=>{
      if(!lastIni)return;
      FS.mkdirTree('/libsdl/SpaceCadetPinball');FS.writeFile(iniPath,lastIni);
    }],postRun:[()=>{
      ready=true;loading.hidden=true;tap('F2');
      saveTimer=setInterval(save,2000);
      setTimeout(()=>{if(!stopped){audio();send('ready');}},120);
    }],print(){},printErr(message){console.error('Space Cadet:',message);},onAbort:fail};
    const script=document.createElement('script');script.src='vendor.js';script.onerror=fail;document.body.append(script);
  }
  function shutdown(){
    if(stopped)return;save();release();stopped=true;clearInterval(saveTimer);
    Module?.pauseMainLoop?.();
    Module?.SDL2?.audioContext?.close().catch(()=>{});
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==origin||event.data?.channel!==channel)return;
    const data=event.data;
    if(data.type==='init')start(data);
    if(data.type==='state'){
      // SDL stops drawing on browser-frame blur. Restore focus before queueing resume or input.
      if(data.focus&&ready){window.focus();canvas.focus();}
      volume=Math.max(0,Math.min(1,Number(data.volume)||0));setPaused(!!data.paused);audio();
    }
    if(data.type==='key'&&!paused)key(data.code,!!data.down);
    if(data.type==='new'&&ready){release();if(paused){setPaused(false);}tap('F2');canvas.focus();}
    if(data.type==='shutdown')shutdown();
  });
  for(const type of ['keydown','keyup'])document.addEventListener(type,event=>{
    if(event.pinballForwarded)return;
    if((event.altKey&&event.key==='F4')||(event.ctrlKey&&event.key==='Escape')){
      event.preventDefault();event.stopImmediatePropagation();if(type==='keydown')send('shell-key',{key:event.key});return;
    }
    if(['F1','F4','F5','F6','F8','F10','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(type==='keydown'&&!event.repeat){if(event.key==='F1'||event.key==='F8')send('help-request');if(event.key==='F5')send('sound-request');}
      return;
    }
    const code=event.code==='KeyC'||event.code==='ArrowRight'?'Slash':event.code==='ArrowLeft'?'KeyZ':event.code;
    if(!keys[code])return;
    event.preventDefault();event.stopImmediatePropagation();
    if(code==='F2'||code==='F3'){if(type==='keydown'&&!event.repeat)send(code==='F2'?'new-request':'pause-request');return;}
    if(!paused)key(code,type==='keydown');
  },true);
  canvas.addEventListener('pointerdown',()=>{send('focus');canvas.focus();audio();});
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  window.addEventListener('blur',release);
  window.addEventListener('pagehide',shutdown);
  send('boot');
})();
