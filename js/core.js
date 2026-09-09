'use strict';
window.XP = (() => {
  // A képernyőre kerülő szövegek fordítása stabil text_* kulcsokból.
  // Normál betöltéskor a teljes nyelvi réteg már a rendszer előtt elkészül.
  const i18n = window.XP_I18N || {t:(key,params)=>String(window.XP_STRINGS?.hu?.[key]??key).replace(/\{(\w+)\}/g,(all,name)=>params&&params[name]!==undefined?params[name]:all),
    languages:[{code:'hu',label:'Magyar'}],language:'hu',locale:'hu-HU',setLanguage:()=>false,applyToDom(){}};
  const t = (text, params) => i18n.t(text, params);
  // A számok és a dátumok a nyelv területi beállítását követik.
  const locale = () => i18n.locale;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconPath = name => `assets/icons/${name==='windows'?'windows-logo':name || 'documents'}.${name === 'recycle' || name === 'pinball' ? 'ico' : 'png'}`;
  const icon = (name, cls='') => `<img class="${cls}" src="${iconPath(name)}" alt="" draggable="false">`;
  // The genuine Windows XP account tiles, in the order the Control Panel showed them.
  const avatars = ['chess','guitar','ball','butterfly','fish','frog','dog','cat','duck','horses','car','airplane','astronaut','beach','palm-tree','red-flower','pink-flower','snowflake','skater','kick','dirt-bike','giraffe','drip','africa','lift-off'];
  const avatarPath = name => `assets/avatars/${avatars.includes(name)||name==='guest'?name:'chess'}.png`;
  const avatar = (name, cls='') => `<img class="account-picture ${cls}" src="${avatarPath(name)}" alt="" draggable="false">`;
  const KEY = 'windows-xp-simulator-v1';
  const defaults = () => ({version:1,user:t("text_administrator"),wallpaper:'bliss',wallpaperFit:'fill',theme:'blue',visualStyle:'xp',cursors:'default',avatar:'chess',accountType:'admin',computerName:'OTTHONI-PC',screensaver:{name:'none',minutes:10},volume:55,sounds:true,showWelcome:true,pinnedPrograms:['ie','outlook'],taskbar:{locked:true,clock:true,quickLaunch:true,autoHide:false,alwaysOnTop:true,group:true,hideInactive:true,edge:'bottom',horizontalSize:30,verticalSize:106},iconPositions:{},draft:'',files:[
    {id:'welcome',name:t("text_welcome_to_windows_xp_txt"),type:'text',parent:'documents',content:t("text_welcome_back_to_2001_this_is_your_own_windows_xp_living_in_a_browser_d_82cbf277"),modified:Date.now()},
    {id:'todo',name:t("text_to_do_txt"),type:'text',parent:'documents',content:t("text_things_to_do_today_rediscover_the_start_menu_draw_something_in_paint_w_ed89fdbb"),modified:Date.now()},
    {id:'folder-personal',name:t("text_personal"),type:'folder',parent:'documents',modified:Date.now()}
  ],security:{firewall:true,updates:true},session:'admin',profiles:{},guest:{enabled:true},favorites:[{title:t("text_google"),url:'google.hu'},{title:t("text_wikipedia"),url:'hu.wikipedia.org'},{title:t("text_web_directory"),url:'about:offline'},{title:t("text_windows_xp"),url:'www.microsoft.com/windowsxp'}],mineBest:null});
  let state;
  try { const saved=JSON.parse(localStorage.getItem(KEY)); state={...defaults(),...(saved?.version===1?saved:{})}; if(!Array.isArray(state.files)) state.files=defaults().files; } catch { state=defaults(); }
  let storageWarned=false;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{if(!storageWarned){storageWarned=true;setTimeout(()=>notify(t("text_the_save_did_not_succeed"),t("text_the_browser_storage_is_full_or_unavailable_download_the_documents_that_7b575206")),0);}return false;}}
  function seedProfile(){
  if(!state.iconPositions||typeof state.iconPositions!=='object'||Array.isArray(state.iconPositions))state.iconPositions={};
  if(!avatars.includes(state.avatar)&&state.avatar!=='guest')state.avatar='chess';
  // Apply the new desktop arrangement once, without discarding personal files or settings.
  if(state.desktopLayoutVersion!==2){
    for(const id of ['computer','internet','documents','recycle','network','notepad','paint','player','mines','solitaire'])delete state.iconPositions[id];
    state.desktopLayoutVersion=2;
  }
  if(!state.administratorRenamed){
    if(state.user==='Levente')state.user='Adminisztrátor';
    state.administratorRenamed=true;
  }
  if(!state.gamesFolderAdded){
    let folder=state.files.find(f=>f.parent==='desktop'&&f.type==='folder'&&f.name===t("text_games")&&!f.deleted);
    if(!folder){folder={id:'folder-games',name:t("text_games"),type:'folder',parent:'desktop',modified:Date.now()};state.files.push(folder);}
    for(const [app,name] of [['mines','Aknakereső'],['solitaire','Pasziánsz']]){
      if(!state.files.some(f=>f.parent===folder.id&&f.type==='shortcut'&&f.app===app&&!f.deleted))state.files.push({id:`shortcut-${app}`,name:t(name),type:'shortcut',app,parent:folder.id,modified:Date.now()});
    }
    state.gamesFolderAdded=true;
  }
  if(!state.pinballAdded){
    const existing=state.files.find(f=>f.type==='shortcut'&&f.app==='pinball');
    const otherGame=state.files.find(f=>f.type==='shortcut'&&['mines','solitaire'].includes(f.app));
    const folder=state.files.find(f=>f.type==='folder'&&f.id===(otherGame?.parent||'folder-games'));
    if(folder&&!existing)state.files.push({id:'shortcut-pinball',name:t("text_3d_pinball_space_cadet"),type:'shortcut',app:'pinball',parent:folder.id,modified:Date.now(),...(folder.deleted?{deleted:folder.deleted}:{})});
    state.pinballAdded=true;
  }
  // The web catalogue joins the favourites of desktops that were set up before it existed.
  if(!state.catalogueFavourite){
    if(!Array.isArray(state.favorites))state.favorites=defaults().favorites;
    if(!state.favorites.some(f=>f.url==='about:offline'))state.favorites.push({title:t("text_web_directory"),url:'about:offline'});
    state.catalogueFavourite=true;
  }
  if(!state.cardGamesAdded){
    const anchor=state.files.find(f=>f.type==='shortcut'&&['mines','solitaire','pinball'].includes(f.app));
    const folder=state.files.find(f=>f.type==='folder'&&f.id===(anchor?.parent||'folder-games'));
    if(folder)for(const [app,name] of [['freecell','FreeCell'],['spider','Pókpasziánsz'],['hearts','Hearts']]){
      if(!state.files.some(f=>f.type==='shortcut'&&f.app===app))state.files.push({id:`shortcut-${app}`,name:t(name),type:'shortcut',app,parent:folder.id,modified:Date.now(),...(folder.deleted?{deleted:folder.deleted}:{})});
    }
    state.cardGamesAdded=true;
  }
  }
  seedProfile();
  persist();
  const MACHINE=['version','computerName','security','profiles','session','guest'];
  const ACCOUNTS={admin:{name:t("text_administrator"),avatar:'chess',type:'admin'},guest:{name:t("text_guest"),avatar:'guest',type:'guest'}};
  const personal=source=>Object.fromEntries(Object.entries(source).filter(([key])=>!MACHINE.includes(key)));
  if(!state.profiles||typeof state.profiles!=='object')state.profiles={};
  if(!state.guest||typeof state.guest!=='object')state.guest={enabled:true};
  if(!ACCOUNTS[state.session])state.session='admin';
  const stored=id=>id===state.session?state:state.profiles[id];
  function accountInfo(id){
    const saved=stored(id),base=ACCOUNTS[id];
    if(!base)return null;
    return {id,name:saved?.user||t(base.name),avatar:id==='guest'?base.avatar:saved?.avatar||base.avatar,type:base.type,
      active:id===state.session,enabled:id!=='guest'||!!state.guest?.enabled,running:parkedCount(id)};
  }
  // The Guest only shows up once somebody has switched it on, exactly as XP kept it.
  const accounts=(all=false)=>Object.keys(ACCOUNTS).map(accountInfo).filter(info=>all||info.enabled);
  // Explorer can mount another account's saved profile without replacing the signed-in desktop.
  const profileFiles=(id=state.session)=>id===state.session?state.files:(Array.isArray(state.profiles?.[id]?.files)?state.profiles[id].files:[]);
  function setGuest(enabled){
    if(state.session==='guest')return false;
    state.guest={...state.guest,enabled:!!enabled};persist();
    document.dispatchEvent(new CustomEvent('xp-settings-changed'));
    return true;
  }
  const parked=new Map();
  const parkedCount=id=>parked.get(id)?.list.length||0;
  function parkSession(){
    if(!windows.size)return false;
    const list=[...windows.values()];
    for(const win of list){
      win.parked=true;win.el.classList.add('parked');win.shade?.classList.add('parked');
      win.onPark?.();
    }
    parked.set(state.session,{list,active,z,modalDepth});
    windows.clear();active=null;modalDepth=0;renderTasks();
    return true;
  }
  function unparkSession(id){
    const session=parked.get(id);
    if(!session)return false;
    parked.delete(id);
    for(const win of session.list){
      windows.set(win.id,win);
      win.parked=false;win.el.classList.remove('parked');win.shade?.classList.remove('parked');
      win.onUnpark?.();
    }
    active=session.active;z=session.z;modalDepth=session.modalDepth;
    for(const win of windows.values())win.el.classList.toggle('inactive',win.id!==active);
    renderTasks();
    return true;
  }
  // Restarting or switching the machine off ends every session, parked ones included.
  function closeParked(){
    for(const session of parked.values())for(const win of session.list){
      win.cleanup.forEach(fn=>fn());win.el.remove();win.shade?.remove();
    }
    parked.clear();
  }
  // Signing in as somebody else puts this desk away and unpacks theirs.
  function switchUser(id){
    if(!ACCOUNTS[id])return false;
    if(id==='guest'&&!state.guest?.enabled)return false;
    if(id===state.session)return unparkSession(id)||true;
    parkSession();
    state.profiles={...state.profiles,[state.session]:personal(state)};
    const saved=state.profiles[id],complete=saved&&Array.isArray(saved.files);
    for(const key of Object.keys(state))if(!MACHINE.includes(key))delete state[key];
    Object.assign(state,{...personal(defaults()),user:t(ACCOUNTS[id].name),avatar:ACCOUNTS[id].avatar,
      accountType:ACCOUNTS[id].type,...(saved||{})});
    state.session=id;
    if(id==='guest')state.avatar='guest';
    if(!complete)seedProfile();
    persist();applySettings();
    document.dispatchEvent(new CustomEvent('xp-settings-changed'));
    document.dispatchEvent(new CustomEvent('xp-files-changed'));
    unparkSession(id);
    return true;
  }
  const shortcutApps={mines:'mines',solitaire:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',hearts:'hearts'};
  const recycleIcon=()=>state.files.some(f=>f.deleted)?'recycle-full':'recycle';
  const targetOf=file=>file.target?state.files.find(f=>f.id===file.target&&!f.deleted):null;
  const fileIcon=file=>file.type==='folder'?'folder':file.type==='image'?'pictures':
    file.type==='shortcut'?(file.icon||shortcutApps[file.app]||(targetOf(file)?fileIcon(targetOf(file)):'help')):'notepad';
  const windows = new Map(), apps = {};
  let sequence=0,z=20,active=null,modalDepth=0,mru=[],altSwitch=null;
  const uniqueId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const wallpaperPath = name => name==='bliss'?'assets/wallpapers/bliss-hd.jpg':name==='none'?'':name==='windows-xp'?'assets/wallpapers/windows-xp.jpg':`assets/wallpapers/${name==='autumn'?'autumn':'azul'}-1920.jpg`;
  function taskbarMetrics(settings={},width=globalThis.innerWidth||1280,height=globalThis.innerHeight||720){
    const edge=['top','right','bottom','left'].includes(settings.edge)?settings.edge:'bottom',horizontal=edge==='top'||edge==='bottom';
    const minimum=horizontal?30:106,available=horizontal?height:width,maximum=Math.max(minimum,Math.floor(available/2));
    const saved=Number(horizontal?settings.horizontalSize:settings.verticalSize);
    return {edge,horizontal,size:Math.max(minimum,Math.min(maximum,Number.isFinite(saved)?Math.round(saved):minimum))};
  }
  function applySettings(){
    document.body.dataset.theme=state.visualStyle==='classic'?'classic':state.theme;
    document.documentElement.dataset.cursors=state.cursors||'default';
    const desktop=$('#desktop'),fit=state.wallpaperFit||'fill';
    desktop.style.backgroundImage=state.wallpaper==='none'?'none':`url("${wallpaperPath(state.wallpaper)}")`;
    desktop.style.backgroundSize=fit==='fill'?'100% 100%':'auto';
    desktop.style.backgroundRepeat=fit==='tile'?'repeat':'no-repeat';
    desktop.style.backgroundPosition=fit==='tile'?'left top':'center';
    const taskbar=state.taskbar||{};
    document.body.classList.toggle('no-clock',taskbar.clock===false);
    document.body.classList.toggle('no-quick-launch',taskbar.quickLaunch===false);
    document.body.classList.toggle('taskbar-auto-hide',taskbar.autoHide===true);
    document.body.classList.toggle('taskbar-behind',taskbar.alwaysOnTop===false);
    document.body.classList.toggle('no-hide-inactive',taskbar.hideInactive===false);
    document.body.classList.toggle('taskbar-locked',taskbar.locked!==false);
    const layout=taskbarMetrics(taskbar);state.taskbar={...taskbar,edge:layout.edge,[layout.horizontal?'horizontalSize':'verticalSize']:layout.size};
    document.body.dataset.taskbarEdge=layout.edge;
    document.documentElement.style?.setProperty?.('--taskbar-size',layout.size+'px');
    // Keep normal windows inside the newly available work area. Maximized windows
    // already use 100% of #desktop and follow it without any extra work.
    const areaWidth=desktop.clientWidth,areaHeight=desktop.clientHeight;
    for(const win of windows.values()){
      if(win.maximized)continue;
      if(win.el.offsetWidth>areaWidth)win.el.style.width=areaWidth+'px';
      if(win.el.offsetHeight>areaHeight)win.el.style.height=areaHeight+'px';
      win.el.style.left=Math.max(0,Math.min(parseInt(win.el.style.left)||0,Math.max(0,areaWidth-100)))+'px';
      win.el.style.top=Math.max(0,Math.min(parseInt(win.el.style.top)||0,Math.max(0,areaHeight-32)))+'px';
    }
    renderTasks();
  }
  function sound(name){
    if(!state.sounds||state.volume<=0)return Promise.resolve('muted');
    const failed=error=>error?.name==='NotAllowedError'?'blocked':'error';
    try{
      const a=name==='startup'?$('#startup-sound'):new Audio(`assets/sounds/${name}.wav`);
      if(name==='startup')a.pause();
      a.currentTime=0;a.volume=state.volume/100;
      return Promise.resolve(a.play()).then(()=>'played',failed);
    }catch(error){return Promise.resolve(failed(error));}
  }
  function notify(title,message){const el=$('#balloon');el.innerHTML=`<button aria-label="${esc(t("text_close_notification"))}">×</button><strong>${esc(title)}</strong>${esc(message)}`;el.hidden=false;$('button',el).onclick=()=>el.hidden=true;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.hidden=true,13000);}
  function focus(win){
    if(!win || (modalDepth&&!win.modal))return;
    const waking=win.minimized&&!win.parked;
    if(waking){sound('restore');const from=taskRect(win);win.el.hidden=false;flyWindow(win,from,true);}
    active=win.id;mru=[win.id,...mru.filter(id=>id!==win.id)];win.el.hidden=false;win.minimized=false;win.el.style.zIndex=++z;for(const w of windows.values())w.el.classList.toggle('inactive',w.id!==active);renderTasks();win.onFocus?.();}
  function frontmost(){const next=[...windows.values()].filter(w=>!w.minimized).sort((a,b)=>Number(b.el.style.zIndex)-Number(a.el.style.zIndex))[0];active=null;if(next)focus(next);else renderTasks();}
  // The name of the program behind a window, for the grouped taskbar buttons.
  const PROGRAMS={notepad:'Jegyzettömb',paint:'Paint',calculator:'Számológép',cmd:'Parancssor',ie:'Internet Explorer',
    outlook:'Outlook Express',player:'Windows Media Player',explorer:'Windows Intéző',mines:'Aknakereső',
    solitaire:'Pasziánsz',freecell:'FreeCell',spider:'Pókpasziánsz',hearts:'Hearts',pinball:'3D Pinball',
    taskmgr:'Feladatkezelő',help:'Súgó és támogatás',image:'Képnézegető'};
  const programName=win=>t(PROGRAMS[win.app]||win.title.split(' – ').at(-1));
  function beginWindowCommand(win,kind){
    if(!win||win.minimized||win.maximized||(kind==='size'&&win.fixed))return;
    hideMenus();focus(win);
    const el=win.el,start={left:parseInt(el.style.left)||0,top:parseInt(el.style.top)||0,width:el.offsetWidth,height:el.offsetHeight};
    const area=$('#desktop'),step=8;
    el.classList.add('window-command',kind==='move'?'moving':'sizing');
    const finish=restore=>{
      if(restore)Object.assign(el.style,{left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px'});
      el.classList.remove('window-command','moving','sizing');
      document.removeEventListener('keydown',key,true);document.removeEventListener('pointermove',pointer,true);document.removeEventListener('pointerdown',accept,true);
    };
    const move=(dx,dy)=>{
      if(kind==='move'){
        el.style.left=Math.max(-el.offsetWidth+100,Math.min(area.clientWidth-90,(parseInt(el.style.left)||0)+dx))+'px';
        el.style.top=Math.max(0,Math.min(area.clientHeight-29,(parseInt(el.style.top)||0)+dy))+'px';
      }else{
        el.style.width=Math.max(win.minWidth,Math.min(area.clientWidth-(parseInt(el.style.left)||0),el.offsetWidth+dx))+'px';
        el.style.height=Math.max(win.minHeight,Math.min(area.clientHeight-(parseInt(el.style.top)||0),el.offsetHeight+dy))+'px';
      }
    };
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();finish(true);return;}
      if(e.key==='Enter'){e.preventDefault();finish(false);return;}
      const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
      if(delta){e.preventDefault();move(...delta);}
    };
    let last=null;
    const pointer=e=>{if(last)move(e.clientX-last.x,e.clientY-last.y);last={x:e.clientX,y:e.clientY};};
    const accept=e=>{if(!e.target.closest('.popup-menu'))finish(false);};
    document.addEventListener('keydown',key,true);document.addEventListener('pointermove',pointer,true);setTimeout(()=>document.addEventListener('pointerdown',accept,true));
  }
  function stepAltTab(reverse=false){
    if(!altSwitch){
      const list=mru.map(id=>windows.get(id)).filter(win=>win&&!win.modal&&!win.parked);
      if(!list.length)return;
      altSwitch={list,index:list.length>1?(reverse?list.length-1:1):0};
      const box=document.createElement('div');box.className='alt-tab-switcher';box.setAttribute('role','listbox');box.innerHTML='<strong>Windows XP</strong><div></div><p></p>';document.body.append(box);altSwitch.el=box;
    }else altSwitch.index=(altSwitch.index+(reverse?-1:1)+altSwitch.list.length)%altSwitch.list.length;
    const chosen=altSwitch.list[altSwitch.index],items=$('div',altSwitch.el);
    items.innerHTML=altSwitch.list.map((win,index)=>`<span class="${index===altSwitch.index?'selected':''}" role="option" aria-selected="${index===altSwitch.index}">${icon(win.icon)}</span>`).join('');
    $('p',altSwitch.el).textContent=chosen.title;
  }
  function finishAltTab(cancel=false){
    if(!altSwitch)return;
    const chosen=altSwitch.list[altSwitch.index];altSwitch.el.remove();altSwitch=null;
    if(!cancel&&chosen&&windows.has(chosen.id))focus(chosen);
  }
  // The menu a window carries: on its task button, on its title bar and under Alt+Space.
  function windowMenu(win){
    return [
      {label:t("text_restore"),disabled:!win.minimized&&!win.maximized,action:()=>{if(win.maximized)maximize(win);else focus(win);}},
      {label:t("text_move"),disabled:win.minimized||win.maximized,action:()=>beginWindowCommand(win,'move')},
      {label:t("text_size"),disabled:win.minimized||win.maximized||win.fixed,action:()=>beginWindowCommand(win,'size')},
      {label:t("text_minimize"),disabled:win.minimized,action:()=>{focus(win);minimize(win);}},
      {label:t("text_maximize"),disabled:win.maximized||win.fixed,action:()=>{if(!win.maximized)maximize(win);}},
      null,
      {label:t("text_close"),shortcut:'Alt+F4',action:()=>close(win)}
    ];
  }
  function renderTasks(){
    const container=$('#task-buttons');if(!container?.replaceChildren)return;container.replaceChildren();
    const list=[...windows.values()].filter(win=>!win.modal);
    // XP collapsed a program's windows into one button once the bar ran out of room.
    const fits=Math.max(1,Math.floor((container.clientWidth||600)/154));
    const grouped=new Map();
    for(const win of list)grouped.set(win.app,[...(grouped.get(win.app)||[]),win]);
    const grouping=state.taskbar?.group!==false&&list.length>fits;
    const done=new Set();
    for(const win of list){
      const family=grouped.get(win.app);
      if(grouping&&family.length>1){
        if(done.has(win.app))continue;
        done.add(win.app);
        container.append(groupButton(win.app,family));
      }else container.append(taskButton(win));
    }
  }
  const motionOff=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const taskRect=win=>$(`[data-win="${win.id}"]`)?.getBoundingClientRect()||$('#task-buttons')?.getBoundingClientRect();
  function flyWindow(win,rect,back){
    const box=win.el.getBoundingClientRect();
    if(motionOff()||!rect||!box.width||!box.height)return Promise.resolve();
    const scaleX=Math.max(0.04,rect.width/box.width),scaleY=Math.max(0.04,rect.height/box.height);
    const shift=`translate(${rect.left-box.left}px,${rect.top-box.top}px) scale(${scaleX},${scaleY})`;
    const style=win.el.style;
    style.transformOrigin='top left';
    if(back){
      // Start small, force the layout, then let it grow into place — a frame callback
      // would never arrive while the page is hidden, leaving the window shrunk.
      style.transition='none';style.transform=shift;style.opacity='0.4';
      void win.el.offsetWidth;
      style.transition='transform .16s ease-out,opacity .16s ease-out';style.transform='';style.opacity='';
      return new Promise(done=>setTimeout(()=>{style.transition='';style.transformOrigin='';done();},170));
    }
    style.transition='transform .16s ease-in,opacity .16s ease-in';style.transform=shift;style.opacity='0.4';
    return new Promise(done=>setTimeout(()=>{
      style.transition='';style.transform='';style.opacity='';style.transformOrigin='';done();
    },160));
  }
  function taskButton(win){
    const b=document.createElement('button');
    b.dataset.win=win.id;
    b.className=`task-button ${win.id===active&&!win.minimized?'active':''}`;
    b.title=win.title;b.setAttribute('aria-label',win.title);
    b.innerHTML=`${icon(win.icon)}<span>${esc(win.title)}</span>`;
    b.onclick=()=>{if(modalDepth)return;if(win.id===active&&!win.minimized)minimize(win);else focus(win);};
    b.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();if(!modalDepth)menu(windowMenu(win),event.clientX,event.clientY);};
    return b;
  }
  function groupButton(app,family){
    const b=document.createElement('button');
    const label=`${family.length} ${programName(family[0])}`;
    b.className=`task-button group ${family.some(win=>win.id===active&&!win.minimized)?'active':''}`;
    b.title=label;b.setAttribute('aria-label',label);
    b.innerHTML=`${icon(family[0].icon)}<span>${esc(label)}</span><b class="group-arrow">▲</b>`;
    b.onclick=event=>{
      if(modalDepth)return;
      const box=b.getBoundingClientRect();
      menu(family.map(win=>({label:win.title,icon:win.icon,action:()=>focus(win)})),box.left,box.top);
      event.stopPropagation();
    };
    b.oncontextmenu=event=>{
      event.preventDefault();event.stopPropagation();
      if(modalDepth)return;
      menu([
        {label:t("text_minimize_group"),action:()=>{sound('minimize');family.forEach(win=>minimize(win,true));}},
        null,
        {label:t("text_close_group"),action:()=>family.slice().forEach(win=>close(win))}
      ],event.clientX,event.clientY);
    };
    return b;
  }
  function close(win){if(!windows.has(win.id))return;if(win.onClose?.()===false)return;win.cleanup.forEach(fn=>fn());win.el.remove();windows.delete(win.id);mru=mru.filter(id=>id!==win.id);if(win.modal){modalDepth--;win.shade?.remove();}frontmost();}
  function minimize(win,quiet){
    if(win.modal)return;
    if(!quiet)sound('minimize');
    const target=taskRect(win);
    win.minimized=true;
    flyWindow(win,target).then(()=>{if(win.minimized)win.el.hidden=true;});
    frontmost();
  }
  function maximize(win){if(win.fixed)return;sound('restore');win.maximized=!win.maximized;win.el.classList.toggle('maximized',win.maximized);if(win.maximized){win.restore={left:win.el.style.left,top:win.el.style.top,width:win.el.style.width,height:win.el.style.height};Object.assign(win.el.style,{left:'0px',top:'0px',width:'100%',height:'100%'});}else Object.assign(win.el.style,win.restore);focus(win);}
  function resizeBox(dir,rect,dx,dy,limits){
    const {minWidth,minHeight,width:areaWidth,height:areaHeight}=limits;
    let left=rect.left,top=rect.top,width=rect.width,height=rect.height;
    if(dir.includes('e'))width=rect.width+dx;
    if(dir.includes('s'))height=rect.height+dy;
    if(dir.includes('w')){width=rect.width-dx;left=rect.left+dx;}
    if(dir.includes('n')){height=rect.height-dy;top=rect.top+dy;}
    if(width<minWidth){if(dir.includes('w'))left=rect.left+rect.width-minWidth;width=minWidth;}
    if(height<minHeight){if(dir.includes('n'))top=rect.top+rect.height-minHeight;height=minHeight;}
    if(left<0){width+=left;left=0;}
    if(top<0){height+=top;top=0;}
    return {left,top,width:Math.max(minWidth,Math.min(width,areaWidth-left)),height:Math.max(minHeight,Math.min(height,areaHeight-top))};
  }
  function createWindow(options){
    const id=`win-${++sequence}`;const bounds=$('#desktop').getBoundingClientRect();
    const width=Math.min(options.width||680,bounds.width-12),height=Math.min(options.height||460,bounds.height-12);
    const offset=(windows.size%5)*22;const left=Math.max(0,Math.min(options.left??Math.round((bounds.width-width)/2)+offset,bounds.width-width));
    const top=Math.max(0,Math.min(options.top??Math.round((bounds.height-height)/2)-18+offset,bounds.height-height));
    const el=document.createElement('section');el.className=`window ${options.className||''}`;el.id=id;el.setAttribute('role','dialog');el.setAttribute('aria-label',options.title);el.style.cssText=`left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;
    el.innerHTML=`<header class="title-bar">${icon(options.icon)}<span class="window-title">${esc(options.title)}</span><div class="window-controls">${options.modal?'':`<button class="window-control minimize" aria-label="${esc(t("text_minimize"))}" title="${esc(t("text_minimize"))}"></button><button class="window-control maximize" aria-label="${esc(t("text_maximize"))}" title="${esc(t("text_maximize"))}" ${options.fixed?'disabled':''}></button>`}<button class="window-control close" aria-label="${esc(t("text_close"))}" title="${esc(t("text_close"))}"></button></div></header><div class="window-content"></div>${options.fixed?'':['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="resize-edge resize-${d}" data-resize="${d}"></div>`).join('')+`<div class="resize-handle" data-resize="se" aria-label="${esc(t("text_resize"))}"></div>`}`;
    const win={id,el,body:$('.window-content',el),title:options.title,icon:options.icon,app:options.app,fixed:options.fixed,modal:options.modal,minWidth:options.minWidth||300,minHeight:options.minHeight||180,minimized:false,maximized:false,cleanup:[]};
    win.setTitle=title=>{win.title=title;$('.window-title',el).textContent=title;el.setAttribute('aria-label',title);renderTasks();};win.setIcon=name=>{if(win.icon===name)return;win.icon=name;const img=$('.title-bar img',el);if(img)img.src=iconPath(name);renderTasks();};win.close=()=>close(win);win.focus=()=>focus(win);
    if(options.modal){modalDepth++;el.classList.add('dialog-window');el.setAttribute('aria-modal','true');const shade=document.createElement('div');shade.className='modal-shade';$('#windows').append(shade);win.shade=shade;}
    windows.set(id,win);$('#windows').append(el);
    el.addEventListener('pointerdown',()=>focus(win));
    // Keep the host browser's modern context menu out of simulated application windows.
    el.addEventListener('contextmenu',e=>e.preventDefault());
    $('.close',el).onclick=()=>close(win);
    if(!options.modal){$('.minimize',el).onclick=()=>minimize(win);$('.maximize',el).onclick=()=>maximize(win);}
    const bar=$('.title-bar',el),titleIcon=$('img',bar);let iconClickTimer;
    bar.ondblclick=e=>{if(e.target===titleIcon){clearTimeout(iconClickTimer);close(win);}else if(!e.target.closest('button'))maximize(win);};
    bar.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();if(!modalDepth||win.modal)menu(windowMenu(win),e.clientX,e.clientY);};
    titleIcon.onclick=e=>{e.stopPropagation();clearTimeout(iconClickTimer);iconClickTimer=setTimeout(()=>{if(!windows.has(win.id))return;const box=el.getBoundingClientRect();menu(windowMenu(win),box.left,box.top+26);},220);};
    bar.onpointerdown=e=>{if(e.button!==0||e.target.closest('button')||win.maximized)return;focus(win);e.preventDefault();const rect=el.getBoundingClientRect(),dragBounds=$('#desktop').getBoundingClientRect(),sx=e.clientX,sy=e.clientY;bar.setPointerCapture(e.pointerId);bar.onpointermove=ev=>{el.style.left=`${Math.max(-rect.width+100,Math.min(dragBounds.width-90,rect.left+ev.clientX-sx))}px`;el.style.top=`${Math.max(0,Math.min(dragBounds.height-29,rect.top+ev.clientY-sy))}px`;};bar.onpointerup=()=>{bar.onpointermove=null;};bar.onlostpointercapture=()=>bar.onpointermove=null;};
    // Every edge and corner resizes; dragging the top or left edge moves the window as it shrinks.
    for(const grip of $$('[data-resize]',el))grip.onpointerdown=e=>{
      if(e.button!==0||win.maximized)return;
      e.preventDefault();focus(win);
      const dir=grip.dataset.resize,rect=el.getBoundingClientRect(),area=$('#desktop').getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
      const minWidth=Math.min(options.minWidth||300,area.width),minHeight=Math.min(options.minHeight||180,area.height);
      grip.setPointerCapture(e.pointerId);
      grip.onpointermove=ev=>{
        const next=resizeBox(dir,rect,ev.clientX-sx,ev.clientY-sy,{minWidth,minHeight,width:area.width,height:area.height});
        Object.assign(el.style,{left:`${next.left}px`,top:`${next.top}px`,width:`${next.width}px`,height:`${next.height}px`});
      };
      grip.onpointerup=()=>grip.onpointermove=null;grip.onlostpointercapture=()=>grip.onpointermove=null;
    };
    focus(win);return win;
  }
  function open(app,...args){
    hideMenus();if(modalDepth)return;
    const fn=apps[app];
    if(!fn){notify(t("text_the_program_could_not_be_found"),app);return;}
    if(PROGRAMS[app]){state.programUse={...state.programUse,[app]:Math.max(0,state.programUse?.[app]||0)+1};persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
    return fn(...args);
  }
  function register(name,fn){apps[name]=fn;}
  function singleton(app){const w=[...windows.values()].find(w=>w.app===app);if(w){focus(w);return w;}return null;}
  // Menus cascade: an item with `items` opens a child menu beside itself.
  const submenus=[];
  const depthOf=el=>submenus.find(entry=>entry.el===el)?.depth??0;
  function closeFrom(depth){while(submenus.length&&submenus.at(-1).depth>=depth)submenus.pop().el.remove();}
  const closeSubmenus=parent=>closeFrom(parent?depthOf(parent)+1:0);
  function paintMenu(el,items){
    el.replaceChildren();
    items.forEach(item=>{
      if(item===null){el.append(document.createElement('hr'));return;}
      const b=document.createElement('button');b.setAttribute('role','menuitem');b.disabled=!!item.disabled;
      b.innerHTML=`${item.icon?icon(item.icon):`<span>${item.checked?'✓':''}</span>`}${esc(item.label)}${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}${item.items?'<b class="submenu-arrow">▶</b>':''}`;
      if(item.items&&!item.disabled){
        const open=()=>openSubmenu(b,item.items);
        b.onpointerenter=open;b.onfocus=open;b.onclick=e=>{e.stopPropagation();open();};
      }else{
        b.onpointerenter=()=>closeSubmenus(el);
        b.onclick=e=>{e.stopPropagation();hideMenus();item.action?.();};
      }
      el.append(b);
    });
  }
  // The child hangs off its parent item, flipping to the left when the screen runs out.
  function openSubmenu(button,items){
    if(submenus.at(-1)?.owner===button)return;
    const depth=depthOf(button.parentElement)+1;
    closeFrom(depth);
    const el=document.createElement('div');el.className='popup-menu submenu';el.setAttribute('role','menu');
    document.body.append(el);submenus.push({owner:button,el,depth});
    paintMenu(el,typeof items==='function'?items():items);
    const anchor=button.getBoundingClientRect();
    const left=anchor.right+el.offsetWidth+2>innerWidth?anchor.left-el.offsetWidth+2:anchor.right-2;
    el.style.left=Math.max(0,left)+'px';
    el.style.top=Math.max(0,Math.min(anchor.top-3,innerHeight-el.offsetHeight-32))+'px';
  }
  function menu(items,x,y){
    const el=$('#context-menu');
    closeFrom(0);
    paintMenu(el,items);
    el.hidden=false;
    el.style.left=Math.min(x,innerWidth-el.offsetWidth-3)+'px';el.style.top=Math.min(y,innerHeight-el.offsetHeight-32)+'px';
    el.style.left=Math.max(0,parseInt(el.style.left))+'px';el.style.top=Math.max(0,parseInt(el.style.top))+'px';
  }
  function menubar(win,menus,logo=false){const bar=document.createElement('nav');bar.className='menu-bar';bar.setAttribute('aria-label',t("text_program_menu"));Object.entries(menus).forEach(([label,items])=>{const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.stopPropagation();const r=b.getBoundingClientRect();menu(typeof items==='function'?items():items,r.left,r.bottom);};bar.append(b);});if(logo){const span=document.createElement('span');span.className='toolbar-logo';span.innerHTML=icon('windows');bar.append(span);}win.body.append(bar);return bar;}
  function hideMenus(){ closeSubmenus();$('#context-menu').hidden=true;$('#start-menu').hidden=true;$('#volume-flyout').hidden=true;$('#start-button').classList.remove('active');$('#start-button').setAttribute('aria-expanded','false'); }
  // A dialog grows to its message: a fixed box let long text slide under the title bar
  // as soon as focusing the button scrolled the overflow into view.
  function fitDialog(win){
    const area=$('#desktop').getBoundingClientRect();
    const bar=$('.title-bar',win.el).offsetHeight,copy=$('.dialog-body',win.el),row=$('.button-row',win.el);
    const wanted=bar+copy.scrollHeight+row.offsetHeight+3;
    const height=Math.max(130,Math.min(area.height-24,wanted));
    win.el.style.height=`${Math.round(height)}px`;
    win.el.style.top=`${Math.max(0,Math.round((area.height-height)/2)-18)}px`;
  }
  function dialog(title,message,{input,value='',buttons=['OK'],icon:ic='info'}={}){return new Promise(resolve=>{const w=createWindow({title,icon:ic,width:420,height:input?192:175,fixed:true,modal:true});w.body.innerHTML=`<div class="dialog-body">${icon(ic)}<div class="dialog-copy"><p>${esc(message).replace(/\n/g,'<br>')}</p>${input?`<input type="text" aria-label="${esc(input)}" value="${esc(value)}" maxlength="160">`:''}</div></div><div class="button-row"></div>`;let answered=false;const finish=(button)=>{if(answered)return;answered=true;const val=input?$('input',w.body).value:button;close(w);resolve(button===buttons[0]?val:null);};buttons.forEach((label,i)=>{const b=document.createElement('button');b.className=`xp-button ${i===0?'primary':''}`;b.textContent=label;b.onclick=()=>finish(label);$('.button-row',w.body).append(b);});fitDialog(w);w.onClose=()=>{if(!answered){answered=true;resolve(null);}};w.el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish('');}if(e.key==='Enter'){e.preventDefault();finish(buttons[0]);}if(e.key==='Tab'){const controls=$$('input,button:not(.window-control)',w.body);let idx=controls.indexOf(document.activeElement);idx=(idx+(e.shiftKey?-1:1)+controls.length)%controls.length;controls[idx]?.focus();e.preventDefault();}});setTimeout(()=>{const first=$('input',w.body)||$('.button-row button',w.body);first.focus();first.select?.();},0);});}
  const prompt=(title,message,value='')=>dialog(title,message,{input:t("text_file_name_a16f7d68"),value,buttons:['OK',t("text_cancel")]});
  const confirm=(title,message)=>dialog(title,message,{buttons:[t("text_yes"),t("text_no")]});
  function fileName(name){return String(name||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').trim().slice(0,100);}
  function uniqueName(name,parent,ignoreId){
    const taken=candidate=>state.files.some(f=>f.id!==ignoreId&&f.parent===parent&&!f.deleted&&f.name===candidate);
    if(!taken(name))return name;
    const dot=name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';
    for(let i=2;i<999;i++){const next=`${base} (${i})${ext}`;if(!taken(next))return next;}
    return null;
  }
  function copyName(name,parent){
    const taken=candidate=>state.files.some(f=>f.parent===parent&&!f.deleted&&f.name===candidate);
    if(!taken(name))return name;
    const first=t("text_copy_of_name",{name});if(!taken(first))return first;
    for(let i=2;i<999;i++){const next=t("text_copy_number_of_name",{number:i,name});if(!taken(next))return next;}
    return null;
  }
  // A copy takes the whole subtree with it and steps its name aside if one is taken.
  function copyInto(id,parent){
    const source=state.files.find(f=>f.id===id&&!f.deleted);if(!source)return null;
    if(source.type==='folder'&&descendants(id).includes(parent)){sound('error');notify(t("text_copy"),t("text_a_folder_cannot_be_copied_into_itself"));return null;}
    const name=copyName(source.name,parent);if(!name)return null;
    const clone=(file,newParent,newName)=>{const copy={...file,id:uniqueId(),parent:newParent,name:newName||file.name,modified:Date.now()};state.files.push(copy);return copy;};
    const root=clone(source,parent,name);
    (function walk(originalId,copyId){
      for(const child of state.files.filter(f=>f.parent===originalId&&!f.deleted).slice())walk(child.id,clone(child,copyId).id);
    })(id,root.id);
    persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));return root.id;
  }
  // Cut and copy hold an item until it is pasted; a cut one is shown faded meanwhile.
  let clipboard=null;
  function clip(id,cut){
    if(!state.files.some(f=>f.id===id&&!f.deleted))return false;
    clipboard={id,cut:!!cut};document.dispatchEvent(new CustomEvent('xp-files-changed'));return true;
  }
  const canPaste=()=>!!clipboard&&state.files.some(f=>f.id===clipboard.id&&!f.deleted);
  function paste(parent){
    if(!canPaste())return false;
    const {id,cut}=clipboard;
    if(!cut)return !!copyInto(id,parent);
    const moved=moveFile(id,parent);
    if(moved){clipboard=null;document.dispatchEvent(new CustomEvent('xp-files-changed'));}
    return moved;
  }
  // Moving is refused for the same reasons XP refused it: a folder cannot swallow
  // itself, and two items in one folder cannot share a name.
  function moveFile(id,parent){
    const file=state.files.find(f=>f.id===id&&!f.deleted);
    if(!file||file.parent===parent)return false;
    if(file.type==='folder'&&descendants(id).includes(parent)){sound('error');notify(t("text_move"),t("text_a_folder_cannot_be_moved_into_itself_or_into_one_of_its_own_subfolders"));return false;}
    if(state.files.some(other=>other.id!==id&&other.parent===parent&&other.name===file.name&&!other.deleted)){sound('error');notify(t("text_move"),t("text_this_location_already_contains_an_item_named_name",{name:file.name}));return false;}
    saveFile({...file,parent});return true;
  }
  // Where a dragged file would land if it were let go at this point on the screen.
  const dropFolders=['documents','pictures','desktop'];
  function dropTarget(x,y,ignore){
    const el=document.elementFromPoint(x,y);if(!el)return null;
    const item=el.closest('.file-item[data-file],.file-item[data-folder]');
    if(item){
      const id=item.dataset.file||item.dataset.folder;
      if(id==='recycle')return {type:'recycle',el:item};
      const file=state.files.find(f=>f.id===id&&!f.deleted);
      if(file?.type==='folder'||dropFolders.includes(id))return {type:'folder',id,el:item};
    }
    const pane=el.closest('[data-drop-folder]');
    if(pane)return pane.dataset.dropFolder==='recycle'?{type:'recycle',el:pane}:{type:'folder',id:pane.dataset.dropFolder,el:pane};
    if(el.closest('.window,#taskbar,.popup-menu'))return null;
    const icon=el.closest('.desktop-icon');
    if(icon&&icon.dataset.iconId!==ignore){
      const id=icon.dataset.iconId;
      if(id==='recycle')return {type:'recycle',el:icon};
      const file=state.files.find(f=>f.id===id&&!f.deleted);
      if(file?.type==='folder')return {type:'folder',id,el:icon};
    }
    return el.closest('#desktop')?{type:'desktop'}:null;
  }
  function highlightDrop(target){
    $$('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));
    target?.el?.classList.add('drop-hover');
  }
  // Letting go: the bin deletes, a folder takes the file in, the desktop keeps the spot.
  function applyDrop(target,id,point,copy){
    if(!target||!state.files.some(f=>f.id===id&&!f.deleted))return false;
    // Dropping on the bin asks too; saying no puts the icon back where it was.
    if(target.type==='recycle'){trashFile(id).then(done=>{if(!done)document.dispatchEvent(new CustomEvent('xp-files-changed'));});return true;}
    const parent=target.type==='desktop'?'desktop':target.id;
    if(copy)return !!copyInto(id,parent);
    if(target.type==='desktop'&&point)state.iconPositions={...state.iconPositions,[id]:{x:point.x,y:point.y}};
    return moveFile(id,parent);
  }
  function dragGhost(source){
    const ghost=document.createElement('div');ghost.className='drag-ghost';
    ghost.innerHTML=source.innerHTML;document.body.append(ghost);return ghost;
  }
  function saveFile(file){const i=state.files.findIndex(f=>f.id===file.id);const next={...file,modified:Date.now()};if(i<0)state.files.push(next);else state.files[i]=next;const ok=persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));return ok;}
  function descendants(id){const ids=[id];for(let i=0;i<ids.length;i++)state.files.filter(f=>f.parent===ids[i]).forEach(f=>ids.push(f.id));return ids;}
  async function trashFile(id){
    const file=state.files.find(f=>f.id===id&&!f.deleted);
    if(!file)return false;
    const answer=await dialog(file.type==='folder'?t("text_confirm_folder_delete"):t("text_confirm_file_delete"),
      t("text_are_you_sure_you_want_to_send_name_to_the_recycle_bin",{name:file.name}),{icon:'recycle',buttons:[t("text_yes"),t("text_no")]});
    if(!answer)return false;
    deleteFile(id);return true;
  }
  function deleteFile(id){const ids=descendants(id),deletedAt=Date.now();state.files.forEach(f=>{if(ids.includes(f.id)){f.deleted=true;if(f.id===id){f.deletedAt=deletedAt;f.originalParent=f.parent;}}});persist();sound('recycle');document.dispatchEvent(new CustomEvent('xp-files-changed'));}
  async function emptyTrash(){
    if(!state.files.some(f=>f.deleted))return false;
    if(!await confirm(t("text_empty_recycle_bin"),t("text_are_you_sure_you_want_to_delete_everything_in_the_recycle_bin")))return false;
    state.files=state.files.filter(f=>!f.deleted);persist();sound('recycle');document.dispatchEvent(new CustomEvent('xp-files-changed'));return true;
  }
  function restoreFile(id){const file=state.files.find(f=>f.id===id);if(!file)return;const parent=state.files.find(f=>f.id===file.parent);if(parent?.deleted)restoreFile(parent.id);const ids=descendants(id);state.files.forEach(f=>{if(ids.includes(f.id)){delete f.deleted;delete f.deletedAt;delete f.originalParent;}});persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));}
  function download(name,content,type='text/plain;charset=utf-8'){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName(name)||'dokumentum.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function shortcutToFile(id,parent='desktop'){
    const source=state.files.find(f=>f.id===id&&!f.deleted);if(!source)return null;
    const file={id:uniqueId(),name:uniqueName(t("text_name_shortcut",{name:source.name}),parent)||source.name,
      type:'shortcut',target:id,parent,modified:Date.now()};
    saveFile(file);return file;
  }
  function shortcutTo(app,name,iconName,parent='desktop'){
    if(state.files.some(f=>f.type==='shortcut'&&f.app===app&&f.parent===parent&&!f.deleted))return null;
    const file={id:uniqueId(),name:uniqueName(name,parent)||name,type:'shortcut',app,icon:iconName,parent,modified:Date.now()};
    saveFile(file);return file;
  }
  function openFile(id){const file=state.files.find(f=>f.id===id&&!f.deleted);if(!file)return;if(file.type==='folder')open('explorer',id);else if(file.type==='image')open('image',id);else if(file.type==='shortcut'){
      if(file.target){
        const target=targetOf(file);
        if(target)openFile(target.id);
        else{sound('error');dialog(t("text_problem_with_shortcut"),t("text_the_item_this_shortcut_refers_to_cannot_be_reached_it_may_have_been_deleted"),{icon:'error'});}
      }else if(apps[file.app])open(file.app);
    }else open('notepad',id);}
  function onFiles(win,fn){const guarded=()=>{if(!win.parked)fn();};document.addEventListener('xp-files-changed',guarded);win.cleanup.push(()=>document.removeEventListener('xp-files-changed',guarded));}
  function status(win,text,extra=''){const bar=document.createElement('footer');bar.className='status-bar';bar.innerHTML=`<span>${esc(text)}</span>${extra?`<span class="status-part">${esc(extra)}</span>`:''}`;win.body.append(bar);return bar;}
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#context-menu,.submenu,#start-menu,#start-button,.menu-bar,#volume-flyout,#volume-button'))hideMenus();});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)open(b.dataset.open);});
  document.addEventListener('keydown',e=>{if(modalDepth)return;if(e.key==='Escape'){hideMenus();finishAltTab(true);}if(e.altKey&&e.key==='F4'){e.preventDefault();if(active)close(windows.get(active));}if(e.ctrlKey&&e.key==='Escape'){e.preventDefault();$('#start-button').click();}if(e.altKey&&e.key===' '&&active){e.preventDefault();const win=windows.get(active);if(win){const box=win.el.getBoundingClientRect();menu(windowMenu(win),box.left,box.top+26);}}
    if(e.altKey&&e.key==='Tab'&&!e.repeat){e.preventDefault();stepAltTab(e.shiftKey);}});
  document.addEventListener('keyup',e=>{if(e.key==='Alt')finishAltTab(false);});
  window.addEventListener('resize',()=>{const area=$('#desktop'),width=area.clientWidth,height=area.clientHeight;applySettings();for(const w of windows.values()){if(w.maximized)continue;w.el.style.left=Math.max(0,Math.min(parseInt(w.el.style.left)||0,width-100))+'px';w.el.style.top=Math.max(0,Math.min(parseInt(w.el.style.top)||0,height-32))+'px';if(w.el.offsetWidth>width)w.el.style.width=width+'px';if(w.el.offsetHeight>height)w.el.style.height=height+'px';}});
  return {$,$$,esc,icon,t,
    get language(){return i18n.language;},locale,setLanguage:code=>i18n.setLanguage(code),get languages(){return i18n.languages;},applyToDom:root=>i18n.applyToDom(root),iconPath,recycleIcon,avatar,avatarPath,avatars,fileIcon,state,persist,apps,windows,open,register,singleton,createWindow,resizeBox,fitDialog,focus,close,minimize,maximize,menu,menubar,hideMenus,dialog,prompt,confirm,notify,sound,applySettings,taskbarMetrics,wallpaperPath,uniqueId,fileName,uniqueName,saveFile,moveFile,copyInto,clip,paste,canPaste,deleteFile,trashFile,emptyTrash,restoreFile,descendants,dropTarget,highlightDrop,applyDrop,dragGhost,download,openFile,shortcutTo,shortcutToFile,onFiles,status,accounts,accountInfo,profileFiles,switchUser,parkSession,closeParked,setGuest,get session(){return state.session;},get clipped(){return clipboard?.cut&&canPaste()?clipboard.id:null;},get active(){return active;},get modal(){return modalDepth>0;}};
})();
