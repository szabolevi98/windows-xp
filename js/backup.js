'use strict';
(() => {
  const {$,esc,t,state,storage}=XP;
  const stateMessage=()=>t(storage.kind==='saved'?'text_backup_saved':storage.kind==='conflict'?'text_save_conflict':storage.kind==='recovery'?'text_save_recovery':'text_the_browser_storage_is_full_or_unavailable_download_the_documents_that_7b575206');
  function snapshot() {
    XP.flushPersist();
    return {format:'windows-xp-backup',version:1,createdAt:new Date().toISOString(),language:XP.language,state:JSON.parse(JSON.stringify(state))};
  }
  XP.backup={snapshot,parse:storage.parseBackup};
  XP.register('backup',()=>{
    if(XP.singleton('backup'))return;
    const w=XP.createWindow({title:t('text_backup'),icon:'disk',app:'backup',width:590,height:520});
    w.body.innerHTML=`<div class="backup-body"><h2>${esc(t('text_backup'))}</h2><p>${esc(t('text_backup_description'))}</p><p class="backup-status" role="status"></p><fieldset><legend>${esc(t('text_backup_export'))}</legend><p>${esc(t('text_backup_export_help'))}</p><button class="xp-button" data-backup="export">${esc(t('text_backup_export'))}</button><button class="xp-button" data-backup="raw" hidden>${esc(t('text_backup_raw'))}</button></fieldset><fieldset><legend>${esc(t('text_backup_restore'))}</legend><label class="settings-field"><span>${esc(t('text_backup_choose'))}</span><input type="file" accept=".json,application/json" data-backup-file></label><p data-backup-preview role="status"></p><button class="xp-button" data-backup="restore" disabled>${esc(t('text_backup_restore'))}</button></fieldset><fieldset data-backup-recovery hidden><legend>${esc(t('text_backup_recovery'))}</legend><p>${esc(t('text_backup_recovery_help'))}</p><button class="xp-button" data-backup="reset">${esc(t('text_backup_reset'))}</button></fieldset></div>`;
    let candidate=null;
    const restore=$('[data-backup=restore]',w.body),preview=$('[data-backup-preview]',w.body),input=$('[data-backup-file]',w.body);
    function refresh() {
      if(w.parked)return;
      $('.backup-status',w.body).textContent=stateMessage();
      $('[data-backup=raw]',w.body).hidden=storage.recovery===null;
      $('[data-backup-recovery]',w.body).hidden=storage.kind!=='recovery';
    }
    refresh();document.addEventListener('xp-storage-changed',refresh);
    w.onUnpark=refresh;w.cleanup.push(()=>document.removeEventListener('xp-storage-changed',refresh));
    input.onchange=async()=>{
      candidate=null;restore.disabled=true;preview.textContent='';
      const file=input.files[0];if(!file)return;
      try {
        if(file.size>20*1024*1024)throw new Error('Too large');
        const text=await file.text();
        // An earlier file read may finish after another file has been chosen.
        if(input.files[0]!==file)return;
        candidate=storage.parseBackup(text);
        const profiles=[candidate.state,...Object.entries(candidate.state.profiles||{}).filter(([id])=>id!==(candidate.state.session||'admin')).map(([,p])=>p)];
        const count=profiles.reduce((n,p)=>n+(p.files?.length||0),0);
        preview.textContent=t('text_backup_preview',{count,language:XP.languages.find(l=>l.code===candidate.language)?.label||candidate.language});
        restore.disabled=false;
      }catch {if(input.files[0]===file)preview.textContent=t('text_backup_invalid');}
    };
    w.body.onclick=async event=>{
      const action=event.target.closest('[data-backup]')?.dataset.backup;
      if(action==='export')XP.download('windows-xp-backup.json',JSON.stringify(snapshot(),null,2),'application/json');
      if(action==='raw'&&storage.recovery!==null)XP.download('windows-xp-recovery.json',storage.recovery,'application/json');
      if(action==='restore'&&candidate) {
        restore.disabled=true;
        try {
          XP.flushPersist();const expected=storage.current(),chosen=candidate;
          if(await XP.confirm(t('text_backup_restore'),t('text_backup_confirm'))) {
            XP.flushPersist();
            if(storage.replace(chosen,expected))location.reload();
            else preview.textContent=stateMessage();
          }
        }catch {preview.textContent=t('text_the_save_did_not_succeed');}
        finally {restore.disabled=!candidate;restore.focus();}
      }
      if(action==='reset'&&storage.kind==='recovery') {
        const expected=storage.current();
        if(await XP.confirm(t('text_backup_reset'),t('text_backup_reset_confirm'))) {
          if(XP.resetStorage(expected))location.reload();else refresh();
        }
      }
    };
    return w;
  });
  // A persistent, accessible entry point remains even after the balloon disappears.
  const warning=document.createElement('button');warning.id='save-warning';warning.hidden=true;
  warning.innerHTML=XP.icon('disk');warning.onclick=()=>XP.open('backup');$('.tray').prepend(warning);
  function updateWarning() {
    warning.hidden=storage.kind==='saved';warning.title=warning.ariaLabel=stateMessage();
  }
  document.addEventListener('xp-storage-changed',updateWarning);
  document.addEventListener('xp-language-changed',updateWarning);updateWarning();
})();
