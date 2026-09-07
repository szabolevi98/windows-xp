'use strict';
(() => {
const {$,$$,esc,icon,state,register,persist,notify}=XP;
const baseIcons=[
 {id:'computer',label:'Sajátgép',icon:'computer',app:'computer'},
 {id:'internet',label:'Internet Explorer',icon:'ie',app:'ie'},
 {id:'outlook',label:'Outlook Express',icon:'mail',app:'outlook'},
 {id:'documents',label:'Dokumentumok',icon:'documents',app:'documents'},
 {id:'notepad',label:'Jegyzettömb',icon:'notepad',app:'notepad'},
 {id:'paint',label:'Paint',icon:'paint',app:'paint'},
 {id:'player',label:'Media Player',icon:'player',app:'player'},
 {id:'recycle',label:'Lomtár',icon:'recycle',app:'recycle'}
];
const BOOT_DURATION=5500,WELCOME_DURATION=2000;
let selectedIcon=null,skipClick=false,desktopShown=false,hiddenWindows=[],bootTimer,welcomeTimer,bootPhase='boot';
let bootGeneration=0,startupPending=false;
function desktopItems(){return [...baseIcons.map(i=>i.id==='recycle'?{...i,icon:XP.recycleIcon()}:i),...state.files.filter(f=>f.parent==='desktop'&&!f.deleted).map(f=>({id:f.id,label:f.name,icon:XP.fileIcon(f),file:f.id,shortcut:f.type==='shortcut'}))];}
function activateIcon(item){if(item.file)XP.openFile(item.file);else XP.open(item.app);}
function renderIcons(){
 const el=$('#desktop-icons');el.replaceChildren();
 const items=desktopItems(),grid=XP.DesktopGrid.create($('#desktop').clientWidth,$('#desktop').clientHeight,items.length);
 let positions=XP.DesktopGrid.layout(items.map(item=>item.id),state.iconPositions,grid);
 const place=(button,id)=>{const p=XP.DesktopGrid.pixel(positions[id],grid);button.style.left=p.x+'px';button.style.top=p.y+'px';};
 items.forEach(item=>{
 const b=document.createElement('button');b.className='desktop-icon'+(selectedIcon===item.id?' selected':'')+(XP.clipped===item.file?' cut':'')+(item.shortcut?' shortcut':'');b.dataset.iconId=item.id;place(b,item.id);
 b.innerHTML=`${icon(item.icon)}<span class="icon-label">${esc(item.label)}</span>`;b.setAttribute('aria-label',item.label);b.title=item.label;
 b.onclick=()=>{if(skipClick){skipClick=false;return;}selectedIcon=item.id;$$('.desktop-icon').forEach(n=>n.classList.toggle('selected',n===b));};b.ondblclick=()=>activateIcon(item);b.onkeydown=e=>{
  if(e.key==='Enter'){e.preventDefault();activateIcon(item);}
  if(e.key==='Delete'&&item.file)XP.trashFile(item.file);
  if(e.ctrlKey){const key=e.key.toLowerCase();if(key==='v'){e.preventDefault();XP.paste('desktop');}if(item.file&&(key==='x'||key==='c')){e.preventDefault();XP.clip(item.file,key==='x');}}
 };
 b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();selectedIcon=item.id;$$('.desktop-icon').forEach(n=>n.classList.toggle('selected',n===b));XP.menu([{label:'Megnyitás',icon:item.icon,action:()=>activateIcon(item)},...(item.id==='recycle'?[{label:'Lomtár ürítése',icon:'recycle',action:XP.emptyTrash,disabled:!state.files.some(f=>f.deleted)}]:[]),...(item.file?[null,{label:'Kivágás',shortcut:'Ctrl+X',action:()=>XP.clip(item.file,true)},{label:'Másolás',shortcut:'Ctrl+C',action:()=>XP.clip(item.file,false)},null,{label:'Küldés',items:[
  {label:'Asztal (parancsikon létrehozása)',icon:'showdesktop',action:()=>{if(XP.shortcutToFile(item.file))notify('Parancsikon',`A(z) „${item.label}” parancsikonja elkészült.`);}},
  {label:'Dokumentumok',icon:'documents',action:()=>{if(XP.copyInto(item.file,'documents'))notify('Küldés',`Másolat készült a Dokumentumokba: ${item.label}`);}}
 ]},
 {label:'Átnevezés',action:async()=>{const name=XP.fileName(await XP.prompt('Átnevezés','Új név:',item.label));if(name){const f=state.files.find(f=>f.id===item.file);if(state.files.some(o=>o.id!==f.id&&o.parent===f.parent&&o.name===name&&!o.deleted)){notify('Átnevezés','Ez a név már foglalt.');return;}XP.saveFile({...f,name});}}},{label:'Törlés',icon:'recycle',action:()=>XP.trashFile(item.file)}]:[]),null,{label:'Tulajdonságok',action:()=>item.id==='computer'?XP.open('system'):XP.dialog(item.label,`${item.label}\n${item.shortcut?'Parancsikon egy Windows XP programhoz.':item.file?'Saját fájl az asztalon.':'Windows XP alkalmazás vagy rendszermappa.'}`)}],e.clientX,e.clientY);};
 b.onpointerdown=e=>{
  if(e.button!==0)return;
  const sx=e.clientX,sy=e.clientY,left=parseInt(b.style.left),top=parseInt(b.style.top);
  let moved=false;
  selectedIcon=item.id;$$('.desktop-icon').forEach(n=>n.classList.toggle('selected',n===b));
  b.setPointerCapture(e.pointerId);
  const finish=(ev,cancelled=false)=>{
   b.onpointermove=null;b.onpointerup=null;b.onpointercancel=null;b.onlostpointercapture=null;
   const target=moved&&!cancelled?XP.dropTarget(ev.clientX,ev.clientY,item.id):null;
   b.classList.remove('dragging');
   XP.highlightDrop(null);
   // Dropped on the bin or into a folder the file leaves the desktop; otherwise it just moves.
   const relocated=item.file&&target&&target.type!=='desktop'&&XP.applyDrop(target,item.file,null,ev.ctrlKey);
   if(moved&&!cancelled&&!relocated){
    positions=XP.DesktopGrid.drop(positions,item.id,{x:parseInt(b.style.left),y:parseInt(b.style.top)},grid);
    state.iconPositions=positions;persist();
   }
   if(relocated)return;
   $$('.desktop-icon').forEach(n=>place(n,n.dataset.iconId));
   if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);
   if(moved){skipClick=true;setTimeout(()=>skipClick=false,0);}
   else if(!cancelled&&ev.pointerType==='touch')activateIcon(item);
  };
  b.onpointermove=ev=>{
   if(Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>5)moved=true;
   if(!moved)return;
   b.classList.add('dragging');
   const max=XP.DesktopGrid.pixel({col:grid.maxColumns-1,row:grid.rows-1},grid);
   b.style.left=Math.max(0,Math.min(max.x,left+ev.clientX-sx))+'px';
   b.style.top=Math.max(0,Math.min(max.y,top+ev.clientY-sy))+'px';
   const over=XP.dropTarget(ev.clientX,ev.clientY,item.id);
   XP.highlightDrop(item.file&&over&&over.type!=='desktop'?over:null);
  };
  b.onpointerup=ev=>finish(ev);
  b.onpointercancel=ev=>finish(ev,true);
  b.onlostpointercapture=ev=>finish(ev,true);
 };el.append(b);
 });
}
// Everything the frequent list may show, with the name and icon it wears there.
const PROGRAM_ITEMS={
 player:['Windows Media Player','player'],notepad:['Jegyzettömb','notepad'],paint:['Paint','paint'],
 calculator:['Számológép','calculator'],mines:['Aknakereső','mines'],solitaire:['Pasziánsz','solitaire'],
 freecell:['FreeCell','freecell'],spider:['Pókpasziánsz','spider'],hearts:['Hearts','hearts'],
 pinball:['3D Pinball – Space Cadet','pinball'],cmd:['Parancssor','cmd'],explorer:['Windows Intéző','folder'],
 taskmgr:['Feladatkezelő','taskmgr'],help:['Súgó és támogatás','help'],ie:['Internet Explorer','ie'],outlook:['Outlook Express','mail']
};
const DEFAULT_FREQUENT=['player','notepad','paint','calculator','mines'];
// Internet and E-mail are pinned above, so they never take a place in the list below.
function frequentPrograms(){
 const used=Object.entries(state.programUse||{})
  .filter(([app])=>PROGRAM_ITEMS[app]&&app!=='ie'&&app!=='outlook')
  .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .map(([app])=>app);
 const list=[...used,...DEFAULT_FREQUENT.filter(app=>!used.includes(app))];
 return list.slice(0,6);
}
function recentDocuments(){
 return (state.recentDocs||[]).map(id=>state.files.find(f=>f.id===id&&!f.deleted)).filter(Boolean);
}
const programsMenu=[
 ['Kellékek','programs',[
  ['Jegyzettömb','notepad','notepad'],['Paint','paint','paint'],['Parancssor','cmd','cmd'],
  ['Számológép','calculator','calculator'],['Windows Intéző','folder','explorer'],
  ['Rendszereszközök','folder',[['Feladatkezelő','taskmgr','taskmgr'],['Vezérlőpult','control','control']]]
 ]],
 ['Játékok','programs',[
  ['Aknakereső','mines','mines'],['FreeCell','freecell','freecell'],['Hearts','hearts','hearts'],
  ['Pasziánsz','solitaire','solitaire'],['Pókpasziánsz','spider','spider'],['3D Pinball – Space Cadet','pinball','pinball']
 ]],
 null,
 ['Internet Explorer','ie','ie'],['Outlook Express','mail','outlook'],['Windows Media Player','player','player'],
 ['Súgó és támogatás','help','help']
];
// A folder opens its own little menu beside itself, like every cascading menu in XP.
// What you opened last, in a little menu of its own — empty until there is something to show.
function recentMarkup(){
 const docs=recentDocuments();
 const items=docs.length
  ?docs.map(f=>`<button class="start-item" data-file="${esc(f.id)}">${icon(XP.fileIcon(f))}<span>${esc(f.name)}</span></button>`).join('')
   +`<div class="start-separator"></div><button class="start-item" data-recent="clear"><span>A lista törlése</span></button>`
  :'<button class="start-item" disabled><span>(üres)</span></button>';
 return `<div class="menu-folder"><button class="start-item">${icon('documents')}<span>Legutóbbi dokumentumok</span><b class="submenu-arrow">▶</b></button><div class="popup-menu folder-menu">${items}</div></div>`;
}
function programsMarkup(entries){
 return entries.map(entry=>{
  if(entry===null)return '<div class="start-separator"></div>';
  const [label,ic,target]=entry;
  if(!Array.isArray(target))return startItem(label,ic,target);
  return `<div class="menu-folder"><button class="start-item folder">${icon(ic)}<span>${esc(label)}</span><b class="submenu-arrow">▶</b></button><div class="popup-menu folder-menu">${programsMarkup(target)}</div></div>`;
 }).join('');
}
function startItem(label,ic,app,subtitle='',minor=false){return `<button class="start-item ${minor?'minor':''}" data-open="${app}" data-label="${esc(label)}" data-icon="${ic}">${icon(ic)}<span>${subtitle?`<b>${label}</b><small>${subtitle}</small>`:label}</span></button>`;}
function renderStart(){const el=$('#start-menu');el.innerHTML=`<header class="start-header"><button class="start-user" data-open="profile" title="Felhasználói fiókok"><img class="start-avatar" src="${XP.avatarPath(state.avatar)}" alt="Felhasználói kép"><span>${esc(state.user)}</span></button></header><div class="start-columns"><div class="start-left">${startItem('Internet','ie','ie','Internet Explorer')}${startItem('Email','mail','outlook','Outlook Express')}<div class="start-separator"></div>${frequentPrograms().map(app=>startItem(PROGRAM_ITEMS[app][0],PROGRAM_ITEMS[app][1],app)).join('')}<div class="start-separator"></div><button class="start-item all-programs" id="all-programs">Minden program <b>▶</b></button></div><div class="start-right">${startItem('Dokumentumok','documents','documents')}${recentMarkup()}${startItem('Képek','pictures','pictures')}${startItem('Zene','music','music')}${startItem('Sajátgép','computer','computer')}<div class="start-separator"></div>${startItem('Vezérlőpult','control','control','',true)}${startItem('Nyomtatók és faxok','printers','printers','',true)}${startItem('Hálózati kapcsolatok','network','network','',true)}<div class="start-separator"></div>${startItem('Súgó és támogatás','help','help','',true)}${startItem('Keresés','search','search','',true)}${startItem('Futtatás…','run','run','',true)}</div></div><footer class="start-footer"><button data-open="logoff">${icon('logoff')} Kijelentkezés</button><button data-open="power">${icon('shutdown')} Kikapcsolás</button></footer><div class="programs-menu popup-menu" hidden>${programsMarkup(programsMenu)}</div>`;el.onclick=e=>{
  const file=e.target.closest('[data-file]');
  if(file){XP.hideMenus();XP.openFile(file.dataset.file);return;}
  if(e.target.closest('[data-recent=clear]')){state.recentDocs=[];persist();renderStart();}
 };
 $('#all-programs').onclick=e=>{e.stopPropagation();$('.programs-menu',el).hidden=!$('.programs-menu',el).hidden;};}
