'use strict';
window.XP = (() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconPath = name => `assets/icons/${name==='windows'?'windows-logo':name || 'documents'}.${name === 'recycle' || name === 'pinball' ? 'ico' : 'png'}`;
  const icon = (name, cls='') => `<img class="${cls}" src="${iconPath(name)}" alt="" draggable="false">`;
  const KEY = 'windows-xp-simulator-v1';
  const defaults = () => ({version:1,user:'Adminisztrátor',wallpaper:'bliss',wallpaperFit:'fill',theme:'blue',visualStyle:'xp',avatar:'user',accountType:'admin',computerName:'OTTHONI-PC',screensaver:{name:'none',minutes:10},volume:55,sounds:true,showWelcome:true,iconPositions:{},draft:'',files:[
    {id:'welcome',name:'Üdv a Windows XP-ben.txt',type:'text',parent:'documents',content:'Üdv újra 2001-ben!\n==================\n\nEz a te saját, böngészőben élő Windows XP-d.\n\n• Az asztali ikonokat dupla kattintással nyithatod meg.\n• Az ablakokat mozgathatod, átméretezheted és a tálcára teheted.\n• A Jegyzettömbben írt fájljaidat a Dokumentumokban találod.\n• A Paintben rajzolhatsz, majd elmentheted a képeidet.\n• Az Internet Explorerben a régi, helyi weben kereshetsz.\n• Próbáld ki az Aknakeresőt és a Pasziánszt!\n\nA dokumentumok és a beállítások ebben a böngészőben maradnak.\nA böngésző adatainak törlése ezeket is törli; a fontos fájlokat\na Fájl → Letöltés menüponttal a valódi gépedre is lementheted.\n\nJó szórakozást!\n',modified:Date.now()},
    {id:'todo',name:'Teendők.txt',type:'text',parent:'documents',content:'Mai teendők\n\n[ ] Újra felfedezni a Start menüt\n[ ] Rajzolni valamit Paintben\n[ ] Megnyerni egy Aknakereső-játékot\n[ ] Rákeresni: windows xp\n',modified:Date.now()},
    {id:'folder-personal',name:'Személyes',type:'folder',parent:'documents',modified:Date.now()}
  ],security:{firewall:true,updates:true},favorites:[{title:'Google',url:'google.hu'},{title:'Wikipédia',url:'hu.wikipedia.org'},{title:'Windows XP',url:'www.microsoft.com/windowsxp'}],mineBest:null});
  let state;
  try { const saved=JSON.parse(localStorage.getItem(KEY)); state={...defaults(),...(saved?.version===1?saved:{})}; if(!Array.isArray(state.files)) state.files=defaults().files; } catch { state=defaults(); }
  let storageWarned=false;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{if(!storageWarned){storageWarned=true;setTimeout(()=>notify('A mentés nem sikerült','A böngésző tárhelye megtelt vagy nem elérhető. Töltsd le a fontos dokumentumokat a Fájl menüből.'),0);}return false;}}
  if(!state.iconPositions||typeof state.iconPositions!=='object'||Array.isArray(state.iconPositions))state.iconPositions={};
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
    let folder=state.files.find(f=>f.parent==='desktop'&&f.type==='folder'&&f.name==='Játékok'&&!f.deleted);
    if(!folder){folder={id:'folder-games',name:'Játékok',type:'folder',parent:'desktop',modified:Date.now()};state.files.push(folder);}
    for(const [app,name] of [['mines','Aknakereső'],['solitaire','Pasziánsz']]){
      if(!state.files.some(f=>f.parent===folder.id&&f.type==='shortcut'&&f.app===app&&!f.deleted))state.files.push({id:`shortcut-${app}`,name,type:'shortcut',app,parent:folder.id,modified:Date.now()});
    }
    state.gamesFolderAdded=true;
  }
  if(!state.pinballAdded){
    const existing=state.files.find(f=>f.type==='shortcut'&&f.app==='pinball');
    const otherGame=state.files.find(f=>f.type==='shortcut'&&['mines','solitaire'].includes(f.app));
    const folder=state.files.find(f=>f.type==='folder'&&f.id===(otherGame?.parent||'folder-games'));
    if(folder&&!existing)state.files.push({id:'shortcut-pinball',name:'3D Pinball – Space Cadet',type:'shortcut',app:'pinball',parent:folder.id,modified:Date.now(),...(folder.deleted?{deleted:folder.deleted}:{})});
    state.pinballAdded=true;
  }
  if(!state.cardGamesAdded){
    const anchor=state.files.find(f=>f.type==='shortcut'&&['mines','solitaire','pinball'].includes(f.app));
    const folder=state.files.find(f=>f.type==='folder'&&f.id===(anchor?.parent||'folder-games'));
    if(folder)for(const [app,name] of [['freecell','FreeCell'],['spider','Pókpasziánsz'],['hearts','Hearts']]){
      if(!state.files.some(f=>f.type==='shortcut'&&f.app===app))state.files.push({id:`shortcut-${app}`,name,type:'shortcut',app,parent:folder.id,modified:Date.now(),...(folder.deleted?{deleted:folder.deleted}:{})});
    }
    state.cardGamesAdded=true;
  }
  persist();
  const shortcutApps={mines:'mines',solitaire:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',hearts:'hearts'};
  const fileIcon=file=>file.type==='folder'?'folder':file.type==='image'?'pictures':file.type==='shortcut'?(shortcutApps[file.app]||'help'):'notepad';
  const windows = new Map(), apps = {};
  let sequence=0,z=20,active=null,modalDepth=0;
  const uniqueId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const wallpaperPath = name => name==='bliss'?'assets/wallpapers/bliss-hd.jpg':name==='none'?'':name==='windows-xp'?'assets/wallpapers/windows-xp.jpg':`assets/wallpapers/${name==='autumn'?'autumn':'azul'}-1920.jpg`;
  function applySettings(){
    document.body.dataset.theme=state.visualStyle==='classic'?'classic':state.theme;
    const desktop=$('#desktop'),fit=state.wallpaperFit||'fill';
    desktop.style.backgroundImage=state.wallpaper==='none'?'none':`url("${wallpaperPath(state.wallpaper)}")`;
    desktop.style.backgroundSize=fit==='fill'?'cover':'auto';
    desktop.style.backgroundRepeat=fit==='tile'?'repeat':'no-repeat';
    desktop.style.backgroundPosition=fit==='tile'?'left top':'center';
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
  function notify(title,message){const el=$('#balloon');el.innerHTML=`<button aria-label="Értesítés bezárása">×</button><strong>${esc(title)}</strong>${esc(message)}`;el.hidden=false;$('button',el).onclick=()=>el.hidden=true;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.hidden=true,6500);}
  function focus(win){if(!win || (modalDepth&&!win.modal))return;active=win.id;win.el.hidden=false;win.minimized=false;win.el.style.zIndex=++z;for(const w of windows.values())w.el.classList.toggle('inactive',w.id!==active);renderTasks();}
  function frontmost(){const next=[...windows.values()].filter(w=>!w.minimized).sort((a,b)=>Number(b.el.style.zIndex)-Number(a.el.style.zIndex))[0];active=null;if(next)focus(next);else renderTasks();}
  function renderTasks(){const container=$('#task-buttons');container.replaceChildren();for(const w of windows.values()){if(w.modal)continue;const b=document.createElement('button');b.className=`task-button ${w.id===active&&!w.minimized?'active':''}`;b.title=w.title;b.setAttribute('aria-label',w.title);b.innerHTML=`${icon(w.icon)}<span>${esc(w.title)}</span>`;b.onclick=()=>{if(modalDepth)return;if(w.id===active&&!w.minimized)minimize(w);else focus(w);};container.append(b);}}
  function close(win){if(!windows.has(win.id))return;if(win.onClose?.()===false)return;win.cleanup.forEach(fn=>fn());win.el.remove();windows.delete(win.id);if(win.modal){modalDepth--;win.shade?.remove();}frontmost();}
  function minimize(win){if(win.modal)return;win.minimized=true;win.el.hidden=true;frontmost();}
  function maximize(win){if(win.fixed)return;win.maximized=!win.maximized;win.el.classList.toggle('maximized',win.maximized);if(win.maximized){win.restore={left:win.el.style.left,top:win.el.style.top,width:win.el.style.width,height:win.el.style.height};Object.assign(win.el.style,{left:'0px',top:'0px',width:'100%',height:'100%'});}else Object.assign(win.el.style,win.restore);focus(win);}
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
    el.innerHTML=`<header class="title-bar">${icon(options.icon)}<span class="window-title">${esc(options.title)}</span><div class="window-controls">${options.modal?'':`<button class="window-control minimize" aria-label="Kis méret" title="Kis méret"></button><button class="window-control maximize" aria-label="Teljes méret" title="Teljes méret" ${options.fixed?'disabled':''}></button>`}<button class="window-control close" aria-label="Bezárás" title="Bezárás">×</button></div></header><div class="window-content"></div>${options.fixed?'':['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="resize-edge resize-${d}" data-resize="${d}"></div>`).join('')+'<div class="resize-handle" data-resize="se" aria-label="Átméretezés"></div>'}`;
    const win={id,el,body:$('.window-content',el),title:options.title,icon:options.icon,app:options.app,fixed:options.fixed,modal:options.modal,minimized:false,maximized:false,cleanup:[]};
    win.setTitle=title=>{win.title=title;$('.window-title',el).textContent=title;el.setAttribute('aria-label',title);renderTasks();};win.close=()=>close(win);win.focus=()=>focus(win);
    if(options.modal){modalDepth++;el.classList.add('dialog-window');el.setAttribute('aria-modal','true');const shade=document.createElement('div');shade.className='modal-shade';$('#windows').append(shade);win.shade=shade;}
    windows.set(id,win);$('#windows').append(el);
    el.addEventListener('pointerdown',()=>focus(win));$('.close',el).onclick=()=>close(win);
    if(!options.modal){$('.minimize',el).onclick=()=>minimize(win);$('.maximize',el).onclick=()=>maximize(win);}
    const bar=$('.title-bar',el);bar.ondblclick=e=>{if(!e.target.closest('button'))maximize(win);};
    bar.onpointerdown=e=>{if(e.button!==0||e.target.closest('button')||win.maximized)return;focus(win);e.preventDefault();const rect=el.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;bar.setPointerCapture(e.pointerId);bar.onpointermove=ev=>{el.style.left=`${Math.max(-width+100,Math.min(bounds.width-90,rect.left+ev.clientX-sx))}px`;el.style.top=`${Math.max(0,Math.min(bounds.height-29,rect.top+ev.clientY-sy))}px`;};bar.onpointerup=()=>{bar.onpointermove=null;};bar.onlostpointercapture=()=>bar.onpointermove=null;};
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
  function open(app,...args){hideMenus();if(modalDepth)return;const fn=apps[app];if(fn)return fn(...args);notify('A program nem található',app);}
  function register(name,fn){apps[name]=fn;}
  function singleton(app){const w=[...windows.values()].find(w=>w.app===app);if(w){focus(w);return w;}return null;}
  function menu(items,x,y){const el=$('#context-menu');el.replaceChildren();items.forEach(item=>{if(item===null){el.append(document.createElement('hr'));return;}const b=document.createElement('button');b.setAttribute('role','menuitem');b.disabled=!!item.disabled;b.innerHTML=`${item.icon?icon(item.icon):`<span>${item.checked?'✓':''}</span>`}${esc(item.label)}${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}`;b.onclick=e=>{e.stopPropagation();hideMenus();item.action?.();};el.append(b);});el.hidden=false;el.style.left=Math.min(x,innerWidth-el.offsetWidth-3)+'px';el.style.top=Math.min(y,innerHeight-el.offsetHeight-32)+'px';el.style.left=Math.max(0,parseInt(el.style.left))+'px';el.style.top=Math.max(0,parseInt(el.style.top))+'px';}
  function menubar(win,menus,logo=false){const bar=document.createElement('nav');bar.className='menu-bar';bar.setAttribute('aria-label','Alkalmazás menü');Object.entries(menus).forEach(([label,items])=>{const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.stopPropagation();const r=b.getBoundingClientRect();menu(typeof items==='function'?items():items,r.left,r.bottom);};bar.append(b);});if(logo){const span=document.createElement('span');span.className='toolbar-logo';span.innerHTML=icon('windows');bar.append(span);}win.body.append(bar);return bar;}
  function hideMenus(){ $('#context-menu').hidden=true;$('#start-menu').hidden=true;$('#start-button').classList.remove('active');$('#start-button').setAttribute('aria-expanded','false'); }
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
  const prompt=(title,message,value='')=>dialog(title,message,{input:'Fájlnév',value,buttons:['OK','Mégse']});
  const confirm=(title,message)=>dialog(title,message,{buttons:['Igen','Nem']});
  function fileName(name){return String(name||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').trim().slice(0,100);}
  function saveFile(file){const i=state.files.findIndex(f=>f.id===file.id);const next={...file,modified:Date.now()};if(i<0)state.files.push(next);else state.files[i]=next;const ok=persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));return ok;}
  function descendants(id){const ids=[id];for(let i=0;i<ids.length;i++)state.files.filter(f=>f.parent===ids[i]).forEach(f=>ids.push(f.id));return ids;}
  function deleteFile(id){const ids=descendants(id);state.files.forEach(f=>{if(ids.includes(f.id))f.deleted=true;});persist();sound('recycle');document.dispatchEvent(new CustomEvent('xp-files-changed'));}
  function restoreFile(id){const file=state.files.find(f=>f.id===id);if(!file)return;const parent=state.files.find(f=>f.id===file.parent);if(parent?.deleted)restoreFile(parent.id);const ids=descendants(id);state.files.forEach(f=>{if(ids.includes(f.id))delete f.deleted;});persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));}
  function download(name,content,type='text/plain;charset=utf-8'){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName(name)||'dokumentum.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openFile(id){const file=state.files.find(f=>f.id===id&&!f.deleted);if(!file)return;if(file.type==='folder')open('explorer',id);else if(file.type==='image')open('image',id);else if(file.type==='shortcut'){if(Object.hasOwn(shortcutApps,file.app))open(shortcutApps[file.app]);}else open('notepad',id);}
  function onFiles(win,fn){document.addEventListener('xp-files-changed',fn);win.cleanup.push(()=>document.removeEventListener('xp-files-changed',fn));}
  function status(win,text,extra=''){const bar=document.createElement('footer');bar.className='status-bar';bar.innerHTML=`<span>${esc(text)}</span>${extra?`<span class="status-part">${esc(extra)}</span>`:''}`;win.body.append(bar);return bar;}
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#context-menu,#start-menu,#start-button,.menu-bar'))hideMenus();});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)open(b.dataset.open);});
  document.addEventListener('keydown',e=>{if(modalDepth)return;if(e.key==='Escape')hideMenus();if(e.altKey&&e.key==='F4'){e.preventDefault();if(active)close(windows.get(active));}if(e.ctrlKey&&e.key==='Escape'){e.preventDefault();$('#start-button').click();}if(e.altKey&&e.key==='Tab'){e.preventDefault();const list=[...windows.values()];const index=list.findIndex(w=>w.id===active);if(list.length)focus(list[(index+1)%list.length]);}});
  window.addEventListener('resize',()=>{const h=$('#desktop').clientHeight;for(const w of windows.values()){if(w.maximized)continue;w.el.style.left=Math.max(0,Math.min(parseInt(w.el.style.left)||0,innerWidth-100))+'px';w.el.style.top=Math.max(0,Math.min(parseInt(w.el.style.top)||0,h-32))+'px';if(w.el.offsetWidth>innerWidth)w.el.style.width=innerWidth+'px';if(w.el.offsetHeight>h)w.el.style.height=h+'px';}});
  return {$,$$,esc,icon,iconPath,fileIcon,state,persist,apps,windows,open,register,singleton,createWindow,resizeBox,fitDialog,focus,close,minimize,maximize,menu,menubar,hideMenus,dialog,prompt,confirm,notify,sound,applySettings,wallpaperPath,uniqueId,fileName,saveFile,deleteFile,restoreFile,descendants,download,openFile,onFiles,status,get active(){return active;},get modal(){return modalDepth>0;}};
})();
