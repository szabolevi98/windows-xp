'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify,t,locale}=XP;
const isAdministrator=()=>XP.session==='admin'&&state.accountType==='admin';
const administratorRequired=()=>{XP.sound('error');XP.dialog(t("text_access_denied"),t("text_you_must_be_logged_on_as_a_computer_administrator_to_change_this_setting"),{icon:'error'});};
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
 row.innerHTML=`<button class="xp-button primary" data-sheet="ok">OK</button><button class="xp-button" data-sheet="cancel">${esc(t("text_cancel"))}</button><button class="xp-button" data-sheet="apply">${esc(t("text_apply"))}</button>`;
 w.body.append(row);
 const applyButton=$('[data-sheet=apply]',row);applyButton.disabled=true;
 const changed=()=>applyButton.disabled=false;
 body.addEventListener('input',changed);body.addEventListener('change',changed);
 row.onclick=e=>{const action=e.target.dataset.sheet;if(!action)return;if(action!=='cancel'){read(current,panel);apply();applyButton.disabled=true;}if(action!=='apply')w.close();};
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
 const bytes=value=>value.toLocaleString(locale());
 const gb=value=>`${(value/GB).toFixed(2).replace('.',',')} GB`;
 const percent=capacity?Math.round(used/capacity*100):0;
 const swatch=(colour,label,value)=>`<div class="disk-legend"><i style="background:${colour}"></i><span>${label}</span><b>${bytes(value)} ${esc(t("text_bytes"))}</b><span>${gb(value)}</span></div>`;
 return propertySheet({
  app:'drive',title:t("text_name_properties",{name:dvd?t("text_dvd_drive_d"):t("text_local_disk_c")}),icon:dvd?'cd':'disk',
  width:400,height:470,initial:'general',
  tabs:[['general',t("text_general")],['tools',t("text_tools")],['hardware',t("text_hardware")]],
  read(){},
  draw(tab,panel){
   if(tab==='general'){
    panel.innerHTML=dvd
     ?`<div class="disk-head">${icon('cd')}<input type="text" value="${esc(t("text_dvd_drive"))}" readonly></div><hr>
       <dl class="disk-facts"><dt>${esc(t("text_type_136ea222"))}</dt><dd>${esc(t("text_cd_drive"))}</dd><dt>${esc(t("text_file_system_b68ed519"))}</dt><dd>${esc(t("text_unknown"))}</dd></dl><hr>
       <p class="settings-note">${esc(t("text_there_is_no_disc_in_the_drive_insert_one_and_try_again"))}</p>`
     :`<div class="disk-head">${icon('disk')}<input type="text" value="${esc(t("text_local_disk"))}" readonly></div><hr>
       <dl class="disk-facts"><dt>${esc(t("text_type_136ea222"))}</dt><dd>${esc(t("text_local_disk"))}</dd><dt>${esc(t("text_file_system_b68ed519"))}</dt><dd>NTFS</dd></dl><hr>
       <div class="disk-usage">
        <div class="disk-legends">${swatch('#1b3fa0',t("text_used_space"),used)}${swatch('#c832c8',t("text_free_space_e575fd0d"),free)}</div>
        <div class="disk-pie" style="background:conic-gradient(#1b3fa0 0 ${percent}%,#c832c8 ${percent}% 100%)"></div>
       </div>
       <hr>
       <div class="disk-legend total"><span>${esc(t("text_capacity_ed1fbb1c"))}</span><b>${bytes(capacity)} ${esc(t("text_bytes"))}</b><span>${gb(capacity)}</span></div>
       <p class="disk-drive">${esc(t("text_drive_c"))}</p>
       <div class="button-row" style="padding:6px 0 0"><button class="xp-button" data-cleanup>${esc(t("text_disk_cleanup"))}</button></div>
       <label class="settings-check"><input type="checkbox" checked> ${esc(t("text_allow_indexing_service_to_index_this_disk_for_fast_file_searching"))}</label>`;
    const cleanup=$('[data-cleanup]',panel);
    if(cleanup)cleanup.onclick=()=>XP.dialog(t("text_disk_cleanup"),t("text_disk_cleanup_is_calculating_how_much_space_you_will_be_able_to_free_on_01f28cb9",{trash:(state.files.filter(f=>f.deleted).length*0.4).toFixed(1).replace('.',',')}),{icon:'disk'});
   }
   if(tab==='tools')panel.innerHTML=`<fieldset><legend>${esc(t("text_error_checking"))}</legend><p>${esc(t("text_this_option_checks_the_volume_for_errors"))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t("text_check_now"))}</button></div></fieldset>
     <fieldset><legend>${esc(t("text_defragmentation"))}</legend><p>${esc(t("text_this_option_defragments_the_files_on_the_volume"))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t("text_defragment_now"))}</button></div></fieldset>
     <fieldset><legend>${esc(t("text_backup"))}</legend><p>${esc(t("text_this_option_backs_up_the_files_on_the_volume"))}</p><div class="button-row"><button class="xp-button" disabled>${esc(t("text_backup_now"))}</button></div></fieldset>`;
   if(tab==='hardware')panel.innerHTML=`<p>${esc(t("text_all_disk_drives"))}</p><table class="taskmgr-table"><thead><tr><th>${esc(t("text_name"))}</th><th>${esc(t("text_type"))}</th></tr></thead><tbody>
     <tr><td>${icon('disk')}ST340016A</td><td>${esc(t("text_disk_drives"))}</td></tr>
     <tr><td>${icon('cd')}HL-DT-ST DVD-ROM GDR8162B</td><td>${esc(t("text_dvd_cd_rom_drives"))}</td></tr>
     <tr><td>${icon('disk')}${esc(t("text_floppy_disk_drive"))}</td><td>${esc(t("text_floppy_disk_drives"))}</td></tr></tbody></table>`;
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
 const REGIONS={hu:t("text_hungarian_hungary"),en:'English (United States)',de:'Deutsch (Deutschland)'};
 return propertySheet({
  app:'regional',title:t("text_regional_and_language_options"),icon:'datetime',width:420,height:460,initial:'formats',
  tabs:[['formats',t("text_regional_options")],['languages',t("text_languages")],['advanced',t("text_advanced")]],
  read(tab,panel){const box=$('[name=language]',panel);if(box)draft.language=box.value;},
  draw(tab,panel){
   const samples=SAMPLES[draft.language]||SAMPLES.hu;
   if(tab==='formats')panel.innerHTML=`<fieldset><legend>${esc(t("text_standards_and_formats"))}</legend>
     <p class="settings-note">${esc(t("text_this_option_affects_how_some_programs_format_numbers_currencies_dates_and_time"))}</p>
     <label class="settings-field"><select name="language">${XP.languages.map(item=>`<option value="${item.code}" ${item.code===draft.language?'selected':''}>${esc(REGIONS[item.code]||item.label)}</option>`).join('')}</select></label>
     <dl class="disk-facts"><dt>${esc(t("text_date"))}:</dt><dd>${esc(samples[0])}</dd><dt>${esc(t("text_time"))}:</dt><dd>${esc(samples[1])}</dd><dt>${esc(t("text_currency"))}:</dt><dd>${esc(samples[2])}</dd></dl></fieldset>
     <fieldset><legend>${esc(t("text_location"))}</legend><p class="settings-note">${esc(t("text_services_that_provide_local_news_and_weather_use_this_setting"))}</p></fieldset>`;
   if(tab==='languages')panel.innerHTML=`<fieldset><legend>${esc(t("text_language_for_the_user_interface"))}</legend>
     <p class="settings-note">${esc(t("text_menus_dialog_boxes_and_program_labels_appear_in_this_language"))}</p>
     <label class="settings-field"><select name="language">${XP.languages.map(item=>`<option value="${item.code}" ${item.code===draft.language?'selected':''}>${esc(item.label)}</option>`).join('')}</select></label></fieldset>
     <fieldset><legend>${esc(t("text_text_services_and_input_languages"))}</legend><p class="settings-note">${esc(t("text_the_installed_keyboard_layout_follows_the_interface_language"))}</p></fieldset>`;
   if(tab==='advanced')panel.innerHTML=`<fieldset><legend>${esc(t("text_language_for_non_unicode_programs"))}</legend>
     <p class="settings-note">${esc(t("text_older_programs_use_this_language_to_display_text"))}</p>
     <label class="settings-field"><select disabled><option>${esc(REGIONS[draft.language]||'')}</option></select></label></fieldset>`;
  },
  async apply(){
   if(!XP.setLanguage(draft.language))return;
   // XP is kijelentkezést kért a felület nyelvének cseréjéhez; nálunk az
   // újraindítás teszi ugyanezt, a fájlok és a beállítások megmaradnak.
   const answer=await XP.dialog(t("text_regional_and_language_options"),
    t("text_the_change_takes_full_effect_once_windows_restarts_restart_now"),
    {icon:'info',buttons:[t("text_yes"),t("text_no")]});
   if(answer)location.reload();
  }
 });
});

// --- Egér tulajdonságai (main.cpl) ---------------------------------------
// Az XP itt tartotta a mutatósémákat. Az alapértelmezett a fehér, sötét
// szegélyű mutató; a fekete és a 3D-fehér készlet a Windows saját sémái.
register('mouse',()=>{
 const SCHEMES=[['default','Windows alapértelmezett (rendszerséma)'],
   ['black','Windows Fekete (rendszerséma)'],['3d-white','3D-Fehér (rendszerséma)']];
 const ROLES=[['Normál kijelölés','arrow'],['Szövegkijelölés','beam'],['Precíziós kijelölés','cross'],
   ['Áthelyezés','move'],['Nem elérhető','no'],['Függőleges átméretezés','size-ns'],
   ['Vízszintes átméretezés','size-we'],['Átlós átméretezés 1','size-nwse'],['Átlós átméretezés 2','size-nesw']];
 const saved={speed:6,enhance:true,snap:false,trails:false,hideTyping:true,showLocation:false,wheelLines:3,...(state.mouse||{})};
 const draft={cursors:state.cursors||'default',...saved};
 let sheet=null;
 sheet=propertySheet({
  app:'mouse',title:t("text_mouse_properties"),icon:'mouse',width:440,height:520,initial:'buttons',
  tabs:[['buttons',t("text_buttons")],['pointers',t("text_pointers")],['options',t("text_pointer_options")],['wheel',t("text_wheel")],['hardware',t("text_hardware")]],
  read(tab,panel){const box=$('[name=scheme]',panel);if(box)draft.cursors=box.value;const speed=$('[name=pointer-speed]',panel);if(speed)draft.speed=Number(speed.value);const lines=$('[name=wheel-lines]',panel);if(lines)draft.wheelLines=Number(lines.value);for(const key of ['enhance','snap','trails','hideTyping','showLocation']){const input=$(`[name=${key}]`,panel);if(input)draft[key]=input.checked;}},
  draw(tab,panel){
   if(tab==='pointers'){
    panel.innerHTML=`<fieldset><legend>${esc(t("text_scheme"))}</legend>
      <label class="settings-field"><select name="scheme">${SCHEMES.map(([key,label])=>`<option value="${key}" ${key===draft.cursors?'selected':''}>${esc(t(label))}</option>`).join('')}</select></label>
      <p class="settings-note">${esc(t("text_a_scheme_changes_the_whole_set_of_pointers_at_once"))}</p></fieldset>
      <fieldset><legend>${esc(t("text_customize"))}</legend><ul class="pointer-list">${ROLES.map(([label,file])=>`<li><span>${esc(t(label))}</span><img src="assets/cursors/${draft.cursors}/${file}.cur?v=3" width="32" height="32" alt=""></li>`).join('')}</ul></fieldset>`;
    $('[name=scheme]',panel).onchange=event=>{draft.cursors=event.target.value;sheet?.repaint();};
   }
   if(tab==='buttons'){
    panel.innerHTML=`<fieldset><legend>${esc(t("text_button_configuration"))}</legend><label class="settings-check"><input type="checkbox" disabled> ${esc(t("text_switch_primary_and_secondary_buttons"))}</label><p class="settings-note">${esc(t("text_primary_button_follows_the_computer_setting"))}</p></fieldset><fieldset><legend>${esc(t("text_double_click_speed"))}</legend><div class="mouse-speed"><span>${esc(t("text_slow"))}</span><input type="range" min="1" max="10" value="5"><span>${esc(t("text_fast"))}</span><button class="mouse-test-folder" title="${esc(t("text_double_click_to_test"))}">${icon('folder')}</button></div><p class="settings-note">${esc(t("text_double_click_the_folder_to_test_your_setting"))}</p></fieldset>`;
    let last=0;$('.mouse-test-folder',panel).onclick=()=>{const now=Date.now();if(now-last<500){$('.mouse-test-folder',panel).classList.toggle('open');last=0;}else last=now;};
   }
   if(tab==='options')panel.innerHTML=`<fieldset><legend>${esc(t("text_motion"))}</legend><label class="settings-field"><span>${esc(t("text_select_a_pointer_speed"))}</span><input type="range" name="pointer-speed" min="1" max="11" value="${draft.speed}"></label><label class="settings-check"><input type="checkbox" name="enhance" ${draft.enhance?'checked':''}> ${esc(t("text_enhance_pointer_precision"))}</label></fieldset><fieldset><legend>${esc(t("text_snap_to"))}</legend><label class="settings-check"><input type="checkbox" name="snap" ${draft.snap?'checked':''}> ${esc(t("text_automatically_move_pointer_to_default_button"))}</label></fieldset><fieldset><legend>${esc(t("text_visibility"))}</legend><label class="settings-check"><input type="checkbox" name="trails" ${draft.trails?'checked':''}> ${esc(t("text_display_pointer_trails"))}</label><label class="settings-check"><input type="checkbox" name="hideTyping" ${draft.hideTyping?'checked':''}> ${esc(t("text_hide_pointer_while_typing"))}</label><label class="settings-check"><input type="checkbox" name="showLocation" ${draft.showLocation?'checked':''}> ${esc(t("text_show_location_when_pressing_ctrl"))}</label></fieldset>`;
   if(tab==='wheel')panel.innerHTML=`<fieldset><legend>${esc(t("text_scrolling"))}</legend><p>${esc(t("text_roll_wheel_one_notch_to_scroll"))}</p><label class="settings-check"><input type="radio" checked> ${esc(t("text_following_number_of_lines"))} <input type="number" name="wheel-lines" min="1" max="100" value="${draft.wheelLines}"></label><label class="settings-check"><input type="radio" disabled> ${esc(t("text_one_screen_at_a_time"))}</label></fieldset>`;
   if(tab==='hardware')panel.innerHTML=`<div class="mouse-hardware"><table><thead><tr><th>${esc(t("text_name"))}</th><th>${esc(t("text_type"))}</th></tr></thead><tbody><tr><td>HID-compliant mouse</td><td>${esc(t("text_mice_and_other_pointing_devices"))}</td></tr></tbody></table><dl class="disk-facts"><dt>${esc(t("text_manufacturer"))}</dt><dd>Microsoft</dd><dt>${esc(t("text_location"))}</dt><dd>${esc(t("text_usb_input_device"))}</dd><dt>${esc(t("text_device_status"))}</dt><dd>${esc(t("text_this_device_is_working_properly"))}</dd></dl><button class="xp-button" data-device>${esc(t("text_properties_eb1f1ae9"))}</button></div>`;
  },
  apply(){state.cursors=draft.cursors;state.mouse={speed:draft.speed,enhance:draft.enhance,snap:draft.snap,trails:draft.trails,hideTyping:draft.hideTyping,showLocation:draft.showLocation,wheelLines:draft.wheelLines};persist();XP.applySettings();}
 });
 return sheet;
});

register('printers',()=>{
 if(XP.singleton('printers'))return;
 const w=createWindow({title:t("text_printers_and_faxes"),icon:'printers',app:'printers',width:680,height:430,minWidth:470,minHeight:320});let selected=null;
 if(!Array.isArray(state.printers))state.printers=[];
 menubar(w,{[t("text_file")]:()=>[{label:t("text_add_printer"),action:wizard},null,{label:t("text_delete"),disabled:!selected,action:remove},{label:t("text_set_as_default_printer"),disabled:!selected,action:setDefault},null,{label:t("text_close"),action:()=>w.close()}],[t("text_view")]:[{label:t("text_refresh"),action:render}],[t("text_help")]:[{label:t("text_help_and_support"),action:()=>XP.open('help')}]},true);
 const toolbar=document.createElement('div');toolbar.className='toolbar';toolbar.innerHTML=`<button data-printer-action="add">${icon('printers')}<span>${esc(t("text_add_printer"))}</span></button><button data-printer-action="delete" disabled>${icon('recycle')}<span>${esc(t("text_delete"))}</span></button>`;w.body.append(toolbar);
 const content=document.createElement('div');content.className='printers-layout';content.innerHTML='<aside class="explorer-sidebar"></aside><main class="printers-list"></main>';w.body.append(content);const side=$('aside',content),list=$('main',content),bar=status(w,'');
 function render(){
  side.innerHTML=`<section class="explorer-panel"><h3>${esc(t("text_printer_tasks"))}</h3><div><button data-printer-action="add">${icon('printers')} ${esc(t("text_add_a_printer"))}</button>${selected?`<button data-printer-action="default">${icon('printers')} ${esc(t("text_set_as_default_printer"))}</button><button data-printer-action="delete">${icon('recycle')} ${esc(t("text_delete_this_printer"))}</button>`:''}</div></section><section class="explorer-panel"><h3>${esc(t("text_see_also"))}</h3><div><button data-printer-action="control">${icon('control')} ${esc(t("text_control_panel"))}</button></div></section>`;
  list.innerHTML=`<div class="details-header"><button>${esc(t("text_name"))}</button><button>${esc(t("text_status"))}</button><button>${esc(t("text_type"))}</button></div><div class="printer-items"><button class="printer-item add" data-printer-action="add">${icon('printers')}<span><b>${esc(t("text_add_printer"))}</b><small>${esc(t("text_starts_the_add_printer_wizard"))}</small></span></button>${state.printers.map(printer=>`<button class="printer-item ${selected===printer.id?'selected':''}" data-printer="${esc(printer.id)}">${icon('printers')}<span><b>${esc(printer.name)}${printer.default?' ✓':''}</b><small>${esc(t("text_ready"))} · ${esc(printer.port)}</small></span></button>`).join('')}</div>`;
  $('[data-printer-action=delete]',toolbar).disabled=!selected;$('span',bar).textContent=t("text_count_objects",{count:state.printers.length});
 }
 function wizard(){
  const wizardWindow=createWindow({title:t("text_add_printer_wizard"),icon:'printers',app:'printer-wizard',width:520,height:390,fixed:true});let step=0,draft={local:true,name:'Microsoft XPS Document Writer',port:'LPT1:'};const area=document.createElement('div');area.className='printer-wizard';wizardWindow.body.append(area);
  function draw(){
   const pages=[`<h1>${esc(t("text_welcome_to_add_printer_wizard"))}</h1><p>${esc(t("text_wizard_helps_install_printer"))}</p><p>${esc(t("text_click_next_to_continue"))}</p>`,`<h1>${esc(t("text_local_or_network_printer"))}</h1><label><input type="radio" name="kind" value="local" ${draft.local?'checked':''}> ${esc(t("text_local_printer_attached_to_this_computer"))}</label><label><input type="radio" name="kind" value="network" ${draft.local?'':'checked'}> ${esc(t("text_network_printer"))}</label><p class="settings-note">${esc(t("text_network_printers_are_unavailable_offline"))}</p>`,`<h1>${esc(t("text_name_your_printer"))}</h1><label class="settings-field"><span>${esc(t("text_printer_name"))}</span><input name="printer-name" value="${esc(draft.name)}" maxlength="60"></label><label class="settings-field"><span>${esc(t("text_use_the_following_port"))}</span><select name="port"><option>LPT1:</option><option>FILE:</option></select></label>`,`<h1>${esc(t("text_completing_add_printer_wizard"))}</h1><p>${esc(t("text_printer_will_be_installed",{name:draft.name}))}</p><dl class="disk-facts"><dt>${esc(t("text_port"))}</dt><dd>${esc(draft.port)}</dd><dt>${esc(t("text_status"))}</dt><dd>${esc(t("text_ready"))}</dd></dl>`];
   area.innerHTML=`<div class="wizard-page">${pages[step]}</div><div class="wizard-buttons"><button class="xp-button" data-wizard="back" ${step?'':'disabled'}>${esc(t("text_back"))}</button><button class="xp-button primary" data-wizard="next">${esc(step===pages.length-1?t("text_finish"):t("text_next"))}</button><button class="xp-button" data-wizard="cancel">${esc(t("text_cancel"))}</button></div>`;
  }
  area.onclick=e=>{const action=e.target.closest('[data-wizard]')?.dataset.wizard;if(!action)return;const name=$('[name=printer-name]',area),port=$('[name=port]',area),kind=$('[name=kind]:checked',area);if(name)draft.name=XP.fileName(name.value)||draft.name;if(port)draft.port=port.value;if(kind)draft.local=kind.value==='local';if(action==='cancel'){wizardWindow.close();return;}if(action==='back'){step=Math.max(0,step-1);draw();return;}if(step===1&&!draft.local){XP.sound('error');XP.dialog(t("text_add_printer_wizard"),t("text_network_printers_are_unavailable_offline"),{icon:'error'});return;}if(step<3){step++;draw();return;}const id=XP.uniqueId();state.printers.push({id,name:draft.name,port:draft.port,default:!state.printers.length});persist();selected=id;wizardWindow.close();render();};draw();
 }
 function remove(){if(!selected)return;state.printers=state.printers.filter(printer=>printer.id!==selected);if(state.printers.length&&!state.printers.some(printer=>printer.default))state.printers[0].default=true;selected=null;persist();render();}
 function setDefault(){state.printers=state.printers.map(printer=>({...printer,default:printer.id===selected}));persist();render();}
 content.onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.printer){selected=button.dataset.printer;render();return;}const action=button.dataset.printerAction;if(action==='add')wizard();if(action==='delete')remove();if(action==='default')setDefault();if(action==='control')XP.open('control');};toolbar.onclick=content.onclick;render();return w;
});
register('taskbar',(initial='taskbar')=>{
 const draft={...{locked:true,clock:true,quickLaunch:true,autoHide:false,alwaysOnTop:true,group:true,hideInactive:true},...(state.taskbar||{})};
 const check=(key,label)=>`<label class="settings-check"><input type="checkbox" data-key="${key}" ${draft[key]?'checked':''}> ${esc(label)}</label>`;
 return propertySheet({
  app:'taskbar',title:t("text_taskbar_and_start_menu_properties"),icon:'taskbar',initial,width:400,height:430,
  tabs:[['taskbar',t("text_taskbar")],['start',t("text_start_menu")]],
  read(tab,panel){$$('[data-key]',panel).forEach(box=>draft[box.dataset.key]=box.checked);},
  draw(tab,panel){
   panel.innerHTML=tab==='taskbar'
    ?`<div class="preview-taskbar-strip"><span class="strip-start">start</span><span class="strip-task">${esc(t("text_notepad"))}</span><span class="strip-tray">${(new Date()).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'})}</span></div>
       <fieldset><legend>${esc(t("text_taskbar_appearance"))}</legend>${check('locked',t("text_lock_the_taskbar"))}${check('autoHide',t("text_auto_hide_the_taskbar"))}${check('alwaysOnTop',t("text_keep_the_taskbar_on_top_of_other_windows"))}${check('group',t("text_group_similar_taskbar_buttons"))}${check('quickLaunch',t("text_show_quick_launch"))}</fieldset>
       <fieldset><legend>${esc(t("text_notification_area"))}</legend>${check('clock',t("text_show_the_clock"))}${check('hideInactive',t("text_hide_inactive_icons"))}<p class="settings-note">${esc(t("text_the_taskbar_hides_inactive_icons_behind_the_arrow"))}</p></fieldset>`
    :`<fieldset><legend>${esc(t("text_start_menu_style"))}</legend><label class="settings-check"><input type="radio" name="start-style" checked> ${esc(t("text_start_menu"))}</label><p class="settings-note">${esc(t("text_this_style_offers_the_programs_used_most_often_and_puts_the_internet_a_7af5bd41"))}</p><label class="settings-check"><input type="radio" name="start-style" disabled> ${esc(t("text_classic_start_menu"))}</label><p class="settings-note">${esc(t("text_brings_back_the_look_and_the_behaviour_of_earlier_versions_of_windows"))}</p></fieldset>`;
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
 const wallpapers=[['none',t("text_none_37b89ad3")],['bliss','Bliss'],['azul','Azul'],['autumn','Autumn'],['windows-xp','Windows XP']];
 const schemes=[['blue',t("text_default_blue")],['olive',t("text_olive_green")],['silver',t("text_silver")]];
 const savers=[['none',t("text_none_37b89ad3")],['logo','Windows XP'],['stars',t("text_starfield")]];
 const scheme=()=>draft.style==='classic'?'classic':draft.theme;
 // A miniature desktop, so the theme and the colour scheme can be judged before applying them.
 const preview=()=>`<div class="preview-desktop" style="${wallpaperStyle(draft.wallpaper,draft.fit)}"><div class="preview-window" data-scheme="${scheme()}"><div class="preview-title">${esc(t("text_active_window"))}</div><div class="preview-content"><span>${esc(t("text_windows_and_buttons_00ed7914"))}</span><span class="preview-button">OK</span></div></div><div class="preview-taskbar" data-scheme="${scheme()}"></div></div>`;
 let stopPreview=null,sheet=null;
 const refresh=panel=>{
  const shown=$('.preview-desktop',panel);if(!shown)return;
  shown.style.cssText=wallpaperStyle(draft.wallpaper,draft.fit);
  $$('[data-scheme]',shown).forEach(el=>el.dataset.scheme=scheme());
 };
 sheet=propertySheet({
  app:'display',title:t("text_display_properties"),icon:'control',initial,height:535,
  tabs:[['themes',t("text_themes")],['desktop',t("text_desktop")],['screensaver',t("text_screen_saver")],['appearance',t("text_appearance")],['settings',t("text_options")]],
  read(tab,panel){
   if(tab==='themes')draft.style=$('[name=theme]',panel).value;
   if(tab==='desktop'){draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;}
   if(tab==='screensaver')draft.saver={name:$('[name=saver]',panel).value,minutes:Math.max(1,Number($('[name=wait]',panel).value)||10)};
   if(tab==='appearance'){draft.style=$('[name=style]',panel).value;const box=$('[name=scheme]',panel);if(box&&!box.disabled)draft.theme=box.value;}
  },
  draw(tab,panel){
   stopPreview?.();stopPreview=null;
   if(tab==='themes'){
    panel.innerHTML=`<label class="settings-field"><span>${esc(t("text_theme"))}</span><select name="theme">${options([['xp','Windows XP'],['classic',t("text_windows_classic")]],draft.style)}</select></label><p class="settings-note" style="margin:0 0 6px">${esc(t("text_sample"))}</p>${monitor(preview())}<p class="settings-note">${esc(t("text_a_theme_ties_together_the_style_of_the_windows_and_buttons_the_colour_77a2248e"))}</p>`;
    $('[name=theme]',panel).onchange=e=>{draft.style=e.target.value;refresh(panel);};
   }
   if(tab==='desktop'){
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>${esc(t("text_background"))}</span><select class="wallpaper-picker" name="wallpaper" size="5">${options(wallpapers,draft.wallpaper)}</select></label></div><div><label class="settings-field"><span>${esc(t("text_position"))}</span><select name="fit">${options([['fill',t("text_stretch")],['center',t("text_center")],['tile',t("text_tiles")]],draft.fit)}</select></label></div></div>`;
    const update=()=>{draft.wallpaper=$('[name=wallpaper]',panel).value;draft.fit=$('[name=fit]',panel).value;refresh(panel);};
    $('[name=wallpaper]',panel).onchange=update;$('[name=fit]',panel).onchange=update;
   }
   if(tab==='screensaver'){
    panel.innerHTML=`${monitor('<div class="preview-desktop saver-preview" style="background:#000"></div>')}<label class="settings-field"><span>${esc(t("text_screen_saver_d5d919d0"))}</span><select name="saver">${options(savers,draft.saver.name)}</select></label><div class="settings-inline"><button class="xp-button" data-preview>${esc(t("text_preview"))}</button><label>${esc(t("text_wait"))} <input type="number" name="wait" min="1" max="60" value="${draft.saver.minutes}"> ${esc(t("text_minutes"))}</label></div><p class="settings-note">${esc(t("text_the_screen_saver_starts_once_the_machine_has_been_idle_for_the_time_yo_94c11f2e"))}</p>`;
    const box=$('.saver-preview',panel);
    const show=()=>{stopPreview?.();box.replaceChildren();stopPreview=draft.saver.name==='none'?null:paintSaver(box,draft.saver.name);};
    $('[name=saver]',panel).onchange=e=>{draft.saver.name=e.target.value;show();};
    $('[data-preview]',panel).onclick=()=>{
     const name=$('[name=saver]',panel).value;
     if(name==='none')XP.dialog(t("text_screen_saver"),t("text_no_screen_saver_is_selected"));else startSaver(name);
    };
    setTimeout(show,0);
   }
   if(tab==='appearance'){
    const classic=draft.style==='classic';
    panel.innerHTML=`${monitor(preview())}<label class="settings-field"><span>${esc(t("text_windows_and_buttons"))}</span><select name="style">${options([['xp',t("text_windows_xp_style")],['classic',t("text_windows_classic_style")]],draft.style)}</select></label><label class="settings-field"><span>${esc(t("text_colour_scheme"))}</span><select name="scheme" ${classic?'disabled':''}>${classic?`<option>${esc(t("text_windows_default"))}</option>`:options(schemes,draft.theme)}</select></label><label class="settings-field"><span>${esc(t("text_font_size"))}</span><select disabled><option>${esc(t("text_normal"))}</option></select></label>`;
    $('[name=style]',panel).onchange=e=>{draft.style=e.target.value;sheet.repaint();};
    if(!classic)$('[name=scheme]',panel).onchange=e=>{draft.theme=e.target.value;refresh(panel);};
   }
   if(tab==='settings'){
    const area=$('#desktop').getBoundingClientRect();
    panel.innerHTML=`${monitor(preview())}<div class="settings-columns"><div><label class="settings-field"><span>${esc(t("text_screen_resolution"))}</span><input type="range" min="0" max="2" value="1" disabled><small>${esc(t("text_width_by_height_pixels",{width:Math.round(area.width),height:Math.round(area.height+30)}))}</small></label></div><div><label class="settings-field"><span>${esc(t("text_colour_quality"))}</span><select disabled><option>${esc(t("text_highest_32_bit"))}</option></select></label></div></div><p class="settings-note">${esc(t("text_the_screen_follows_the_size_of_the_window_resize_it_and_the_resolution_follows"))}</p>`;
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
 const admin=isAdministrator();
 const info=(title,text)=>()=>XP.dialog(title,text);
 return propertySheet({
  app:'system',title:t("text_system_properties"),icon:'computer',initial,height:520,
  tabs:[['general',t("text_general")],['name',t("text_computer_name")],['hardware',t("text_hardware")],['advanced',t("text_advanced")],['updates',t("text_automatic_updates")]],
  read(tab,panel){
   if(tab==='name')draft.computerName=($('[name=computer]',panel).value.trim()||'OTTHONI-PC').toUpperCase().slice(0,15);
   if(tab==='updates')draft.updates=$('[name=updates]:checked',panel)?.value==='auto';
  },
  draw(tab,panel){
   if(tab==='general'){
    const used=new Blob([JSON.stringify(state)]).size;
    panel.innerHTML=`<div class="system-brand">${icon('windows')}<div><strong>Windows<span>xp</span></strong><br>Professional</div></div><dl class="system-facts"><dt>${esc(t("text_system_0fb27331"))}</dt><dd>Microsoft Windows XP<br>Professional<br>Version 2002<br>Service Pack 3</dd><dt>${esc(t("text_registered_to"))}</dt><dd>${esc(state.user)}<br>${esc(draft.computerName)}<br>55274-640-1234567-23456</dd><dt>${esc(t("text_computer"))}</dt><dd>Intel(R) Pentium(R) 4 CPU 2.40GHz<br>${esc(t("text_2_40_ghz_512_mb_of_ram"))}<br>${esc(t("text_size_kb_of_your_own_data",{size:(used/1024).toFixed(1)}))}</dd></dl><p class="settings-note">${esc(t("text_windows_xp_is_a_trademark_of_microsoft_corporation_this_program_is_an_2cc81451"))}</p>`;
   }
   if(tab==='name'){
    panel.innerHTML=`<p>${esc(t("text_the_computer_is_known_on_the_network_by_the_following_details"))}</p><label class="settings-field"><span>${esc(t("text_computer_description"))}</span><input type="text" value="Otthoni gép" readonly></label><label class="settings-field"><span>${esc(t("text_full_computer_name"))}</span><input type="text" name="computer" maxlength="15" value="${esc(draft.computerName)}" ${admin?'':'disabled'}></label><label class="settings-field"><span>${esc(t("text_workgroup"))}</span><input type="text" value="MUNKACSOPORT" readonly></label><p class="settings-note">${esc(admin?t("text_click_apply_once_you_have_changed_the_name_it_appears_on_my_computer_a_e5cd75e4"):t("text_you_must_be_logged_on_as_a_computer_administrator_to_change_this_setting"))}</p>`;
   }
   if(tab==='hardware'){
    panel.innerHTML=`<div class="settings-block"><b>${esc(t("text_device_manager"))}</b><p>${esc(t("text_device_manager_lists_every_device_in_this_computer_and_their_propertie_44068a4f"))}</p><button class="xp-button" data-hw="devices">${esc(t("text_device_manager"))}</button></div><div class="settings-block"><b>${esc(t("text_drivers"))}</b><p>${esc(t("text_driver_signing_makes_it_possible_to_check_whether_what_is_installed_wo_3fda7da3"))}</p><button class="xp-button" data-hw="drivers">${esc(t("text_driver_signing"))}</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.hw;
     if(kind==='devices')info(t("text_device_manager"),t("text_home_pc_keyboards_standard_101_102_key_keyboard_mice_and_other_pointin_a23b5bd2"))();
     if(kind==='drivers')info(t("text_driver_signing"),t("text_every_installed_driver_carries_a_digital_signature_windows_warns_you_i_05dfeb5d"))();
    };
   }
   if(tab==='advanced'){
    panel.innerHTML=`<p class="settings-note">${esc(t("text_changing_this_needs_administrator_rights"))}</p><div class="settings-block"><b>${esc(t("text_performance"))}</b><p>${esc(t("text_visual_effects_processor_scheduling_memory_usage_and_virtual_memory"))}</p><button class="xp-button" data-adv="perf" ${admin?'':'disabled'}>${esc(t("text_options"))}</button></div><div class="settings-block"><b>${esc(t("text_user_profiles"))}</b><p>${esc(t("text_the_desktop_and_the_settings_that_belong_to_a_logon"))}</p><button class="xp-button" data-adv="profiles" ${admin?'':'disabled'}>${esc(t("text_options"))}</button></div><div class="settings-block"><b>${esc(t("text_startup_and_recovery"))}</b><p>${esc(t("text_system_startup_system_failure_and_debugging_information"))}</p><button class="xp-button" data-adv="boot" ${admin?'':'disabled'}>${esc(t("text_options"))}</button></div>`;
    panel.onclick=e=>{
     const kind=e.target.dataset?.adv;
     if(kind==='perf')info(t("text_performance_options"),t("text_visual_effects_let_windows_choose_what_is_best_processor_scheduling_pr_e943b53e"))();
     if(kind==='profiles')info(t("text_user_profiles"),t("text_name_type_local_size_2_4_mb_modified_today",{name:state.user}))();
     if(kind==='boot')info(t("text_startup_and_recovery"),t("text_default_operating_system_microsoft_windows_xp_professional_time_to_dis_0f872d38"))();
    };
   }
   if(tab==='updates'){
    panel.innerHTML=`<p>${esc(t("text_windows_can_download_and_install_the_important_updates_in_the_background"))}</p><label class="settings-field"><input type="radio" name="updates" value="auto" ${draft.updates?'checked':''} ${admin?'':'disabled'}> <b>${esc(t("text_automatic_recommended"))}</b><br><small>${esc(t("text_updates_are_downloaded_and_installed_on_their_own"))}</small></label><label class="settings-field"><input type="radio" name="updates" value="off" ${draft.updates?'':'checked'} ${admin?'':'disabled'}> <b>${esc(t("text_turn_off_automatic_updates"))}</b><br><small>${esc(t("text_you_have_to_fetch_the_updates_yourself_windows_does_not_recommend_this_setting"))}</small></label><p class="settings-note">${esc(admin?t("text_the_same_setting_also_shows_in_security_center"):t("text_you_must_be_logged_on_as_a_computer_administrator_to_change_this_setting"))}</p>`;
   }
  },
  apply(){
   if(!admin)return;
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
 const events=[['startup',t("text_start_windows")],['ding',t("text_warning")],['error',t("text_critical_stop")],['notify',t("text_new_message")],['recycle',t("text_empty_recycle_bin")]];
 return propertySheet({
  app:'sounds',title:t("text_sounds_and_audio_devices_properties"),icon:'volume',initial,height:490,
  tabs:[['volume',t("text_volume")],['sounds',t("text_sounds")],['audio',t("text_audio")]],
  read(tab,panel){
   if(tab==='volume'){draft.volume=Number($('[name=volume]',panel).value);draft.sounds=!$('[name=mute]',panel).checked;}
   if(tab==='sounds')draft.sounds=$('[name=scheme]',panel).value!=='none';
  },
  draw(tab,panel){
   if(tab==='volume'){
    panel.innerHTML=`<div class="system-brand">${icon('volume')}<div><strong style="font:bold 13px Tahoma">${esc(t("text_windows_audio_device"))}</strong></div></div><label class="settings-field"><span>${esc(t("text_device_volume"))}</span><input type="range" name="volume" min="0" max="100" value="${draft.volume}"></label><label class="settings-field"><input type="checkbox" name="mute" ${draft.sounds?'':'checked'}> ${esc(t("text_mute"))}</label><label class="settings-field"><input type="checkbox" checked disabled> ${esc(t("text_place_volume_icon_in_the_taskbar"))}</label>`;
    $('[name=volume]',panel).oninput=e=>{draft.volume=Number(e.target.value);};
   }
   if(tab==='sounds'){
    panel.innerHTML=`<label class="settings-field"><span>${esc(t("text_sound_scheme"))}</span><select name="scheme"><option value="windows" ${draft.sounds?'selected':''}>${esc(t("text_windows_default"))}</option><option value="none" ${draft.sounds?'':'selected'}>${esc(t("text_no_sounds"))}</option></select></label><label class="settings-field"><span>${esc(t("text_program_events"))}</span><select name="event" size="6" class="wallpaper-picker">${events.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label><div class="settings-inline"><button class="xp-button" data-play>${esc(t("text_play_dca1c67f"))}</button><small>${esc(t("text_pick_an_event_and_listen_to_the_sound_that_belongs_to_it"))}</small></div>`;
    $('[name=event]',panel).selectedIndex=0;
    $('[data-play]',panel).onclick=()=>{
     const chosen=$('[name=event]',panel).value;
     if($('[name=scheme]',panel).value==='none'){XP.dialog(t("text_sounds"),t("text_the_no_sounds_scheme_is_selected_so_windows_plays_nothing"));return;}
     XP.sound(chosen);
    };
   }
   if(tab==='audio'){
    panel.innerHTML=`<div class="settings-block"><b>${esc(t("text_sound_playback"))}</b><p>${esc(t("text_default_device"))}<br>${esc(t("text_windows_audio_device"))}</p></div><div class="settings-block"><b>${esc(t("text_sound_recording"))}</b><p>${esc(t("text_default_device"))}<br>${esc(t("text_no_recording_device"))}</p></div><div class="settings-block"><b>${esc(t("text_midi_music_playback"))}</b><p>${esc(t("text_default_device"))}<br>Microsoft GS Wavetable SW Synth</p></div>`;
   }
  },
  apply(){
   state.volume=draft.volume;state.sounds=draft.sounds;persist();
   document.dispatchEvent(new CustomEvent('xp-volume-changed'));
   document.dispatchEvent(new CustomEvent('xp-settings-changed'));
  }
 });
}

register('folderOptions',()=>{
 const draft={singleClick:false,showHidden:false,hideExtensions:true,...(state.folderOptions||{})};
 return propertySheet({app:'folderOptions',title:t("text_folder_options"),icon:'folder',width:455,height:500,initial:'general',
  tabs:[['general',t("text_general")],['view',t("text_view")],['types',t("text_file_types")]],
  read(tab,panel){if(tab==='general')draft.singleClick=$('[name=click-mode]:checked',panel)?.value==='single';if(tab==='view'){draft.showHidden=$('[name=hidden]:checked',panel)?.value==='show';draft.hideExtensions=$('[name=hide-extensions]',panel).checked;}},
  draw(tab,panel){
   if(tab==='general')panel.innerHTML=`<fieldset><legend>${esc(t("text_click_items_as_follows"))}</legend><label class="settings-field"><input type="radio" name="click-mode" value="single" ${draft.singleClick?'checked':''}> <b>${esc(t("text_single_click_to_open_an_item"))}</b><br><small>${esc(t("text_point_to_select"))}</small></label><label class="settings-field"><input type="radio" name="click-mode" value="double" ${draft.singleClick?'':'checked'}> <b>${esc(t("text_double_click_to_open_an_item"))}</b><br><small>${esc(t("text_single_click_to_select"))}</small></label></fieldset>`;
   if(tab==='view')panel.innerHTML=`<fieldset><legend>${esc(t("text_advanced_settings"))}</legend><b>${esc(t("text_hidden_files_and_folders"))}</b><label class="settings-check"><input type="radio" name="hidden" value="hide" ${draft.showHidden?'':'checked'}> ${esc(t("text_do_not_show_hidden_files_and_folders"))}</label><label class="settings-check"><input type="radio" name="hidden" value="show" ${draft.showHidden?'checked':''}> ${esc(t("text_show_hidden_files_and_folders"))}</label><label class="settings-check"><input type="checkbox" name="hide-extensions" ${draft.hideExtensions?'checked':''}> ${esc(t("text_hide_extensions_for_known_file_types"))}</label></fieldset>`;
   if(tab==='types')panel.innerHTML=`<p>${esc(t("text_registered_file_types"))}</p><div class="file-type-list">${[['notepad','TXT',t("text_text_document")],['pictures','BMP',t("text_image")],['pictures','PNG',t("text_image")],['windows','EXE',t("text_application")]].map(([ic,ext,name])=>`<div>${icon(ic)}<b>${ext}</b><span>${esc(name)}</span></div>`).join('')}</div>`;
  },
  apply(){state.folderOptions={...draft};persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));}
 });
});

register('internetOptions',()=>{
 const draft={home:state.browserHome||'google.hu',historyDays:state.browserHistoryDays??20};
 return propertySheet({app:'internetOptions',title:t("text_internet_options_7382f1bc"),icon:'ie',width:455,height:505,initial:'general',
  tabs:[['general',t("text_general")],['security',t("text_security")],['privacy',t("text_privacy")],['content',t("text_content")],['connections',t("text_connections")],['programs',t("text_programs")],['advanced',t("text_advanced")]],
  read(tab,panel){if(tab==='general'){draft.home=($('[name=home-page]',panel).value.trim()||'google.hu').slice(0,300);draft.historyDays=Math.max(0,Math.min(999,Number($('[name=history-days]',panel).value)||0));}},
  draw(tab,panel){
   if(tab==='general'){panel.innerHTML=`<fieldset><legend>${esc(t("text_home_page"))}</legend><p>${esc(t("text_home_page_address"))}</p><input type="text" name="home-page" value="${esc(draft.home)}"><div class="settings-inline"><button class="xp-button" data-home-current>${esc(t("text_use_current"))}</button><button class="xp-button" data-home-default>${esc(t("text_use_default"))}</button></div></fieldset><fieldset><legend>${esc(t("text_temporary_internet_files"))}</legend><p>${esc(t("text_delete_cached_pages_and_browsing_history"))}</p><button class="xp-button" data-clear-history>${esc(t("text_clear_history"))}</button></fieldset><fieldset><legend>${esc(t("text_history"))}</legend><label>${esc(t("text_days_to_keep_pages_in_history"))} <input type="number" name="history-days" min="0" max="999" value="${draft.historyDays}"></label></fieldset>`;const setHome=value=>{const input=$('[name=home-page]',panel);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};$('[data-home-current]',panel).onclick=()=>setHome(state.browserCurrent||state.browserHome||'google.hu');$('[data-home-default]',panel).onclick=()=>setHome('google.hu');$('[data-clear-history]',panel).onclick=()=>{state.browserHistory=[];persist();document.dispatchEvent(new CustomEvent('xp-browser-history-cleared'));notify(t("text_internet_options_7382f1bc"),t("text_the_browsing_history_has_been_cleared"));};}
   else panel.innerHTML=`<div class="settings-block"><b>${esc(t(tab==='security'?"text_security":tab==='privacy'?"text_privacy":"text_internet_options_7382f1bc"))}</b><p>${esc(t("text_local_browser_settings_apply_to_the_pages_stored_on_this_computer"))}</p></div>`;
  },
  apply(){state.browserHome=draft.home;state.browserHistoryDays=draft.historyDays;persist();}
 });
});

register('control',()=>{
 if(XP.singleton('control'))return;
 const w=createWindow({title:t("text_control_panel"),icon:'control',app:'control',width:760,height:525,minWidth:470,minHeight:380});
 const note=(title,text)=>()=>XP.dialog(title,text);
  const applets={
  display:{name:t("text_display"),icon:'control',hint:t("text_wallpaper_screen_saver_and_colour_scheme"),open:()=>XP.open('display')},
   folders:{name:t("text_folder_options"),icon:'folder',hint:t("text_how_items_are_opened"),open:()=>XP.open('folderOptions')},
  network:{name:t("text_network_connections"),icon:'network',hint:t("text_the_state_of_the_local_area_connection"),open:()=>XP.open('network')},
   internet:{name:t("text_internet_options_7382f1bc"),icon:'ie',hint:t("text_home_page_history_and_favourites"),open:()=>XP.open('internetOptions')},
  programs:{name:t("text_add_or_remove_programs"),icon:'programs',hint:t("text_the_programs_installed_on_this_computer"),open:()=>XP.dialog(t("text_add_or_remove_programs"),t("text_currently_installed_programs_internet_explorer_6_12_4_mb_windows_media_364cc81b"))},
  volume:{name:t("text_sounds_and_audio_devices_34b385fc"),icon:'volume',hint:t("text_system_sounds_and_volume"),open:()=>XP.open('sounds')},
  player:{name:t("text_audio_devices"),icon:'player',hint:t("text_playback_and_audio_files"),open:()=>XP.open('player')},
  system:{name:t("text_system"),icon:'computer',hint:t("text_system_information_and_storage"),open:()=>XP.open('system')},
  cleanup:{name:t("text_disk_cleanup"),icon:'disk',hint:t("text_free_up_space_on_the_disk"),open:()=>{const trash=state.files.filter(f=>f.deleted).length;XP.dialog(t("text_disk_cleanup_c"),t("text_disk_cleanup_can_remove_the_following_files_temporary_internet_files_3_607783f7",{trash:(trash*0.06).toFixed(2),count:trash,total:(4.01+trash*0.06).toFixed(2)}));}},
  printers:{name:t("text_printers_and_faxes"),icon:'printers',hint:t("text_installed_printers"),open:()=>XP.open('printers')},
  mouse:{name:t("text_mouse"),icon:'mouse',hint:t("text_the_scheme_of_the_mouse_pointers"),open:()=>XP.open('mouse')},
  profile:{name:t("text_user_accounts"),icon:'user',hint:t("text_the_name_the_picture_and_the_type_of_the_account"),open:()=>XP.open('profile')},
  regional:{name:t("text_regional_and_language_options"),icon:'datetime',hint:t("text_the_interface_language_and_the_formats"),open:()=>XP.open('regional')},
  datetime:{name:t("text_date_and_time"),icon:'datetime',hint:t("text_calendar_and_the_exact_time"),open:()=>XP.open('calendar')},
  accessibility:{name:t("text_accessibility_options"),icon:'accessibility',hint:t("text_keyboard_sound_and_display"),open:note(t("text_accessibility_options"),t("text_windows_can_be_driven_from_the_keyboard_alone_tab_step_through_the_con_6ea02cf8"))},
  security:{name:t("text_security_center"),icon:'security',hint:t("text_firewall_updates_and_virus_protection"),open:()=>XP.open('security')}
 };
 const categories=[
  {id:'appearance',name:t("text_appearance_and_themes"),icon:'control',hint:t("text_the_desktop_background_the_colour_scheme_and_the_display_settings"),items:['display','folders']},
  {id:'network',name:t("text_network_and_internet_connections"),icon:'network',hint:t("text_connection_status_and_browser_settings"),items:['network','internet']},
  {id:'programs',name:t("text_add_or_remove_programs"),icon:'programs',hint:t("text_the_list_of_programs_installed_on_this_computer"),items:['programs']},
  {id:'sound',name:t("text_sounds_speech_and_audio_devices"),icon:'volume',hint:t("text_system_sounds_volume_and_playback"),items:['volume','player']},
  {id:'performance',name:t("text_performance_and_maintenance"),icon:'computer',hint:t("text_system_information_and_disk_maintenance"),items:['system','cleanup']},
  {id:'hardware',name:t("text_printers_and_other_hardware"),icon:'printers',hint:t("text_printers_faxes_and_devices"),items:['printers','mouse']},
  {id:'accounts',name:t("text_user_accounts"),icon:'user',hint:t("text_your_user_name_and_your_profile"),items:['profile']},
  {id:'datetime',name:t("text_date_time_language_and_regional_options"),icon:'datetime',hint:t("text_calendar_the_exact_time_and_the_language_settings"),items:['datetime','regional']},
  {id:'access',name:t("text_accessibility_options"),icon:'accessibility',hint:t("text_keyboard_use_and_visibility"),items:['accessibility']},
  {id:'security',name:t("text_security_center"),icon:'security',hint:t("text_firewall_automatic_updates_and_virus_protection"),items:['security']}
 ];
 let classic=!!state.controlClassic,category='';
 menubar(w,{
  [t("text_file")]:[{label:t("text_close"),action:()=>w.close()}],
  [t("text_view")]:()=>[{label:t("text_category_view"),checked:!classic,action:()=>setView(false)},{label:t("text_classic_view"),checked:classic,action:()=>setView(true)}],
  [t("text_help")]:[{label:t("text_help_and_support"),action:()=>XP.open('help')}]
 },true);
 const toolbar=document.createElement('div');toolbar.className='toolbar';
 toolbar.innerHTML=`<button data-action="back">${icon('back')}<span>${esc(t("text_back"))}</span></button><button data-action="up" title="${esc(t("text_up_one_level"))}">${icon('up')}</button><span class="toolbar-separator"></span><button data-action="search">${icon('search')}<span class="toolbar-label">${esc(t("text_search"))}</span></button><button data-action="view">${icon('documents')}<span class="toolbar-label">${esc(t("text_view"))}</span></button>`;
 w.body.append(toolbar);
 const addr=document.createElement('div');addr.className='address-bar';
 addr.innerHTML=`${esc(t("text_address"))} ${'<div class="address-input">'}${icon('control')}<input type="text" aria-label="${esc(t("text_location"))}" readonly></div>`;
 w.body.append(addr);
 const layout=document.createElement('div');layout.className='explorer-layout';
 layout.innerHTML='<aside class="explorer-sidebar"></aside><div class="explorer-files control-files"></div>';
 w.body.append(layout);
 const sidebar=$('.explorer-sidebar',layout),files=$('.control-files',layout),bar=status(w,'');
 const current=()=>categories.find(c=>c.id===category);
 function setView(next){classic=next;category='';state.controlClassic=classic;persist();render();}
 function render(){
  const here=current();
  w.setTitle(here?here.name:t("text_control_panel"));
  $('input',addr).value=here?t("text_control_panel_d3719eb4")+here.name:t("text_control_panel");
  $('[data-action=back]',toolbar).disabled=!here;
  $('[data-action=up]',toolbar).disabled=!here;
  sidebar.innerHTML=`<section class="explorer-panel"><h3>${esc(t("text_control_panel"))}</h3><div><button data-view="${classic?'category':'classic'}">${icon('control')} ${esc(t("text_switch_to_view",{view:classic?t("text_to_category_view"):t("text_to_classic_view")}))}</button>${here?`<button data-view="home">${icon('back')} ${esc(t("text_back_to_categories"))}</button>`:''}</div></section><section class="explorer-panel"><h3>${esc(t("text_see_also_029b4b1c"))}</h3><div><button data-side="update">${icon('refresh')} Windows Update</button><button data-side="help">${icon('help')} ${esc(t("text_help_and_support"))}</button><button data-side="explorer">${icon('computer')} ${esc(t("text_my_computer"))}</button></div></section>`;
  if(here){
   files.className='explorer-files control-files';
   files.innerHTML=`<h1 class="control-title">${esc(here.name)}</h1><p class="control-lead">${esc(here.hint)}</p><h2 class="control-sub">${esc(t("text_pick_a_control_panel_icon"))}</h2><div class="file-grid">${here.items.map(id=>`<button class="file-item" data-applet="${id}">${icon(applets[id].icon)}<span>${esc(applets[id].name)}</span></button>`).join('')}</div>`;
   bar.firstElementChild.textContent=t("text_count_objects",{count:here.items.length});
   return;
  }
  if(classic){
   files.className='explorer-files control-files';
   files.innerHTML=`<div class="file-grid">${Object.entries(applets).map(([id,a])=>`<button class="file-item" data-applet="${id}">${icon(a.icon)}<span>${esc(a.name)}</span></button>`).join('')}</div>`;
   bar.firstElementChild.textContent=t("text_count_objects",{count:Object.keys(applets).length});
   return;
  }
  files.className='explorer-files control-files category-view';
  files.innerHTML=`<h1 class="control-title">${esc(t("text_pick_a_category"))}</h1><div class="control-categories">${categories.map(c=>`<button class="control-category" data-category="${c.id}">${icon(c.icon)}<span><strong>${esc(c.name)}</strong>${esc(c.hint)}</span></button>`).join('')}</div>`;
  bar.firstElementChild.textContent=t("text_count_categories",{count:categories.length});
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
  if(side==='update')XP.dialog('Windows Update',t("text_the_machine_is_not_on_a_network_so_there_is_nothing_to_download_every_797091df"));
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
 const w=createWindow({title:t("text_user_accounts"),icon:'user',app:'accounts',width:640,height:520,minWidth:430,minHeight:370});
 const labels={chess:t("text_chess"),guitar:t("text_guitar"),ball:t("text_football"),butterfly:t("text_butterfly"),fish:t("text_fish"),frog:t("text_frog"),dog:t("text_dog"),cat:t("text_kitten"),duck:t("text_duck"),horses:t("text_horses"),car:t("text_car"),airplane:t("text_aeroplane"),astronaut:t("text_astronaut"),beach:t("text_beach"),'palm-tree':t("text_palm_tree"),'red-flower':t("text_red_flower"),'pink-flower':t("text_pink_flower"),snowflake:t("text_snowflake"),skater:t("text_skateboarder"),kick:t("text_soccer"),'dirt-bike':t("text_dirt_bike"),giraffe:t("text_giraffe"),drip:t("text_drip"),africa:t("text_africa"),'lift-off':t("text_lift_off")};
 const pictures=XP.avatars.map(key=>[key,labels[key]||key]);
 const typeName=type=>type==='guest'?t("text_guest_account"):type==='limited'?t("text_limited_account"):t("text_computer_administrator");
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
 const guestTile=()=>tile(guest(),'guest',guest().enabled?null:t("text_the_guest_account_is_off"));
 function save(){state.user=draftName;state.avatar=draftPicture;state.accountType=draftType;persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
 function render(){
  // A guest may only change their own picture; everything else belongs to the administrator.
  const ownTasks=`<li><button data-go="name">${esc(t("text_change_the_account_name"))}</button></li><li><button data-go="picture">${esc(t("text_change_the_picture"))}</button></li><li><button data-go="type">${esc(t("text_change_the_account_type"))}</button></li>`;
  const ownBlock=asGuest()
   ?`<h1>${esc(t("text_the_guest_account"))}</h1><p>${esc(t("text_the_guest_account_gives_you_a_desk_of_your_own_its_name_picture_and_se_c43ff54d"))}</p>`
   :`<h1>${esc(t("text_pick_a_task"))}</h1><ul class="account-tasks">${ownTasks}</ul><h2>${esc(t("text_or_pick_an_account_to_change"))}</h2>`;
  const pages={
   home:`${ownBlock}<div class="account-list">${ownTile()}${asGuest()?'':guestTile()}</div>`,
   pick:asGuest()?`${ownBlock}<div class="account-list">${ownTile()}</div>`:`<h1>${esc(t("text_what_do_you_want_to_change_about_name_s_account",{name:state.user}))}</h1><ul class="account-tasks">${ownTasks}</ul><div class="account-list">${ownTile()}</div>`,
   guest:guest().enabled
    ?`<h1>${esc(t("text_what_do_you_want_to_change_about_the_guest_account"))}</h1><p>${esc(t("text_the_guest_works_on_a_desk_of_their_own_but_cannot_install_programs_or_c92d2485"))}</p><ul class="account-tasks"><li><button data-guest="off">${esc(t("text_turn_off_the_guest_account"))}</button></li></ul><div class="account-list">${guestTile()}</div>`
    :`<h1>${esc(t("text_do_you_want_to_turn_on_the_guest_account"))}</h1><p>${esc(t("text_the_guest_account_lets_people_without_an_account_of_their_own_use_the_972f64ab"))}</p><p>${esc(t("text_once_it_is_on_the_guest_appears_on_the_logon_screen_and_works_on_a_des_02de0474"))}</p><div class="account-buttons"><button class="xp-button primary" data-guest="on">${esc(t("text_turn_on_the_guest_account"))}</button><button class="xp-button" data-go="back">${esc(t("text_cancel"))}</button></div>`,
   name:`<h1>${esc(t("text_provide_a_new_name_for_the_name_account",{name:state.user}))}</h1><p>${esc(t("text_the_name_appears_on_the_logon_screen_and_at_the_top_of_the_start_menu"))}</p><label class="settings-field"><input type="text" name="account-name" maxlength="32" value="${esc(draftName)}"></label><div class="account-buttons"><button class="xp-button primary" data-save="name">${esc(t("text_change_the_name"))}</button><button class="xp-button" data-go="back">${esc(t("text_cancel"))}</button></div>`,
   picture:`<h1>${esc(t("text_pick_a_new_picture_for_name_s_account",{name:state.user}))}</h1><p>${esc(t("text_the_picture_appears_on_the_logon_screen_and_in_the_start_menu"))}</p><div class="picture-grid">${pictures.map(([key,label])=>`<button class="picture-choice ${key===draftPicture?'selected':''}" data-picture="${key}" title="${esc(label)}" aria-label="${esc(label)}">${XP.avatar(key)}</button>`).join('')}</div><div class="account-buttons"><button class="xp-button primary" data-save="picture">${esc(t("text_change_the_picture_7fbc5154"))}</button><button class="xp-button" data-go="back">${esc(t("text_cancel"))}</button></div>`,
   type:`<h1>${esc(t("text_pick_a_new_account_type_for_name",{name:state.user}))}</h1><label class="settings-field"><input type="radio" name="account-type" value="admin" ${draftType==='admin'?'checked':''}> <b>${esc(t("text_computer_administrator"))}</b><br><small>${esc(t("text_can_install_programs_reach_every_file_and_change_the_system_settings"))}</small></label><label class="settings-field"><input type="radio" name="account-type" value="limited" ${draftType==='limited'?'checked':''} ${state.accountType==='admin'?'disabled':''}> <b>${esc(t("text_limited"))}</b><br><small>${esc(t("text_can_change_their_own_password_and_picture_but_cannot_install_programs"))}</small></label>${state.accountType==='admin'?`<p class="settings-note">${esc(t("text_cannot_change_only_administrator_to_limited"))}</p>`:''}<div class="account-buttons"><button class="xp-button primary" data-save="type">${esc(t("text_change_account_type"))}</button><button class="xp-button" data-go="back">${esc(t("text_cancel"))}</button></div>`
  };
  body.innerHTML=`<header class="accounts-head">${icon('user')}<div><h1>${esc(t("text_user_accounts"))}</h1><p>${esc(state.user)} – ${accountType()}</p></div></header><nav class="accounts-nav"><button class="nav-back" data-nav="back" ${trail.length?'':'disabled'}>${icon('back')}<span>${esc(t("text_back"))}</span></button><span class="nav-gap"></span><button data-nav="home" title="${esc(t("text_home"))}" aria-label="${esc(t("text_home"))}">${icon('home')}</button><button data-nav="help" title="${esc(t("text_help"))}" aria-label="${esc(t("text_help"))}">${icon('help')}</button></nav><div class="accounts-main"><aside class="accounts-side"><h2>${esc(t("text_see_also"))}</h2><ul><li><button data-side="control">${esc(t("text_control_panel"))}</button></li><li><button data-side="logoff">${esc(t("text_log_off"))}</button></li><li><button data-side="help">${esc(t("text_help_and_support"))}</button></li></ul></aside><section class="accounts-page">${pages[view]||pages.home}</section></div>`;
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
   if(!XP.setGuest(on)){XP.sound('error');XP.dialog(t("text_user_accounts"),t("text_only_the_administrator_can_turn_the_guest_account_off"),{icon:'error'});return;}
   notify(t("text_user_accounts"),on?t("text_the_guest_account_is_on_it_can_be_chosen_on_the_logon_screen_now"):t("text_the_guest_account_is_off_da3a994f"));
   if(on)go('guest');else home();return;
  }
  if(button.dataset.picture){draftPicture=button.dataset.picture;render();return;}
  const action=button.dataset.save;
  if(action==='name'){
   const next=XP.fileName($('[name=account-name]',body).value).slice(0,32).trim();
   if(!next){XP.sound('error');XP.dialog(t("text_user_accounts"),t("text_give_the_account_a_name"),{icon:'error'});return;}
   draftName=next;save();home();notify(t("text_user_accounts"),t("text_the_account_is_now_called_name",{name:next}));return;
  }
  if(action==='picture'){save();home();return;}
  if(action==='type'){draftType=$('[name=account-type]:checked',body)?.value||'admin';save();home();return;}
  const side=button.dataset.side;
  if(side==='control')XP.open('control');
  if(side==='help')XP.open('help');
  if(side==='logoff')XP.open('logoff');
 };
 render();
 status(w,t("text_user_accounts"));
 return w;
}
register('volume',()=>{
 if(XP.singleton('volume'))return;
 // Hangerő-szabályozó: the master alongside the channels a 2001 sound card offered.
 const channels=[['master',t("text_volume_control"),t("text_mute_all")],['wave',t("text_wave"),t("text_mute")],['synth','SW Synth',t("text_mute")],['cd',t("text_cd_player"),t("text_mute")]];
 const mixer={wave:82,synth:74,cd:70,muted:[],balance:{},...(state.mixer||{})};
 const level=key=>key==='master'?state.volume:mixer[key];
 const muted=key=>key==='master'?!state.sounds:mixer.muted.includes(key);
 const w=createWindow({title:t("text_volume_control"),icon:'volume',app:'volume',width:462,height:326,fixed:true});
 XP.menubar(w,{
  [t("text_options")]:[{label:t("text_properties_eb1f1ae9"),action:()=>XP.open('sounds')},{label:t("text_advanced_controls"),disabled:true},null,{label:t("text_exit"),action:()=>w.close()}],
  [t("text_help")]:[{label:t("text_about_volume_control"),action:()=>XP.dialog(t("text_volume_control"),t("text_volume_control_the_volume_and_the_balance_of_the_channels_of_the_sound_5ca2d115"))}]
 });
 const body=document.createElement('div');body.className='mixer';w.body.append(body);
 body.innerHTML=channels.map(([key,label,muteLabel])=>`<section class="mixer-channel" data-channel="${key}">
   <h3>${esc(label)}</h3>
   <p class="mixer-label">${esc(t("text_balance"))}</p>
   <div class="mixer-balance">${icon('volume')}<input type="range" min="-10" max="10" step="1" value="${mixer.balance[key]||0}" data-balance="${key}" aria-label="${esc(label)} balansz">${icon('volume')}</div>
   <p class="mixer-label">${esc(t("text_volume_3b2efd3b"))}</p>
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
 XP.status(w,t("text_audio_device_realtek_ac97_audio"),t("text_stereo"));
 return w;
});
register('calendar',()=>{
 const current=XP.now(),pad=value=>String(value).padStart(2,'0');
 const draft={date:`${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}`,time:`${pad(current.getHours())}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`,zone:state.timeZone||'local',internet:!!state.internetTime};let year=current.getFullYear(),month=current.getMonth(),sheet;
 sheet=propertySheet({app:'calendar',title:t("text_date_and_time_properties"),icon:'datetime',width:440,height:550,initial:'datetime',tabs:[['datetime',t("text_date_and_time")],['timezone',t("text_time_zone")],['internet',t("text_internet_time")]],
  read(tab,panel){if(tab==='datetime'){draft.date=$('[name=system-date]',panel)?.value||draft.date;draft.time=$('[name=system-time]',panel)?.value||draft.time;}if(tab==='timezone')draft.zone=$('[name=time-zone]',panel)?.value||draft.zone;if(tab==='internet')draft.internet=!!$('[name=internet-time]',panel)?.checked;},
  draw(tab,panel){
   if(tab==='datetime'){
    const selected=new Date(`${draft.date}T12:00:00`),first=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();panel.innerHTML=`<fieldset><legend>${esc(t("text_date"))}</legend><div class="calendar-heading"><button class="xp-button" data-month="-1">‹</button><b>${new Date(year,month).toLocaleDateString(locale(),{year:'numeric',month:'long'})}</b><button class="xp-button" data-month="1">›</button></div><div class="calendar-grid">${[t("text_mo"),t("text_tu"),t("text_we"),t("text_th"),t("text_fr"),t("text_sa"),t("text_su")].map(day=>`<span class="weekday">${day}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>`<button class="${selected.getDate()===i+1&&selected.getMonth()===month&&selected.getFullYear()===year?'today':''}" data-day="${i+1}">${i+1}</button>`).join('')}</div><input type="date" name="system-date" value="${draft.date}" hidden></fieldset><fieldset><legend>${esc(t("text_time"))}</legend><input class="calendar-time-input" type="time" name="system-time" step="1" value="${draft.time}"><p class="settings-note">${esc(t("text_changes_apply_to_the_simulated_windows_clock"))}</p></fieldset>`;
    panel.onclick=e=>{const nav=e.target.closest('[data-month]'),day=e.target.closest('[data-day]');if(nav){month+=Number(nav.dataset.month);if(month<0){month=11;year--;}if(month>11){month=0;year++;}sheet.repaint();}if(day){draft.date=`${year}-${pad(month+1)}-${pad(day.dataset.day)}`;panel.dispatchEvent(new Event('change',{bubbles:true}));sheet.repaint();}};
   }
   if(tab==='timezone')panel.innerHTML=`<fieldset><legend>${esc(t("text_time_zone"))}</legend><label class="settings-field"><select name="time-zone"><option value="local" ${draft.zone==='local'?'selected':''}>${esc(t("text_current_browser_time_zone"))}</option><option value="GMT Standard Time" ${draft.zone==='GMT Standard Time'?'selected':''}>(GMT) Greenwich</option><option value="Central Europe Standard Time" ${draft.zone==='Central Europe Standard Time'?'selected':''}>(GMT+01:00) Budapest, Prague</option><option value="Eastern Standard Time" ${draft.zone==='Eastern Standard Time'?'selected':''}>(GMT-05:00) Eastern Time</option></select></label><p class="settings-note">${esc(t("text_time_zone_is_saved_with_this_windows_profile"))}</p></fieldset>`;
   if(tab==='internet'){
    panel.innerHTML=`<fieldset><legend>${esc(t("text_internet_time"))}</legend><label class="settings-check"><input type="checkbox" name="internet-time" ${draft.internet?'checked':''}> ${esc(t("text_automatically_synchronize_with_an_internet_time_server"))}</label><label class="settings-field"><span>${esc(t("text_server"))}</span><select disabled><option>time.windows.com</option></select></label><button class="xp-button" data-sync>${esc(t("text_update_now"))}</button><p class="settings-note">${esc(t("text_time_sync_is_unavailable_while_offline"))}</p></fieldset>`;
    $('[data-sync]',panel).onclick=()=>XP.dialog(t("text_internet_time"),t("text_time_sync_is_unavailable_while_offline"),{icon:'error'});
   }
  },
  apply(){const chosen=new Date(`${draft.date}T${draft.time}:00`);if(Number.isFinite(chosen.getTime()))state.clockOffset=chosen.getTime()-Date.now();state.timeZone=draft.zone;state.internetTime=draft.internet;persist();document.dispatchEvent(new CustomEvent('xp-settings-changed'));}
 });return sheet;
});
register('network',()=>{
 if(XP.singleton('network'))return;const w=createWindow({title:t("text_network_connections"),icon:'network',app:'network',width:530,height:330});w.body.innerHTML=`<div class="network-body"><h2 style="font-size:16px;color:#214f98">${esc(t("text_local_area_connection"))}</h2><div class="network-connection">${icon('network')}<div><b>${esc(t("text_connected_to_the_local_web"))}</b><br>${esc(t("text_speed_100_0_mbps"))}<br>${esc(t("text_status_connected"))}</div></div><p>${esc(t("text_the_connection_is_alive_on_the_local_network_internet_explorer_opens_t_6405d6a4"))}</p><button class="xp-button" data-open="ie">${esc(t("text_open_the_browser"))}</button></div>`;return w;
});
register('image',(id,source,title)=>{
 const file=state.files.find(f=>f.id===id&&!f.deleted);if(!file&&!source)return;const siblings=file?state.files.filter(item=>!item.deleted&&item.type==='image'&&item.parent===file.parent):[];let index=Math.max(0,siblings.findIndex(item=>item.id===file?.id)),current=file||{content:source,name:title||t("text_image")},rotation=0,zoom=1,fit=true,slideTimer=null;
 const w=createWindow({title:t("text_name_windows_picture_and_fax_viewer",{name:current.name}),icon:'pictures',app:'image',width:730,height:510});
 const download=()=>{const a=document.createElement('a');a.href=current.content;a.download=XP.fileName(current.name)+(current.name.includes('.')?'':'.jpg');a.click();};
 menubar(w,{[t("text_file")]:()=>[{label:t("text_download"),action:download},{label:t("text_edit_in_paint"),disabled:!current.id,action:()=>XP.open('paint',current.id)},null,{label:t("text_close"),action:()=>w.close()}],[t("text_view")]:()=>[{label:t("text_previous"),disabled:siblings.length<2,action:()=>move(-1)},{label:t("text_next"),disabled:siblings.length<2,action:()=>move(1)},null,{label:t("text_best_fit"),checked:fit,action:()=>{fit=true;zoom=1;paint();}},{label:t("text_actual_size"),checked:!fit&&zoom===1,action:()=>{fit=false;zoom=1;paint();}},{label:t("text_slide_show"),checked:!!slideTimer,disabled:siblings.length<2,action:toggleSlide},null,{label:t("text_maximize"),action:()=>XP.maximize(w)}]});
 const body=document.createElement('div');body.className='image-viewer';const img=document.createElement('img');body.append(img);w.body.append(body);const tools=document.createElement('div');tools.className='picture-toolbar';tools.innerHTML=`<button data-picture="previous" title="${esc(t("text_previous"))}">◀</button><button data-picture="next" title="${esc(t("text_next"))}">▶</button><i></i><button data-picture="fit" title="${esc(t("text_best_fit"))}">▣</button><button data-picture="actual" title="${esc(t("text_actual_size"))}">1:1</button><button data-picture="zoom-in" title="${esc(t("text_zoom_in"))}">＋</button><button data-picture="zoom-out" title="${esc(t("text_zoom_out"))}">−</button><i></i><button data-picture="rotate-left" title="${esc(t("text_rotate_counterclockwise"))}">↶</button><button data-picture="rotate-right" title="${esc(t("text_rotate_clockwise"))}">↷</button><button data-picture="slide" title="${esc(t("text_slide_show"))}">▸</button><i></i><button data-picture="edit" title="${esc(t("text_edit_in_paint"))}">✎</button>`;w.body.append(tools);const bar=status(w,'');
 function paint(){img.src=current.content;img.alt=current.name;img.style.transform=`rotate(${rotation}deg) scale(${zoom})`;img.classList.toggle('actual-size',!fit);w.setTitle(t("text_name_windows_picture_and_fax_viewer",{name:current.name}));$('span',bar).textContent=`${current.name}${siblings.length>1?` (${index+1}/${siblings.length})`:''}`;tools.querySelector('[data-picture=edit]').disabled=!current.id;}
 function move(direction){if(siblings.length<2)return;index=(index+direction+siblings.length)%siblings.length;current=siblings[index];rotation=0;zoom=1;fit=true;paint();}
 function toggleSlide(){if(slideTimer){clearInterval(slideTimer);slideTimer=null;}else if(siblings.length>1)slideTimer=setInterval(()=>move(1),3000);}
 tools.onclick=e=>{const action=e.target.closest('[data-picture]')?.dataset.picture;if(action==='previous')move(-1);if(action==='next')move(1);if(action==='fit'){fit=true;zoom=1;paint();}if(action==='actual'){fit=false;zoom=1;paint();}if(action==='zoom-in'){fit=false;zoom=Math.min(4,zoom+.25);paint();}if(action==='zoom-out'){fit=false;zoom=Math.max(.25,zoom-.25);paint();}if(action==='rotate-left'){rotation-=90;paint();}if(action==='rotate-right'){rotation+=90;paint();}if(action==='slide')toggleSlide();if(action==='edit'&&current.id)XP.open('paint',current.id);};w.cleanup.push(()=>{if(slideTimer)clearInterval(slideTimer);});paint();return w;
});
register('search',()=>{
 const w=createWindow({title:t("text_search"),icon:'search',app:'search',width:600,height:395});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('search')}<div><h1>${esc(t("text_what_are_you_looking_for"))}</h1><p>${esc(t("text_search_through_your_own_documents"))}</p></div></div><form style="display:flex;gap:8px;margin:18px 0"><input type="text" name="q" aria-label="${esc(t("text_search_for_files"))}" placeholder="${esc(t("text_file_name_or_a_word_in_the_file"))}" style="flex:1"><button class="xp-button">${esc(t("text_search"))}</button></form><div class="file-search-results"></div>`;w.body.append(body);$('form',body).onsubmit=e=>{e.preventDefault();const q=$('input',body).value.toLocaleLowerCase(locale());const found=state.files.filter(f=>!f.deleted&&(f.name.toLocaleLowerCase(locale()).includes(q)||(f.type==='text'&&f.content.toLocaleLowerCase(locale()).includes(q))));$('.file-search-results',body).innerHTML=`<p>${esc(t("text_count_results",{count:found.length}))}</p>${found.map(f=>`<button class="start-item" data-found="${esc(f.id)}">${icon(XP.fileIcon(f))}${esc(f.name)}</button>`).join('')}`;};body.onclick=e=>{const b=e.target.closest('[data-found]');if(b)XP.openFile(b.dataset.found);};setTimeout(()=>$('input',body).focus(),0);return w;
});
register('run',async()=>{
 const result=await XP.prompt(t("text_run_4e426da6"),t("text_type_the_name_of_a_program_or_folder_and_windows_will_open_it"),'');if(!result)return;const value=result.trim().toLowerCase().replace(/\.exe$/,'');const map={notepad:'notepad',jegyzettömb:'notepad',mspaint:'paint',paint:'paint',calc:'calculator',cmd:'cmd',iexplore:'ie',msimn:'outlook',outlook:'outlook',taskmgr:'taskmgr',compmgmt:'compmgmt','compmgmt.msc':'compmgmt',explorer:'explorer',control:'control',winmine:'mines',minesweeper:'mines',sol:'solitaire',pinball:'pinball',freecell:'freecell',spider:'spider',pókpasziánsz:'spider',mshearts:'hearts',hearts:'hearts',wmplayer:'player',wscui:'security','wscui.cpl':'security',sysdm:'system',desk:'display',mmsys:'sounds',nusrmgr:'profile',winver:'system'};if(map[value])XP.open(map[value]);else if(value.includes('.')||value.includes('://'))XP.open('ie',result);else{const f=state.files.find(f=>!f.deleted&&f.name.toLowerCase()===value);if(f)XP.openFile(f.id);else{XP.sound('error');XP.dialog(t("text_run_4e426da6"),t("text_windows_cannot_find_name_try_notepad_mspaint_calc_cmd_winmine_or_iexplore",{name:result}),{icon:'error'});}}
});
register('security',()=>{
 if(XP.singleton('security'))return;
 const w=createWindow({title:t("text_windows_security_center"),icon:'security',app:'security',width:660,height:545,minWidth:430,minHeight:360});
 if(!state.security||typeof state.security!=='object')state.security={firewall:true,updates:true};// a save from before the Security Centre has no switches yet
 let opened='';
 const parts=()=>[
  {id:'firewall',name:t("text_firewall"),on:!!state.security.firewall,
   good:t("text_windows_firewall_is_on_and_watching_the_incoming_connections_turn_it_o_a962c189"),
   bad:t("text_windows_firewall_is_off_turning_it_on_helps_protect_the_computer_from_139cfb74")},
  {id:'updates',name:t("text_automatic_updates"),on:!!state.security.updates,
   good:t("text_windows_regularly_downloads_and_installs_the_important_updates_that_is_a135fa21"),
   bad:t("text_automatic_updates_are_off_so_important_fixes_do_not_install_by_themselves")},
  {id:'virus',name:t("text_virus_protection"),on:null,
   bad:t("text_windows_did_not_find_antivirus_software_on_this_computer_or_cannot_wat_25250836")}
 ];
 const label=part=>part.on===null?t("text_not_found"):part.on?t("text_on"):t("text_off");
 const body=document.createElement('div');body.className='security-body';w.body.append(body);
 function render(){
  const list=parts(),warn=list.filter(p=>p.on!==true);
  body.innerHTML=`<div class="security-head">${icon('security')}<div><h1>${esc(t("text_windows_security_center"))}</h1><p>${esc(t("text_helping_protect_your_pc"))}</p></div></div><div class="security-main"><aside class="security-side"><h2>${esc(t("text_resources"))}</h2><ul><li><button data-link="update">${esc(t("text_look_for_the_latest_fixes_with_windows_update"))}</button></li><li><button data-link="ie">${esc(t("text_change_the_internet_options"))}</button></li><li><button data-link="help">${esc(t("text_help_with_security_questions"))}</button></li><li><button data-link="about">${esc(t("text_about_security_center"))}</button></li></ul></aside><section class="security-panels"><div class="security-note ${warn.length?'warn':'ok'}">${warn.length?esc(t("text_your_computer_needs_attention_parts_open_the_sections_below_for_the_details",{parts:warn.map(p=>p.name.toLowerCase()).join(', ')})):t("text_the_security_essentials_are_switched_on_security_center_speaks_up_if_t_63268a43")}</div><h2>${esc(t("text_security_essentials"))}</h2>${list.map(part=>`<div class="security-item"><button class="security-row" data-panel="${part.id}" aria-expanded="${opened===part.id}"><span class="security-name">${part.name}</span><span class="security-state ${part.on===null?'missing':part.on?'on':'off'}">${label(part)}</span><i class="security-chevron"></i></button><div class="security-detail" ${opened===part.id?'':'hidden'}><p>${part.on?part.good:part.bad}</p>${part.on===null?'':`<button class="xp-button" data-toggle="${part.id}">${part.on?t("text_turn_off"):t("text_turn_on")}</button>`}</div></div>`).join('')}<div class="security-manage"><span>${esc(t("text_manage_security_settings_for"))}</span><div>${[['ie',t("text_internet_options"),'ie'],['refresh',t("text_automatic_updates"),'updates'],['security',t("text_windows_firewall"),'firewall']].map(([ic,title,target])=>`<button data-manage="${target}">${icon(ic)}<span>${title}</span></button>`).join('')}</div></div></section></div>`;
 }
 body.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  const panel=button.dataset.panel;
  if(panel){opened=opened===panel?'':panel;render();return;}
  const toggle=button.dataset.toggle;
  if(toggle){if(!isAdministrator()){administratorRequired();return;}state.security[toggle]=!state.security[toggle];persist();opened=toggle;render();XP.sound(state.security[toggle]?'ding':'error');return;}
  const manage=button.dataset.manage;
  if(manage){if(manage==='ie')XP.open('internetOptions');else{opened=manage;render();}return;}
  const link=button.dataset.link;
  if(link==='ie')XP.open('internetOptions');
  if(link==='help')XP.open('help');
  if(link==='update')XP.dialog('Windows Update',t("text_the_computer_is_up_to_date_last_checked_today_last_installed_windows_x_bc6b7724"));
  if(link==='about')XP.dialog(t("text_about_security_center"),t("text_security_center_shows_the_three_most_important_protections_of_this_com_915c58fa"));
 };
 render();
 status(w,'Windows XP Service Pack 3');
 return w;
});
register('help',()=>{
 if(XP.singleton('help'))return;const w=createWindow({title:t("text_help_and_support"),icon:'help',app:'help',width:720,height:540});const body=document.createElement('div');body.className='help-content';body.innerHTML=`<div class="help-banner">${icon('windows')}<div><h1>${esc(t("text_welcome_back_to_windows_xp"))}</h1><p>${esc(t("text_a_familiar_place_possibilities_worth_rediscovering"))}</p></div></div><div class="help-cards">${[['ie',t("text_explore_the_old_web"),t("text_google_local_pages_and_a_search_that_works"),'ie'],['notepad',t("text_write_your_ideas_down"),t("text_your_notes_are_kept_in_the_browser"),'notepad'],['paint',t("text_make_something"),t("text_draw_colour_and_save_your_picture"),'paint'],['mines',t("text_take_a_little_break"),t("text_a_classic_game_of_minesweeper"),'mines'],['documents',t("text_your_own_files"),t("text_make_folders_and_put_your_documents_in_order"),'documents'],['control',t("text_make_the_desktop_yours"),t("text_choose_a_wallpaper_a_colour_scheme_and_a_name"),'display']].map(([ic,title,text,app])=>`<button class="help-card" data-open="${app}">${icon(ic)}<span><strong>${title}</strong>${text}</span></button>`).join('')}</div><div class="help-shortcuts"><b>${esc(t("text_a_few_small_helps"))}</b><br>${esc(t("text_double_click_open_right_click_context_menu"))}<br>${esc(t("text_ctrl_s_save_ctrl_esc_start_menu_alt_f4_close_window"))}<br>${esc(t("text_windows_move_by_their_title_bar_and_resize_from_the_bottom_right_corner"))}<br>${esc(t("text_desktop_icons_can_be_dragged_about_and_the_recycle_bin_gives_files_back"))}</div><p style="font-size:10px;color:#888">${esc(t("text_your_documents_drawings_and_settings_stay_on_this_computer_save_what_m_4403ea39"))}</p>`;w.body.append(body);return w;
});
})();
