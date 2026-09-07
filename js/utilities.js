'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify}=XP;
// --- Képernyőkímélő ------------------------------------------------------
const saver={el:null,stop:null,at:0};
const saverSettings=()=>({name:state.screensaver?.name||'none',minutes:Math.max(1,Number(state.screensaver?.minutes)||10)});
function stopSaver(){if(!saver.el)return;saver.stop?.();saver.el.remove();saver.el=null;saver.stop=null;}
function paintSaver(box,name){
 let frame=0;
 const width=()=>box.clientWidth||box.offsetWidth||320,height=()=>box.clientHeight||box.offsetHeight||240;
 if(name==='logo'){
  const img=document.createElement('img');img.src=XP.iconPath('windows');img.alt='';
  const size=Math.max(14,Math.min(128,Math.round(width()*0.14)));
  img.style.width=img.style.height=size+'px';box.append(img);
  let x=width()/3,y=height()/3,dx=Math.max(0.35,width()/560),dy=Math.max(0.25,height()/620);
  const step=()=>{
   x+=dx;y+=dy;
   if(x<=0||x+size>=width()){dx=-dx;x=Math.max(0,Math.min(width()-size,x));}
   if(y<=0||y+size>=height()){dy=-dy;y=Math.max(0,Math.min(height()-size,y));}
   img.style.transform=`translate(${x}px,${y}px)`;
   frame=requestAnimationFrame(step);
  };
  step();
 }else{
  const canvas=document.createElement('canvas');box.append(canvas);
  canvas.width=width();canvas.height=height();
  const ctx=canvas.getContext('2d');
  const stars=Array.from({length:Math.max(70,Math.round(width()*0.3))},()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()||0.5}));
  const step=()=>{
   ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='#fff';
   for(const star of stars){
    star.z-=0.008;
    if(star.z<=0.02){star.x=Math.random()*2-1;star.y=Math.random()*2-1;star.z=1;}
    const px=canvas.width/2+star.x/star.z*canvas.width/2,py=canvas.height/2+star.y/star.z*canvas.height/2;
    if(px<0||px>canvas.width||py<0||py>canvas.height)continue;
    const size=Math.max(0.7,(1-star.z)*Math.max(1.6,canvas.width/380));
    ctx.globalAlpha=Math.min(1,1.15-star.z);
    ctx.fillRect(px,py,size,size);
   }
   ctx.globalAlpha=1;
   frame=requestAnimationFrame(step);
  };
  step();
 }
 return ()=>cancelAnimationFrame(frame);
}
function startSaver(name){
 if(saver.el||name==='none')return;
 const el=document.createElement('div');el.className='screensaver';document.body.append(el);
 saver.el=el;saver.at=Date.now();saver.stop=paintSaver(el,name);
}
let idleSince=Date.now();
const wake=()=>{idleSince=Date.now();if(saver.el&&Date.now()-saver.at>500)stopSaver();};
for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])document.addEventListener(type,wake,true);
setInterval(()=>{
 const {name,minutes}=saverSettings();
 if(name==='none'||saver.el||XP.modal)return;
 if(!$('#boot-screen').hidden||!$('#welcome-screen').hidden||!$('#off-screen').hidden)return;
 if(Date.now()-idleSince>=minutes*60000)startSaver(name);
},4000);

// --- Közös tulajdonságlap ------------------------------------------------
// Fülek fent, OK / Mégse / Alkalmaz lent — ahogy a Windows tulajdonságlapjain.
function propertySheet({app,title,icon:ic,tabs,initial,width=470,height=515,read,draw,apply}){
 if(XP.singleton(app))return null;
 const w=createWindow({title,icon:ic,app,width,height,fixed:true});
 const body=document.createElement('div');body.className='settings-body';
 body.innerHTML='<nav class="tabs"></nav><div class="tab-panel"></div>';w.body.append(body);
 const panel=$('.tab-panel',body),bar=$('.tabs',body);
 let current=tabs.some(([key])=>key===initial)?initial:tabs[0][0];
 bar.innerHTML=tabs.map(([key,label])=>`<button data-tab="${key}">${esc(label)}</button>`).join('');
 const paint=()=>{$$('[data-tab]',bar).forEach(b=>b.classList.toggle('active',b.dataset.tab===current));draw(current,panel);};
 bar.onclick=e=>{const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===current)return;read(current,panel);current=b.dataset.tab;paint();};
 const row=document.createElement('div');row.className='button-row';
 row.innerHTML='<button class="xp-button primary" data-sheet="ok">OK</button><button class="xp-button" data-sheet="cancel">Mégse</button><button class="xp-button" data-sheet="apply">Alkalmaz</button>';
 w.body.append(row);
 row.onclick=e=>{const action=e.target.dataset.sheet;if(!action)return;if(action!=='cancel'){read(current,panel);apply();}if(action!=='apply')w.close();};
 w.repaint=paint;
 paint();
 return w;
}
const monitor=inner=>`<div class="monitor-preview"><div class="monitor-screen">${inner||''}</div></div>`;
const wallpaperStyle=(name,fit)=>name==='none'?'background:#3a6ea5':`background:#3a6ea5 url('${XP.wallpaperPath(name)}') ${fit==='tile'?'left top/auto repeat':fit==='center'?'center/auto no-repeat':'center/cover no-repeat'}`;

