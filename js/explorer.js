'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify,fileName}=XP;

// These entries belong to the simulated drive, never to the user's saved files.
function systemDrive(){
  const entries={};
  function add(name,parent,children,ic='folder'){
    const path=parent?entries[parent].path+name:'C:';
    const id=parent?'system:'+path:'disk';
    const entry={id,name,parent:parent||'computer',type:children?'folder':'system-file',icon:ic,readOnly:true,path:path+(children?'\\':'')};
    entries[id]=entry;
    if(children)for(const child of children)Array.isArray(child)?add(child[0],id,child[1]):add(child,id,null,/\.exe$/i.test(child)?'windows':'documents');
    return entry;
  }
  add('Helyi lemez (C:)',null,[
    ['Documents and Settings',[
      ['All Users',[['Asztal',[]],['Dokumentumok',[]],['Start Menu',[['Programs',[]]]]]],
      ['Default User',[['Asztal',[]],['Dokumentumok',[]]]],
      [state.user,[['Asztal',[]],['Dokumentumok',[['Képek',[]],['Zene',[]]]],['Application Data',[]],['Local Settings',[['Temp',[]]]]]]
    ]],
    ['Program Files',[
      ['Common Files',[['Microsoft Shared',[]]]],
      ['Internet Explorer',['iexplore.exe','iedw.exe']],
      ['Messenger',['msmsgs.exe']],
      ['Outlook Express',['msimn.exe']],
      ['Windows Media Player',['wmplayer.exe','wmp.dll']],
      ['Windows NT',[['Accessories',['wordpad.exe']]]]
    ]],
    ['WINDOWS',[
      ['system32',[['drivers',['acpi.sys','disk.sys','tcpip.sys']],['config',['system','software']], 'cmd.exe','calc.exe','mspaint.exe','kernel32.dll','shell32.dll','user32.dll']],
      ['Fonts',['arial.ttf','tahoma.ttf','verdana.ttf']],
      ['Help',['windows.chm']],
      ['Media',['Windows XP Startup.wav','Windows XP Shutdown.wav','Windows XP Error.wav']],
      ['Resources',[['Themes',[['Luna',['luna.msstyles']],'Luna.theme','Windows Classic.theme']]]],
      ['Temp',[]],
      ['Web',[['Wallpaper',['Bliss.bmp','Azul.jpg','Autumn.jpg']]]],
      'explorer.exe','notepad.exe','win.ini','system.ini'
    ]],
    ['Temp',[]]
  ],'disk');
  return entries;
}