$('#start-button').onclick=e=>{e.stopPropagation();if(XP.modal)return;const el=$('#start-menu');if(el.hidden){renderStart();el.hidden=false;$('#start-button').classList.add('active');$('#start-button').setAttribute('aria-expanded','true');}else XP.hideMenus();};
$('#start-menu').oncontextmenu=e=>{
 const button=e.target.closest('.start-item[data-open]');if(!button)return;
 e.preventDefault();e.stopPropagation();
 const app=button.dataset.open,label=button.dataset.label||button.textContent.trim(),ic=button.dataset.icon||'help';
 const already=baseIcons.some(i=>i.app===app)||state.files.some(f=>f.type==='shortcut'&&f.app===app&&f.parent==='desktop'&&!f.deleted);
 XP.menu([
  {label:'Megnyitás',icon:ic,action:()=>XP.open(app)},
  null,
  {label:'Küldés az asztalra (parancsikon)',icon:'showdesktop',disabled:already,action:()=>{
   if(XP.shortcutTo(app,label,ic))notify('Parancsikon',`A(z) „${label}” parancsikonja az asztalra került.`);
  }}
 ],e.clientX,e.clientY);
};
$('#show-desktop').onclick=()=>{if(XP.modal)return;if(!desktopShown){hiddenWindows=[...XP.windows.values()].filter(w=>!w.minimized).map(w=>w.id);XP.sound('minimize');hiddenWindows.forEach(id=>XP.minimize(XP.windows.get(id),true));desktopShown=true;}else{hiddenWindows.forEach(id=>{const w=XP.windows.get(id);if(w)XP.focus(w);});desktopShown=false;hiddenWindows=[];}};
const volumeFlyout=$('#volume-flyout'),volumeDial=$('.volume-dial',volumeFlyout),volumeMute=$('.volume-mute input',volumeFlyout);
function showVolume(){
 const shown=volumeFlyout.hidden;
 XP.hideMenus();
 if(!shown||XP.modal)return;
 volumeDial.value=state.volume;volumeMute.checked=!state.sounds;
 volumeFlyout.hidden=false;
 // Anchored by its right edge, so it lands under the speaker without measuring itself.
 const button=$('#volume-button').getBoundingClientRect();
 volumeFlyout.style.right=Math.max(2,innerWidth-button.right)+'px';
}
const volumeChanged=()=>{persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));document.dispatchEvent(new CustomEvent('xp-settings-changed'));};
volumeDial.oninput=e=>{state.volume=Number(e.target.value);volumeChanged();};
volumeMute.onchange=e=>{state.sounds=!e.target.checked;volumeChanged();};
$('#volume-button').onclick=e=>{e.stopPropagation();showVolume();};
$('#volume-button').ondblclick=()=>{XP.hideMenus();XP.open('volume');};
document.addEventListener('xp-volume-changed',()=>{if(!volumeFlyout.hidden){volumeDial.value=state.volume;volumeMute.checked=!state.sounds;}});
$('#clock').ondblclick=()=>XP.open('calendar');
const trayToggle=$('#tray-toggle'),trayHidden=$('#tray-hidden');
trayToggle.onclick=e=>{e.stopPropagation();const show=trayHidden.hidden;trayHidden.hidden=!show;trayToggle.title=trayToggle.ariaLabel=show?'Rejtett ikonok elrejtése':'Rejtett ikonok megjelenítése';trayToggle.setAttribute('aria-expanded',String(show));};
const trayNotices={
 mail:null
};
$$('[data-tray]').forEach(button=>button.onclick=()=>{const notice=trayNotices[button.dataset.tray];if(notice)XP.dialog(notice[0],notice[1]);else XP.open(button.dataset.tray);});
function updateClock(){const now=new Date();$('#clock').textContent=now.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});$('#clock').title=now.toLocaleDateString('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'});}
// Sorting fills the columns in the order the chosen key gives, the way XP lined them up.
function sortIcons(by){
 const items=desktopItems(),file=id=>state.files.find(f=>f.id===id);
 const rank={computer:0,internet:1,outlook:2,documents:3,notepad:4,paint:5,player:6,recycle:99};
 const order=[...items].sort((a,b)=>{
  const fa=file(a.file),fb=file(b.file);
  if(!fa&&!fb)return (rank[a.id]??50)-(rank[b.id]??50);
  if(!fa)return -1;
  if(!fb)return 1;
  if(by==='type')return (fa.type||'').localeCompare(fb.type||'','hu')||fa.name.localeCompare(fb.name,'hu');
  if(by==='modified')return (fb.modified||0)-(fa.modified||0);
  return fa.name.localeCompare(fb.name,'hu');
 });
 const grid=XP.DesktopGrid.create($('#desktop').clientWidth,$('#desktop').clientHeight,order.length);
 state.iconPositions={};
 if(by!=='grid')order.forEach((item,index)=>{state.iconPositions[item.id]={col:Math.floor(index/grid.rows),row:index%grid.rows};});
 persist();renderIcons();
}
async function newDesktop(type){const result=await XP.prompt(type==='folder'?'Új mappa':'Új szöveges dokumentum','Név:',type==='folder'?'Új mappa':'Új dokumentum.txt');let name=XP.fileName(result);if(!name)return;if(type==='text'&&!name.endsWith('.txt'))name+='.txt';if(state.files.some(f=>f.parent==='desktop'&&f.name===name&&!f.deleted)){notify('Új elem','Ez a név már foglalt.');return;}XP.saveFile({id:XP.uniqueId(),name,type,parent:'desktop',content:''});}
$('#desktop').oncontextmenu=e=>{if(e.target.closest('.window,.desktop-icon'))return;e.preventDefault();XP.menu([
  {label:'Rendezés ikonok szerint',items:[
   {label:'Név',action:()=>sortIcons('name')},{label:'Típus',action:()=>sortIcons('type')},
   {label:'Módosítás dátuma',action:()=>sortIcons('modified')},null,
   {label:'Automatikus elrendezés',action:()=>sortIcons('grid')}
  ]},
  {label:'Frissítés',action:renderIcons},null,
  {label:'Új',items:[{label:'Mappa',icon:'folder',action:()=>newDesktop('folder')},{label:'Szöveges dokumentum',icon:'notepad',action:()=>newDesktop('text')}]},{label:'Beillesztés',shortcut:'Ctrl+V',action:()=>XP.paste('desktop'),disabled:!XP.canPaste()},null,{label:document.fullscreenElement?'Kilépés a teljes képernyőből':'Teljes képernyő',action:()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p?.catch(()=>notify('Teljes képernyő','A teljes képernyőhöz az F11 billentyűt is használhatod.'));}},{label:'Tulajdonságok',icon:'control',action:()=>XP.open('display')}],e.clientX,e.clientY);};