// --- Megjelenítés tulajdonságai (desk.cpl) -------------------------------
register('display',()=>displayProperties());
register('screensaver',()=>displayProperties('screensaver'));
function displayProperties(initial='themes'){
 const draft={wallpaper:state.wallpaper,fit:state.wallpaperFit||'fill',theme:state.theme,style:state.visualStyle||'xp',saver:saverSettings()};
 const options=(list,value)=>list.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(label)}</option>`).join('');
 const wallpapers=[['none','(Nincs)'],['bliss','Bliss'],['azul','Azul'],['autumn','Autumn'],['windows-xp','Windows XP']];
 const schemes=[['blue','Alapértelmezett (kék)'],['olive','Olívazöld'],['silver','Ezüst']];
 const savers=[['none','(Nincs)'],['logo','Windows XP'],['stars','Csillagmező']];
 const scheme=()=>draft.style==='classic'?'classic':draft.theme;
 // A miniature desktop, so the theme and the colour scheme can be judged before applying them.
 const preview=()=>`<div class="preview-desktop" style="${wallpaperStyle(draft.wallpaper,draft.fit)}"><div class="preview-window" data-scheme="${scheme()}"><div class="preview-title">Aktív ablak</div><div class="preview-content"><span>Windows és gombok</span><span class="preview-button">OK</span></div></div><div class="preview-taskbar" data-scheme="${scheme()}"></div></div>`;
 let stopPreview=null,sheet=null;
 const refresh=panel=>{
  const shown=$('.preview-desktop',panel);if(!shown)return;
  shown.style.cssText=wallpaperStyle(draft.wallpaper,draft.fit);
  $$('[data-scheme]',shown).forEach(el=>el.dataset.scheme=scheme());
 };
 sheet=propertySheet({
  app:'display',title:'Megjelenítés tulajdonságai',icon:'control',initial,height:535,
  tabs:[['themes','Témák'],['desktop','Asztal'],['screensaver','Képernyőkímélő'],['appearance','Megjelenés'],['settings','Beállítások']],
  read(tab,panel){
   if(tab==='themes')draft.style=$('[name=theme]',panel).value;
   if(tab==='desktop'){draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;}
   if(tab==='screensaver')draft.saver={name:$('[name=saver]',panel).value,minutes:Math.max(1,Number($('[name=wait]',panel).value)||10)};
   if(tab==='appearance'){draft.style=$('[name=style]',panel).value;const box=$('[name=scheme]',panel);if(box&&!box.disabled)draft.theme=box.value;}
  },
  draw(tab,panel){
   stopPreview?.();stopPreview=null;
   if(tab==='themes'){
    panel.innerHTML=`<label class="settings-field"><span>Téma:</span><select name="theme">${options([['xp','Windows XP'],['classic','Windows klasszikus']],draft.style)}</select></label><p class="settings-note" style="margin:0 0 6px">Minta:</p>${monitor(preview())}<p class="settings-note">A téma az ablakok és a gombok stílusát, a színsémát és a hangokat fogja össze. A színséma külön a Megjelenés lapon állítható.</p>`;
    $('[name=theme]',panel).onchange=e=>{draft.style=e.target.value;refresh(panel);};
   }
   if(tab==='desktop'){
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>Háttér:</span><select class="wallpaper-picker" name="wallpaper" size="5">${options(wallpapers,draft.wallpaper)}</select></label></div><div><label class="settings-field"><span>Elhelyezés:</span><select name="fit">${options([['fill','Nyújtott'],['center','Középre'],['tile','Mozaik']],draft.fit)}</select></label></div></div>`;
    const update=()=>{draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;refresh(panel);};
    $('[name=wallpaper]',panel).onchange=update;$('[name=fit]',panel).onchange=update;
   }
   if(tab==='screensaver'){
    panel.innerHTML=`${monitor('<div class="preview-desktop saver-preview" style="background:#000"></div>')}<label class="settings-field"><span>Képernyőkímélő:</span><select name="saver">${options(savers,draft.saver.name)}</select></label><div class="settings-inline"><button class="xp-button" data-preview>Előnézet</button><label>Várakozás: <input type="number" name="wait" min="1" max="60" value="${draft.saver.minutes}"> perc</label></div><p class="settings-note">A képernyőkímélő akkor indul el, ha a megadott ideig nem használod a gépet. Bármelyik billentyű vagy az egér mozgatása leállítja.</p>`;
    const box=$('.saver-preview',panel);
    const show=()=>{stopPreview?.();box.replaceChildren();stopPreview=draft.saver.name==='none'?null:paintSaver(box,draft.saver.name);};
    $('[name=saver]',panel).onchange=e=>{draft.saver.name=e.target.value;show();};
    $('[data-preview]',panel).onclick=()=>{
     const name=$('[name=saver]',panel).value;
     if(name==='none')XP.dialog('Képernyőkímélő','Nincs képernyőkímélő kiválasztva.');else startSaver(name);
    };
    setTimeout(show,0);
   }
   if(tab==='appearance'){
    const classic=draft.style==='classic';
    panel.innerHTML=`${monitor(preview())}<label class="settings-field"><span>Ablakok és gombok:</span><select name="style">${options([['xp','Windows XP stílus'],['classic','Windows klasszikus stílus']],draft.style)}</select></label><label class="settings-field"><span>Színséma:</span><select name="scheme" ${classic?'disabled':''}>${classic?'<option>Windows alapértelmezett</option>':options(schemes,draft.theme)}</select></label><label class="settings-field"><span>Betűméret:</span><select disabled><option>Normál</option></select></label>`;
    $('[name=style]',panel).onchange=e=>{draft.style=e.target.value;sheet.repaint();};
    if(!classic)$('[name=scheme]',panel).onchange=e=>{draft.theme=e.target.value;refresh(panel);};
   }
   if(tab==='settings'){
    const area=$('#desktop').getBoundingClientRect();
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>Képernyőfelbontás:</span><input type="range" min="0" max="2" value="1" disabled><small>${Math.round(area.width)} × ${Math.round(area.height+30)} képpont</small></label></div><div><label class="settings-field"><span>Színminőség:</span><select disabled><option>Legjobb (32 bit)</option></select></label></div></div><p class="settings-note">A képernyő az ablak méretéhez igazodik: ha átméretezed, a felbontás is ennek megfelelően változik.</p>`;
   }
  },
  apply(){
   Object.assign(state,{wallpaper:draft.wallpaper,wallpaperFit:draft.fit,theme:draft.theme,visualStyle:draft.style,screensaver:{...draft.saver}});
   persist();XP.applySettings();document.dispatchEvent(new CustomEvent('xp-settings-changed'));
  }
 });
 sheet?.cleanup.push(()=>stopPreview?.());
 return sheet;
}

// --- Rendszertulajdonságok (sysdm.cpl) -----------------------------------
register('system',()=>systemProperties());
function systemProperties(initial='general'){
 const draft={computerName:state.computerName||'OTTHONI-PC',updates:state.security?.updates!==false};
 const info=(title,text)=>()=>XP.dialog(title,text);
 return propertySheet({
  app:'system',title:'Rendszertulajdonságok',icon:'computer',initial,height:520,
  tabs:[['general','Általános'],['name','Számítógépnév'],['hardware','Hardver'],['advanced','Speciális'],['updates','Automatikus frissítések']],
  read(tab,panel){
   if(tab==='name')draft.computerName=($('[name=computer]',panel).value.trim()||'OTTHONI-PC').toUpperCase().slice(0,15);
   if(tab==='updates')draft.updates=$('[name=updates]:checked',panel)?.value==='auto';
  },
  draw(tab,panel){
   if(tab==='general'){
    const used=new Blob([JSON.stringify(state)]).size;
    panel.innerHTML=`<div class="system-brand">${icon('windows')}<div><strong>Windows<span>xp</span></strong><br>Professional</div></div><dl class="system-facts"><dt>Rendszer:</dt><dd>Microsoft Windows XP<br>Professional<br>Version 2002<br>Service Pack 3</dd><dt>Bejegyzett tulajdonos:</dt><dd>${esc(state.user)}<br>${esc(draft.computerName)}<br>55274-640-1234567-23456</dd><dt>Számítógép:</dt><dd>Intel(R) Pentium(R) 4 CPU 2.40GHz<br>2,40 GHz, 512 MB RAM<br>${(used/1024).toFixed(1)} KB felhasználói adat</dd></dl><p class="settings-note">A Windows XP a Microsoft Corporation védjegye. Ez a program egy független, nem hivatalos újraalkotás.</p>`;
   }
   if(tab==='name'){
    panel.innerHTML=`<p>A számítógép a hálózaton a következő adatokkal azonosítható.</p><label class="settings-field"><span>Számítógép leírása:</span><input type="text" value="Otthoni gép" readonly></label><label class="settings-field"><span>Teljes számítógépnév:</span><input type="text" name="computer" maxlength="15" value="${esc(draft.computerName)}"></label><label class="settings-field"><span>Munkacsoport:</span><input type="text" value="MUNKACSOPORT" readonly></label><p class="settings-note">A név megváltoztatása után kattints az Alkalmaz gombra. A név megjelenik a Sajátgépen és a hálózaton.</p>`;
   }
   if(tab==='hardware'){
    panel.innerHTML=`<div class="settings-block"><b>Eszközkezelő</b><p>Az Eszközkezelő felsorolja a számítógépbe épített összes eszközt. Innen módosíthatók az eszközök tulajdonságai.</p><button class="xp-button" data-hw="devices">Eszközkezelő</button></div><div class="settings-block"><b>Illesztőprogramok</b><p>Az illesztőprogram-aláírás segítségével ellenőrizhető, hogy a telepített programok kompatibilisek-e a Windows rendszerrel.</p><button class="xp-button" data-hw="drivers">Illesztőprogram aláírása</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.hw;
     if(kind==='devices')info('Eszközkezelő','OTTHONI-PC\n\n  Billentyűzetek\n    Szabványos 101/102 gombos billentyűzet\n  Egerek és egyéb mutatóeszközök\n    HID-kompatibilis egér\n  Hang-, videó- és játékvezérlők\n    Windows-hangeszköz\n  Képernyőadapterek\n    Szabványos VGA grafikus adapter\n  Lemezmeghajtók\n    Általános merevlemez\n  Processzorok\n    Intel(R) Pentium(R) 4 CPU 2.40GHz')();
     if(kind==='drivers')info('Illesztőprogram aláírása','Minden telepített illesztőprogram digitálisan alá van írva.\n\nA Windows figyelmeztet, ha aláíratlan illesztőprogramot próbálsz telepíteni.')();
    };
   }
   if(tab==='advanced'){
    panel.innerHTML=`<p class="settings-note">A módosításokhoz rendszergazdai jogosultság szükséges.</p><div class="settings-block"><b>Teljesítmény</b><p>Vizuális effektusok, processzorütemezés, memóriahasználat és virtuális memória.</p><button class="xp-button" data-adv="perf">Beállítások</button></div><div class="settings-block"><b>Felhasználói profilok</b><p>A bejelentkezéshez tartozó asztal és beállítások.</p><button class="xp-button" data-adv="profiles">Beállítások</button></div><div class="settings-block"><b>Indítás és helyreállítás</b><p>Rendszerindítás, rendszerhiba és hibakeresési adatok.</p><button class="xp-button" data-adv="boot">Beállítások</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.adv;
     if(kind==='perf')info('Teljesítménybeállítások','Vizuális effektusok: A Windows válassza ki az optimális beállítást\nProcesszorütemezés: Programok\nMemóriahasználat: Programok\n\nVirtuális memória: 768 MB a C: meghajtón')();
     if(kind==='profiles')info('Felhasználói profilok',`${state.user}\nTípus: Helyi\nMéret: 2,4 MB\nUtoljára módosítva: ma`)();
     if(kind==='boot')info('Indítás és helyreállítás','Alapértelmezett operációs rendszer:\n„Microsoft Windows XP Professional”\n\nAz operációs rendszerek listájának megjelenítése: 30 másodperc\nRendszerhiba esetén: automatikus újraindítás')();
    };
   }
   if(tab==='updates'){
    panel.innerHTML=`<p>A Windows a háttérben letöltheti és telepítheti a fontos frissítéseket.</p><label class="settings-field"><input type="radio" name="updates" value="auto" ${draft.updates?'checked':''}> <b>Automatikus (ajánlott)</b><br><small>A frissítések letöltése és telepítése automatikusan történik.</small></label><label class="settings-field"><input type="radio" name="updates" value="off" ${draft.updates?'':'checked'}> <b>Az automatikus frissítések kikapcsolása</b><br><small>A frissítéseket magadnak kell letöltened. Ezt a beállítást a Windows nem javasolja.</small></label><p class="settings-note">Ugyanez a beállítás a Biztonsági központban is látszik.</p>`;
   }
  },
  apply(){
   state.computerName=draft.computerName;
   if(!state.security||typeof state.security!=='object')state.security={firewall:true,updates:true};
   state.security.updates=draft.updates;
   persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));
  }
 });
}

// --- Hangok és audioeszközök tulajdonságai (mmsys.cpl) -------------------
register('sounds',()=>soundProperties());
function soundProperties(initial='volume'){
 const draft={volume:state.volume,sounds:state.sounds};
 const events=[['startup','Windows indítása'],['ding','Figyelmeztetés'],['error','Kritikus hiba'],['notify','Új üzenet'],['recycle','Lomtár ürítése']];
 return propertySheet({
  app:'sounds',title:'Hangok és audioeszközök tulajdonságai',icon:'volume',initial,height:490,
  tabs:[['volume','Hangerő'],['sounds','Hangok'],['audio','Hang']],
  read(tab,panel){
   if(tab==='volume'){draft.volume=Number($('[name=volume]',panel).value);draft.sounds=!$('[name=mute]',panel).checked;}
   if(tab==='sounds')draft.sounds=$('[name=scheme]',panel).value!=='none';
  },
  draw(tab,panel){
   if(tab==='volume'){
    panel.innerHTML=`<div class="system-brand">${icon('volume')}<div><strong style="font:bold 13px Tahoma">Windows-hangeszköz</strong></div></div><label class="settings-field"><span>Eszköz hangereje:</span><input type="range" name="volume" min="0" max="100" value="${draft.volume}"></label><label class="settings-field"><input type="checkbox" name="mute" ${draft.sounds?'':'checked'}> Némítás</label><label class="settings-field"><input type="checkbox" checked disabled> A hangerő ikonjának megjelenítése a tálcán</label>`;
    $('[name=volume]',panel).oninput=e=>{draft.volume=Number(e.target.value);};
   }
   if(tab==='sounds'){
    panel.innerHTML=`<label class="settings-field"><span>Hangséma:</span><select name="scheme"><option value="windows" ${draft.sounds?'selected':''}>Windows alapértelmezett</option><option value="none" ${draft.sounds?'':'selected'}>Nincs hang</option></select></label><label class="settings-field"><span>Programesemények:</span><select name="event" size="6" class="wallpaper-picker">${events.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label><div class="settings-inline"><button class="xp-button" data-play>▶ Lejátszás</button><small>Válassz egy eseményt, majd hallgasd meg a hozzá tartozó hangot.</small></div>`;
    $('[name=event]',panel).selectedIndex=0;
    $('[data-play]',panel).onclick=()=>{
     const chosen=$('[name=event]',panel).value;
     if($('[name=scheme]',panel).value==='none'){XP.dialog('Hangok','A „Nincs hang” séma van kiválasztva, ezért a Windows nem játszik le hangot.');return;}
     XP.sound(chosen);
    };
   }
   if(tab==='audio'){
    panel.innerHTML=`<div class="settings-block"><b>Hanglejátszás</b><p>Alapértelmezett eszköz:<br>Windows-hangeszköz</p></div><div class="settings-block"><b>Hangfelvétel</b><p>Alapértelmezett eszköz:<br>Nincs felvevőeszköz</p></div><div class="settings-block"><b>MIDI-zene lejátszása</b><p>Alapértelmezett eszköz:<br>Microsoft GS Wavetable SW Synth</p></div>`;
   }
  },
  apply(){
   state.volume=draft.volume;state.sounds=draft.sounds;persist();
   document.dispatchEvent(new CustomEvent('xp-volume-changed'));
   document.dispatchEvent(new CustomEvent('xp-settings-changed'));
  }
 });
}

register('control',()=>{
 if(XP.singleton('control'))return;
 const w=createWindow({title:'Vezérlőpult',icon:'control',app:'control',width:760,height:525,minWidth:470,minHeight:380});
 const note=(title,text)=>()=>XP.dialog(title,text);
 const applets={
  display:{name:'Megjelenítés',icon:'control',hint:'Háttérkép, képernyőkímélő és színséma',open:()=>XP.open('display')},
  folders:{name:'Mappabeállítások',icon:'folder',hint:'Az elemek megnyitásának módja',open:note('Mappabeállítások','Az elemeket dupla kattintással nyithatod meg, érintőképernyőn egy koppintás is elég.\n\nA saját fájljaidat jobb kattintással átnevezheted, törölheted vagy letöltheted.')},
  network:{name:'Hálózati kapcsolatok',icon:'network',hint:'A helyi kapcsolat állapota',open:()=>XP.open('network')},
  internet:{name:'Internetbeállítások',icon:'ie',hint:'Kezdőlap, előzmények és kedvencek',open:()=>XP.open('ie')},
  programs:{name:'Programok telepítése és törlése',icon:'programs',hint:'A gépre telepített programok',open:()=>XP.dialog('Programok telepítése és törlése','Jelenleg telepített programok:\n\nInternet Explorer 6 — 12,4 MB\nWindows Media Player 9 — 18,7 MB\nOutlook Express 6 — 6,2 MB\nMSN Explorer — 9,1 MB\nWindows XP játékok — 24,3 MB\n3D Pinball – Space Cadet — 9,4 MB\n\nA programok a Windows részei, ezért nem távolíthatók el.')},
  volume:{name:'Hangok és audioeszközök',icon:'volume',hint:'Rendszerhangok és hangerő',open:()=>XP.open('sounds')},
  player:{name:'Hangeszközök',icon:'player',hint:'Lejátszás és hangfájlok',open:()=>XP.open('player')},
  system:{name:'Rendszer',icon:'computer',hint:'Rendszerinformációk és tárhely',open:()=>XP.open('system')},
  cleanup:{name:'Lemezkarbantartó',icon:'disk',hint:'Hely felszabadítása a lemezen',open:()=>{const trash=state.files.filter(f=>f.deleted).length;XP.dialog('Lemezkarbantartó – C:',`A Lemezkarbantartó a következő fájlokat távolíthatja el:\n\nIdeiglenes internetfájlok        3,17 MB\nLetöltött programfájlok          0,00 MB\nLomtár                           ${(trash*0.06).toFixed(2)} MB (${trash} elem)\nIdeiglenes fájlok                0,84 MB\n\nÖsszesen felszabadítható: ${(4.01+trash*0.06).toFixed(2)} MB\n\nA Lomtár tartalmát a Lomtár ablakában ürítheted ki.`);}},
  printers:{name:'Nyomtatók és faxok',icon:'printers',hint:'Telepített nyomtatók',open:note('Nyomtatók és faxok','Nincs telepítve nyomtató.\n\nNyomtató üzembe helyezéséhez indítsd el a Nyomtató hozzáadása varázslót, vagy csatlakoztass egy Plug and Play nyomtatót – a Windows automatikusan felismeri.')},
  profile:{name:'Felhasználói fiókok',icon:'user',hint:'A fiók neve, képe és típusa',open:()=>XP.open('profile')},
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
// --- Felhasználói fiókok (nusrmgr.cpl) -----------------------------------
register('profile',()=>userAccounts());
register('accounts',()=>userAccounts());
function userAccounts(){
 if(XP.singleton('accounts'))return;
 const w=createWindow({title:'Felhasználói fiókok',icon:'user',app:'accounts',width:640,height:520,minWidth:430,minHeight:370});
 const labels={chess:'Sakk',guitar:'Gitár',ball:'Focilabda',butterfly:'Pillangó',fish:'Hal',frog:'Béka',dog:'Kutya',cat:'Cica',duck:'Kacsa',horses:'Lovak',car:'Autó',airplane:'Repülő',astronaut:'Űrhajós',beach:'Tengerpart','palm-tree':'Pálmafa','red-flower':'Piros virág','pink-flower':'Rózsaszín virág',snowflake:'Hópehely',skater:'Gördeszkás',kick:'Rúgás','dirt-bike':'Motocross',giraffe:'Zsiráf',drip:'Vízcsepp',africa:'Afrika','lift-off':'Rakétaindítás'};
 const pictures=XP.avatars.map(key=>[key,labels[key]||key]);
 const accountType=()=>state.accountType==='limited'?'Korlátozott fiók':'Számítógép rendszergazdája';
 let view='home',draftName=state.user,draftPicture=state.avatar,draftType=state.accountType||'admin';
 const body=document.createElement('div');body.className='accounts-body';w.body.append(body);
 const tile=()=>`<button class="account-tile" data-go="pick">${XP.avatar(state.avatar)}<span><b>${esc(state.user)}</b>${accountType()}</span></button>`;
 function save(){state.user=draftName;state.avatar=draftPicture;state.accountType=draftType;persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
 function render(){
  const pages={
   home:`<h1>Válasszon egy feladatot:</h1><ul class="account-tasks"><li><button data-go="name">A fiók nevének megváltoztatása</button></li><li><button data-go="picture">A kép megváltoztatása</button></li><li><button data-go="type">A fiók típusának megváltoztatása</button></li></ul><h2>vagy válasszon egy fiókot a módosításhoz</h2><div class="account-list">${tile()}</div>`,
   pick:`<h1>Mit szeretne módosítani a(z) ${esc(state.user)} fiókján?</h1><ul class="account-tasks"><li><button data-go="name">A nevem megváltoztatása</button></li><li><button data-go="picture">A képem megváltoztatása</button></li><li><button data-go="type">A fiók típusának megváltoztatása</button></li></ul><div class="account-list">${tile()}</div>`,
   name:`<h1>Adjon új nevet a(z) ${esc(state.user)} fióknak</h1><p>A név a bejelentkezési képernyőn és a Start menü tetején jelenik meg.</p><label class="settings-field"><input type="text" name="account-name" maxlength="32" value="${esc(draftName)}"></label><div class="account-buttons"><button class="xp-button primary" data-save="name">Név megváltoztatása</button><button class="xp-button" data-go="home">Mégse</button></div>`,
   picture:`<h1>Válasszon új képet a(z) ${esc(state.user)} fiókhoz</h1><p>A kép a bejelentkezési képernyőn és a Start menüben jelenik meg.</p><div class="picture-grid">${pictures.map(([key,label])=>`<button class="picture-choice ${key===draftPicture?'selected':''}" data-picture="${key}" title="${esc(label)}" aria-label="${esc(label)}">${XP.avatar(key)}</button>`).join('')}</div><div class="account-buttons"><button class="xp-button primary" data-save="picture">Kép megváltoztatása</button><button class="xp-button" data-go="home">Mégse</button></div>`,
   type:`<h1>Válassza ki az új fióktípust a(z) ${esc(state.user)} fiókhoz</h1><label class="settings-field"><input type="radio" name="account-type" value="admin" ${draftType==='admin'?'checked':''}> <b>Számítógép rendszergazdája</b><br><small>Programokat telepíthet, minden fájlt elérhet és módosíthatja a rendszerbeállításokat.</small></label><label class="settings-field"><input type="radio" name="account-type" value="limited" ${draftType==='limited'?'checked':''}> <b>Korlátozott</b><br><small>Módosíthatja a saját jelszavát és képét, de nem telepíthet programokat.</small></label><div class="account-buttons"><button class="xp-button primary" data-save="type">Fióktípus megváltoztatása</button><button class="xp-button" data-go="home">Mégse</button></div>`
  };
  body.innerHTML=`<header class="accounts-head">${icon('user')}<div><h1>Felhasználói fiókok</h1><p>${esc(state.user)} – ${accountType()}</p></div></header><div class="accounts-main"><aside class="accounts-side"><h2>Kapcsolódó témakörök</h2><ul><li><button data-side="control">Vezérlőpult</button></li><li><button data-side="logoff">Kijelentkezés</button></li><li><button data-side="help">Súgó és támogatás</button></li></ul></aside><section class="accounts-page">${pages[view]}</section></div>`;
  const input=$('[name=account-name]',body);if(input)setTimeout(()=>{input.focus();input.select();},0);
 }
 body.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.go){view=button.dataset.go;render();return;}
  if(button.dataset.picture){draftPicture=button.dataset.picture;render();return;}
  const action=button.dataset.save;
  if(action==='name'){
   const next=XP.fileName($('[name=account-name]',body).value).slice(0,32).trim();
   if(!next){XP.sound('error');XP.dialog('Felhasználói fiókok','Adj meg egy nevet a fiókhoz.',{icon:'error'});return;}
   draftName=next;save();view='home';render();notify('Felhasználói fiókok',`A fiók új neve: ${next}`);return;
  }
  if(action==='picture'){save();view='home';render();return;}
  if(action==='type'){draftType=$('[name=account-type]:checked',body)?.value||'admin';save();view='home';render();return;}
  const side=button.dataset.side;
  if(side==='control')XP.open('control');
  if(side==='help')XP.open('help');
  if(side==='logoff')XP.open('logoff');
 };
 render();
 status(w,'Felhasználói fiókok');
 return w;
}
register('volume',()=>{
 if(XP.singleton('volume'))return;const w=createWindow({title:'Hangerő',icon:'volume',app:'volume',width:270,height:210,fixed:true});w.body.innerHTML=`<div class="volume-panel">${icon('volume')} <b>Fő hangerő</b><input type="range" min="0" max="100" value="${state.volume}" aria-label="Fő hangerő"><label><input type="checkbox" ${!state.sounds?'checked':''}> Elnémítás</label></div>`;$('input[type=range]',w.body).oninput=e=>{state.volume=Number(e.target.value);persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));};$('input[type=checkbox]',w.body).onchange=e=>{state.sounds=!e.target.checked;persist();document.dispatchEvent(new CustomEvent('xp-volume-changed'));};return w;
});
register('calendar',()=>{
 if(XP.singleton('calendar'))return;const w=createWindow({title:'Dátum és idő',icon:'datetime',app:'calendar',width:330,height:365,fixed:true});const body=document.createElement('div');body.className='calendar';w.body.append(body);const now=new Date();let year=now.getFullYear(),month=now.getMonth();function render(){const first=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();body.innerHTML=`<div class="calendar-heading"><button class="xp-button" data-month="-1" style="min-width:26px">‹</button> <span>${new Date(year,month).toLocaleDateString('hu-HU',{year:'numeric',month:'long'})}</span> <button class="xp-button" data-month="1" style="min-width:26px">›</button></div><div class="calendar-grid">${['H','K','Sze','Cs','P','Szo','V'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>`<span class="${i+1===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()?'today':''}">${i+1}</span>`).join('')}</div><div class="calendar-time"></div><small>A számítógép helyi ideje</small>`;tick();}function tick(){const el=$('.calendar-time',body);if(el)el.textContent=new Date().toLocaleTimeString('hu-HU');}body.onclick=e=>{const b=e.target.closest('[data-month]');if(b){month+=Number(b.dataset.month);if(month<0){month=11;year--;}if(month>11){month=0;year++;}render();}};const timer=setInterval(tick,1000);w.cleanup.push(()=>clearInterval(timer));render();return w;
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
 const result=await XP.prompt('Futtatás','Írd be egy program vagy mappa nevét, és a Windows megnyitja azt.','');if(!result)return;const value=result.trim().toLowerCase().replace(/\.exe$/,'');const map={notepad:'notepad',jegyzettömb:'notepad',mspaint:'paint',paint:'paint',calc:'calculator',cmd:'cmd',iexplore:'ie',msimn:'outlook',outlook:'outlook',taskmgr:'taskmgr',explorer:'explorer',control:'control',winmine:'mines',minesweeper:'mines',sol:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',pókpasziánsz:'spider',mshearts:'hearts',hearts:'hearts',wmplayer:'player',wscui:'security','wscui.cpl':'security',sysdm:'system',desk:'display',mmsys:'sounds',nusrmgr:'profile',winver:'system'};if(map[value])XP.open(map[value]);else if(value.includes('.')||value.includes('://'))XP.open('ie',result);else{const f=state.files.find(f=>!f.deleted&&f.name.toLowerCase()===value);if(f)XP.openFile(f.id);else{XP.sound('error');XP.dialog('Futtatás',`A Windows nem találja ezt: „${result}”.\nPróbáld például: notepad, mspaint, calc, cmd, winmine vagy iexplore.`,{icon:'error'});}}
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
})();
