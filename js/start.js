'use strict';
(() => {
const {$,$$,esc,icon,state,register,persist,notify,t,locale}=XP;
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
function desktopItems(){return [...baseIcons.map(i=>({...i,label:t(i.label),icon:i.id==='recycle'?XP.recycleIcon():i.icon})),...state.files.filter(f=>f.parent==='desktop'&&!f.deleted).map(f=>({id:f.id,label:f.name,icon:XP.fileIcon(f),file:f.id,shortcut:f.type==='shortcut'}))];}
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
 b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();selectedIcon=item.id;$$('.desktop-icon').forEach(n=>n.classList.toggle('selected',n===b));XP.menu([{label:t("text_open"),icon:item.icon,action:()=>activateIcon(item)},...(item.id==='computer'?[{label:t("text_explore"),icon:'folder',action:()=>XP.open('explorer')},{label:t("text_search_35795fbf"),icon:'search',action:()=>XP.open('search')},{label:t("text_manage"),icon:'computer',action:()=>XP.open('compmgmt')},null,{label:t("text_map_network_drive"),disabled:true},{label:t("text_disconnect_network_drive"),disabled:true}]:[]),...(item.id==='recycle'?[{label:t("text_empty_recycle_bin"),icon:'recycle',action:XP.emptyTrash,disabled:!state.files.some(f=>f.deleted)}]:[]),...(item.file?[null,{label:t("text_cut"),shortcut:'Ctrl+X',action:()=>XP.clip(item.file,true)},{label:t("text_copy"),shortcut:'Ctrl+C',action:()=>XP.clip(item.file,false)},null,{label:t("text_send_to"),items:[
  {label:t("text_desktop_create_shortcut"),icon:'showdesktop',action:()=>{if(XP.shortcutToFile(item.file))notify(t("text_shortcut"),t("text_the_shortcut_to_name_has_been_created",{name:item.label}));}},
  {label:t("text_my_documents"),icon:'documents',action:()=>{if(XP.copyInto(item.file,'documents'))notify(t("text_send_to"),t("text_a_copy_was_placed_in_my_documents_name",{name:item.label}));}}
 ]},
 {label:t("text_rename"),action:async()=>{const name=XP.fileName(await XP.prompt(t("text_rename"),t("text_new_name"),item.label));if(name){const f=state.files.find(f=>f.id===item.file);if(state.files.some(o=>o.id!==f.id&&o.parent===f.parent&&o.name===name&&!o.deleted)){notify(t("text_rename"),t("text_that_name_is_already_taken"));return;}XP.saveFile({...f,name});}}},{label:t("text_delete"),icon:'recycle',action:()=>XP.trashFile(item.file)}]:[]),null,{label:t("text_properties"),action:()=>item.id==='computer'?XP.open('system'):XP.dialog(item.label,`${item.label}\n${item.shortcut?t("text_a_shortcut_to_a_windows_xp_program"):item.file?t("text_your_own_file_on_the_desktop"):t("text_a_windows_xp_program_or_system_folder")}`)}],e.clientX,e.clientY);};
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
 pinball:['3D Pinball – Space Cadet','pinball'],cmd:['Parancssor','cmd'],
 taskmgr:['Feladatkezelő','taskmgr'],help:['Súgó és támogatás','help'],ie:['Internet Explorer','ie'],outlook:['Outlook Express','mail']
};
const DEFAULT_FREQUENT=['player','notepad','paint','calculator','mines'];
const pinnedPrograms=()=>Array.isArray(state.pinnedPrograms)?state.pinnedPrograms.filter(app=>PROGRAM_ITEMS[app]):['ie','outlook'];
// Internet and E-mail are pinned above, so they never take a place in the list below.
function frequentPrograms(){
  const pinned=pinnedPrograms();
  const used=Object.entries(state.programUse||{})
   .filter(([app,count])=>PROGRAM_ITEMS[app]&&!pinned.includes(app)&&count>=0)
  .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .map(([app])=>app);
  const list=[...used,...DEFAULT_FREQUENT.filter(app=>!used.includes(app)&&!pinned.includes(app)&&state.programUse?.[app]!==-1)];
 return list.slice(0,5);
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
function programsMarkup(entries){
 return entries.map(entry=>{
  if(entry===null)return '<div class="start-separator"></div>';
  const [label,ic,target]=entry;
  if(!Array.isArray(target))return startItem(label,ic,target);
  return `<div class="menu-folder"><button class="start-item folder">${icon(ic)}<span>${esc(t(label))}</span><b class="submenu-arrow">▶</b></button><div class="popup-menu folder-menu">${programsMarkup(target)}</div></div>`;
 }).join('');
}
function startItem(label,ic,app,subtitle='',minor=false,pinned=false){label=t(label);subtitle=subtitle?t(subtitle):'';return `<button class="start-item ${minor?'minor':''}" data-open="${app}" data-label="${esc(label)}" data-icon="${ic}" ${pinned?'data-pinned="true"':''}>${icon(ic)}<span>${subtitle?`<b>${label}</b><small>${subtitle}</small>`:label}</span></button>`;}
function renderStart(){const el=$('#start-menu'),pinned=pinnedPrograms();el.innerHTML=`<header class="start-header"><button class="start-user" data-open="profile" title="${esc(t("text_user_accounts"))}"><img class="start-avatar" src="${XP.avatarPath(state.avatar)}" alt="${esc(t("text_account_picture"))}"><span>${esc(state.user)}</span></button></header><div class="start-columns"><div class="start-left">${pinned.map(app=>app==='ie'?startItem('Internet','ie',app,'Internet Explorer',false,true):app==='outlook'?startItem('Email','mail',app,'Outlook Express',false,true):startItem(PROGRAM_ITEMS[app][0],PROGRAM_ITEMS[app][1],app,'',false,true)).join('')}${pinned.length?'<div class="start-separator"></div>':''}${frequentPrograms().map(app=>startItem(PROGRAM_ITEMS[app][0],PROGRAM_ITEMS[app][1],app)).join('')}<div class="start-separator"></div><button class="start-item all-programs" id="all-programs">${esc(t("text_all_programs"))} <b>▶</b></button></div><div class="start-right">${startItem(t("text_my_documents"),'documents','documents')}${startItem('Képek','pictures','pictures')}${startItem('Zene','music','music')}${startItem('Sajátgép','computer','computer')}<div class="start-separator"></div>${startItem('Vezérlőpult','control','control','',true)}${startItem('Nyomtatók és faxok','printers','printers','',true)}${startItem('Hálózati kapcsolatok','network','network','',true)}<div class="start-separator"></div>${startItem('Súgó és támogatás','help','help','',true)}${startItem('Keresés','search','search','',true)}${startItem('Futtatás…','run','run','',true)}</div></div><footer class="start-footer"><button data-open="logoff">${icon('logoff')} ${t("text_log_off")}</button><button data-open="power">${icon('shutdown')} ${t("text_turn_off")}</button></footer><div class="programs-menu popup-menu" hidden>${programsMarkup(programsMenu)}</div>`;$('#all-programs').onclick=e=>{e.stopPropagation();$('.programs-menu',el).hidden=!$('.programs-menu',el).hidden;};}
$('#start-button').onclick=e=>{e.stopPropagation();if(XP.modal)return;const el=$('#start-menu');if(el.hidden){renderStart();el.hidden=false;$('#start-button').classList.add('active');$('#start-button').setAttribute('aria-expanded','true');}else XP.hideMenus();};
$('#start-menu').oncontextmenu=e=>{
 const button=e.target.closest('.start-item[data-open]');if(!button)return;
 e.preventDefault();e.stopPropagation();
  const app=button.dataset.open,label=button.dataset.label||button.textContent.trim(),ic=button.dataset.icon||'help';
  const pinned=pinnedPrograms().includes(app),frequent=frequentPrograms().includes(app);
 const already=baseIcons.some(i=>i.app===app)||state.files.some(f=>f.type==='shortcut'&&f.app===app&&f.parent==='desktop'&&!f.deleted);
 XP.menu([
   {label:t("text_open"),icon:ic,action:()=>XP.open(app)},
   ...(PROGRAM_ITEMS[app]?[{label:pinned?t("text_unpin_from_start_menu"):t("text_pin_to_start_menu"),action:()=>{state.pinnedPrograms=pinned?pinnedPrograms().filter(item=>item!==app):[...pinnedPrograms(),app];persist();renderStart();}},...(frequent&&!pinned?[{label:t("text_remove_from_this_list"),action:()=>{state.programUse={...state.programUse,[app]:-1};persist();renderStart();}}]:[])]:[]),
  null,
  {label:t("text_send_to_desktop_create_shortcut"),icon:'showdesktop',disabled:already,action:()=>{
   if(XP.shortcutTo(app,label,ic))notify(t("text_shortcut"),t("text_the_shortcut_to_name_is_on_the_desktop",{name:label}));
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
 const button=$('#volume-button').getBoundingClientRect(),bar=taskbar.getBoundingClientRect(),edge=XP.taskbarMetrics(state.taskbar).edge;
 const width=volumeFlyout.offsetWidth||74,height=volumeFlyout.offsetHeight||150;
 Object.assign(volumeFlyout.style,{left:'auto',right:'auto',top:'auto',bottom:'auto'});
 if(edge==='bottom'||edge==='top'){
  volumeFlyout.style.left=Math.max(2,Math.min(innerWidth-width-2,button.left+(button.width-width)/2))+'px';
  volumeFlyout.style[edge==='bottom'?'bottom':'top']=(edge==='bottom'?innerHeight-bar.top:bar.bottom)+'px';
 }else{
  volumeFlyout.style.top=Math.max(2,Math.min(innerHeight-height-2,button.top+(button.height-height)/2))+'px';
  volumeFlyout.style[edge==='left'?'left':'right']=(edge==='left'?bar.right:innerWidth-bar.left)+'px';
 }
}
const volumeChanged=()=>{persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));document.dispatchEvent(new CustomEvent('xp-settings-changed'));};
volumeDial.oninput=e=>{state.volume=Number(e.target.value);volumeChanged();};
volumeMute.onchange=e=>{state.sounds=!e.target.checked;volumeChanged();};
$('#volume-button').onclick=e=>{e.stopPropagation();showVolume();};
$('#volume-button').ondblclick=()=>{XP.hideMenus();XP.open('volume');};
document.addEventListener('xp-volume-changed',()=>{if(!volumeFlyout.hidden){volumeDial.value=state.volume;volumeMute.checked=!state.sounds;}});
$('#clock').ondblclick=()=>XP.open('calendar');
const trayToggle=$('#tray-toggle'),trayHidden=$('#tray-hidden');
trayToggle.onclick=e=>{e.stopPropagation();const show=trayHidden.hidden;trayHidden.hidden=!show;trayToggle.title=trayToggle.ariaLabel=show?t("text_hide_inactive_icons"):t("text_show_hidden_icons");trayToggle.setAttribute('aria-expanded',String(show));};
const trayNotices={
 mail:null
};
$$('[data-tray]').forEach(button=>button.onclick=()=>{const notice=trayNotices[button.dataset.tray];if(notice)XP.dialog(notice[0],notice[1]);else XP.open(button.dataset.tray);});
function updateClock(){const now=new Date();$('#clock').textContent=now.toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'});$('#clock').title=now.toLocaleDateString(locale(),{year:'numeric',month:'long',day:'numeric',weekday:'long'});}
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
async function newDesktop(type){const result=await XP.prompt(type==='folder'?t("text_new_folder"):t("text_new_text_document"),t("text_name_14078c2c"),type==='folder'?t("text_new_folder"):t("text_new_document_txt"));let name=XP.fileName(result);if(!name)return;if(type==='text'&&!name.endsWith('.txt'))name+='.txt';if(state.files.some(f=>f.parent==='desktop'&&f.name===name&&!f.deleted)){notify(t("text_new_item"),t("text_that_name_is_already_taken"));return;}XP.saveFile({id:XP.uniqueId(),name,type,parent:'desktop',content:''});}
$('#desktop').oncontextmenu=e=>{if(e.target.closest('.window,.desktop-icon'))return;e.preventDefault();XP.menu([
  {label:t("text_arrange_icons_by"),items:[
   {label:t("text_name"),action:()=>sortIcons('name')},{label:t("text_type"),action:()=>sortIcons('type')},
   {label:t("text_modified"),action:()=>sortIcons('modified')},null,
   {label:t("text_auto_arrange"),action:()=>sortIcons('grid')}
  ]},
  {label:t("text_refresh"),action:renderIcons},null,
  {label:t("text_new"),items:[{label:t("text_folder"),icon:'folder',action:()=>newDesktop('folder')},{label:t("text_text_document"),icon:'notepad',action:()=>newDesktop('text')}]},{label:t("text_paste"),shortcut:'Ctrl+V',action:()=>XP.paste('desktop'),disabled:!XP.canPaste()},null,{label:document.fullscreenElement?t("text_exit_full_screen"):t("text_full_screen"),action:()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p?.catch(()=>notify(t("text_full_screen"),t("text_you_can_also_press_f11_for_full_screen")));}},{label:t("text_properties"),icon:'control',action:()=>XP.open('display')}],e.clientX,e.clientY);};
$('#desktop').addEventListener('pointerdown',e=>{if(e.target.closest('.window,.desktop-icon')||e.button!==0||XP.modal)return;selectedIcon=null;$$('.desktop-icon').forEach(b=>b.classList.remove('selected'));const box=$('#selection-box'),x=e.clientX,y=e.clientY;box.hidden=false;Object.assign(box.style,{left:x+'px',top:y+'px',width:'0px',height:'0px'});function move(ev){Object.assign(box.style,{left:Math.min(x,ev.clientX)+'px',top:Math.min(y,ev.clientY)+'px',width:Math.abs(x-ev.clientX)+'px',height:Math.abs(y-ev.clientY)+'px'});const r=box.getBoundingClientRect();$$('.desktop-icon').forEach(b=>{const br=b.getBoundingClientRect();b.classList.toggle('selected',br.left<r.right&&br.right>r.left&&br.top<r.bottom&&br.bottom>r.top);});}function up(){box.hidden=true;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);});
// Cascade and tile, both measured against the desktop the way the taskbar arranged them.
function arrange(mode){
 const list=[...XP.windows.values()].filter(w=>!w.modal&&!w.fixed);
 if(!list.length){notify(t("text_taskbar"),t("text_there_are_no_windows_to_arrange"));return;}
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
const taskbar=$('#taskbar'),taskbarResize=$('#taskbar-resize-grip');
const taskbarEdgeAt=(x,y)=>[['top',y],['right',innerWidth-x],['bottom',innerHeight-y],['left',x]].sort((a,b)=>a[1]-b[1])[0][0];
function finishTaskbarChange(){persist();XP.applySettings();renderIcons();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
taskbar.onpointerdown=e=>{
 if(e.button!==0||(state.taskbar||{}).locked!==false)return;
 const resizing=e.target===taskbarResize;
 if(!resizing&&e.target!==taskbar&&e.target.id!=='taskbar-move-grip'&&e.target.id!=='task-buttons')return;
 e.preventDefault();XP.hideMenus();const pointer=e.pointerId,startX=e.clientX,startY=e.clientY;let changed=false,active=true;
 taskbar.setPointerCapture(pointer);taskbar.classList.add(resizing?'resizing':'moving');
 taskbar.onpointermove=ev=>{
  if(!active)return;
  if(!changed&&Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY)<4)return;
  changed=true;
  if(resizing){
   const edge=XP.taskbarMetrics(state.taskbar).edge,raw=edge==='bottom'?innerHeight-ev.clientY:edge==='top'?ev.clientY:edge==='right'?innerWidth-ev.clientX:ev.clientX;
   if(edge==='top'||edge==='bottom')state.taskbar.horizontalSize=Math.max(30,Math.round(raw/30)*30);
   else state.taskbar.verticalSize=Math.max(106,Math.round(raw));
  }else state.taskbar.edge=taskbarEdgeAt(ev.clientX,ev.clientY);
  XP.applySettings();
 };
 const finish=()=>{if(!active)return;active=false;taskbar.onpointermove=taskbar.onpointerup=taskbar.onpointercancel=taskbar.onlostpointercapture=null;taskbar.classList.remove('moving','resizing');if(taskbar.hasPointerCapture(pointer))taskbar.releasePointerCapture(pointer);if(changed)finishTaskbarChange();};
 taskbar.onpointerup=finish;taskbar.onpointercancel=finish;taskbar.onlostpointercapture=finish;
};
$('#taskbar').oncontextmenu=e=>{
 if(XP.modal||e.target.closest('.task-button'))return;
 e.preventDefault();
 if(e.target.closest('#start-button')){
  XP.menu([
   {label:t("text_open"),icon:'start',action:()=>$('#start-button').click()},
   {label:t("text_explore"),icon:'folder',action:()=>XP.open('explorer')},
   {label:t("text_search_35795fbf"),icon:'search',action:()=>XP.open('search')},
   null,
   {label:t("text_properties"),icon:'taskbar',action:()=>XP.open('taskbar','start')}
  ],e.clientX,e.clientY);
  return;
 }
 const locked=(state.taskbar||{}).locked!==false;
  XP.menu([
   {label:t("text_toolbars"),items:[{label:t("text_quick_launch"),checked:state.taskbar?.quickLaunch!==false,action:()=>{state.taskbar={...state.taskbar,quickLaunch:state.taskbar?.quickLaunch===false};finishTaskbarChange();}},{label:t("text_language_bar"),disabled:true}]},
  null,
  {label:t("text_cascade_windows"),action:()=>arrange('cascade')},
  {label:t("text_tile_windows_horizontally"),action:()=>arrange('rows')},
  {label:t("text_tile_windows_vertically"),action:()=>arrange('columns')},
  {label:t("text_minimize_all_windows"),disabled:![...XP.windows.values()].some(w=>!w.modal&&!w.minimized),action:()=>{
   if(desktopShown){desktopShown=false;hiddenWindows=[];}
   $('#show-desktop').click();
  }},
  null,
  {label:t("text_task_manager"),icon:'taskmgr',action:()=>XP.open('taskmgr')},
  null,
  {label:t("text_lock_the_taskbar"),checked:locked,action:()=>{state.taskbar={...state.taskbar,locked:!locked};finishTaskbarChange();}},
  {label:t("text_properties"),icon:'taskbar',action:()=>XP.open('taskbar')}
 ],e.clientX,e.clientY);
};
function closeAll(){[...XP.windows.values()].forEach(w=>XP.close(w));}
function resetStartup(){bootGeneration++;startupPending=false;const startup=$('#startup-sound');startup.pause();startup.currentTime=0;}
function boot(){clearTimeout(bootTimer);clearTimeout(welcomeTimer);resetStartup();bootPhase='boot';$('#off-screen').hidden=true;$('#welcome-screen').hidden=true;$('#boot-screen').hidden=false;XP.hideMenus();bootTimer=setTimeout(loginScreen,BOOT_DURATION);}
function welcome(){if(bootPhase!=='boot')return;clearTimeout(bootTimer);bootPhase='welcome';$('#boot-screen').hidden=true;$('#welcome-screen').hidden=false;$('.welcome-center').innerHTML=`<span>${esc(t("text_welcome"))}</span>`;$('.welcome-bottom').innerHTML='';welcomeTimer=setTimeout(enterDesktop,WELCOME_DURATION);}
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
 if(playback==='error')notify(t("text_logon_sound"),t("text_the_logon_sound_could_not_be_played"));
 // The tip is for the first arrival; after that the desktop speaks for itself.
 else if(state.showWelcome){state.showWelcome=false;persist();notify(t("text_welcome_to_windows_xp"), t("text_double_click_an_icon_to_open_it_start_with_the_start_menu_and_rediscov_deb29056"));}
}
function logonPower(){
 const screen=$('#welcome-screen');
 if($('.logon-power',screen))return;
 const panel=document.createElement('div');panel.className='logon-power';
 panel.innerHTML=`<div class="power-panel"><header class="power-heading"><span>${esc(t("text_turn_off_computer"))}</span>${icon('windows')}</header><div class="power-options"><button data-power="standby">${icon('standby')} ${t("text_stand_by")}</button><button data-power="shutdown">${icon('shutdown')} ${t("text_turn_off")}</button><button data-power="restart">${icon('restart')} ${t("text_restart")}</button></div><footer class="power-bottom"><button class="xp-button" data-power="cancel">${t("text_cancel")}</button></footer></div>`;
 screen.append(panel);
 panel.onclick=event=>{
  const action=event.target.closest('[data-power]')?.dataset.power;
  if(!action)return;
  panel.remove();
  if(action==='cancel')return;
  persist();
  if(action==='restart'){closeAll();XP.closeParked();boot();return;}
  if(action==='shutdown'){closeAll();XP.closeParked();XP.sound('shutdown');screen.hidden=true;$('#off-screen').hidden=false;bootPhase='off';return;}
  // Waking from standby returns to the logon screen, since nobody has signed in yet.
  bootPhase='standby';
  $('.welcome-center').innerHTML=`<button class="welcome-user"><span><strong>${esc(t("text_stand_by"))}</strong><small>${esc(t("text_click_to_continue"))}</small></span></button>`;
  $('.welcome-bottom').innerHTML='';
  $('.welcome-user').onclick=()=>loginScreen();
 };
 $('[data-power=cancel]',panel).focus();
}
function loginMarkup(){
 return `<div class="welcome-login"><div class="welcome-brand"><div class="windows-brand">${icon('windows')}<small>Microsoft®</small><strong>Windows<i>®</i><span>xp<em>™</em></span></strong></div><p class="welcome-hint">${esc(t("text_to_begin_click_your_user_name"))}</p></div><i class="welcome-divider"></i><div class="welcome-users">${XP.accounts().map(account=>`<button class="welcome-user" data-account="${account.id}">${XP.avatar(account.avatar)}<span><strong>${esc(account.name)}</strong><small>${account.running?t("text_count_programs_running",{count:account.running}):account.id==='guest'?t("text_guest_account"):t("text_log_on")}</small></span></button>`).join('')}</div></div>`;
}
function bindLogin(after){
 $$('.welcome-user[data-account]').forEach(button=>button.onclick=()=>{XP.switchUser(button.dataset.account);return after();});
}
function showLogin(){
 $('.welcome-center').innerHTML=loginMarkup();
 $('.welcome-bottom').innerHTML=`<button class="welcome-power">${icon('shutdown')}<span>${esc(t("text_turn_off_computer"))}</span></button><p class="welcome-note">${t("text_to_change_an_account_open_control_panel")}<br>${t("text_and_click_user_accounts")}</p>`;
 $('.welcome-power').onclick=logonPower;
}
function loginScreen(keepRunning){clearTimeout(bootTimer);clearTimeout(welcomeTimer);resetStartup();if(!keepRunning)closeAll();bootPhase='login';$('#boot-screen').hidden=true;$('#welcome-screen').hidden=false;showLogin();bindLogin(()=>{bootPhase='boot';welcome();});}
register('logoff',()=>powerDialog(true));register('power',()=>powerDialog(false));
function powerDialog(logoff){const w=XP.createWindow({title:logoff?t("text_log_off"):t("text_turn_off_computer"),icon:'shutdown',width:390,height:230,fixed:true,modal:true,className:'power-dialog'});$('.title-bar',w.el).hidden=true;w.onClose=()=>{};
 const shade=document.createElement('div');shade.className='power-shade';document.body.append(shade);w.cleanup.push(()=>shade.remove());w.body.innerHTML=`<header class="power-heading"><span>${logoff?t("text_log_off"):t("text_turn_off_computer")}</span>${icon('windows')}</header><div class="power-options">${logoff?`<button data-power="switch">${icon('switchuser')} ${t("text_switch_user")}</button><button data-power="logoff">${icon('logoff')} ${t("text_log_off")}</button>`:`<button data-power="standby">${icon('standby')} ${t("text_stand_by")}</button><button data-power="shutdown">${icon('shutdown')} ${t("text_turn_off")}</button><button data-power="restart">${icon('restart')} ${t("text_restart")}</button>`}</div><footer class="power-bottom"><button class="xp-button" data-power="cancel">${t("text_cancel")}</button></footer>`;w.body.onclick=e=>{const a=e.target.closest('[data-power]')?.dataset.power;if(!a)return;w.close();if(a==='cancel')return;persist();if(a==='switch'){XP.sound('logoff');XP.parkSession();loginScreen(true);}
   if(a==='logoff'){XP.sound('logoff');loginScreen();}if(a==='restart'){closeAll();XP.closeParked();boot();}if(a==='shutdown'){closeAll();XP.closeParked();XP.sound('shutdown');$('#balloon').hidden=true;$('#off-screen').hidden=false;bootPhase='off';}if(a==='standby'){bootPhase='standby';$('#welcome-screen').hidden=false;$('.welcome-center').innerHTML=`<button class="welcome-user"><span><strong>${esc(t("text_stand_by"))}</strong><small>${esc(t("text_click_to_continue"))}</small></span></button>`;$('.welcome-user').onclick=()=>{bootPhase='desktop';$('#welcome-screen').hidden=true;};}};}
$('#skip-boot').onclick=loginScreen;$('#boot-screen').onclick=loginScreen;$('#power-on').onclick=boot;
document.addEventListener('keydown',e=>{if(bootPhase==='boot'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();loginScreen();}if(e.key==='F1'&&bootPhase==='desktop'&&!XP.modal){e.preventDefault();XP.open('help');}});
document.addEventListener('xp-files-changed',renderIcons);document.addEventListener('xp-settings-changed',()=>{renderIcons();if(!$('#start-menu').hidden)renderStart();});window.addEventListener('resize',renderIcons);
XP.applySettings();renderIcons();updateClock();setInterval(updateClock,1000);boot();
})();
