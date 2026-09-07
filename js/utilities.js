'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify,t}=XP;
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
 row.innerHTML=`<button class="xp-button primary" data-sheet="ok">OK</button><button class="xp-button" data-sheet="cancel">${esc(t('Mégse'))}</button><button class="xp-button" data-sheet="apply">Alkalmaz</button>`;
 w.body.append(row);
 row.onclick=e=>{const action=e.target.dataset.sheet;if(!action)return;if(action!=='cancel'){read(current,panel);apply();}if(action!=='apply')w.close();};
 w.repaint=paint;
 paint();
 return w;
}
const monitor=inner=>`<div class="monitor-preview"><div class="monitor-screen">${inner||''}</div></div>`;
const wallpaperStyle=(name,fit)=>name==='none'?'background:#3a6ea5':`background:#3a6ea5 url('${XP.wallpaperPath(name)}') ${fit==='tile'?'left top/auto repeat':fit==='center'?'center/auto no-repeat':'center/cover no-repeat'}`;

// --- Tálca és Start menü tulajdonságai -----------------------------------
// --- Meghajtó tulajdonságai (a kördiagrammal) ----------------------------
register('drive',(which='disk')=>{
 const dvd=which==='dvd';
 const GB=1024**3;
 // A 2001-es gépben egy 40 GB-os lemez ült; a használt hely az itt tárolt fájlokkal nő.
 const capacity=dvd?0:40*GB-1_100_000_000;
 const own=state.files.filter(f=>!f.deleted).reduce((sum,f)=>sum+(f.content||'').length+1024,0);
 const used=dvd?0:4_283_924_480+own;
 const free=Math.max(0,capacity-used);
 const bytes=value=>value.toLocaleString('hu-HU');
 const gb=value=>`${(value/GB).toFixed(2).replace('.',',')} GB`;
 const percent=capacity?Math.round(used/capacity*100):0;
 const swatch=(colour,label,value)=>`<div class="disk-legend"><i style="background:${colour}"></i><span>${label}</span><b>${bytes(value)} bájt</b><span>${gb(value)}</span></div>`;
 return propertySheet({
  app:'drive',title:`${dvd?t('DVD-meghajtó (D:)'):'Helyi lemez (C:)'} tulajdonságai`,icon:dvd?'cd':'disk',
  width:400,height:470,initial:'general',
  tabs:[['general',t('Általános')],['tools',t('Eszközök')],['hardware',t('Hardver')]],
  read(){},
  draw(tab,panel){
   if(tab==='general'){
    panel.innerHTML=dvd
     ?`<div class="disk-head">${icon('cd')}<input type="text" value="DVD-meghajtó" readonly></div><hr>
       <dl class="disk-facts"><dt>${esc(t('Típus:'))}</dt><dd>${esc(t('CD-meghajtó'))}</dd><dt>${esc(t('Fájlrendszer:'))}</dt><dd>Ismeretlen</dd></dl><hr>
       <p class="settings-note">${esc(t('Nincs lemez a meghajtóban. Helyezzen be egy lemezt, majd próbálja újra.'))}</p>`
     :`<div class="disk-head">${icon('disk')}<input type="text" value="Helyi lemez" readonly></div><hr>
       <dl class="disk-facts"><dt>${esc(t('Típus:'))}</dt><dd>Helyi lemez</dd><dt>${esc(t('Fájlrendszer:'))}</dt><dd>NTFS</dd></dl><hr>
       <div class="disk-usage">
        <div class="disk-legends">${swatch('#1b3fa0',t('Használt terület:'),used)}${swatch('#c832c8',t('Szabad terület:'),free)}</div>
        <div class="disk-pie" style="background:conic-gradient(#1b3fa0 0 ${percent}%,#c832c8 ${percent}% 100%)"></div>
       </div>
       <hr>
       <div class="disk-legend total"><span>${esc(t('Kapacitás:'))}</span><b>${bytes(capacity)} bájt</b><span>${gb(capacity)}</span></div>
       <p class="disk-drive">${esc(t('C: meghajtó'))}</p>
       <div class="button-row" style="padding:6px 0 0"><button class="xp-button" data-cleanup>${esc(t('Lemezkarbantartó'))}</button></div>
       <label class="settings-check"><input type="checkbox" checked> ${esc(t('A meghajtó indexelése a gyorsabb kereséshez'))}</label>`;
    const cleanup=$('[data-cleanup]',panel);
    if(cleanup)cleanup.onclick=()=>XP.dialog(t('Lemezkarbantartó'),`A Lemezkarbantartó kiszámítja, mennyi helyet szabadíthat fel a(z) C: meghajtón.\n\nIdeiglenes internetfájlok: 12,4 MB\nLomtár: ${(state.files.filter(f=>f.deleted).length*0.4).toFixed(1).replace('.',',')} MB\nIdeiglenes fájlok: 3,1 MB`,{icon:'disk'});
   }
   if(tab==='tools')panel.innerHTML=`<fieldset><legend>${esc(t('Hibakeresés'))}</legend><p>${esc(t('A beállítás ellenőrzi a kötet hibáit.'))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t('Ellenőrzés…'))}</button></div></fieldset>
     <fieldset><legend>${esc(t('Töredezettségmentesítés'))}</legend><p>${esc(t('A beállítás töredezettségmentesíti a köteten lévő fájlokat.'))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t('Töredezettségmentesítés…'))}</button></div></fieldset>
     <fieldset><legend>${esc(t('Biztonsági mentés'))}</legend><p>${esc(t('A beállítás biztonsági másolatot készít a köteten lévő fájlokról.'))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t('Mentés indítása…'))}</button></div></fieldset>`;
   if(tab==='hardware')panel.innerHTML=`<p>${esc(t('Az összes lemezmeghajtó:'))}</p><table class="taskmgr-table"><thead><tr><th>${esc(t('Név'))}</th><th>${esc(t('Típus'))}</th></tr></thead><tbody>
     <tr><td>${icon('disk')}ST340016A</td><td>${esc(t('Lemezmeghajtók'))}</td></tr>
     <tr><td>${icon('cd')}HL-DT-ST DVD-ROM GDR8162B</td><td>${esc(t('DVD/CD-ROM-meghajtók'))}</td></tr>
     <tr><td>${icon('disk')}Floppy lemezmeghajtó</td><td>${esc(t('Hajlékonylemez-meghajtók'))}</td></tr></tbody></table>`;
  },
  apply(){}
 });
});
// --- Területi és nyelvi beállítások (intl.cpl) ---------------------------
register('regional',()=>{
 // XP itt tartotta a nyelvet: a lista a felület nyelvét váltja.
 const draft={language:XP.language};
 const SAMPLES={hu:['2026. szeptember 7.','13:45:20','1 234 567,89 Ft'],
   en:['Monday, 07 September 2026','1:45:20 PM','$1,234,567.89'],
   de:['Montag, 7. September 2026','13:45:20','1.234.567,89 €']};
 const REGIONS={hu:t('Magyar (Magyarország)'),en:'English (United States)',de:'Deutsch (Deutschland)'};
 return propertySheet({
  app:'regional',title:t('Területi és nyelvi beállítások'),icon:'datetime',width:420,height:460,initial:'formats',
  tabs:[['formats',t('Területi beállítások')],['languages',t('Nyelvek')],['advanced',t('Speciális')]],
  read(tab,panel){const box=$('[name=language]',panel);if(box)draft.language=box.value;},
  draw(tab,panel){
   const samples=SAMPLES[draft.language]||SAMPLES.hu;
   if(tab==='formats')panel.innerHTML=`<fieldset><legend>${esc(t('Szabványok és formátumok'))}</legend>
     <p class="settings-note">${esc(t('A programok ebben a formában mutatják a számokat, a pénznemet, a dátumot és az időt.'))}</p>
     <label class="settings-field"><select name="language">${XP.languages.map(item=>`<option value="${item.code}" ${item.code===draft.language?'selected':''}>${esc(REGIONS[item.code]||item.label)}</option>`).join('')}</select></label>
     <dl class="disk-facts"><dt>${esc(t('Dátum'))}:</dt><dd>${esc(samples[0])}</dd><dt>${esc(t('Idő'))}:</dt><dd>${esc(samples[1])}</dd><dt>${esc(t('Pénznem'))}:</dt><dd>${esc(samples[2])}</dd></dl></fieldset>
     <fieldset><legend>${esc(t('Hely'))}</legend><p class="settings-note">${esc(t('A helyi híreket és időjárást kínáló szolgáltatások ezt használják.'))}</p></fieldset>`;
   if(tab==='languages')panel.innerHTML=`<fieldset><legend>${esc(t('A felület nyelve'))}</legend>
     <p class="settings-note">${esc(t('Ezen a nyelven jelennek meg a menük, a párbeszédablakok és a programok feliratai.'))}</p>
     <label class="settings-field"><select name="language">${XP.languages.map(item=>`<option value="${item.code}" ${item.code===draft.language?'selected':''}>${esc(item.label)}</option>`).join('')}</select></label></fieldset>
     <fieldset><legend>${esc(t('Szövegbeviteli szolgáltatások'))}</legend><p class="settings-note">${esc(t('A telepített billentyűzetkiosztás a felület nyelvét követi.'))}</p></fieldset>`;
   if(tab==='advanced')panel.innerHTML=`<fieldset><legend>${esc(t('Nem Unicode-os programok nyelve'))}</legend>
     <p class="settings-note">${esc(t('A régebbi programok ezt a nyelvet használják a szövegek megjelenítéséhez.'))}</p>
     <label class="settings-field"><select disabled><option>${esc(REGIONS[draft.language]||'')}</option></select></label></fieldset>`;
  },
  async apply(){
   if(!XP.setLanguage(draft.language))return;
   // XP is kijelentkezést kért a felület nyelvének cseréjéhez; nálunk az
   // újraindítás teszi ugyanezt, a fájlok és a beállítások megmaradnak.
   const answer=await XP.dialog(t('Területi és nyelvi beállítások'),
    t('A módosítás akkor lép teljesen életbe, ha a Windows újraindul. Újraindítja most?'),
    {icon:'info',buttons:['Igen',t('Nem')]});
   if(answer)location.reload();
  }
 });
});

