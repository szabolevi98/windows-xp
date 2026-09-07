'use strict';
(() => {
  const {register,createWindow,menubar,state,$,t,esc}=XP;
  register('pinball',()=>{
    if(XP.singleton('pinball'))return;
    const w=createWindow({title:t('3D Pinball – Space Cadet'),icon:'pinball',app:'pinball',width:720,height:650,minWidth:380,minHeight:400,className:'pinball-window'});
    const channel='xp-space-cadet';
    let ready=false,manualPause=false,muted=false,disposed=false,lastState='',focusFrame=0;
    const send=(type,extra={})=>frame.contentWindow?.postMessage({channel,type,...extra},location.origin==='null'?'*':location.origin);
    const blocked=()=>w.minimized||XP.active!==w.id||document.hidden;
    const volume=()=>state.sounds&&!muted?Math.max(0,Math.min(100,Number(state.volume)||0))/100:0;
    function sync(forceFocus=false){
      if(!ready||disposed)return;
      const paused=manualPause||blocked();
      const next={paused,volume:volume(),focus:!blocked()};
      const serialized=JSON.stringify(next);
      if(lastState!==serialized||forceFocus){lastState=serialized;send('state',next);}
      pauseButton.textContent=manualPause?t('Folytatás (F3)'):t('Szünet (F3)');
      pauseButton.setAttribute('aria-pressed',String(manualPause));
      status.textContent=paused?t('Szüneteltetve'):t('Z / C: karok · Szóköz: golyókilövés · X: asztallökés');
    }
    function restoreFocus(){
      cancelAnimationFrame(focusFrame);
      focusFrame=requestAnimationFrame(()=>{
        // Wait until the clicked button's default focus action and any opened menus finish.
        if(!blocked()&&!XP.modal&&$('#context-menu').hidden&&$('#start-menu').hidden)sync(true);
      });
    }
    w.onFocus=()=>{sync();restoreFocus();};
    function newGame(){if(!ready)return;manualPause=false;sync(true);send('new');restoreFocus();}
    function pause(){if(!ready)return;manualPause=!manualPause;sync(true);restoreFocus();}
    function sound(){muted=!muted;sync();restoreFocus();}
    function help(){XP.dialog(t('Space Cadet – Irányítás'),t('Bal kar: Z vagy bal nyíl\nJobb kar: C, / vagy jobb nyíl\nKilövés: tartsd nyomva, majd engedd fel a Szóközt\nAsztallökés: X, . vagy fel nyíl (túl sok lökés: TILT!)\n\nF2: új játék · F3: szünet / folytatás\nÉrintőképernyőn használd az alsó gombokat.\n\nTaláld el a célpontokat, teljesíts küldetéseket és szerezz magasabb rangot! Három golyóval indulsz. A rekordok és a játék beállításai ebben a böngészőben mentődnek.'));}
    menubar(w,{
      [t('Játék')]:()=>[{label:t('Új játék'),shortcut:'F2',disabled:!ready,action:newGame},{label:manualPause?t('Folytatás'):t('Szünet'),shortcut:'F3',disabled:!ready,action:pause},null,{label:t('Kilépés'),action:()=>w.close()}],
      [t('Beállítások')]:()=>[{label:t('Hangeffektusok'),checked:!muted,action:sound}],
      [t('Súgó')]:[{label:t('Irányítás és játékszabályok'),action:help},{label:t('A Space Cadetről'),action:()=>XP.dialog('3D Pinball – Space Cadet',t('Az eredeti Space Cadet böngészős portja.\nJátékmotor: k4zmu2a / alula, MIT licenc.\nWebAssembly-csomag: Luciano Russo.\nEredeti játék: Cinematronics / Maxis / Microsoft.\n\nA játék minden szükséges fájlja helyben van.')) }]
    });
    const stage=document.createElement('div');stage.className='pinball-stage';
    const frame=document.createElement('iframe');frame.className='pinball-frame';frame.title=t('Space Cadet játéktábla');frame.setAttribute('allow','autoplay');
    stage.append(frame);w.body.append(stage);
    // Activate before a control sends its key, so the first click on an inactive window also works.
    w.el.addEventListener('pointerdown',()=>{if(XP.active!==w.id)w.focus();sync(true);},true);
    w.el.addEventListener('click',event=>{if(!event.target.closest('.window-controls,.menu-bar'))restoreFocus();});
    const controls=document.createElement('div');controls.className='pinball-controls';
    controls.innerHTML=`<div class="pinball-actions"><button class="xp-button" data-new disabled>${esc(t('Új játék (F2)'))}</button><button class="xp-button" data-pause disabled>${esc(t('Szünet (F3)'))}</button><button class="xp-button" data-help>${esc(t('Súgó'))}</button></div><div class="pinball-touch"><button class="xp-button" data-key="KeyZ" disabled>Bal kar <kbd>Z</kbd></button><button class="xp-button" data-key="Space" disabled>${esc(t('Kilövés'))} <kbd>${esc(t('Szóköz'))}</kbd></button><button class="xp-button" data-key="Slash" disabled>Jobb kar <kbd>C</kbd></button></div>`;
    w.body.append(controls);
    const status=XP.status(w,t('A Space Cadet betöltése…')).firstElementChild;
    const pauseButton=$('[data-pause]',controls);
    $('[data-new]',controls).onclick=newGame;pauseButton.onclick=pause;$('[data-help]',controls).onclick=help;
    controls.querySelectorAll('[data-key]').forEach(button=>{
      let pressedAt=0,releaseTimer;
      const release=(event)=>{
        clearTimeout(releaseTimer);releaseTimer=0;
        const delay=button.dataset.key==='Space'&&event?.type==='pointerup'?Math.max(0,1000-(performance.now()-pressedAt)):0;
        const finish=()=>{releaseTimer=0;send('key',{code:button.dataset.key,down:false});button.classList.remove('pressed');};
        if(delay)releaseTimer=setTimeout(finish,delay);else finish();
      };
      button.addEventListener('pointerdown',event=>{
        if(event.button!==0||!ready||manualPause)return;event.preventDefault();clearTimeout(releaseTimer);releaseTimer=0;pressedAt=performance.now();button.setPointerCapture(event.pointerId);button.classList.add('pressed');send('key',{code:button.dataset.key,down:true});
      });
      button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',event=>{if(!releaseTimer)release(event);});
      button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();send('key',{code:button.dataset.key,down:true});}});
      button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();release();}});
      button.addEventListener('blur',release);
      w.cleanup.push(()=>clearTimeout(releaseTimer));
    });
    function message(event){
      if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.channel!==channel||disposed)return;
      const data=event.data;
      if(data.type==='boot')send('init',{ini:state.pinballIni||'',volume:volume()});
      if(data.type==='ready'){ready=true;controls.querySelectorAll('button').forEach(button=>button.disabled=false);sync();}
      if(data.type==='save'&&typeof data.ini==='string'&&data.ini.length<100000){state.pinballIni=data.ini;XP.persist();}
      if(data.type==='focus'&&XP.active!==w.id)w.focus();
      if(data.type==='new-request')newGame();if(data.type==='pause-request')pause();
      if(data.type==='help-request')help();if(data.type==='sound-request')sound();
      if(data.type==='shell-key'){if(data.key==='F4')w.close();else if(data.key==='Escape')$('#start-button').click();}
      if(data.type==='error'){ready=false;status.textContent=t('Nem sikerült elindítani a játékot. Zárd be, majd nyisd meg újra.');controls.querySelectorAll('button:not([data-help])').forEach(button=>button.disabled=true);}
    }
    window.addEventListener('message',message);
    const observer=new MutationObserver(()=>sync());observer.observe(w.el,{attributes:true,attributeFilter:['hidden','class']});
    document.addEventListener('visibilitychange',sync);document.addEventListener('xp-volume-changed',sync);document.addEventListener('xp-settings-changed',sync);
    const controlCodes={KeyZ:'KeyZ',KeyC:'Slash',Slash:'Slash',ArrowLeft:'KeyZ',ArrowRight:'Slash',Space:'Space',KeyX:'KeyX',Period:'Period',ArrowUp:'ArrowUp'};
    const keyHandler=type=>event=>{
      if(disposed||XP.active!==w.id||XP.modal)return;
      if(event.target?.closest?.('input,textarea,select,[data-key]')||event.ctrlKey||event.altKey||event.metaKey)return;
      if(event.key==='F2'||event.key==='F3'){event.preventDefault();if(type==='keydown'&&!event.repeat)(event.key==='F2'?newGame:pause)();return;}
      const code=controlCodes[event.code];if(!code||blocked())return;
      event.preventDefault();sync(true);send('key',{code,down:type==='keydown'});
    };
    const keyListeners=['keydown','keyup'].map(type=>{const fn=keyHandler(type);document.addEventListener(type,fn);return [type,fn];});
    w.cleanup.push(()=>{
      // Synchronous teardown ensures the last score/settings write is saved before removing the iframe.
      frame.contentWindow?.dispatchEvent(new Event('pagehide'));
      try{const ini=frame.contentWindow?.FS?.readFile('/libsdl/SpaceCadetPinball/imgui_pb.ini',{encoding:'utf8'});if(typeof ini==='string'&&ini.length<100000){state.pinballIni=ini;XP.persist();}}catch{}
      disposed=true;cancelAnimationFrame(focusFrame);w.onFocus=null;observer.disconnect();window.removeEventListener('message',message);
      keyListeners.forEach(([type,fn])=>document.removeEventListener(type,fn));
      document.removeEventListener('visibilitychange',sync);document.removeEventListener('xp-volume-changed',sync);document.removeEventListener('xp-settings-changed',sync);
      frame.remove();
    });
    frame.src='assets/pinball/index.html?v=3';
    return w;
  });
})();