$('#desktop').addEventListener('pointerdown',e=>{if(e.target.closest('.window,.desktop-icon')||e.button!==0||XP.modal)return;selectedIcon=null;$$('.desktop-icon').forEach(b=>b.classList.remove('selected'));const box=$('#selection-box'),x=e.clientX,y=e.clientY;box.hidden=false;Object.assign(box.style,{left:x+'px',top:y+'px',width:'0px',height:'0px'});function move(ev){Object.assign(box.style,{left:Math.min(x,ev.clientX)+'px',top:Math.min(y,ev.clientY)+'px',width:Math.abs(x-ev.clientX)+'px',height:Math.abs(y-ev.clientY)+'px'});const r=box.getBoundingClientRect();$$('.desktop-icon').forEach(b=>{const br=b.getBoundingClientRect();b.classList.toggle('selected',br.left<r.right&&br.right>r.left&&br.top<r.bottom&&br.bottom>r.top);});}function up(){box.hidden=true;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);});
// Cascade and tile, both measured against the desktop the way the taskbar arranged them.
function arrange(mode){
 const list=[...XP.windows.values()].filter(w=>!w.modal&&!w.fixed);
 if(!list.length){notify('Tálca','Nincs elrendezhető ablak.');return;}
 const area=$('#desktop'),width=area.clientWidth,height=area.clientHeight;
 list.forEach((w,index)=>{
  if(w.maximized)XP.maximize(w);
  w.minimized=false;w.el.hidden=false;
  const box=mode==='cascade'
   ?{left:26*index,top:26*index,width:Math.min(660,width-26*list.length),height:Math.min(480,height-26*list.length)}
   :mode==='rows'
   ?{left:0,top:Math.round(index*height/list.length),width,height:Math.round(height/list.length)}
   :{left:Math.round(index*width/list.length),top:0,width:Math.round(width/list.length),height};
  Object.assign(w.el.style,{left:box.left+'px',top:box.top+'px',
   width:Math.max(w.minWidth,box.width)+'px',height:Math.max(w.minHeight,box.height)+'px'});
  XP.focus(w);
 });
 desktopShown=false;hiddenWindows=[];
}
$('#taskbar').oncontextmenu=e=>{
 if(XP.modal||e.target.closest('.task-button'))return;
 e.preventDefault();
 if(e.target.closest('#start-button')){
  XP.menu([
   {label:'Megnyitás',icon:'start',action:()=>$('#start-button').click()},
   {label:'Az Intéző megnyitása',icon:'folder',action:()=>XP.open('explorer')},
   {label:'Keresés…',icon:'search',action:()=>XP.open('search')},
   null,
   {label:'Tulajdonságok',icon:'taskbar',action:()=>XP.open('taskbar','start')}
  ],e.clientX,e.clientY);
  return;
 }
 const locked=(state.taskbar||{}).locked!==false;
 XP.menu([
  {label:'Eszköztárak',disabled:true},
  null,
  {label:'Ablakok lépcsőzetesen',action:()=>arrange('cascade')},
  {label:'Ablakok mozaikszerűen vízszintesen',action:()=>arrange('rows')},
  {label:'Ablakok mozaikszerűen függőlegesen',action:()=>arrange('columns')},
  {label:'Az összes ablak kis mérete',disabled:![...XP.windows.values()].some(w=>!w.modal&&!w.minimized),action:()=>{
   if(desktopShown){desktopShown=false;hiddenWindows=[];}
   $('#show-desktop').click();
  }},
  null,
  {label:'Feladatkezelő',icon:'taskmgr',action:()=>XP.open('taskmgr')},
  null,
  {label:'A Tálca rögzítése',checked:locked,action:()=>{state.taskbar={...state.taskbar,locked:!locked};persist();}},
  {label:'Tulajdonságok',icon:'taskbar',action:()=>XP.open('taskbar')}
 ],e.clientX,e.clientY);
};
function closeAll(){[...XP.windows.values()].forEach(w=>XP.close(w));}
function resetStartup(){bootGeneration++;startupPending=false;const startup=$('#startup-sound');startup.pause();startup.currentTime=0;}
function boot(){clearTimeout(bootTimer);clearTimeout(welcomeTimer);resetStartup();bootPhase='boot';$('#off-screen').hidden=true;$('#welcome-screen').hidden=true;$('#boot-screen').hidden=false;XP.hideMenus();bootTimer=setTimeout(loginScreen,BOOT_DURATION);}
function welcome(){if(bootPhase!=='boot')return;clearTimeout(bootTimer);bootPhase='welcome';$('#boot-screen').hidden=true;$('#welcome-screen').hidden=false;$('.welcome-center').innerHTML='<span>Üdvözöljük</span>';$('.welcome-bottom').innerHTML='';welcomeTimer=setTimeout(enterDesktop,WELCOME_DURATION);}
async function enterDesktop(){
 if(bootPhase!=='welcome'||startupPending)return;
 startupPending=true;const generation=bootGeneration;
 // Call play() directly from the login click when autoplay was denied.
 const playback=await XP.sound('startup');
 if(generation!==bootGeneration)return;
 startupPending=false;
 if(playback==='blocked'){
  showLogin();
  bindLogin(()=>enterDesktop());
  return;
 }
 bootPhase='desktop';$('#welcome-screen').hidden=true;$('#boot-screen').hidden=true;$('#off-screen').hidden=true;
 if(playback==='error')notify('Bejelentkezési hang','A bejelentkezési hangot nem sikerült lejátszani.');
 // The tip is for the first arrival; after that the desktop speaks for itself.
 else if(state.showWelcome){state.showWelcome=false;persist();notify('Üdv a Windows XP-ben!', 'Az ikonokat dupla kattintással nyithatod meg. Kezdj a Start menüvel, és fedezd fel a régi kedvenceket! Az igazi élményhez az F11 billentyűvel válthatsz teljes képernyőre.');}
}
function logonPower(){
 const screen=$('#welcome-screen');
 if($('.logon-power',screen))return;
 const panel=document.createElement('div');panel.className='logon-power';
 panel.innerHTML=`<div class="power-panel"><header class="power-heading"><span>A számítógép kikapcsolása</span>${icon('windows')}</header><div class="power-options"><button data-power="standby">${icon('standby')} Készenlét</button><button data-power="shutdown">${icon('shutdown')} Kikapcsolás</button><button data-power="restart">${icon('restart')} Újraindítás</button></div><footer class="power-bottom"><button class="xp-button" data-power="cancel">Mégse</button></footer></div>`;
 screen.append(panel);
 panel.onclick=event=>{
  const action=event.target.closest('[data-power]')?.dataset.power;
  if(!action)return;
  panel.remove();
  if(action==='cancel')return;
  persist();
  if(action==='restart'){closeAll();boot();return;}
  if(action==='shutdown'){closeAll();XP.sound('shutdown');screen.hidden=true;$('#off-screen').hidden=false;bootPhase='off';return;}
  // Waking from standby returns to the logon screen, since nobody has signed in yet.
  bootPhase='standby';
  $('.welcome-center').innerHTML='<button class="welcome-user"><span><strong>Készenlét</strong><small>Kattints a folytatáshoz</small></span></button>';
  $('.welcome-bottom').innerHTML='';
  $('.welcome-user').onclick=()=>loginScreen();
 };
 $('[data-power=cancel]',panel).focus();
}
function loginMarkup(){
 return `<div class="welcome-login"><div class="welcome-brand"><div class="windows-brand">${icon('windows')}<small>Microsoft®</small><strong>Windows<i>®</i><span>xp<em>™</em></span></strong></div><p class="welcome-hint">A kezdéshez kattints a nevedre</p></div><i class="welcome-divider"></i><div class="welcome-users">${XP.accounts().map(account=>`<button class="welcome-user" data-account="${account.id}">${XP.avatar(account.avatar)}<span><strong>${esc(account.name)}</strong><small>${account.running?`${account.running} program fut`:account.id==='guest'?'Vendég fiók':'Bejelentkezés'}</small></span></button>`).join('')}</div></div>`;
}
function bindLogin(after){
 $$('.welcome-user[data-account]').forEach(button=>button.onclick=()=>{XP.switchUser(button.dataset.account);return after();});
}
function showLogin(){
 $('.welcome-center').innerHTML=loginMarkup();
 $('.welcome-bottom').innerHTML=`<button class="welcome-power">${icon('shutdown')}<span>A számítógép kikapcsolása</span></button><p class="welcome-note">A fiók módosításához nyisd meg a Vezérlőpultot,<br>és kattints a Felhasználói fiókok elemre.</p>`;
 $('.welcome-power').onclick=logonPower;
}
function loginScreen(keepRunning){clearTimeout(bootTimer);clearTimeout(welcomeTimer);resetStartup();if(!keepRunning)closeAll();bootPhase='login';$('#boot-screen').hidden=true;$('#welcome-screen').hidden=false;showLogin();bindLogin(()=>{bootPhase='boot';welcome();});}
register('logoff',()=>powerDialog(true));register('power',()=>powerDialog(false));
function powerDialog(logoff){const w=XP.createWindow({title:logoff?'Kijelentkezés':'A számítógép kikapcsolása',icon:'shutdown',width:390,height:230,fixed:true,modal:true,className:'power-dialog'});$('.title-bar',w.el).hidden=true;w.onClose=()=>{};
 const shade=document.createElement('div');shade.className='power-shade';document.body.append(shade);w.cleanup.push(()=>shade.remove());w.body.innerHTML=`<header class="power-heading"><span>${logoff?'Kijelentkezés':'A számítógép kikapcsolása'}</span>${icon('windows')}</header><div class="power-options">${logoff?`<button data-power="switch">${icon('user')} Felhasználóváltás</button><button data-power="logoff">${icon('logoff')} Kijelentkezés</button>`:`<button data-power="standby">${icon('standby')} Készenlét</button><button data-power="shutdown">${icon('shutdown')} Kikapcsolás</button><button data-power="restart">${icon('restart')} Újraindítás</button>`}</div><footer class="power-bottom"><button class="xp-button" data-power="cancel">Mégse</button></footer>`;w.body.onclick=e=>{const a=e.target.closest('[data-power]')?.dataset.power;if(!a)return;w.close();if(a==='cancel')return;persist();if(a==='switch'){XP.sound('logoff');XP.parkSession();loginScreen(true);}
   if(a==='logoff'){XP.sound('logoff');loginScreen();}if(a==='restart'){closeAll();XP.closeParked();boot();}if(a==='shutdown'){closeAll();XP.closeParked();XP.sound('shutdown');$('#balloon').hidden=true;$('#off-screen').hidden=false;bootPhase='off';}if(a==='standby'){bootPhase='standby';$('#welcome-screen').hidden=false;$('.welcome-center').innerHTML='<button class="welcome-user"><span><strong>Készenlét</strong><small>Kattints a folytatáshoz</small></span></button>';$('.welcome-user').onclick=()=>{bootPhase='desktop';$('#welcome-screen').hidden=true;};}};}
$('#skip-boot').onclick=loginScreen;$('#boot-screen').onclick=loginScreen;$('#power-on').onclick=boot;
document.addEventListener('keydown',e=>{if(bootPhase==='boot'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();loginScreen();}if(e.key==='F1'&&bootPhase==='desktop'&&!XP.modal){e.preventDefault();XP.open('help');}});
document.addEventListener('xp-files-changed',renderIcons);document.addEventListener('xp-settings-changed',()=>{renderIcons();if(!$('#start-menu').hidden)renderStart();});window.addEventListener('resize',renderIcons);
XP.applySettings();renderIcons();updateClock();setInterval(updateClock,1000);boot();
})();