register('printers',()=>XP.dialog(t('Nyomtatók és faxok'),t('Nincs telepítve nyomtató.\n\nNyomtató üzembe helyezéséhez indítsd el a Nyomtató hozzáadása varázslót, vagy csatlakoztass egy Plug and Play nyomtatót – a Windows automatikusan felismeri.'),{icon:'printers'}));
register('taskbar',(initial='taskbar')=>{
 const draft={...{locked:true,clock:true,quickLaunch:true},...(state.taskbar||{})};
 const check=(key,label)=>`<label class="settings-check"><input type="checkbox" data-key="${key}" ${draft[key]?'checked':''}> ${esc(label)}</label>`;
 return propertySheet({
  app:'taskbar',title:t('A Tálca és a Start menü tulajdonságai'),icon:'taskbar',initial,width:400,height:430,
  tabs:[['taskbar',t('Tálca')],['start',t('Start menü')]],
  read(tab,panel){$$('[data-key]',panel).forEach(box=>draft[box.dataset.key]=box.checked);},
  draw(tab,panel){
   panel.innerHTML=tab==='taskbar'
    ?`<div class="preview-taskbar-strip"><span class="strip-start">start</span><span class="strip-task">${esc(t('Jegyzettömb'))}</span><span class="strip-tray">${(new Date()).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})}</span></div>
       <fieldset><legend>${esc(t('A Tálca megjelenése'))}</legend>${check('locked',t('A Tálca rögzítése'))}${check('quickLaunch',t('A Gyorsindítás eszköztár megjelenítése'))}</fieldset>
       <fieldset><legend>${esc(t('Az értesítési terület'))}</legend>${check('clock',t('Az óra megjelenítése'))}<p class="settings-note">${esc(t('Az inaktív ikonokat a Tálca a nyíl mögé rejti.'))}</p></fieldset>`
    :`<fieldset><legend>${esc(t('A Start menü stílusa'))}</legend><label class="settings-check"><input type="radio" name="start-style" checked> ${esc(t('Start menü'))}</label><p class="settings-note">${esc(t('Ez a stílus a leggyakrabban használt programokat kínálja, és közvetlen elérést ad az internethez és az e-mailhez.'))}</p><label class="settings-check"><input type="radio" name="start-style" disabled> ${esc(t('Klasszikus Start menü'))}</label><p class="settings-note">${esc(t('A Windows korábbi verzióinak megjelenését és működését adja vissza.'))}</p></fieldset>`;
  },
  apply(){state.taskbar={...state.taskbar,...draft};persist();XP.applySettings();}
 });
});