register('explorer',(initial='computer')=>{
  const system=systemDrive();
  const folders={computer:{name:'Sajátgép',icon:'computer'},documents:{name:'Dokumentumok',icon:'documents'},pictures:{name:'Képek',icon:'pictures'},music:{name:'Zene',icon:'music'},desktop:{name:'Asztal',icon:'computer'},recycle:{name:'Lomtár',icon:'recycle'},...system};
  const dvd={id:'dvd',name:'DVD-meghajtó (D:)',icon:'cd',readOnly:true,type:'drive',path:'D:\\'};
  const w=createWindow({title:'Sajátgép',icon:'computer',app:'explorer',width:760,height:490});
  let folder=initial,selected=null,backStack=[],forwardStack=[],listView=false,dragged=false;
  // The desktop grid puts an icon's top-left corner where the pointer is, minus half a cell.
  const dropPoint=ev=>{const box=$('#desktop').getBoundingClientRect();return {x:ev.clientX-box.left-42,y:ev.clientY-box.top-40};};
  const savedFile=id=>state.files.find(f=>f.id===id);
  const entry=id=>id==='dvd'?dvd:folders[id]||savedFile(id);
  const folderInfo=()=>entry(folder)||folders.documents;
  const readOnly=()=>!!system[folder];
  const selectedFile=()=>savedFile(selected);
  const canEdit=()=>!!selectedFile()&&!readOnly()&&folder!=='recycle';
  const selectedEntry=()=>entry(selected);
  const entryType=f=>f.type==='folder'?'Mappa':f.type==='image'?'PNG-kép':f.type==='shortcut'?'Parancsikon':f.type==='system-file'?(/\.exe$/i.test(f.name)?'Alkalmazás':'Rendszerfájl'):f.type==='drive'?'Meghajtó':'Szöveges dokumentum';
  function folderPath(id){
    const f=entry(id);if(f?.path)return f.path;
    if(id==='computer')return 'Sajátgép';if(id==='recycle')return 'Lomtár';
    if(f?.parent)return folderPath(f.parent).replace(/\\$/,'')+'\\'+f.name;
    return `C:\\Documents and Settings\\${state.user}\\${f?.name||'Dokumentumok'}`;
  }
  function buttonId(b){return b?.dataset.file||b?.dataset.folder||b?.dataset.system||(b?.hasAttribute('data-cd')?'dvd':null);}
  function navigate(next,push=true){
    if(next===folder&&push)return;
    if(push){backStack.push(folder);forwardStack=[];}
    folder=next;selected=null;render();
  }
  function properties(id){
    const f=entry(id);if(!f)return;
    XP.dialog(f.name,`${entryType(f)}\nHely: ${f.path||folderPath(f.parent||folder)}${f.readOnly?'\nAttribútumok: Csak olvasható':''}`,{icon:f.icon||XP.fileIcon(f)});
  }
  function openEntry(id){
    if(XP.modal)return;
    if(id==='dvd'){XP.dialog(dvd.name,'Helyezzen be egy lemezt a következő meghajtóba: D:',{icon:'cd'});return;}
    if(system[id]){if(system[id].type==='folder')navigate(id);else properties(id);return;}
    if(folders[id]){navigate(id);return;}
    const f=savedFile(id);if(!f)return;
    if(folder==='recycle'){XP.restoreFile(id);return;}
    if(f.type==='folder')navigate(id);else XP.openFile(id);
  }
  async function newFolder(){
    if(readOnly())return;
    const name=fileName(await XP.prompt('Új mappa','Az új mappa neve:','Új mappa'));if(!name)return;
    const parent=['computer','recycle','music'].includes(folder)?'documents':folder;
    if(state.files.some(f=>f.name===name&&f.parent===parent&&!f.deleted)){notify('Új mappa','Ilyen nevű mappa vagy fájl már létezik.');return;}
    XP.saveFile({id:XP.uniqueId(),name,type:'folder',parent});
  }
  async function newDocument(){
    if(readOnly())return;
    const parent=['computer','recycle','music'].includes(folder)?'documents':folder;
    let name=fileName(await XP.prompt('Új szöveges dokumentum','Fájlnév:','Új dokumentum.txt'));if(!name)return;
    if(!name.endsWith('.txt'))name+='.txt';
    if(state.files.some(f=>f.name===name&&f.parent===parent&&!f.deleted)){notify('Új dokumentum','Ez a név már foglalt.');return;}
    const id=XP.uniqueId();XP.saveFile({id,name,type:'text',parent,content:''});XP.openFile(id);
  }
  async function rename(){
    if(!canEdit())return;const f=selectedFile();
    const name=fileName(await XP.prompt('Átnevezés','Új név:',f.name));if(!name)return;
    if(state.files.some(other=>other.id!==f.id&&other.parent===f.parent&&other.name===name&&!other.deleted)){notify('Átnevezés','Ez a név már foglalt.');return;}
    XP.saveFile({...f,name});
  }
  async function remove(){
    const f=selectedFile();if(!f||readOnly())return;
    if(folder==='recycle'){
      if(await XP.confirm('Fájl végleges törlése',`Végleg törlöd ezt: „${f.name}”?`)){
        const ids=XP.descendants(f.id);state.files=state.files.filter(f=>!ids.includes(f.id));persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));
      }
    }else XP.deleteFile(f.id);
    selected=null;
  }
  // New items land in the folder on screen, unless it is one that holds no files of its own.
  const pasteParent=()=>['computer','recycle','music'].includes(folder)?'documents':folder;
  const cut=()=>canEdit()&&XP.clip(selected,true);
  const copy=()=>selectedFile()&&folder!=='recycle'&&XP.clip(selected,false);
  const pasteHere=()=>{if(!readOnly()&&folder!=='recycle')XP.paste(pasteParent());};
  const fileActions=()=>[
    {label:'Megnyitás',action:()=>selected&&openEntry(selected),disabled:!selected},
    {label:'Új mappa',icon:'folder',action:newFolder,disabled:readOnly()},
    {label:'Új szöveges dokumentum',icon:'notepad',action:newDocument,disabled:readOnly()},null,
    {label:'Kivágás',shortcut:'Ctrl+X',action:cut,disabled:!canEdit()},
    {label:'Másolás',shortcut:'Ctrl+C',action:copy,disabled:!selectedFile()||folder==='recycle'},
    {label:'Beillesztés',shortcut:'Ctrl+V',action:pasteHere,disabled:!XP.canPaste()||readOnly()||folder==='recycle'},null,
    {label:'Átnevezés',shortcut:'F2',action:rename,disabled:!canEdit()},
    {label:folder==='recycle'?'Végleges törlés':'Törlés',shortcut:'Del',action:remove,disabled:!selectedFile()||readOnly()},null,
    {label:'Bezárás',action:()=>w.close()}
  ];
  menubar(w,{
    'Fájl':fileActions,
    'Szerkesztés':()=>[{label:'Kivágás',shortcut:'Ctrl+X',action:cut,disabled:!canEdit()},{label:'Másolás',shortcut:'Ctrl+C',action:copy,disabled:!selectedFile()||folder==='recycle'},{label:'Beillesztés',shortcut:'Ctrl+V',action:pasteHere,disabled:!XP.canPaste()||readOnly()||folder==='recycle'},null,{label:'Átnevezés',action:rename,disabled:!canEdit()},{label:'Törlés',action:remove,disabled:!selectedFile()||readOnly()}],
    'Nézet':()=>[{label:'Ikonok',checked:!listView,action:()=>{listView=false;render();}},{label:'Lista',checked:listView,action:()=>{listView=true;render();}},{label:'Frissítés',shortcut:'F5',action:render}],
    'Kedvencek':[{label:'Dokumentumok',icon:'documents',action:()=>navigate('documents')},{label:'Képek',icon:'pictures',action:()=>navigate('pictures')}],
    'Eszközök':[{label:'Mappabeállítások',action:()=>XP.dialog('Mappabeállítások','Az elemeket dupla kattintással nyithatod meg.\nA saját fájljaidat jobb kattintással átnevezheted, törölheted vagy letöltheted.')}],
    'Súgó':[{label:'Súgó és támogatás',action:()=>XP.open('help')}]
  },true);
  const toolbar=document.createElement('div');toolbar.className='toolbar';
  toolbar.innerHTML=`<button data-action="back">${icon('back')}<span>Vissza</span></button><button data-action="forward" title="Előre">${icon('forward')}</button><button data-action="up" title="Egy szinttel feljebb">${icon('up')}</button><span class="toolbar-separator"></span><button data-action="search">${icon('search')}<span class="toolbar-label">Keresés</span></button><button data-action="folder">${icon('folder')}<span class="toolbar-label">Új mappa</span></button><button data-action="view">${icon('documents')}<span class="toolbar-label">Nézet</span></button>`;w.body.append(toolbar);
  const addr=document.createElement('div');addr.className='address-bar';addr.innerHTML=`Cím <div class="address-input">${icon('computer')}<input type="text" aria-label="Mappa elérési útja" readonly></div>`;w.body.append(addr);
  const layout=document.createElement('div');layout.className='explorer-layout';layout.innerHTML='<aside class="explorer-sidebar"></aside><div class="explorer-files"></div>';w.body.append(layout);
  const sidebar=$('.explorer-sidebar',layout),filesEl=$('.explorer-files',layout),bar=status(w,'');
  function item(name,ic,data,extra=''){return `<button class="file-item ${extra}" ${data}>${icon(ic)}<span>${esc(name)}</span></button>`;}
  function render(keepFiles=false){
    folders.recycle.icon=XP.recycleIcon();
    const info=folderInfo(),details=selectedEntry();w.setTitle(info.name);w.setIcon(info.icon||'folder');$('input',addr).value=folderPath(folder);
    $('[data-action=back]',toolbar).disabled=!backStack.length;$('[data-action=forward]',toolbar).disabled=!forwardStack.length;
    $('[data-action=up]',toolbar).disabled=folder==='computer';$('[data-action=folder]',toolbar).disabled=readOnly();
    const actions=readOnly()?`<button data-side="system">${icon('computer')} A számítógép adatainak megjelenítése</button><button data-side="control">${icon('control')} Vezérlőpult</button>`:folder==='recycle'?`<button data-side="empty">${icon('recycle')} Lomtár ürítése</button><button data-side="restore" ${!selectedFile()?'disabled':''}>${icon('back')} Kijelölt elem visszaállítása</button>`:`<button data-side="new">${icon('folder')} Új mappa létrehozása</button><button data-side="notepad">${icon('notepad')} Új dokumentum</button>${canEdit()?`<button data-side="rename">${icon('documents')} Elem átnevezése</button><button data-side="delete">${icon('recycle')} Elem törlése</button>`:''}`;
    sidebar.innerHTML=`<section class="explorer-panel"><h3>${readOnly()?'Rendszerfeladatok':folder==='recycle'?'Lomtár-műveletek':'Fájl- és mappaműveletek'}</h3><div>${actions}</div></section><section class="explorer-panel"><h3>Egyéb helyek</h3><div>${['computer','documents','pictures','music','recycle'].filter(f=>f!==folder).map(f=>`<button data-folder="${f}">${icon(folders[f].icon)} ${folders[f].name}</button>`).join('')}<button data-side="control">${icon('control')} Vezérlőpult</button></div></section><section class="explorer-panel"><h3>Részletek</h3><div><b>${esc(details?.name||info.name)}</b><p>${details?`${entryType(details)}${details.modified?`<br>Módosítva: ${new Date(details.modified).toLocaleDateString('hu-HU')}`:''}`:readOnly()?'Rendszermappa':'Itt találod a saját fájljaidat és mappáidat.'}${(details?.readOnly||readOnly())?'<br>Attribútumok: Csak olvasható':''}</p></div></section>`;
    if(keepFiles)return;
    if(!readOnly()&&(folder==='recycle'||['documents','pictures'].includes(folder)||!!savedFile(folder)))filesEl.dataset.dropFolder=folder;
    else delete filesEl.dataset.dropFolder;
    filesEl.classList.toggle('list-view',listView);let html='',count=0;
    if(folder==='computer'){
      html=`<div class="explorer-section">A számítógépen tárolt fájlok</div><div class="file-grid">${item('Dokumentumok','documents','data-folder="documents"')}${item('Képek','pictures','data-folder="pictures"')}${item('Zene','music','data-folder="music"')}</div><div class="explorer-section" style="margin-top:25px">Merevlemezek</div><div class="file-grid">${item('Helyi lemez (C:)','disk','data-folder="disk"','drive')}</div><div class="explorer-section" style="margin-top:25px">Cserélhető adathordozós eszközök</div><div class="file-grid">${item(dvd.name,'cd','data-cd','drive')}</div>`;count=5;
    }else if(readOnly()){
      const children=Object.values(system).filter(f=>f.parent===folder).sort((a,b)=>(b.type==='folder')-(a.type==='folder')||a.name.localeCompare(b.name,'hu'));
      count=children.length;html=`<div class="file-grid">${children.map(f=>item(f.name,f.icon,`data-system="${esc(f.id)}"`,selected===f.id?'selected':'')).join('')}</div>`;
    }else{
      const files=state.files.filter(f=>folder==='recycle'?f.deleted:!f.deleted&&f.parent===folder).sort((a,b)=>(b.type==='folder')-(a.type==='folder')||a.name.localeCompare(b.name,'hu'));
      count=files.length;html=`<div class="file-grid">${folder==='pictures'?['bliss','azul','autumn'].map(key=>`<button class="file-item" data-wallpaper="${key}"><img src="${XP.wallpaperPath(key)}" alt=""><span>${key==='bliss'?'Bliss':key==='azul'?'Azul':'Autumn'}</span></button>`).join(''):''}${folder==='music'?item('Windows rendszerhangok','player','data-player'):''}${files.map(f=>item(f.name,XP.fileIcon(f),`data-file="${esc(f.id)}"`,`${selected===f.id?'selected':''} ${XP.clipped===f.id?'cut':''} ${f.type==='shortcut'?'shortcut':''}`)).join('')}</div>`;
      if(folder==='pictures')count+=3;if(folder==='music')count++;
    }
    if(!count)html+=`<div class="empty-folder">${icon(folder==='recycle'?'recycle':'folder')}${folder==='recycle'?'A Lomtár üres.':'Ez a mappa üres.'}</div>`;
    filesEl.innerHTML=html;
    $$('.file-item',filesEl).forEach(b=>b.classList.toggle('selected',!!selected&&buttonId(b)===selected));
    $('span',bar).textContent=`${count} objektum${selected?' · 1 kijelölve':''}${readOnly()?' · Csak olvasható':''}`;
  }
  toolbar.onclick=e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='back'&&backStack.length){forwardStack.push(folder);navigate(backStack.pop(),false);}
    if(action==='forward'&&forwardStack.length){backStack.push(folder);navigate(forwardStack.pop(),false);}
    if(action==='up'&&folder!=='computer')navigate(entry(folder)?.parent||'computer');
    if(action==='folder')newFolder();if(action==='view'){listView=!listView;render();}if(action==='search')XP.open('search');
  };
  sidebar.onclick=e=>{
    const b=e.target.closest('button');if(!b)return;if(b.dataset.folder)navigate(b.dataset.folder);
    const a=b.dataset.side;if(a==='new')newFolder();if(a==='notepad')newDocument();if(a==='rename')rename();if(a==='delete')remove();if(a==='empty')XP.emptyTrash();
    if(a==='restore'&&selectedFile()){XP.restoreFile(selected);selected=null;render();}if(a==='control')XP.open('control');if(a==='system')XP.open('system');
  };
  filesEl.onclick=e=>{
    if(dragged)return;
    const b=e.target.closest('.file-item');selected=buttonId(b);
    $$('.file-item',filesEl).forEach(el=>el.classList.toggle('selected',el===b));
    const details=selectedEntry();$('span',bar).textContent=details?`${details.name} · ${entryType(details)}${details.readOnly?' · Csak olvasható':''}`:'Nincs kijelölés';render(true);
    if(selected==='dvd')openEntry('dvd');
  };
  function activate(target){
    const b=target.closest('.file-item');if(!b||XP.modal)return;
    const id=buttonId(b);if(id)openEntry(id);
    if(b.dataset.wallpaper)XP.open('image',null,XP.wallpaperPath(b.dataset.wallpaper),b.dataset.wallpaper);
    if(b.hasAttribute('data-player'))XP.open('player');
  }
  filesEl.ondblclick=e=>activate(e.target);filesEl.onpointerup=e=>{if(e.pointerType==='touch')activate(e.target);};
  // Dragging a file out of the window: the icon follows the pointer and whatever is
  // under it lights up, so the same gesture works towards the desktop or another folder.
  filesEl.onpointerdown=e=>{
    if(e.button!==0||XP.modal)return;
    const button=e.target.closest('.file-item'),id=button?.dataset.file;
    if(!id||readOnly()||folder==='recycle')return;
    const startX=e.clientX,startY=e.clientY;let ghost=null,target=null;
    const move=ev=>{
      if(!ghost){
        if(Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY)<6)return;
        ghost=XP.dragGhost(button);
      }
      ghost.style.left=`${ev.clientX+10}px`;ghost.style.top=`${ev.clientY+8}px`;
      target=XP.dropTarget(ev.clientX,ev.clientY);
      if(target?.type==='folder'&&target.id===folder)target=null;
      XP.highlightDrop(target);
    };
    const up=ev=>{
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
      if(!ghost)return;
      ghost.remove();XP.highlightDrop(null);
      if(ev.type==='pointerup')XP.applyDrop(target,id,dropPoint(ev),ev.ctrlKey);
      dragged=true;setTimeout(()=>dragged=false,0);
    };
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
  };
  filesEl.oncontextmenu=e=>{
    e.preventDefault();e.stopPropagation();selected=buttonId(e.target.closest('.file-item'));render();
    const builtIn=selected&&!selectedFile();
    const actions=folder==='recycle'?[
      {label:'Visszaállítás',action:()=>selected&&XP.restoreFile(selected),disabled:!selectedFile()},
      {label:'Végleges törlés',action:remove,disabled:!selectedFile()},null,{label:'Lomtár ürítése',action:XP.emptyTrash}
    ]:builtIn?[
      {label:'Megnyitás',action:()=>openEntry(selected)},null,{label:'Tulajdonságok',action:()=>properties(selected)}
    ]:[...fileActions().slice(0,-2),{label:'Letöltés',disabled:!selected||!['text','image'].includes(selectedFile()?.type),action:()=>{
      const f=selectedFile();if(!f||readOnly())return;
      if(f.type==='image'){const a=document.createElement('a');a.href=f.content;a.download=f.name;a.click();}else XP.download(f.name,f.content);
    }}];
    const chosen=selectedFile();
    if(chosen&&!readOnly())actions.push(null,{label:'Küldés',items:[
      {label:'Asztal (parancsikon létrehozása)',icon:'showdesktop',action:()=>{if(XP.shortcutToFile(chosen.id))XP.notify('Parancsikon',`A(z) „${chosen.name}” parancsikonja az asztalra került.`);}},
      {label:'Dokumentumok',icon:'documents',action:()=>XP.copyInto(chosen.id,'documents')}
    ]});
    XP.menu(actions,e.clientX,e.clientY);
  };
  w.el.addEventListener('keydown',e=>{
    if(e.key==='F2'){e.preventDefault();rename();}if(e.key==='Delete')remove();
    if(e.ctrlKey&&!e.target.closest('input,textarea')){const key=e.key.toLowerCase();if(key==='x'){e.preventDefault();cut();}if(key==='c'){e.preventDefault();copy();}if(key==='v'){e.preventDefault();pasteHere();}}
    if(e.key==='Enter'&&e.target.closest('.file-item')){e.preventDefault();activate(e.target);}
    else if(e.key==='Enter'&&selected&&e.target===filesEl){e.preventDefault();openEntry(selected);}
    if(e.key==='F5'){e.preventDefault();render();}
  });
  XP.onFiles(w,()=>{
    if(folder!=='recycle'&&!folders[folder]&&!state.files.some(f=>f.id===folder&&!f.deleted))folder='documents';
    if(selected&&!entry(selected))selected=null;render();
  });
  render();return w;
});
for(const app of ['computer','documents','pictures','music','recycle'])register(app,()=>XP.open('explorer',app));
})();
