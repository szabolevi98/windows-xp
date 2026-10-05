'use strict';
// Persistence is deliberately independent of windows and applications.
window.XP_STORAGE = (() => {
  const LANGUAGE_KEY = 'windows-xp-simulator-lang';
  const languages = ['hu','en','de','fr','es'];
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  function validateState(value) {
    const fail = () => { throw new Error('Invalid saved desktop'); };
    function safe(node,depth=0) {
      if(depth>60)fail();
      if(typeof node==='number'&&!Number.isFinite(node))fail();
      if(node&&typeof node==='object')for(const [key,item] of Object.entries(node)) {
        if(['__proto__','prototype','constructor'].includes(key))fail();
        safe(item,depth+1);
      }
    }
    safe(value);
    function profile(p) {
      if(!record(p))fail();
      for(const key of ['user','avatar','wallpaper','wallpaperFit','theme','visualStyle','cursors','draft','paintDraft','browserHome','browserCurrent','pinballIni','timeZone'])
        if(p[key]!==undefined&&typeof p[key]!=='string')fail();
      for(const key of ['sounds','showWelcome','controlClassic','internetTime','mineMarks','fastStartup'])
        if(p[key]!==undefined&&typeof p[key]!=='boolean')fail();
      for(const key of ['volume','clockOffset','desktopLayoutVersion','solitaireDraw','browserHistoryDays'])
        if(p[key]!==undefined&&(typeof p[key]!=='number'||!Number.isFinite(p[key])))fail();
      if(p.volume!==undefined&&(p.volume<0||p.volume>100))fail();
      if(p.mineZoom!==undefined&&![1,1.5,2].includes(p.mineZoom))fail();
      for(const key of ['taskbar','screensaver','iconPositions','programUse','folderOptions','folderViews','desktopOptions','playerSettings','taskManager','mixer','mouse','webDemo','outlook','freecellStats','mineCustom','drafts'])
        if(p[key]!==undefined&&!record(p[key]))fail();
      if(p.pinnedPrograms!==undefined&&(!Array.isArray(p.pinnedPrograms)||p.pinnedPrograms.some(x=>typeof x!=='string')))fail();
      if(p.browserHistory!==undefined&&(!Array.isArray(p.browserHistory)||p.browserHistory.some(x=>!record(x)||typeof x.url!=='string'||typeof x.title!=='string')))fail();
      if(p.favorites!==undefined&&(!Array.isArray(p.favorites)||p.favorites.some(x=>!record(x)||typeof x.title!=='string'||typeof x.url!=='string')))fail();
      if(p.printers!==undefined&&(!Array.isArray(p.printers)||p.printers.some(x=>!record(x)||typeof x.id!=='string'||typeof x.name!=='string'||typeof x.port!=='string')))fail();
      if(p.iconPositions)for(const position of Object.values(p.iconPositions))if(!record(position)||Object.values(position).some(n=>typeof n!=='number'))fail();
      if(p.programUse&&Object.values(p.programUse).some(n=>typeof n!=='number'))fail();
      if(p.webDemo){
        if(p.webDemo.cart!==undefined&&!record(p.webDemo.cart))fail();
        if(p.webDemo.messages!==undefined&&(!Array.isArray(p.webDemo.messages)||p.webDemo.messages.some(m=>!record(m)||['name','message','date'].some(k=>typeof m[k]!=='string'))))fail();
        if(p.webDemo.draft!==undefined&&(!record(p.webDemo.draft)||Object.values(p.webDemo.draft).some(x=>typeof x!=='string')))fail();
      }
      if(p.outlook){
        if(p.outlook.read!==undefined&&(!Array.isArray(p.outlook.read)||p.outlook.read.some(x=>typeof x!=='string')))fail();
        if(p.outlook.own!==undefined&&(!Array.isArray(p.outlook.own)||p.outlook.own.some(x=>!record(x))))fail();
        if(p.outlook.moved!==undefined&&!record(p.outlook.moved))fail();
      }
      if(p.files!==undefined) {
        if(!Array.isArray(p.files))fail();
        const files=new Map();
        for(const f of p.files) {
          if(!record(f)||typeof f.id!=='string'||!f.id||typeof f.name!=='string'||typeof f.parent!=='string'||!['text','image','folder','shortcut'].includes(f.type)||files.has(f.id))fail();
          for(const key of ['content','app','target','icon'])if(f[key]!==undefined&&typeof f[key]!=='string')fail();
          if(f.type==='text'&&f.content===undefined)f.content='';
          if(f.type==='image'&&f.content!==undefined&&!/^data:image\/png;base64,[a-z0-9+/=\s]*$/i.test(f.content))fail();
          files.set(f.id,f);
        }
        // Legacy orphaned files are retained, but recursive graphs must not reach Explorer.
        for(const f of files.values())for(const edge of ['parent','target']) {
          const visited=new Set([f.id]);let next=f[edge];
          while(files.has(next)) {if(visited.has(next))fail();visited.add(next);next=files.get(next)[edge];}
        }
      }
      if(p.drafts)for(const [id,draft] of Object.entries(p.drafts)) {
        if(!id||!record(draft)||!['text','image'].includes(draft.type)||typeof draft.content!=='string'||(draft.name!==undefined&&typeof draft.name!=='string')||(draft.fileId!=null&&typeof draft.fileId!=='string'))fail();
        if(draft.type==='image'&&!/^data:image\/png;base64,[a-z0-9+/=\s]*$/i.test(draft.content))fail();
      }
    }
    if(!record(value)||value.version!==1)fail();
    profile(value);
    if(value.session!==undefined&&!['admin','guest'].includes(value.session))fail();
    if(value.computerName!==undefined&&typeof value.computerName!=='string')fail();
    for(const key of ['security','guest','profiles'])if(value[key]!==undefined&&!record(value[key]))fail();
    if(value.profiles)for(const [id,p] of Object.entries(value.profiles)) {if(!['admin','guest'].includes(id))fail();profile(p);}
    return value;
  }
  function parseBackup(text) {
    const backup=JSON.parse(text);
    if(!record(backup)||backup.format!=='windows-xp-backup'||backup.version!==1||!languages.includes(backup.language))throw new Error('Invalid backup');
    validateState(backup.state);
    if(!Array.isArray(backup.state.files))throw new Error('Missing files');
    return backup;
  }
  function create({key,defaults,onChange=()=>{}}) {
    let raw=null,recovery=null,kind='saved',initial,replaced=false;
    const change=next=>{kind=next;onChange(next);};
    try {
      raw=localStorage.getItem(key);
      try {initial=raw===null?defaults():{...defaults(),...validateState(JSON.parse(raw))};}
      catch {recovery=raw;kind='recovery';initial=defaults();}
    }catch {kind='error';initial=defaults();}
    function current() {return localStorage.getItem(key);}
    function write(state) {
      if(replaced||kind==='recovery'||kind==='conflict'){change(kind);return false;}
      try {
        if(current()!==raw){change('conflict');return false;}
        const next=JSON.stringify(state);
        if(next!==raw)localStorage.setItem(key,next);
        raw=next;change('saved');return true;
      }catch {change('error');return false;}
    }
    function replace(backup,expected) {
      validateState(backup.state);
      if(!languages.includes(backup.language))throw new Error('Invalid language');
      let previousLanguage,languageWritten=false;
      try {
        if(current()!==expected){change('conflict');return false;}
        previousLanguage=localStorage.getItem(LANGUAGE_KEY);
        localStorage.setItem(LANGUAGE_KEY,backup.language);languageWritten=true;
        const next=JSON.stringify(backup.state);
        localStorage.setItem(key,next);
        raw=next;recovery=null;replaced=true;change('saved');return true;
      }catch {
        if(languageWritten)try {if(previousLanguage===null)localStorage.removeItem(LANGUAGE_KEY);else localStorage.setItem(LANGUAGE_KEY,previousLanguage);}catch {}
        change('error');return false;
      }
    }
    window.addEventListener('storage',event=>{
      if((event.key===key||event.key===null)&&(!event.storageArea||event.storageArea===localStorage)) {
        try {if(current()!==raw)change('conflict');}catch {change('error');}
      }
    });
    return {initial,write,replace,current,parseBackup,validateState,get kind(){return kind;},get recovery(){return recovery;}};
  }
  return {create,validateState,parseBackup};
})();