// --- Megjelenítés tulajdonságai (desk.cpl) -------------------------------
register('display',()=>displayProperties());
register('screensaver',()=>displayProperties('screensaver'));
function displayProperties(initial='themes'){
 const draft={wallpaper:state.wallpaper,fit:state.wallpaperFit||'fill',theme:state.theme,style:state.visualStyle||'xp',saver:saverSettings()};
 const options=(list,value)=>list.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(label)}</option>`).join('');
 const wallpapers=[['none','(Nincs)'],['bliss','Bliss'],['azul','Azul'],['autumn','Autumn'],['windows-xp','Windows XP']];
 const schemes=[['blue',t('Alapértelmezett (kék)')],['olive',t('Olívazöld')],['silver',t('Ezüst')]];
 const savers=[['none','(Nincs)'],['logo','Windows XP'],['stars',t('Csillagmező')]];
 const scheme=()=>draft.style==='classic'?'classic':draft.theme;
 // A miniature desktop, so the theme and the colour scheme can be judged before applying them.
 const preview=()=>`<div class="preview-desktop" style="${wallpaperStyle(draft.wallpaper,draft.fit)}"><div class="preview-window" data-scheme="${scheme()}"><div class="preview-title">${esc(t('Aktív ablak'))}</div><div class="preview-content"><span>${esc(t('Windows és gombok'))}</span><span class="preview-button">OK</span></div></div><div class="preview-taskbar" data-scheme="${scheme()}"></div></div>`;
 let stopPreview=null,sheet=null;
 const refresh=panel=>{
  const shown=$('.preview-desktop',panel);if(!shown)return;
  shown.style.cssText=wallpaperStyle(draft.wallpaper,draft.fit);
  $$('[data-scheme]',shown).forEach(el=>el.dataset.scheme=scheme());
 };
 sheet=propertySheet({
  app:'display',title:t('Megjelenítés tulajdonságai'),icon:'control',initial,height:535,
  tabs:[['themes',t('Témák')],['desktop',t('Asztal')],['screensaver',t('Képernyőkímélő')],['appearance',t('Megjelenés')],['settings',t('Beállítások')]],
  read(tab,panel){
   if(tab==='themes')draft.style=$('[name=theme]',panel).value;
   if(tab==='desktop'){draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;}
   if(tab==='screensaver')draft.saver={name:$('[name=saver]',panel).value,minutes:Math.max(1,Number($('[name=wait]',panel).value)||10)};
   if(tab==='appearance'){draft.style=$('[name=style]',panel).value;const box=$('[name=scheme]',panel);if(box&&!box.disabled)draft.theme=box.value;}
  },
  draw(tab,panel){
   stopPreview?.();stopPreview=null;
   if(tab==='themes'){
    panel.innerHTML=`<label class="settings-field"><span>${esc(t('Téma:'))}</span><select name="theme">${options([['xp','Windows XP'],['classic',t('Windows klasszikus')]],draft.style)}</select></label><p class="settings-note" style="margin:0 0 6px">Minta:</p>${monitor(preview())}<p class="settings-note">${esc(t('A téma az ablakok és a gombok stílusát, a színsémát és a hangokat fogja össze. A színséma külön a Megjelenés lapon állítható.'))}</p>`;
    $('[name=theme]',panel).onchange=e=>{draft.style=e.target.value;refresh(panel);};
   }
   if(tab==='desktop'){
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>${esc(t('Háttér:'))}</span><select class="wallpaper-picker" name="wallpaper" size="5">${options(wallpapers,draft.wallpaper)}</select></label></div><div><label class="settings-field"><span>${esc(t('Elhelyezés:'))}</span><select name="fit">${options([['fill',t('Nyújtott')],['center',t('Középre')],['tile',t('Mozaik')]],draft.fit)}</select></label></div></div>`;
    const update=()=>{draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;refresh(panel);};
    $('[name=wallpaper]',panel).onchange=update;$('[name=fit]',panel).onchange=update;
   }
   if(tab==='screensaver'){
    panel.innerHTML=`${monitor('<div class="preview-desktop saver-preview" style="background:#000"></div>')}<label class="settings-field"><span>${esc(t('Képernyőkímélő:'))}</span><select name="saver">${options(savers,draft.saver.name)}</select></label><div class="settings-inline"><button class="xp-button" data-preview>${esc(t('Előnézet'))}</button><label>${esc(t('Várakozás:'))} <input type="number" name="wait" min="1" max="60" value="${draft.saver.minutes}"> perc</label></div><p class="settings-note">${esc(t('A képernyőkímélő akkor indul el, ha a megadott ideig nem használod a gépet. Bármelyik billentyű vagy az egér mozgatása leállítja.'))}</p>`;
    const box=$('.saver-preview',panel);
    const show=()=>{stopPreview?.();box.replaceChildren();stopPreview=draft.saver.name==='none'?null:paintSaver(box,draft.saver.name);};
    $('[name=saver]',panel).onchange=e=>{draft.saver.name=e.target.value;show();};
    $('[data-preview]',panel).onclick=()=>{
     const name=$('[name=saver]',panel).value;
     if(name==='none')XP.dialog(t('Képernyőkímélő'),t('Nincs képernyőkímélő kiválasztva.'));else startSaver(name);
    };
    setTimeout(show,0);
   }
   if(tab==='appearance'){
    const classic=draft.style==='classic';
    panel.innerHTML=`${monitor(preview())}<label class="settings-field"><span>${esc(t('Ablakok és gombok:'))}</span><select name="style">${options([['xp',t('Windows XP stílus')],['classic',t('Windows klasszikus stílus')]],draft.style)}</select></label><label class="settings-field"><span>${esc(t('Színséma:'))}</span><select name="scheme" ${classic?'disabled':''}>${classic?`<option>${esc(t('Windows alapértelmezett'))}</option>`:options(schemes,draft.theme)}</select></label><label class="settings-field"><span>${esc(t('Betűméret:'))}</span><select disabled><option>${esc(t('Normál'))}</option></select></label>`;
    $('[name=style]',panel).onchange=e=>{draft.style=e.target.value;sheet.repaint();};
    if(!classic)$('[name=scheme]',panel).onchange=e=>{draft.theme=e.target.value;refresh(panel);};
   }
   if(tab==='settings'){
    const area=$('#desktop').getBoundingClientRect();
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>${esc(t('Képernyőfelbontás:'))}</span><input type="range" min="0" max="2" value="1" disabled><small>${Math.round(area.width)} × ${Math.round(area.height+30)} képpont</small></label></div><div><label class="settings-field"><span>${esc(t('Színminőség:'))}</span><select disabled><option>Legjobb (32 bit)</option></select></label></div></div><p class="settings-note">${esc(t('A képernyő az ablak méretéhez igazodik: ha átméretezed, a felbontás is ennek megfelelően változik.'))}</p>`;
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
  app:'system',title:t('Rendszertulajdonságok'),icon:'computer',initial,height:520,
  tabs:[['general',t('Általános')],['name',t('Számítógépnév')],['hardware',t('Hardver')],['advanced',t('Speciális')],['updates',t('Automatikus frissítések')]],
  read(tab,panel){
   if(tab==='name')draft.computerName=($('[name=computer]',panel).value.trim()||'OTTHONI-PC').toUpperCase().slice(0,15);
   if(tab==='updates')draft.updates=$('[name=updates]:checked',panel)?.value==='auto';
  },
  draw(tab,panel){
   if(tab==='general'){
    const used=new Blob([JSON.stringify(state)]).size;
    panel.innerHTML=`<div class="system-brand">${icon('windows')}<div><strong>Windows<span>xp</span></strong><br>Professional</div></div><dl class="system-facts"><dt>Rendszer:</dt><dd>Microsoft Windows XP<br>Professional<br>Version 2002<br>Service Pack 3</dd><dt>Bejegyzett tulajdonos:</dt><dd>${esc(state.user)}<br>${esc(draft.computerName)}<br>55274-640-1234567-23456</dd><dt>${esc(t('Számítógép:'))}</dt><dd>Intel(R) Pentium(R) 4 CPU 2.40GHz<br>2,40 GHz, 512 MB RAM<br>${(used/1024).toFixed(1)} KB felhasználói adat</dd></dl><p class="settings-note">${esc(t('A Windows XP a Microsoft Corporation védjegye. Ez a program egy független, nem hivatalos újraalkotás.'))}</p>`;
   }
   if(tab==='name'){
    panel.innerHTML=`<p>${esc(t('A számítógép a hálózaton a következő adatokkal azonosítható.'))}</p><label class="settings-field"><span>${esc(t('Számítógép leírása:'))}</span><input type="text" value="Otthoni gép" readonly></label><label class="settings-field"><span>${esc(t('Teljes számítógépnév:'))}</span><input type="text" name="computer" maxlength="15" value="${esc(draft.computerName)}"></label><label class="settings-field"><span>Munkacsoport:</span><input type="text" value="MUNKACSOPORT" readonly></label><p class="settings-note">${esc(t('A név megváltoztatása után kattints az Alkalmaz gombra. A név megjelenik a Sajátgépen és a hálózaton.'))}</p>`;
   }
   if(tab==='hardware'){
    panel.innerHTML=`<div class="settings-block"><b>${esc(t('Eszközkezelő'))}</b><p>${esc(t('Az Eszközkezelő felsorolja a számítógépbe épített összes eszközt. Innen módosíthatók az eszközök tulajdonságai.'))}</p><button class="xp-button" data-hw="devices">${esc(t('Eszközkezelő'))}</button></div><div class="settings-block"><b>${esc(t('Illesztőprogramok'))}</b><p>${esc(t('Az illesztőprogram-aláírás segítségével ellenőrizhető, hogy a telepített programok kompatibilisek-e a Windows rendszerrel.'))}</p><button class="xp-button" data-hw="drivers">${esc(t('Illesztőprogram aláírása'))}</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.hw;
     if(kind==='devices')info(t('Eszközkezelő'),t('OTTHONI-PC\n\n  Billentyűzetek\n    Szabványos 101/102 gombos billentyűzet\n  Egerek és egyéb mutatóeszközök\n    HID-kompatibilis egér\n  Hang-, videó- és játékvezérlők\n    Windows-hangeszköz\n  Képernyőadapterek\n    Szabványos VGA grafikus adapter\n  Lemezmeghajtók\n    Általános merevlemez\n  Processzorok\n    Intel(R) Pentium(R) 4 CPU 2.40GHz'))();
     if(kind==='drivers')info(t('Illesztőprogram aláírása'),t('Minden telepített illesztőprogram digitálisan alá van írva.\n\nA Windows figyelmeztet, ha aláíratlan illesztőprogramot próbálsz telepíteni.'))();
    };
   }
   if(tab==='advanced'){
    panel.innerHTML=`<p class="settings-note">${esc(t('A módosításokhoz rendszergazdai jogosultság szükséges.'))}</p><div class="settings-block"><b>${esc(t('Teljesítmény'))}</b><p>${esc(t('Vizuális effektusok, processzorütemezés, memóriahasználat és virtuális memória.'))}</p><button class="xp-button" data-adv="perf">${esc(t('Beállítások'))}</button></div><div class="settings-block"><b>${esc(t('Felhasználói profilok'))}</b><p>${esc(t('A bejelentkezéshez tartozó asztal és beállítások.'))}</p><button class="xp-button" data-adv="profiles">${esc(t('Beállítások'))}</button></div><div class="settings-block"><b>${esc(t('Indítás és helyreállítás'))}</b><p>${esc(t('Rendszerindítás, rendszerhiba és hibakeresési adatok.'))}</p><button class="xp-button" data-adv="boot">${esc(t('Beállítások'))}</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.adv;
     if(kind==='perf')info(t('Teljesítménybeállítások'),t('Vizuális effektusok: A Windows válassza ki az optimális beállítást\nProcesszorütemezés: Programok\nMemóriahasználat: Programok\n\nVirtuális memória: 768 MB a C: meghajtón'))();
     if(kind==='profiles')info(t('Felhasználói profilok'),`${state.user}\nTípus: Helyi\nMéret: 2,4 MB\nUtoljára módosítva: ma`)();
     if(kind==='boot')info(t('Indítás és helyreállítás'),t('Alapértelmezett operációs rendszer:\n„Microsoft Windows XP Professional”\n\nAz operációs rendszerek listájának megjelenítése: 30 másodperc\nRendszerhiba esetén: automatikus újraindítás'))();
    };
   }
   if(tab==='updates'){
    panel.innerHTML=`<p>${esc(t('A Windows a háttérben letöltheti és telepítheti a fontos frissítéseket.'))}</p><label class="settings-field"><input type="radio" name="updates" value="auto" ${draft.updates?'checked':''}> <b>${esc(t('Automatikus (ajánlott)'))}</b><br><small>${esc(t('A frissítések letöltése és telepítése automatikusan történik.'))}</small></label><label class="settings-field"><input type="radio" name="updates" value="off" ${draft.updates?'':'checked'}> <b>${esc(t('Az automatikus frissítések kikapcsolása'))}</b><br><small>${esc(t('A frissítéseket magadnak kell letöltened. Ezt a beállítást a Windows nem javasolja.'))}</small></label><p class="settings-note">${esc(t('Ugyanez a beállítás a Biztonsági központban is látszik.'))}</p>`;
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
 const events=[['startup',t('Windows indítása')],['ding',t('Figyelmeztetés')],['error',t('Kritikus hiba')],['notify',t('Új üzenet')],['recycle',t('Lomtár ürítése')]];
 return propertySheet({
  app:'sounds',title:t('Hangok és audioeszközök tulajdonságai'),icon:'volume',initial,height:490,
  tabs:[['volume',t('Hangerő')],['sounds',t('Hangok')],['audio',t('Hang')]],
  read(tab,panel){
   if(tab==='volume'){draft.volume=Number($('[name=volume]',panel).value);draft.sounds=!$('[name=mute]',panel).checked;}
   if(tab==='sounds')draft.sounds=$('[name=scheme]',panel).value!=='none';
  },
  draw(tab,panel){
   if(tab==='volume'){
    panel.innerHTML=`<div class="system-brand">${icon('volume')}<div><strong style="font:bold 13px Tahoma">${esc(t('Windows-hangeszköz'))}</strong></div></div><label class="settings-field"><span>${esc(t('Eszköz hangereje:'))}</span><input type="range" name="volume" min="0" max="100" value="${draft.volume}"></label><label class="settings-field"><input type="checkbox" name="mute" ${draft.sounds?'':'checked'}> ${esc(t('Némítás'))}</label><label class="settings-field"><input type="checkbox" checked disabled> ${esc(t('A hangerő ikonjának megjelenítése a tálcán'))}</label>`;
    $('[name=volume]',panel).oninput=e=>{draft.volume=Number(e.target.value);};
   }
   if(tab==='sounds'){
    panel.innerHTML=`<label class="settings-field"><span>${esc(t('Hangséma:'))}</span><select name="scheme"><option value="windows" ${draft.sounds?'selected':''}>${esc(t('Windows alapértelmezett'))}</option><option value="none" ${draft.sounds?'':'selected'}>Nincs hang</option></select></label><label class="settings-field"><span>${esc(t('Programesemények:'))}</span><select name="event" size="6" class="wallpaper-picker">${events.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label><div class="settings-inline"><button class="xp-button" data-play>${esc(t('▶ Lejátszás'))}</button><small>${esc(t('Válassz egy eseményt, majd hallgasd meg a hozzá tartozó hangot.'))}</small></div>`;
    $('[name=event]',panel).selectedIndex=0;
    $('[data-play]',panel).onclick=()=>{
     const chosen=$('[name=event]',panel).value;
     if($('[name=scheme]',panel).value==='none'){XP.dialog(t('Hangok'),t('A „Nincs hang” séma van kiválasztva, ezért a Windows nem játszik le hangot.'));return;}
     XP.sound(chosen);
    };
   }
   if(tab==='audio'){
    panel.innerHTML=`<div class="settings-block"><b>${esc(t('Hanglejátszás'))}</b><p>${esc(t('Alapértelmezett eszköz:'))}<br>${esc(t('Windows-hangeszköz'))}</p></div><div class="settings-block"><b>${esc(t('Hangfelvétel'))}</b><p>${esc(t('Alapértelmezett eszköz:'))}<br>${esc(t('Nincs felvevőeszköz'))}</p></div><div class="settings-block"><b>${esc(t('MIDI-zene lejátszása'))}</b><p>${esc(t('Alapértelmezett eszköz:'))}<br>Microsoft GS Wavetable SW Synth</p></div>`;
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
 const w=createWindow({title:t('Vezérlőpult'),icon:'control',app:'control',width:760,height:525,minWidth:470,minHeight:380});
 const note=(title,text)=>()=>XP.dialog(title,text);
 const applets={
  display:{name:t('Megjelenítés'),icon:'control',hint:t('Háttérkép, képernyőkímélő és színséma'),open:()=>XP.open('display')},
  folders:{name:t('Mappabeállítások'),icon:'folder',hint:t('Az elemek megnyitásának módja'),open:note(t('Mappabeállítások'),t('Az elemeket dupla kattintással nyithatod meg, érintőképernyőn egy koppintás is elég.\n\nA saját fájljaidat jobb kattintással átnevezheted, törölheted vagy letöltheted.'))},
  network:{name:t('Hálózati kapcsolatok'),icon:'network',hint:t('A helyi kapcsolat állapota'),open:()=>XP.open('network')},
  internet:{name:t('Internetbeállítások'),icon:'ie',hint:t('Kezdőlap, előzmények és kedvencek'),open:()=>XP.open('ie')},
  programs:{name:t('Programok telepítése és törlése'),icon:'programs',hint:t('A gépre telepített programok'),open:()=>XP.dialog(t('Programok telepítése és törlése'),t('Jelenleg telepített programok:\n\nInternet Explorer 6 — 12,4 MB\nWindows Media Player 9 — 18,7 MB\nOutlook Express 6 — 6,2 MB\nMSN Explorer — 9,1 MB\nWindows XP játékok — 24,3 MB\n3D Pinball – Space Cadet — 9,4 MB\n\nA programok a Windows részei, ezért nem távolíthatók el.'))},
  volume:{name:t('Hangok és audioeszközök'),icon:'volume',hint:t('Rendszerhangok és hangerő'),open:()=>XP.open('sounds')},
  player:{name:t('Hangeszközök'),icon:'player',hint:t('Lejátszás és hangfájlok'),open:()=>XP.open('player')},
  system:{name:t('Rendszer'),icon:'computer',hint:t('Rendszerinformációk és tárhely'),open:()=>XP.open('system')},
  cleanup:{name:t('Lemezkarbantartó'),icon:'disk',hint:t('Hely felszabadítása a lemezen'),open:()=>{const trash=state.files.filter(f=>f.deleted).length;XP.dialog(t('Lemezkarbantartó – C:'),`A Lemezkarbantartó a következő fájlokat távolíthatja el:\n\nIdeiglenes internetfájlok        3,17 MB\nLetöltött programfájlok          0,00 MB\nLomtár                           ${(trash*0.06).toFixed(2)} MB (${trash} elem)\nIdeiglenes fájlok                0,84 MB\n\nÖsszesen felszabadítható: ${(4.01+trash*0.06).toFixed(2)} MB\n\nA Lomtár tartalmát a Lomtár ablakában ürítheted ki.`);}},
  printers:{name:t('Nyomtatók és faxok'),icon:'printers',hint:t('Telepített nyomtatók'),open:()=>XP.open('printers')},
  profile:{name:t('Felhasználói fiókok'),icon:'user',hint:t('A fiók neve, képe és típusa'),open:()=>XP.open('profile')},
  regional:{name:t('Területi és nyelvi beállítások'),icon:'datetime',hint:t('A felület nyelve és a formátumok'),open:()=>XP.open('regional')},
  datetime:{name:t('Dátum és idő'),icon:'datetime',hint:t('Naptár és pontos idő'),open:()=>XP.open('calendar')},
  accessibility:{name:t('Kisegítő lehetőségek'),icon:'accessibility',hint:t('Billentyűzet, hang és megjelenítés'),open:note(t('Kisegítő lehetőségek'),t('A Windows billentyűzetről is végig vezérelhető:\n\nTab – léptetés a vezérlők között\nEnter – a kijelölt elem megnyitása\nAlt+F4 – az aktív ablak bezárása\nCtrl+Esc – a Start menü megnyitása\nAlt+Tab – váltás a futó programok között\nF1 – Súgó és támogatás'))},
  security:{name:t('Biztonsági központ'),icon:'security',hint:t('Tűzfal, frissítések és vírusvédelem'),open:()=>XP.open('security')}
 };
 const categories=[
  {id:'appearance',name:t('Megjelenés és témák'),icon:'control',hint:t('Az asztal háttere, a színséma és a képernyő beállításai'),items:['display','folders']},
  {id:'network',name:t('Hálózati és internetkapcsolatok'),icon:'network',hint:t('A kapcsolat állapota és a böngésző beállításai'),items:['network','internet']},
  {id:'programs',name:t('Programok telepítése és törlése'),icon:'programs',hint:t('A gépre telepített programok listája'),items:['programs']},
  {id:'sound',name:t('Hangok, beszéd és audioeszközök'),icon:'volume',hint:t('Rendszerhangok, hangerő és lejátszás'),items:['volume','player']},
  {id:'performance',name:t('Teljesítmény és karbantartás'),icon:'computer',hint:t('Rendszeradatok és a lemez karbantartása'),items:['system','cleanup']},
  {id:'hardware',name:t('Nyomtatók és egyéb hardver'),icon:'printers',hint:t('Nyomtatók, faxok és eszközök'),items:['printers']},
  {id:'accounts',name:t('Felhasználói fiókok'),icon:'user',hint:t('A felhasználóneved és a profilod'),items:['profile']},
  {id:'datetime',name:t('Dátum, idő, nyelv és területi beállítások'),icon:'datetime',hint:t('Naptár, pontos idő és a nyelvi beállítások'),items:['datetime','regional']},
  {id:'access',name:t('Kisegítő lehetőségek'),icon:'accessibility',hint:t('Billentyűzetes használat és láthatóság'),items:['accessibility']},
  {id:'security',name:t('Biztonsági központ'),icon:'security',hint:t('Tűzfal, automatikus frissítések és vírusvédelem'),items:['security']}
 ];
 let classic=!!state.controlClassic,category='';
 menubar(w,{
  [t('Fájl')]:[{label:t('Bezárás'),action:()=>w.close()}],
  [t('Nézet')]:()=>[{label:t('Kategórianézet'),checked:!classic,action:()=>setView(false)},{label:t('Klasszikus nézet'),checked:classic,action:()=>setView(true)}],
  [t('Súgó')]:[{label:t('Súgó és támogatás'),action:()=>XP.open('help')}]
 },true);
 const toolbar=document.createElement('div');toolbar.className='toolbar';
 toolbar.innerHTML=`<button data-action="back">${icon('back')}<span>Vissza</span></button><button data-action="up" title="Egy szinttel feljebb">${icon('up')}</button><span class="toolbar-separator"></span><button data-action="search">${icon('search')}<span class="toolbar-label">${esc(t('Keresés'))}</span></button><button data-action="view">${icon('documents')}<span class="toolbar-label">${esc(t('Nézet'))}</span></button>`;
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
  w.setTitle(here?here.name:t('Vezérlőpult'));
  $('input',addr).value=here?t('Vezérlőpult\\')+here.name:t('Vezérlőpult');
  $('[data-action=back]',toolbar).disabled=!here;
  $('[data-action=up]',toolbar).disabled=!here;
  sidebar.innerHTML=`<section class="explorer-panel"><h3>${esc(t('Vezérlőpult'))}</h3><div><button data-view="${classic?'category':'classic'}">${icon('control')} Váltás ${classic?t('kategórianézetre'):t('klasszikus nézetre')}</button>${here?`<button data-view="home">${icon('back')} Vissza a kategóriákhoz</button>`:''}</div></section><section class="explorer-panel"><h3>${esc(t('Lásd még'))}</h3><div><button data-side="update">${icon('refresh')} Windows Update</button><button data-side="help">${icon('help')} Súgó és támogatás</button><button data-side="explorer">${icon('computer')} Sajátgép</button></div></section>`;
  if(here){
   files.className='explorer-files control-files';
   files.innerHTML=`<h1 class="control-title">${esc(here.name)}</h1><p class="control-lead">${esc(here.hint)}</p><h2 class="control-sub">${esc(t('Válasszon egy Vezérlőpult-ikont'))}</h2><div class="file-grid">${here.items.map(id=>`<button class="file-item" data-applet="${id}">${icon(applets[id].icon)}<span>${esc(applets[id].name)}</span></button>`).join('')}</div>`;
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
  files.innerHTML=`<h1 class="control-title">${esc(t('Válasszon kategóriát'))}</h1><div class="control-categories">${categories.map(c=>`<button class="control-category" data-category="${c.id}">${icon(c.icon)}<span><strong>${esc(c.name)}</strong>${esc(c.hint)}</span></button>`).join('')}</div>`;
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
  if(side==='update')XP.dialog('Windows Update',t('A gép nem csatlakozik hálózathoz, ezért nincs mit letölteni. Minden szükséges fájl helyben van.'));
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
 const w=createWindow({title:t('Felhasználói fiókok'),icon:'user',app:'accounts',width:640,height:520,minWidth:430,minHeight:370});
 const labels={chess:t('Sakk'),guitar:t('Gitár'),ball:t('Focilabda'),butterfly:t('Pillangó'),fish:t('Hal'),frog:t('Béka'),dog:t('Kutya'),cat:t('Cica'),duck:t('Kacsa'),horses:t('Lovak'),car:t('Autó'),airplane:t('Repülő'),astronaut:t('Űrhajós'),beach:t('Tengerpart'),'palm-tree':t('Pálmafa'),'red-flower':t('Piros virág'),'pink-flower':t('Rózsaszín virág'),snowflake:t('Hópehely'),skater:t('Gördeszkás'),kick:t('Rúgás'),'dirt-bike':t('Motocross'),giraffe:t('Zsiráf'),drip:t('Vízcsepp'),africa:t('Afrika'),'lift-off':t('Rakétaindítás')};
 const pictures=XP.avatars.map(key=>[key,labels[key]||key]);
 const typeName=type=>type==='guest'?t('Vendég fiók'):type==='limited'?t('Korlátozott fiók'):t('Számítógép rendszergazdája');
 const accountType=()=>typeName(state.accountType);
 const guest=()=>XP.accountInfo('guest');
 const asGuest=()=>XP.session==='guest';
 let view='home',trail=[],draftName=state.user,draftPicture=state.avatar,draftType=state.accountType||'admin';
 // XP kept a way back: a green Back arrow above the page, with Home and Help beside it.
 const go=next=>{if(next!==view){trail.push(view);view=next;}render();};
 const back=()=>{view=trail.pop()||'home';render();};
 const home=()=>{trail=[];view='home';render();};
 const body=document.createElement('div');body.className='accounts-body';w.body.append(body);
 const tile=(info,go,note)=>`<button class="account-tile ${info.enabled?'':'off'}" data-go="${go}">${XP.avatar(info.avatar)}<span><b>${esc(info.name)}</b>${note||typeName(info.type)}</span></button>`;
 const ownTile=()=>tile({...XP.accountInfo(XP.session),type:state.accountType},'pick');
 const guestTile=()=>tile(guest(),'guest',guest().enabled?null:t('A Vendég fiók ki van kapcsolva'));
 function save(){state.user=draftName;state.avatar=draftPicture;state.accountType=draftType;persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
 function render(){
  // A guest may only change their own picture; everything else belongs to the administrator.
  const ownTasks=`<li><button data-go="name">${esc(t('A fiók nevének megváltoztatása'))}</button></li><li><button data-go="picture">${esc(t('A kép megváltoztatása'))}</button></li><li><button data-go="type">${esc(t('A fiók típusának megváltoztatása'))}</button></li>`;
  const ownBlock=asGuest()
   ?`<h1>${esc(t('A Vendég fiók'))}</h1><p>${esc(t('A Vendég fiókkal a saját asztalodon dolgozhatsz. A fiók nevét, képét és beállításait a számítógép rendszergazdája kezeli.'))}</p>`
   :`<h1>${esc(t('Válasszon egy feladatot:'))}</h1><ul class="account-tasks">${ownTasks}</ul><h2>${esc(t('vagy válasszon egy fiókot a módosításhoz'))}</h2>`;
  const pages={
   home:`${ownBlock}<div class="account-list">${ownTile()}${asGuest()?'':guestTile()}</div>`,
   pick:asGuest()?`${ownBlock}<div class="account-list">${ownTile()}</div>`:`<h1>Mit szeretne módosítani a(z) ${esc(state.user)} fiókján?</h1><ul class="account-tasks">${ownTasks}</ul><div class="account-list">${ownTile()}</div>`,
   guest:guest().enabled
    ?`<h1>${esc(t('Mit szeretne módosítani a Vendég fiókon?'))}</h1><p>${esc(t('A Vendég a saját asztalán dolgozhat, de nem telepíthet programokat, és nem módosíthatja a rendszerbeállításokat. A képe a Windows állandó Vendég-képe.'))}</p><ul class="account-tasks"><li><button data-guest="off">${esc(t('A Vendég fiók kikapcsolása'))}</button></li></ul><div class="account-list">${guestTile()}</div>`
    :`<h1>${esc(t('Szeretné bekapcsolni a Vendég fiókot?'))}</h1><p>${esc(t('A Vendég fiókkal azok is használhatják a számítógépet, akiknek nincs saját fiókjuk a gépen. A Vendég nem telepíthet programokat, és nem módosíthatja a rendszerbeállításokat.'))}</p><p>${esc(t('Bekapcsolás után a Vendég megjelenik a bejelentkezési képernyőn, és a saját asztalán dolgozhat.'))}</p><div class="account-buttons"><button class="xp-button primary" data-guest="on">${esc(t('A Vendég fiók bekapcsolása'))}</button><button class="xp-button" data-go="back">${esc(t('Mégse'))}</button></div>`,
   name:`<h1>Adjon új nevet a(z) ${esc(state.user)} fióknak</h1><p>${esc(t('A név a bejelentkezési képernyőn és a Start menü tetején jelenik meg.'))}</p><label class="settings-field"><input type="text" name="account-name" maxlength="32" value="${esc(draftName)}"></label><div class="account-buttons"><button class="xp-button primary" data-save="name">${esc(t('Név megváltoztatása'))}</button><button class="xp-button" data-go="back">${esc(t('Mégse'))}</button></div>`,
   picture:`<h1>Válasszon új képet a(z) ${esc(state.user)} fiókhoz</h1><p>${esc(t('A kép a bejelentkezési képernyőn és a Start menüben jelenik meg.'))}</p><div class="picture-grid">${pictures.map(([key,label])=>`<button class="picture-choice ${key===draftPicture?'selected':''}" data-picture="${key}" title="${esc(label)}" aria-label="${esc(label)}">${XP.avatar(key)}</button>`).join('')}</div><div class="account-buttons"><button class="xp-button primary" data-save="picture">${esc(t('Kép megváltoztatása'))}</button><button class="xp-button" data-go="back">${esc(t('Mégse'))}</button></div>`,
   type:`<h1>Válassza ki az új fióktípust a(z) ${esc(state.user)} fiókhoz</h1><label class="settings-field"><input type="radio" name="account-type" value="admin" ${draftType==='admin'?'checked':''}> <b>${esc(t('Számítógép rendszergazdája'))}</b><br><small>${esc(t('Programokat telepíthet, minden fájlt elérhet és módosíthatja a rendszerbeállításokat.'))}</small></label><label class="settings-field"><input type="radio" name="account-type" value="limited" ${draftType==='limited'?'checked':''}> <b>${esc(t('Korlátozott'))}</b><br><small>${esc(t('Módosíthatja a saját jelszavát és képét, de nem telepíthet programokat.'))}</small></label><div class="account-buttons"><button class="xp-button primary" data-save="type">${esc(t('Fióktípus megváltoztatása'))}</button><button class="xp-button" data-go="back">${esc(t('Mégse'))}</button></div>`
  };
  body.innerHTML=`<header class="accounts-head">${icon('user')}<div><h1>${esc(t('Felhasználói fiókok'))}</h1><p>${esc(state.user)} – ${accountType()}</p></div></header><nav class="accounts-nav"><button class="nav-back" data-nav="back" ${trail.length?'':'disabled'}>${icon('back')}<span>Vissza</span></button><span class="nav-gap"></span><button data-nav="home" title="Kezdőlap" aria-label="Kezdőlap">${icon('home')}</button><button data-nav="help" title="Súgó" aria-label="Súgó">${icon('help')}</button></nav><div class="accounts-main"><aside class="accounts-side"><h2>${esc(t('Kapcsolódó témakörök'))}</h2><ul><li><button data-side="control">${esc(t('Vezérlőpult'))}</button></li><li><button data-side="logoff">${esc(t('Kijelentkezés'))}</button></li><li><button data-side="help">${esc(t('Súgó és támogatás'))}</button></li></ul></aside><section class="accounts-page">${pages[view]||pages.home}</section></div>`;
  const input=$('[name=account-name]',body);if(input)setTimeout(()=>{input.focus();input.select();},0);
 }
 body.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  const nav=button.dataset.nav;
  if(nav==='back'){back();return;}
  if(nav==='home'){home();return;}
  if(nav==='help'){XP.open('help');return;}
  if(button.dataset.go==='back'){back();return;}
  if(button.dataset.go){
   if(button.dataset.go==='picture')draftPicture=state.avatar;
   go(button.dataset.go);return;
  }
  if(button.dataset.guest){
   const on=button.dataset.guest==='on';
   if(!XP.setGuest(on)){XP.sound('error');XP.dialog(t('Felhasználói fiókok'),t('A Vendég fiókot csak a rendszergazda kapcsolhatja ki.'),{icon:'error'});return;}
   notify(t('Felhasználói fiókok'),on?t('A Vendég fiók bekapcsolva. A bejelentkezési képernyőn már választható.'):t('A Vendég fiók kikapcsolva.'));
   if(on)go('guest');else home();return;
  }
  if(button.dataset.picture){draftPicture=button.dataset.picture;render();return;}
  const action=button.dataset.save;
  if(action==='name'){
   const next=XP.fileName($('[name=account-name]',body).value).slice(0,32).trim();
   if(!next){XP.sound('error');XP.dialog(t('Felhasználói fiókok'),t('Adj meg egy nevet a fiókhoz.'),{icon:'error'});return;}
   draftName=next;save();home();notify(t('Felhasználói fiókok'),`A fiók új neve: ${next}`);return;
  }
  if(action==='picture'){save();home();return;}
  if(action==='type'){draftType=$('[name=account-type]:checked',body)?.value||'admin';save();home();return;}
  const side=button.dataset.side;
  if(side==='control')XP.open('control');
  if(side==='help')XP.open('help');
  if(side==='logoff')XP.open('logoff');
 };
 render();
 status(w,t('Felhasználói fiókok'));
 return w;
}
register('volume',()=>{
 if(XP.singleton('volume'))return;
 // Hangerő-szabályozó: the master alongside the channels a 2001 sound card offered.
 const channels=[['master',t('Hangerő-szabályozó'),t('Összes némítása')],['wave',t('Hullám'),t('Némítás')],['synth','SW Synth',t('Némítás')],['cd',t('CD-lejátszó'),t('Némítás')]];
 const mixer={wave:82,synth:74,cd:70,muted:[],balance:{},...(state.mixer||{})};
 const level=key=>key==='master'?state.volume:mixer[key];
 const muted=key=>key==='master'?!state.sounds:mixer.muted.includes(key);
 const w=createWindow({title:t('Hangerő-szabályozó'),icon:'volume',app:'volume',width:462,height:326,fixed:true});
 XP.menubar(w,{
  [t('Beállítások')]:[{label:t('Tulajdonságok…'),action:()=>XP.open('sounds')},{label:t('Speciális vezérlők'),disabled:true},null,{label:t('Kilépés'),action:()=>w.close()}],
  [t('Súgó')]:[{label:t('A Hangerő-szabályozó névjegye'),action:()=>XP.dialog(t('Hangerő-szabályozó'),t('Hangerő-szabályozó\n\nA hangeszköz csatornáinak hangereje és balansza.\n\nEgy kattintás a tálca hangszóróján a kis csúszkát nyitja, kettő ezt az ablakot.'))}]
 });
 const body=document.createElement('div');body.className='mixer';w.body.append(body);
 body.innerHTML=channels.map(([key,label,muteLabel])=>`<section class="mixer-channel" data-channel="${key}">
   <h3>${esc(label)}</h3>
   <p class="mixer-label">Balansz:</p>
   <div class="mixer-balance">${icon('volume')}<input type="range" min="-10" max="10" step="1" value="${mixer.balance[key]||0}" data-balance="${key}" aria-label="${esc(label)} balansz">${icon('volume')}</div>
   <p class="mixer-label">${esc(t('Hangerő:'))}</p>
   <div class="mixer-slider"><input type="range" min="0" max="100" step="1" value="${level(key)}" data-level="${key}" orient="vertical" aria-label="${esc(label)} hangerő"></div>
   <label class="mixer-mute"><input type="checkbox" data-mute="${key}" ${muted(key)?'checked':''}> ${esc(muteLabel)}</label>
  </section>`).join('');
 const store=()=>{state.mixer={wave:mixer.wave,synth:mixer.synth,cd:mixer.cd,muted:mixer.muted,balance:mixer.balance};persist();};
 const broadcast=()=>{store();document.dispatchEvent(new CustomEvent('xp-volume-changed'));document.dispatchEvent(new CustomEvent('xp-settings-changed'));};
 body.oninput=e=>{
  const target=e.target;
  if(target.dataset.level){
   const key=target.dataset.level,value=Number(target.value);
   if(key==='master')state.volume=value;else mixer[key]=value;
   broadcast();
  }
  if(target.dataset.balance){mixer.balance[target.dataset.balance]=Number(target.value);store();}
 };
 body.onchange=e=>{
  const key=e.target.dataset.mute;if(!key)return;
  if(key==='master')state.sounds=!e.target.checked;
  else mixer.muted=e.target.checked?[...new Set([...mixer.muted,key])]:mixer.muted.filter(name=>name!==key);
  broadcast();
 };
 // The tray slider and this window are two views of the same knob.
 const follow=()=>{
  $('[data-level=master]',body).value=state.volume;
  $('[data-mute=master]',body).checked=!state.sounds;
 };
 document.addEventListener('xp-volume-changed',follow);
 w.cleanup.push(()=>document.removeEventListener('xp-volume-changed',follow));
 XP.status(w,t('Hangeszköz: Realtek AC97 Audio'),t('Sztereó'));
 return w;
});
register('calendar',()=>{
 if(XP.singleton('calendar'))return;const w=createWindow({title:t('Dátum és idő'),icon:'datetime',app:'calendar',width:330,height:365,fixed:true});const body=document.createElement('div');body.className='calendar';w.body.append(body);const now=new Date();let year=now.getFullYear(),month=now.getMonth();function render(){const first=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();body.innerHTML=`<div class="calendar-heading"><button class="xp-button" data-month="-1" style="min-width:26px">‹</button> <span>${new Date(year,month).toLocaleDateString('hu-HU',{year:'numeric',month:'long'})}</span> <button class="xp-button" data-month="1" style="min-width:26px">›</button></div><div class="calendar-grid">${['H','K',t('Sze'),t('Cs'),'P',t('Szo'),'V'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>`<span class="${i+1===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()?'today':''}">${i+1}</span>`).join('')}</div><div class="calendar-time"></div><small>${esc(t('A számítógép helyi ideje'))}</small>`;tick();}function tick(){const el=$('.calendar-time',body);if(el)el.textContent=new Date().toLocaleTimeString('hu-HU');}body.onclick=e=>{const b=e.target.closest('[data-month]');if(b){month+=Number(b.dataset.month);if(month<0){month=11;year--;}if(month>11){month=0;year++;}render();}};const timer=setInterval(tick,1000);w.cleanup.push(()=>clearInterval(timer));render();return w;
});
register('network',()=>{
 if(XP.singleton('network'))return;const w=createWindow({title:t('Hálózati kapcsolatok'),icon:'network',app:'network',width:530,height:330});w.body.innerHTML=`<div class="network-body"><h2 style="font-size:16px;color:#214f98">Helyi kapcsolat</h2><div class="network-connection">${icon('network')}<div><b>Csatlakoztatva a helyi webhez</b><br>${esc(t('Sebesség: 100,0 Mbps'))}<br>${esc(t('Állapot: csatlakoztatva'))}</div></div><p>${esc(t('A kapcsolat a helyi hálózaton él. Az Internet Explorer a számítógépen tárolt oldalakat nyitja meg.'))}</p><button class="xp-button" data-open="ie">${esc(t('Böngésző megnyitása'))}</button></div>`;return w;
});
register('image',(id,source,title)=>{
 const file=state.files.find(f=>f.id===id&&!f.deleted);if(!file&&!source)return;const src=file?.content||source,name=file?.name||title||t('Kép');const w=createWindow({title:`${name} – Windows kép- és faxmegjelenítő`,icon:'pictures',app:'image',width:730,height:510});menubar(w,{[t('Fájl')]:[{label:t('Letöltés'),action:()=>{const a=document.createElement('a');a.href=src;a.download=XP.fileName(name)+(name.includes('.')?'':'.'+(src.endsWith('.bmp')?'bmp':'jpg'));a.click();}},{label:t('Szerkesztés a Paintben'),disabled:!file,action:()=>XP.open('paint',id)},{label:t('Bezárás'),action:()=>w.close()}],[t('Nézet')]:[{label:t('Teljes méret'),action:()=>XP.maximize(w)}]});const body=document.createElement('div');body.className='image-viewer';const img=document.createElement('img');img.src=src;img.alt=name;body.append(img);w.body.append(body);status(w,name);return w;
});
register('search',()=>{
 const w=createWindow({title:t('Keresés'),icon:'search',app:'search',width:600,height:395});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('search')}<div><h1>Mit keresel?</h1><p>${esc(t('Keress a saját dokumentumaid között.'))}</p></div></div><form style="display:flex;gap:8px;margin:18px 0"><input type="text" name="q" aria-label="Fájlkeresés" placeholder="Fájlnév vagy szövegrészlet" style="flex:1"><button class="xp-button">${esc(t('Keresés'))}</button></form><div class="file-search-results"></div>`;w.body.append(body);$('form',body).onsubmit=e=>{e.preventDefault();const q=$('input',body).value.toLocaleLowerCase('hu-HU');const found=state.files.filter(f=>!f.deleted&&(f.name.toLocaleLowerCase('hu-HU').includes(q)||(f.type==='text'&&f.content.toLocaleLowerCase('hu-HU').includes(q))));$('.file-search-results',body).innerHTML=`<p>${found.length} találat</p>${found.map(f=>`<button class="start-item" data-found="${esc(f.id)}">${icon(XP.fileIcon(f))}${esc(f.name)}</button>`).join('')}`;};body.onclick=e=>{const b=e.target.closest('[data-found]');if(b)XP.openFile(b.dataset.found);};setTimeout(()=>$('input',body).focus(),0);return w;
});
register('run',async()=>{
 const result=await XP.prompt('Futtatás',t('Írd be egy program vagy mappa nevét, és a Windows megnyitja azt.'),'');if(!result)return;const value=result.trim().toLowerCase().replace(/\.exe$/,'');const map={notepad:'notepad',jegyzettömb:'notepad',mspaint:'paint',paint:'paint',calc:'calculator',cmd:'cmd',iexplore:'ie',msimn:'outlook',outlook:'outlook',taskmgr:'taskmgr',compmgmt:'compmgmt','compmgmt.msc':'compmgmt',explorer:'explorer',control:'control',winmine:'mines',minesweeper:'mines',sol:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',pókpasziánsz:'spider',mshearts:'hearts',hearts:'hearts',wmplayer:'player',wscui:'security','wscui.cpl':'security',sysdm:'system',desk:'display',mmsys:'sounds',nusrmgr:'profile',winver:'system'};if(map[value])XP.open(map[value]);else if(value.includes('.')||value.includes('://'))XP.open('ie',result);else{const f=state.files.find(f=>!f.deleted&&f.name.toLowerCase()===value);if(f)XP.openFile(f.id);else{XP.sound('error');XP.dialog(t('Futtatás'),`A Windows nem találja ezt: „${result}”.\nPróbáld például: notepad, mspaint, calc, cmd, winmine vagy iexplore.`,{icon:'error'});}}
});
register('security',()=>{
 if(XP.singleton('security'))return;
 const w=createWindow({title:t('Windows Biztonsági központ'),icon:'security',app:'security',width:660,height:545,minWidth:430,minHeight:360});
 if(!state.security||typeof state.security!=='object')state.security={firewall:true,updates:true};// a save from before the Security Centre has no switches yet
 let opened='';
 const parts=()=>[
  {id:'firewall',name:t('Tűzfal'),on:!!state.security.firewall,
   good:t('A Windows tűzfal be van kapcsolva, és figyeli a beérkező kapcsolatokat. Csak akkor kapcsold ki, ha másik tűzfalat használsz.'),
   bad:t('A Windows tűzfal ki van kapcsolva. Bekapcsolása segít megvédeni a számítógépet a hálózat felől érkező kéretlen kapcsolatoktól.')},
  {id:'updates',name:t('Automatikus frissítések'),on:!!state.security.updates,
   good:t('A Windows rendszeresen letölti és telepíti a fontos frissítéseket. Ez a legegyszerűbb módja annak, hogy a gép naprakész maradjon.'),
   bad:t('Az automatikus frissítések ki vannak kapcsolva, így a fontos javítások nem települnek maguktól.')},
  {id:'virus',name:t('Vírusvédelem'),on:null,
   bad:t('A Windows nem talált vírusvédelmi programot ezen a számítógépen, vagy a program állapotát nem tudja figyelni.\n\nA Microsoft azt javasolja, hogy telepíts vírusvédelmi programot, és tartsd naprakészen.')}
 ];
 const label=part=>part.on===null?t('NEM TALÁLHATÓ'):part.on?'BEKAPCSOLVA':'KIKAPCSOLVA';
 const body=document.createElement('div');body.className='security-body';w.body.append(body);
 function render(){
  const list=parts(),warn=list.filter(p=>p.on!==true);
  body.innerHTML=`<div class="security-head">${icon('security')}<div><h1>${esc(t('Windows Biztonsági központ'))}</h1><p>${esc(t('Segítünk a számítógép védelmében'))}</p></div></div><div class="security-main"><aside class="security-side"><h2>${esc(t('Erőforrások'))}</h2><ul><li><button data-link="update">${esc(t('A legfrissebb javítások keresése a Windows Update-tel'))}</button></li><li><button data-link="ie">${esc(t('Internet-beállítások módosítása'))}</button></li><li><button data-link="help">${esc(t('Súgó a biztonsági kérdésekhez'))}</button></li><li><button data-link="about">${esc(t('A Biztonsági központról'))}</button></li></ul></aside><section class="security-panels"><div class="security-note ${warn.length?'warn':'ok'}">${warn.length?`A számítógép védelme figyelmet igényel: ${warn.map(p=>p.name.toLowerCase()).join(', ')}. A részletekért nyisd le az alábbi sorokat.`:t('A biztonsági alapelemek be vannak kapcsolva. A Biztonsági központ szól, ha ez megváltozik.')}</div><h2>${esc(t('Biztonsági alapelemek'))}</h2>${list.map(part=>`<div class="security-item"><button class="security-row" data-panel="${part.id}" aria-expanded="${opened===part.id}"><span class="security-name">${part.name}</span><span class="security-state ${part.on===null?'missing':part.on?'on':'off'}">${label(part)}</span><i class="security-chevron"></i></button><div class="security-detail" ${opened===part.id?'':'hidden'}><p>${part.on?part.good:part.bad}</p>${part.on===null?'':`<button class="xp-button" data-toggle="${part.id}">${part.on?t('Kikapcsolás'):t('Bekapcsolás')}</button>`}</div></div>`).join('')}<div class="security-manage"><span>${esc(t('Biztonsági beállítások kezelése:'))}</span><div>${[['ie',t('Internet-beállítások'),'ie'],['refresh',t('Automatikus frissítések'),'updates'],['security',t('Windows tűzfal'),'firewall']].map(([ic,title,target])=>`<button data-manage="${target}">${icon(ic)}<span>${title}</span></button>`).join('')}</div></div></section></div>`;
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
  if(link==='update')XP.dialog('Windows Update',t('A számítógép naprakész.\n\nLegutóbbi ellenőrzés: ma\nLegutóbbi telepítés: Windows XP Service Pack 3\n\nNincs telepítésre váró frissítés.'));
  if(link==='about')XP.dialog(t('A Biztonsági központról'),t('A Biztonsági központ egy helyen mutatja a számítógép három legfontosabb védelmi beállítását: a tűzfalat, az automatikus frissítéseket és a vírusvédelmet.\n\nHa valamelyik ki van kapcsolva vagy hiányzik, a Windows figyelmeztet, és a tálcán is megjelenik a pajzs ikon.'));
 };
 render();
 status(w,'Windows XP Service Pack 3');
 return w;
});
register('help',()=>{
 if(XP.singleton('help'))return;const w=createWindow({title:t('Súgó és támogatás'),icon:'help',app:'help',width:720,height:540});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('windows')}<div><h1>${esc(t('Üdv újra a Windows XP-ben!'))}</h1><p>${esc(t('Ismerős hely. Újra felfedezhető lehetőségek.'))}</p></div></div><div class="help-cards">${[['ie',t('Fedezd fel a régi webet'),t('Google, helyi oldalak és működő keresés.'),'ie'],['notepad',t('Írd le az ötleteidet'),t('A jegyzeteid a böngészőben megmaradnak.'),'notepad'],['paint',t('Alkoss valamit'),t('Rajzolj, színezz és mentsd el a képed.'),'paint'],['mines',t('Tarts egy kis szünetet'),t('Egy klasszikus Aknakereső-parti?'),'mines'],['documents',t('A saját fájljaid'),t('Hozz létre mappákat, rendszerezd a dokumentumokat.'),'documents'],['control',t('Legyen a te asztalod'),t('Válassz háttérképet, színsémát és nevet.'),'display']].map(([ic,title,text,app])=>`<button class="help-card" data-open="${app}">${icon(ic)}<span><strong>${title}</strong>${text}</span></button>`).join('')}</div><div class="help-shortcuts"><b>${esc(t('Néhány apró segítség'))}</b><br>${esc(t('Dupla kattintás: megnyitás · Jobb kattintás: helyi menü'))}<br>${esc(t('Ctrl+S: mentés · Ctrl+Esc: Start menü · Alt+F4: ablak bezárása'))}<br>${esc(t('Az ablakok a fejlécnél mozgathatók, a jobb alsó saroknál átméretezhetők.'))}<br>${esc(t('Az asztali ikonokat is áthúzhatod. A Lomtárból visszaállíthatod a fájlokat.'))}</div><p style="font-size:10px;color:#888">${esc(t('A dokumentumaid, a rajzaid és a beállításaid a számítógépen maradnak. A fontos fájlokat a Fájl menüből mentheted ki magadnak.'))}</p>`;w.body.append(body);return w;
});
})();
