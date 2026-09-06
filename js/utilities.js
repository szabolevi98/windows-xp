'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify}=XP;
register('display',()=>settings('desktop'));
register('system',()=>settings('system'));
function settings(initial='desktop'){
 if(XP.singleton('settings'))return;const w=createWindow({title:initial==='system'?'Rendszertulajdonságok':'Megjelenítés tulajdonságai',icon:initial==='system'?'computer':'control',app:'settings',width:470,height:515,fixed:true});let current=initial,draft={wallpaper:state.wallpaper,theme:state.theme,user:state.user,sounds:state.sounds,volume:state.volume};
 const body=document.createElement('div');body.className='settings-body';body.innerHTML='<nav class="tabs"></nav><div class="tab-panel"></div>';w.body.append(body);const panel=$('.tab-panel',body),tabs=$('.tabs',body);const tabsData=[['desktop','Asztal'],['appearance','Megjelenés'],['sound','Hangok'],['system','Rendszer']];tabs.innerHTML=tabsData.map(([key,title])=>`<button data-tab="${key}">${title}</button>`).join('');tabs.onclick=e=>{const b=e.target.closest('[data-tab]');if(b){readDraft();current=b.dataset.tab;render();}};
 const buttons=document.createElement('div');buttons.className='button-row';buttons.innerHTML='<button class="xp-button primary" data-settings="ok">OK</button><button class="xp-button" data-settings="cancel">Mégse</button><button class="xp-button" data-settings="apply">Alkalmaz</button>';w.body.append(buttons);
 function readDraft(){if(current==='desktop')draft.wallpaper=$('[name=wallpaper]',panel).value;if(current==='appearance'){draft.theme=$('[name=theme]',panel).value;draft.user=$('[name=user]',panel).value.trim()||'Felhasználó';}if(current==='sound'){draft.sounds=$('[name=sounds]',panel).checked;draft.volume=Number($('[name=volume]',panel).value);}}
 function render(){ $$('[data-tab]',tabs).forEach(b=>b.classList.toggle('active',b.dataset.tab===current));
 if(current==='desktop'){panel.innerHTML=`<div class="monitor-preview"><div class="monitor-screen"></div></div><div class="settings-columns"><div><label class="settings-field"><span>Háttérkép:</span><select class="wallpaper-picker" name="wallpaper" size="5"><option value="none">(Nincs)</option><option value="bliss">Bliss</option><option value="azul">Azul</option><option value="autumn">Autumn</option><option value="windows-xp">Windows XP</option></select></label></div><div><label class="settings-field"><span>Elhelyezés:</span><select disabled><option>Kitöltés</option></select></label></div></div><p class="settings-note">Válaszd ki az asztalodon megjelenő háttérképet.</p>`;$('[name=wallpaper]',panel).value=draft.wallpaper;const preview=()=>$('.monitor-screen',panel).style.backgroundImage=$('[name=wallpaper]',panel).value==='none'?'none':`url("${XP.wallpaperPath($('[name=wallpaper]',panel).value)}")`;$('[name=wallpaper]',panel).onchange=preview;preview();}
 if(current==='appearance'){panel.innerHTML=`<div style="height:95px;background:#3a6ea5;padding:20px;margin-bottom:17px"><div style="border:3px solid #0055ea;background:#ece9d8"><div class="title-bar">Aktív ablak</div><div style="padding:8px">Windows és gombok</div></div></div><label class="settings-field"><span>Színséma:</span><select name="theme"><option value="blue">Alapértelmezett (kék)</option><option value="olive">Olívazöld</option><option value="silver">Ezüst</option></select></label><label class="settings-field"><span>Felhasználó neve:</span><input type="text" name="user" maxlength="32" value="${esc(draft.user)}"></label><p class="settings-note">A név a Start menüben és a bejelentkezéskor jelenik meg.</p>`;$('[name=theme]',panel).value=draft.theme;}
 if(current==='sound'){panel.innerHTML=`<div class="system-brand">${icon('volume')}<strong>Hangok</strong></div><p>Hangjelzések a Windows rendszereseményeihez.</p><label class="settings-field"><input type="checkbox" name="sounds" ${draft.sounds?'checked':''}> Windows rendszerhangok lejátszása</label><label class="settings-field"><span>Hangerő:</span><input type="range" name="volume" min="0" max="100" value="${draft.volume}" style="width:100%"></label><button class="xp-button" data-preview-sound>► Hang kipróbálása</button><p class="settings-note">A böngésző az első kattintás után engedélyezi a hangokat.</p>`;$('[data-preview-sound]',panel).onclick=()=>{const a=new Audio('assets/sounds/startup.wav');a.volume=Number($('[name=volume]',panel).value)/100;a.play().catch(()=>notify('Hangok','A hang lejátszása most nem érhető el.'));};}
 if(current==='system'){const used=new Blob([JSON.stringify(state)]).size;panel.innerHTML=`<div class="system-brand">${icon('windows')}<div><strong>Windows<span>xp</span></strong><br>Professional</div></div><dl class="system-facts"><dt>Rendszer:</dt><dd>Microsoft Windows XP<br>Version 2002<br>Service Pack 3</dd><dt>Regisztrált felhasználó:</dt><dd>${esc(state.user)}</dd><dt>Számítógép:</dt><dd>Intel(R) Pentium(R) 4 CPU<br>2,40 GHz, 512 MB RAM</dd><dt>Helyben tárolt adatok:</dt><dd>${(used/1024).toFixed(1)} KB<br>${state.files.filter(f=>!f.deleted).length} saját elem</dd></dl><p class="settings-note">A fájlok és beállítások a böngésző helyi tárhelyén maradnak. A fontos dokumentumokat a Fájl menüből le is töltheted.</p>`;}
 }
 function apply(){readDraft();Object.assign(state,draft);persist();XP.applySettings();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
 buttons.onclick=e=>{const a=e.target.dataset.settings;if(a==='apply')apply();if(a==='ok'){apply();w.close();}if(a==='cancel')w.close();};render();return w;
}
register('control',()=>{
 if(XP.singleton('control'))return;
 const w=createWindow({title:'Vezérlőpult',icon:'control',app:'control',width:760,height:525,minWidth:470,minHeight:380});
 const note=(title,text)=>()=>XP.dialog(title,text);
 const applets={
  display:{name:'Megjelenítés',icon:'control',hint:'Háttérkép, színséma és felhasználónév',open:()=>XP.open('display')},
  folders:{name:'Mappabeállítások',icon:'folder',hint:'Az elemek megnyitásának módja',open:note('Mappabeállítások','Az elemeket dupla kattintással nyithatod meg, érintőképernyőn egy koppintás is elég.\n\nA saját fájljaidat jobb kattintással átnevezheted, törölheted vagy letöltheted.')},
  network:{name:'Hálózati kapcsolatok',icon:'network',hint:'A helyi kapcsolat állapota',open:()=>XP.open('network')},
  internet:{name:'Internetbeállítások',icon:'ie',hint:'Kezdőlap, előzmények és kedvencek',open:()=>XP.open('ie')},
  programs:{name:'Programok telepítése és törlése',icon:'programs',hint:'A gépre telepített programok',open:()=>XP.dialog('Programok telepítése és törlése','Jelenleg telepített programok:\n\nInternet Explorer 6 — 12,4 MB\nWindows Media Player 9 — 18,7 MB\nOutlook Express 6 — 6,2 MB\nMSN Explorer — 9,1 MB\nWindows XP játékok — 24,3 MB\n3D Pinball – Space Cadet — 9,4 MB\n\nA programok a Windows részei, ezért nem távolíthatók el.')},
  volume:{name:'Hangok és audioeszközök',icon:'volume',hint:'Rendszerhangok és hangerő',open:()=>XP.open('volume')},
  player:{name:'Hangeszközök',icon:'player',hint:'Lejátszás és hangfájlok',open:()=>XP.open('player')},
  system:{name:'Rendszer',icon:'computer',hint:'Rendszerinformációk és tárhely',open:()=>XP.open('system')},
  cleanup:{name:'Lemezkarbantartó',icon:'disk',hint:'Hely felszabadítása a lemezen',open:()=>{const trash=state.files.filter(f=>f.deleted).length;XP.dialog('Lemezkarbantartó – C:',`A Lemezkarbantartó a következő fájlokat távolíthatja el:\n\nIdeiglenes internetfájlok        3,17 MB\nLetöltött programfájlok          0,00 MB\nLomtár                           ${(trash*0.06).toFixed(2)} MB (${trash} elem)\nIdeiglenes fájlok                0,84 MB\n\nÖsszesen felszabadítható: ${(4.01+trash*0.06).toFixed(2)} MB\n\nA Lomtár tartalmát a Lomtár ablakában ürítheted ki.`);}},
  printers:{name:'Nyomtatók és faxok',icon:'printers',hint:'Telepített nyomtatók',open:note('Nyomtatók és faxok','Nincs telepítve nyomtató.\n\nNyomtató üzembe helyezéséhez indítsd el a Nyomtató hozzáadása varázslót, vagy csatlakoztass egy Plug and Play nyomtatót – a Windows automatikusan felismeri.')},
  profile:{name:'Felhasználói fiókok',icon:'user',hint:'A személyes profilod',open:()=>XP.open('profile')},
  datetime:{name:'Dátum és idő',icon:'datetime',hint:'Naptár és pontos idő',open:()=>XP.open('calendar')},
  accessibility:{name:'Kisegítő lehetőségek',icon:'accessibility',hint:'Billentyűzet, hang és megjelenítés',open:note('Kisegítő lehetőségek','A Windows billentyűzetről is végig vezérelhető:\n\nTab – léptetés a vezérlők között\nEnter – a kijelölt elem megnyitása\nAlt+F4 – az aktív ablak bezárása\nCtrl+Esc – a Start menü megnyitása\nAlt+Tab – váltás a futó programok között\nF1 – Súgó és támogatás')},
  security:{name:'Biztonsági központ',icon:'security',hint:'Tűzfal, frissítések és vírusvédelem',open:()=>XP.open('security')}
 };
 const categories=[
  {id:'appearance',name:'Megjelenés és témák',icon:'control',hint:'Az asztal háttere, a színséma és a képernyő beállításai',items:['display','folders']},
  {id:'network',name:'Hálózati és internetkapcsolatok',icon:'network',hint:'A kapcsolat állapota és a böngésző beállításai',items:['network','internet']},
  {id:'programs',name:'Programok telepítése és törlése',icon:'programs',hint:'A gépre telepített programok listája',items:['programs']},
  {id:'sound',name:'Hangok, beszéd és audioeszközök',icon:'volume',hint:'Rendszerhangok, hangerő és lejátszás',items:['volume','player']},
  {id:'performance',name:'Teljesítmény és karbantartás',icon:'computer',hint:'Rendszeradatok és a lemez karbantartása',items:['system','cleanup']},
  {id:'hardware',name:'Nyomtatók és egyéb hardver',icon:'printers',hint:'Nyomtatók, faxok és eszközök',items:['printers']},
  {id:'accounts',name:'Felhasználói fiókok',icon:'user',hint:'A felhasználóneved és a profilod',items:['profile']},
  {id:'datetime',name:'Dátum, idő, nyelv és területi beállítások',icon:'datetime',hint:'Naptár, pontos idő és a magyar beállítások',items:['datetime']},
  {id:'access',name:'Kisegítő lehetőségek',icon:'accessibility',hint:'Billentyűzetes használat és láthatóság',items:['accessibility']},
  {id:'security',name:'Biztonsági központ',icon:'security',hint:'Tűzfal, automatikus frissítések és vírusvédelem',items:['security']}
 ];
 let classic=!!state.controlClassic,category='';
 menubar(w,{
  'Fájl':[{label:'Bezárás',action:()=>w.close()}],
  'Nézet':()=>[{label:'Kategórianézet',checked:!classic,action:()=>setView(false)},{label:'Klasszikus nézet',checked:classic,action:()=>setView(true)}],
  'Súgó':[{label:'Súgó és támogatás',action:()=>XP.open('help')}]
 },true);
 const toolbar=document.createElement('div');toolbar.className='toolbar';
 toolbar.innerHTML=`<button data-action="back">${icon('back')}<span>Vissza</span></button><button data-action="up" title="Egy szinttel feljebb">${icon('up')}</button><span class="toolbar-separator"></span><button data-action="search">${icon('search')}<span class="toolbar-label">Keresés</span></button><button data-action="view">${icon('documents')}<span class="toolbar-label">Nézet</span></button>`;
 w.body.append(toolbar);
 const addr=document.createElement('div');addr.className='address-bar';
 addr.innerHTML=`Cím ${'<div class="address-input">'}${icon('control')}<input type="text" aria-label="Hely" readonly></div>`;
 w.body.append(addr);
 const layout=document.createElement('div');layout.className='explorer-layout';
 layout.innerHTML='<aside class="explorer-sidebar"></aside><div class="explorer-files control-files"></div>';
 w.body.append(layout);
 const sidebar=$('.explorer-sidebar',layout),files=$('.control-files',layout),bar=status(w,'');
 const current=()=>categories.find(c=>c.id===category);
 function setView(next){classic=next;category='';state.controlClassic=classic;persist();render();}
 function render(){
  const here=current();
  w.setTitle(here?here.name:'Vezérlőpult');
  $('input',addr).value=here?'Vezérlőpult\\'+here.name:'Vezérlőpult';
  $('[data-action=back]',toolbar).disabled=!here;
  $('[data-action=up]',toolbar).disabled=!here;
  sidebar.innerHTML=`<section class="explorer-panel"><h3>Vezérlőpult</h3><div><button data-view="${classic?'category':'classic'}">${icon('control')} Váltás ${classic?'kategórianézetre':'klasszikus nézetre'}</button>${here?`<button data-view="home">${icon('back')} Vissza a kategóriákhoz</button>`:''}</div></section><section class="explorer-panel"><h3>Lásd még</h3><div><button data-side="update">${icon('refresh')} Windows Update</button><button data-side="help">${icon('help')} Súgó és támogatás</button><button data-side="explorer">${icon('computer')} Sajátgép</button></div></section>`;
  if(here){
   files.className='explorer-files control-files';
   files.innerHTML=`<h1 class="control-title">${esc(here.name)}</h1><p class="control-lead">${esc(here.hint)}</p><h2 class="control-sub">Válasszon egy Vezérlőpult-ikont</h2><div class="file-grid">${here.items.map(id=>`<button class="file-item" data-applet="${id}">${icon(applets[id].icon)}<span>${esc(applets[id].name)}</span></button>`).join('')}</div>`;
   bar.firstElementChild.textContent=`${here.items.length} objektum`;
   return;
  }
  if(classic){
   files.className='explorer-files control-files';
   files.innerHTML=`<div class="file-grid">${Object.entries(applets).map(([id,a])=>`<button class="file-item" data-applet="${id}">${icon(a.icon)}<span>${esc(a.name)}</span></button>`).join('')}</div>`;
   bar.firstElementChild.textContent=`${Object.keys(applets).length} objektum`;
   return;
  }
  files.className='explorer-files control-files category-view';
  files.innerHTML=`<h1 class="control-title">Válasszon kategóriát</h1><div class="control-categories">${categories.map(c=>`<button class="control-category" data-category="${c.id}">${icon(c.icon)}<span><strong>${esc(c.name)}</strong>${esc(c.hint)}</span></button>`).join('')}</div>`;
  bar.firstElementChild.textContent=`${categories.length} kategória`;
 }
 toolbar.onclick=e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='back'||action==='up'){category='';render();}
  if(action==='search')XP.open('search');
  if(action==='view')setView(!classic);
 };
 layout.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.category){category=button.dataset.category;render();return;}
  if(button.dataset.applet){applets[button.dataset.applet].open();return;}
  const view=button.dataset.view;
  if(view==='home'){category='';render();return;}
  if(view)  {setView(view==='classic');return;}
  const side=button.dataset.side;
  if(side==='update')XP.dialog('Windows Update','A gép nem csatlakozik hálózathoz, ezért nincs mit letölteni. Minden szükséges fájl helyben van.');
  if(side==='help')XP.open('help');
  if(side==='explorer')XP.open('explorer','computer');
 };
 render();
 return w;
});
register('profile',()=>settings('appearance'));
register('volume',()=>{
 if(XP.singleton('volume'))return;const w=createWindow({title:'Hangerő',icon:'volume',app:'volume',width:270,height:210,fixed:true});w.body.innerHTML=`<div class="volume-panel">${icon('volume')} <b>Fő hangerő</b><input type="range" min="0" max="100" value="${state.volume}" aria-label="Fő hangerő"><label><input type="checkbox" ${!state.sounds?'checked':''}> Elnémítás</label></div>`;$('input[type=range]',w.body).oninput=e=>{state.volume=Number(e.target.value);persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));};$('input[type=checkbox]',w.body).onchange=e=>{state.sounds=!e.target.checked;persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));};return w;
});
register('calendar',()=>{
 if(XP.singleton('calendar'))return;const w=createWindow({title:'Dátum és idő',icon:'help',app:'calendar',width:330,height:365,fixed:true});const body=document.createElement('div');body.className='calendar';w.body.append(body);const now=new Date();let year=now.getFullYear(),month=now.getMonth();function render(){const first=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();body.innerHTML=`<div class="calendar-heading"><button class="xp-button" data-month="-1" style="min-width:26px">‹</button> <span>${new Date(year,month).toLocaleDateString('hu-HU',{year:'numeric',month:'long'})}</span> <button class="xp-button" data-month="1" style="min-width:26px">›</button></div><div class="calendar-grid">${['H','K','Sze','Cs','P','Szo','V'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>`<span class="${i+1===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()?'today':''}">${i+1}</span>`).join('')}</div><div class="calendar-time"></div><small>A számítógép helyi ideje</small>`;tick();}function tick(){const el=$('.calendar-time',body);if(el)el.textContent=new Date().toLocaleTimeString('hu-HU');}body.onclick=e=>{const b=e.target.closest('[data-month]');if(b){month+=Number(b.dataset.month);if(month<0){month=11;year--;}if(month>11){month=0;year++;}render();}};const timer=setInterval(tick,1000);w.cleanup.push(()=>clearInterval(timer));render();return w;
});
register('network',()=>{
 if(XP.singleton('network'))return;const w=createWindow({title:'Hálózati kapcsolatok',icon:'network',app:'network',width:530,height:330});w.body.innerHTML=`<div class="network-body"><h2 style="font-size:16px;color:#214f98">Helyi kapcsolat</h2><div class="network-connection">${icon('network')}<div><b>Csatlakoztatva a helyi webhez</b><br>Sebesség: 100,0 Mbps<br>Állapot: csatlakoztatva</div></div><p>A kapcsolat a helyi hálózaton él. Az Internet Explorer a számítógépen tárolt oldalakat nyitja meg.</p><button class="xp-button" data-open="ie">Böngésző megnyitása</button></div>`;return w;
});
register('image',(id,source,title)=>{
 const file=state.files.find(f=>f.id===id&&!f.deleted);if(!file&&!source)return;const src=file?.content||source,name=file?.name||title||'Kép';const w=createWindow({title:`${name} – Windows kép- és faxmegjelenítő`,icon:'pictures',app:'image',width:730,height:510});menubar(w,{'Fájl':[{label:'Letöltés',action:()=>{const a=document.createElement('a');a.href=src;a.download=XP.fileName(name)+(name.includes('.')?'':'.'+(src.endsWith('.bmp')?'bmp':'jpg'));a.click();}},{label:'Szerkesztés a Paintben',disabled:!file,action:()=>XP.open('paint',id)},{label:'Bezárás',action:()=>w.close()}],'Nézet':[{label:'Teljes méret',action:()=>XP.maximize(w)}]});const body=document.createElement('div');body.className='image-viewer';const img=document.createElement('img');img.src=src;img.alt=name;body.append(img);w.body.append(body);status(w,name);return w;
});
register('search',()=>{
 const w=createWindow({title:'Keresés',icon:'search',app:'search',width:600,height:395});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('search')}<div><h1>Mit keresel?</h1><p>Keress a saját dokumentumaid között.</p></div></div><form style="display:flex;gap:8px;margin:18px 0"><input type="text" name="q" aria-label="Fájlkeresés" placeholder="Fájlnév vagy szövegrészlet" style="flex:1"><button class="xp-button">Keresés</button></form><div class="file-search-results"></div>`;w.body.append(body);$('form',body).onsubmit=e=>{e.preventDefault();const q=$('input',body).value.toLocaleLowerCase('hu-HU');const found=state.files.filter(f=>!f.deleted&&(f.name.toLocaleLowerCase('hu-HU').includes(q)||(f.type==='text'&&f.content.toLocaleLowerCase('hu-HU').includes(q))));$('.file-search-results',body).innerHTML=`<p>${found.length} találat</p>${found.map(f=>`<button class="start-item" data-found="${esc(f.id)}">${icon(XP.fileIcon(f))}${esc(f.name)}</button>`).join('')}`;};body.onclick=e=>{const b=e.target.closest('[data-found]');if(b)XP.openFile(b.dataset.found);};setTimeout(()=>$('input',body).focus(),0);return w;
});
register('run',async()=>{
 const result=await XP.prompt('Futtatás','Írd be egy program vagy mappa nevét, és a Windows megnyitja azt.','');if(!result)return;const value=result.trim().toLowerCase().replace(/\.exe$/,'');const map={notepad:'notepad',jegyzettömb:'notepad',mspaint:'paint',paint:'paint',calc:'calculator',cmd:'cmd',iexplore:'ie',explorer:'explorer',control:'control',winmine:'mines',minesweeper:'mines',sol:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',pókpasziánsz:'spider',mshearts:'hearts',hearts:'hearts',wmplayer:'player',wscui:'security','wscui.cpl':'security',winver:'system'};if(map[value])XP.open(map[value]);else if(value.includes('.')||value.includes('://'))XP.open('ie',result);else{const f=state.files.find(f=>!f.deleted&&f.name.toLowerCase()===value);if(f)XP.openFile(f.id);else{XP.sound('error');XP.dialog('Futtatás',`A Windows nem találja ezt: „${result}”.\nPróbáld például: notepad, mspaint, calc, cmd, winmine vagy iexplore.`,{icon:'error'});}}
});
register('security',()=>{
 if(XP.singleton('security'))return;
 const w=createWindow({title:'Windows Biztonsági központ',icon:'security',app:'security',width:660,height:545,minWidth:430,minHeight:360});
 if(!state.security||typeof state.security!=='object')state.security={firewall:true,updates:true};// a save from before the Security Centre has no switches yet
 let opened='';
 const parts=()=>[
  {id:'firewall',name:'Tűzfal',on:!!state.security.firewall,
   good:'A Windows tűzfal be van kapcsolva, és figyeli a beérkező kapcsolatokat. Csak akkor kapcsold ki, ha másik tűzfalat használsz.',
   bad:'A Windows tűzfal ki van kapcsolva. Bekapcsolása segít megvédeni a számítógépet a hálózat felől érkező kéretlen kapcsolatoktól.'},
  {id:'updates',name:'Automatikus frissítések',on:!!state.security.updates,
   good:'A Windows rendszeresen letölti és telepíti a fontos frissítéseket. Ez a legegyszerűbb módja annak, hogy a gép naprakész maradjon.',
   bad:'Az automatikus frissítések ki vannak kapcsolva, így a fontos javítások nem települnek maguktól.'},
  {id:'virus',name:'Vírusvédelem',on:null,
   bad:'A Windows nem talált vírusvédelmi programot ezen a számítógépen, vagy a program állapotát nem tudja figyelni.\n\nA Microsoft azt javasolja, hogy telepíts vírusvédelmi programot, és tartsd naprakészen.'}
 ];
 const label=part=>part.on===null?'NEM TALÁLHATÓ':part.on?'BEKAPCSOLVA':'KIKAPCSOLVA';
 const body=document.createElement('div');body.className='security-body';w.body.append(body);
 function render(){
  const list=parts(),warn=list.filter(p=>p.on!==true);
  body.innerHTML=`<div class="security-head">${icon('security')}<div><h1>Windows Biztonsági központ</h1><p>Segítünk a számítógép védelmében</p></div></div><div class="security-main"><aside class="security-side"><h2>Erőforrások</h2><ul><li><button data-link="update">A legfrissebb javítások keresése a Windows Update-tel</button></li><li><button data-link="ie">Internet-beállítások módosítása</button></li><li><button data-link="help">Súgó a biztonsági kérdésekhez</button></li><li><button data-link="about">A Biztonsági központról</button></li></ul></aside><section class="security-panels"><div class="security-note ${warn.length?'warn':'ok'}">${warn.length?`A számítógép védelme figyelmet igényel: ${warn.map(p=>p.name.toLowerCase()).join(', ')}. A részletekért nyisd le az alábbi sorokat.`:'A biztonsági alapelemek be vannak kapcsolva. A Biztonsági központ szól, ha ez megváltozik.'}</div><h2>Biztonsági alapelemek</h2>${list.map(part=>`<div class="security-item"><button class="security-row" data-panel="${part.id}" aria-expanded="${opened===part.id}"><span class="security-name">${part.name}</span><span class="security-state ${part.on===null?'missing':part.on?'on':'off'}">${label(part)}</span><i class="security-chevron"></i></button><div class="security-detail" ${opened===part.id?'':'hidden'}><p>${part.on?part.good:part.bad}</p>${part.on===null?'':`<button class="xp-button" data-toggle="${part.id}">${part.on?'Kikapcsolás':'Bekapcsolás'}</button>`}</div></div>`).join('')}<div class="security-manage"><span>Biztonsági beállítások kezelése:</span><div>${[['ie','Internet-beállítások','ie'],['refresh','Automatikus frissítések','updates'],['security','Windows tűzfal','firewall']].map(([ic,title,target])=>`<button data-manage="${target}">${icon(ic)}<span>${title}</span></button>`).join('')}</div></div></section></div>`;
 }
 body.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  const panel=button.dataset.panel;
  if(panel){opened=opened===panel?'':panel;render();return;}
  const toggle=button.dataset.toggle;
  if(toggle){state.security[toggle]=!state.security[toggle];persist();opened=toggle;render();XP.sound(state.security[toggle]?'ding':'error');return;}
  const manage=button.dataset.manage;
  if(manage){if(manage==='ie')XP.open('ie');else{opened=manage;render();}return;}
  const link=button.dataset.link;
  if(link==='ie')XP.open('ie');
  if(link==='help')XP.open('help');
  if(link==='update')XP.dialog('Windows Update','A számítógép naprakész.\n\nLegutóbbi ellenőrzés: ma\nLegutóbbi telepítés: Windows XP Service Pack 3\n\nNincs telepítésre váró frissítés.');
  if(link==='about')XP.dialog('A Biztonsági központról','A Biztonsági központ egy helyen mutatja a számítógép három legfontosabb védelmi beállítását: a tűzfalat, az automatikus frissítéseket és a vírusvédelmet.\n\nHa valamelyik ki van kapcsolva vagy hiányzik, a Windows figyelmeztet, és a tálcán is megjelenik a pajzs ikon.');
 };
 render();
 status(w,'Windows XP Service Pack 3');
 return w;
});
register('help',()=>{
 if(XP.singleton('help'))return;const w=createWindow({title:'Súgó és támogatás',icon:'help',app:'help',width:720,height:540});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('windows')}<div><h1>Üdv újra a Windows XP-ben!</h1><p>Ismerős hely. Újra felfedezhető lehetőségek.</p></div></div><div class="help-cards">${[['ie','Fedezd fel a régi webet','Google, helyi oldalak és működő keresés.','ie'],['notepad','Írd le az ötleteidet','A jegyzeteid a böngészőben megmaradnak.','notepad'],['paint','Alkoss valamit','Rajzolj, színezz és mentsd el a képed.','paint'],['mines','Tarts egy kis szünetet','Egy klasszikus Aknakereső-parti?','mines'],['documents','A saját fájljaid','Hozz létre mappákat, rendszerezd a dokumentumokat.','documents'],['control','Legyen a te asztalod','Válassz háttérképet, színsémát és nevet.','display']].map(([ic,title,text,app])=>`<button class="help-card" data-open="${app}">${icon(ic)}<span><strong>${title}</strong>${text}</span></button>`).join('')}</div><div class="help-shortcuts"><b>Néhány apró segítség</b><br>Dupla kattintás: megnyitás · Jobb kattintás: helyi menü<br>Ctrl+S: mentés · Ctrl+Esc: Start menü · Alt+F4: ablak bezárása<br>Az ablakok a fejlécnél mozgathatók, a jobb alsó saroknál átméretezhetők.<br>Az asztali ikonokat is áthúzhatod. A Lomtárból visszaállíthatod a fájlokat.</div><p style="font-size:10px;color:#888">A dokumentumaid, a rajzaid és a beállításaid a számítógépen maradnak. A fontos fájlokat a Fájl menüből mentheted ki magadnak.</p>`;w.body.append(body);return w;
});
register('player',()=>{
 if(XP.singleton('player'))return;const w=createWindow({title:'Windows Media Player',icon:'player',app:'player',width:650,height:465});
 let tracks=[{title:'Windows XP Startup',artist:'Windows rendszerhangok',src:'assets/sounds/startup.wav'},{title:'Windows XP Shutdown',artist:'Windows rendszerhangok',src:'assets/sounds/shutdown.wav'},{title:'Windows XP Notify',artist:'Windows rendszerhangok',src:'assets/sounds/notify.wav'},{title:'Windows XP Ding',artist:'Windows rendszerhangok',src:'assets/sounds/ding.wav'}],index=0,objectURLs=[];
 const audio=new Audio();audio.preload='metadata';audio.volume=state.volume/100;audio.muted=!state.sounds;
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='audio/*';fileInput.multiple=true;fileInput.hidden=true;w.body.append(fileInput);
 fileInput.onchange=()=>{const files=[...fileInput.files];for(const f of files){const url=URL.createObjectURL(f);objectURLs.push(url);tracks.push({title:f.name,artist:'Saját hangfájl',src:url});}renderList();if(files.length)load(tracks.length-files.length,true);};
 menubar(w,{'Fájl':[{label:'Hangfájl megnyitása…',action:()=>fileInput.click()},{label:'Bezárás',action:()=>w.close()}],'Lejátszás':[{label:'Lejátszás / szünet',action:toggle},{label:'Leállítás',action:()=>{audio.pause();audio.currentTime=0;}},{label:'Következő',action:()=>load((index+1)%tracks.length,true)}],'Súgó':[{label:'A Windows Media Player névjegye',action:()=>XP.dialog('Windows Media Player','Helyi zenelejátszó, klasszikus XP-külsővel.\nAz eredeti Windows-rendszerhangok mellett saját hangfájlokat is megnyithatsz. A saját fájlok csak az aktuális munkamenetben érhetők el.')} ]});
 const body=document.createElement('div');body.className='player-body';body.innerHTML=`<aside class="player-sidebar"><button class="active" data-player-tab="now">Most játszott</button><button data-player-tab="library">Médiatár</button><button data-player-tab="open">Fájl megnyitása</button><button data-player-tab="guide">Műsorfüzet</button></aside><div class="player-main"><div class="player-visual"><div class="visual-bars">${Array.from({length:29},(_,i)=>`<i style="--h:${18+Math.sin(i*.6)**2*78}px;--delay:${-i*.12}s"></i>`).join('')}</div><span class="player-watermark">Windows Media Player</span></div><div class="track-list"></div></div>`;w.body.append(body);
 const controls=document.createElement('div');controls.className='player-controls';controls.innerHTML='<div class="player-progress"><input type="range" min="0" max="1000" value="0" aria-label="Lejátszási pozíció"><span class="player-time">00:00 / 00:00</span></div><div class="player-buttons"><button data-player="prev" title="Előző">◀</button><button data-player="play" class="play" title="Lejátszás">▶</button><button data-player="stop" title="Leállítás">■</button><button data-player="next" title="Következő">▶</button><span class="player-track-name"></span><input type="range" min="0" max="100" aria-label="Lejátszó hangereje"></div>';w.body.append(controls);
 const format=t=>Number.isFinite(t)?`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`:'00:00';
 function renderList(){$('.track-list',body).innerHTML=tracks.map((t,i)=>`<button class="track-row ${i===index?'active':''}" data-track="${i}"><span>${i+1}.</span> ${esc(t.title)} <small>${esc(t.artist)}</small></button>`).join('');}
 function load(i,play=false){index=i;audio.src=tracks[i].src;$('.player-track-name',controls).textContent=tracks[i].title;renderList();if(play)audio.play().catch(()=>notify('Windows Media Player','Ez a hangfájl nem játszható le.'));}
 function toggle(){if(audio.paused)audio.play().catch(()=>notify('Windows Media Player','A lejátszás nem sikerült.'));else audio.pause();}
 function sync(){const playing=!audio.paused;$('.player-visual',body).classList.toggle('playing',playing);$('[data-player=play]',controls).textContent=playing?'Ⅱ':'▶';$('[data-player=play]',controls).title=playing?'Szünet':'Lejátszás';$('.player-time',controls).textContent=`${format(audio.currentTime)} / ${format(audio.duration)}`;$('.player-progress input',controls).value=audio.duration?audio.currentTime/audio.duration*1000:0;}
 audio.addEventListener('timeupdate',sync);audio.addEventListener('loadedmetadata',sync);audio.addEventListener('play',sync);audio.addEventListener('pause',sync);audio.addEventListener('ended',sync);
 body.onclick=e=>{const t=e.target.closest('[data-track]');if(t)load(Number(t.dataset.track),true);const tab=e.target.closest('[data-player-tab]');if(tab){const action=tab.dataset.playerTab;if(action==='open')fileInput.click();else if(action==='guide')XP.open('ie','www.zeneszoba.hu');else{$$('.player-sidebar button',body).forEach(b=>b.classList.toggle('active',b===tab));$('.player-visual',body).hidden=action==='library';}}};
 controls.onclick=e=>{const action=e.target.closest('[data-player]')?.dataset.player;if(action==='play')toggle();if(action==='stop'){audio.pause();audio.currentTime=0;sync();}if(action==='prev')load((index-1+tracks.length)%tracks.length,true);if(action==='next')load((index+1)%tracks.length,true);};
 $('.player-progress input',controls).oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)/1000*audio.duration;};const volume=$('.player-buttons input',controls);volume.value=state.volume;volume.oninput=e=>{audio.volume=Number(e.target.value)/100;};const updateVolume=()=>{audio.volume=state.volume/100;audio.muted=!state.sounds;volume.value=state.volume;};document.addEventListener('xp-volume-changed',updateVolume);document.addEventListener('xp-settings-changed',updateVolume);
 w.cleanup.push(()=>{audio.pause();audio.src='';objectURLs.forEach(url=>URL.revokeObjectURL(url));document.removeEventListener('xp-volume-changed',updateVolume);document.removeEventListener('xp-settings-changed',updateVolume);});load(0);return w;
});
})();
