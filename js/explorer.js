'use strict';
(() => {
const {$,$$,esc,icon,state,register,createWindow,menubar,status,persist,notify,fileName,t,locale}=XP;

// Fixed system entries live on the drive; profile mounts below point at the users' saved files.
function systemDrive(){
  const entries={},profileAliases={};
  function add(name,parent,children,ic='folder'){
    const path=parent?entries[parent].path+name:'C:';
    const id=parent?'system:'+path:'disk';
    const entry={id,name,parent:parent||'computer',type:children?'folder':'system-file',icon:ic,readOnly:true,path:path+(children?'\\':''),hidden:!children&&/\.(dll|sys)$/i.test(name)};
    entries[id]=entry;
    if(children)for(const child of children)Array.isArray(child)?add(child[0],id,child[1]):add(child,id,null,/\.exe$/i.test(child)?'windows':'documents');
    return entry;
  }
  add(t("text_local_disk_c"),null,[
    ['Documents and Settings',[
      ['All Users',[[t("text_desktop"),[]],[t("text_my_documents"),[]],['Start Menu',[['Programs',[]]]]]],
      ['Default User',[[t("text_desktop"),[]],[t("text_my_documents"),[]]]]
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
  const settings=Object.values(entries).find(entry=>entry.path==='C:\\Documents and Settings\\');
  const visible=XP.accounts(true).filter(account=>account.id===XP.session||state.accountType==='admin'&&(account.enabled||XP.profileFiles(account.id).length));
  for(const account of visible){
    const profile=add(account.name,settings.id,[],'user');
    profileAliases[account.id]={};
    const mount=(name,root,ic='folder',parent=profile.id)=>{
      const entry=add(name,parent,[],ic);entry.profileOwner=account.id;entry.profileRoot=root;profileAliases[account.id][root]=entry.id;return entry;
    };
    mount(t("text_desktop"),'desktop','showdesktop');
    const documents=mount(t("text_my_documents"),'documents','documents');
    mount(t("text_my_pictures"),'pictures','pictures',documents.id);
    mount(t("text_my_music"),'music','music',documents.id);
    add('Application Data',profile.id,[]);add('Local Settings',profile.id,[['Temp',[]]]);
  }
  return {entries,profileAliases};
}

register('explorer',(initial='computer')=>{
  const drive=systemDrive(),system=drive.entries,profileAliases=drive.profileAliases;
  const folders={computer:{name:t("text_my_computer"),icon:'computer'},documents:{name:t("text_my_documents"),icon:'documents'},pictures:{name:t("text_my_pictures"),icon:'pictures'},music:{name:t("text_my_music"),icon:'music'},desktop:{name:t("text_desktop"),icon:'computer'},network:{name:t("text_my_network_places"),icon:'network'},'network-entire':{name:t("text_entire_network"),icon:'network',parent:'network'},'network-workgroup':{name:t("text_workgroup_computers"),icon:'computer',parent:'network'},recycle:{name:t("text_recycle_bin"),icon:'recycle'},...system};
  const dvd={id:'dvd',name:t("text_dvd_drive_d"),icon:'cd',readOnly:true,type:'drive',path:'D:\\'};
  const sharedDocuments=Object.values(system).find(item=>item.path===`C:\\Documents and Settings\\All Users\\${t("text_my_documents")}\\`);
  const w=createWindow({title:t("text_my_computer"),icon:'computer',app:'explorer',width:760,height:490});
  let folder=initial,selected=null,selectedIds=new Set(),backStack=[],forwardStack=[],view=state.folderViews?.[initial]||(initial==='recycle'?'details':'icons'),sort={key:'name',dir:1},dragged=false,profileContext=null;
  let showTree=false;const expanded=new Set(['desktop','computer','documents']);
  // The desktop grid puts an icon's top-left corner where the pointer is, minus half a cell.
  const dropPoint=ev=>{const box=$('#desktop').getBoundingClientRect();return {x:ev.clientX-box.left-42,y:ev.clientY-box.top-40};};
  const profileRef=(owner,id)=>`profile-file:${owner}:${id}`;
  const refInfo=id=>{const match=String(id||'').match(/^profile-file:([^:]+):(.*)$/);return match?{owner:match[1],id:match[2]}:null;};
  const ownerOf=id=>refInfo(id)?.owner||XP.session;
  const realId=id=>refInfo(id)?.id||id;
  const savedFile=id=>XP.profileFiles(ownerOf(id)).find(f=>f.id===realId(id));
  function rootOf(owner,id){const files=XP.profileFiles(owner);let file=files.find(f=>f.id===id);while(file&&!['desktop','documents','pictures','music'].includes(file.parent))file=files.find(parent=>parent.id===file.parent);return file?.parent||null;}
  const parentRef=(owner,parent)=>profileAliases[owner]?.[parent]||profileRef(owner,parent);
  const entry=id=>{
    if(id==='dvd')return dvd;
    if(folders[id])return folders[id];
    const file=savedFile(id);if(!file)return null;
    const owner=ownerOf(id),root=rootOf(owner,file.id),context=refInfo(id)?{owner,root,alias:profileAliases[owner]?.[root]}:profileContext?.owner===owner&&root===profileContext.root?profileContext:null;
    return context?{...file,id,owner,parent:file.parent===context.root?context.alias:parentRef(owner,file.parent)}:file;
  };
  const folderInfo=()=>entry(folder)||folders.documents;
  const label=name=>t(name);
  const readOnly=()=>folder.startsWith('network')||(profileContext?profileContext.owner!==XP.session:!!system[folder]);
  const selectedFile=()=>savedFile(selected);
  const canEdit=()=>!!selectedFile()&&!readOnly()&&ownerOf(selected)===XP.session&&folder!=='recycle';
  const selectedEntry=()=>entry(selected);
  const storageFolder=()=>system[folder]?.profileRoot?profileContext.root:profileContext?realId(folder):(['computer','recycle','music'].includes(folder)?'documents':folder);
  const entryType=f=>f.type==='folder'?t("text_folder"):f.type==='image'?t("text_png_image"):f.type==='shortcut'?t("text_shortcut"):f.type==='system-file'?(/\.exe$/i.test(f.name)?t("text_application"):t("text_system_file")):f.type==='drive'?t("text_drive"):t("text_text_document");
  function folderPath(id){
    const f=entry(id);if(f?.path)return f.path;
    if(id==='computer')return t("text_my_computer");if(id==='recycle')return t("text_recycle_bin");if(id.startsWith('network'))return id==='network'?t("text_my_network_places"):`${t("text_my_network_places")}\\${t(f?.name)}`;
    if(profileContext&&f){
      const owner=profileContext.owner,files=XP.profileFiles(owner),names=[];let current=files.find(file=>file.id===realId(id));
      while(current){names.unshift(current.name);if(current.parent===profileContext.root)break;current=files.find(file=>file.id===current.parent);}
      return system[profileContext.alias].path+names.join('\\')+(f.type==='folder'?'\\':'');
    }
    if(f?.parent)return folderPath(f.parent).replace(/\\$/,'')+'\\'+f.name;
    const base=`C:\\Documents and Settings\\${state.user}`;
    if(id==='desktop')return `${base}\\${t("text_desktop")}`;
    if(id==='documents')return `${base}\\${t("text_my_documents")}`;
    if(id==='pictures'||id==='music')return `${base}\\${t("text_my_documents")}\\${t(folders[id].name)}`;
    return `${base}\\${t(f?.name||"text_my_documents")}`;
  }
  function resolveAddress(value){
    const wanted=String(value||'').trim().replace(/\//g,'\\').replace(/\\+$/,'').toLocaleLowerCase(locale());
    const candidates=['computer','desktop','documents','pictures','music','network','recycle','disk','dvd',...Object.keys(system),...state.files.filter(file=>file.type==='folder'&&!file.deleted).map(file=>file.id)];
    return candidates.find(id=>{const info=entry(id);return info&&[folderPath(id),info.name,id].some(name=>String(name).replace(/\\+$/,'').toLocaleLowerCase(locale())===wanted);});
  }
  function buttonId(b){return b?.dataset.file||b?.dataset.folder||b?.dataset.system||(b?.hasAttribute('data-cd')?'dvd':null);}
  const location=()=>({folder,profileContext:profileContext&&{...profileContext}});
  function contextFor(next,previous){
    const mounted=system[next];if(mounted?.profileRoot)return {owner:mounted.profileOwner,root:mounted.profileRoot,alias:next};
    const file=savedFile(next),owner=ownerOf(next),root=file&&rootOf(owner,file.id);
    if(file&&refInfo(next))return {owner,root,alias:profileAliases[owner]?.[root]};
    return file&&previous?.owner===owner&&root===previous.root?previous:null;
  }
  function navigate(next,push=true){
    const target=typeof next==='string'?{folder:next}:next;
    if(target.folder===folder&&push)return;
    if(push){backStack.push(location());forwardStack=[];}
    const previous=profileContext;folder=target.folder;selected=null;selectedIds.clear();view=state.folderViews?.[folder]||(folder==='recycle'?'details':'icons');
    profileContext=Object.hasOwn(target,'profileContext')?target.profileContext:contextFor(folder,previous);
    for(let id=folder;id;){const parent=entry(id)?.parent;if(!parent)break;expanded.add(parent);id=parent;}
    render();
  }
  function properties(id){
    const f=entry(id);if(!f)return;
    // A drive has a sheet of its own, with the pie XP drew of it.
    if(id==='disk'||id==='dvd'){XP.open('drive',id);return;}
    XP.dialog(f.name,`${entryType(f)}\n${t("text_location")}: ${f.path||folderPath(f.parent||folder)}${f.readOnly||ownerOf(id)!==XP.session?'\n'+t("text_attributes_read_only"):''}`,{icon:f.icon||XP.fileIcon(f)});
  }
  function openEntry(id){
    if(XP.modal)return;
    if(id==='dvd'){XP.dialog(dvd.name,t("text_please_insert_a_disc_into_drive_d"),{icon:'cd'});return;}
    if(system[id]){if(system[id].type==='folder')navigate(id);else properties(id);return;}
    if(folders[id]){navigate(id);return;}
    const f=savedFile(id);if(!f)return;
    if(folder==='recycle'){properties(id);return;}
    const owner=ownerOf(id);
    if(f.type==='folder')navigate(id);
    else if(owner===XP.session)XP.openFile(f.id);
    else if(f.type==='image')XP.open('image',null,f.content,f.name);
    else if(f.type==='shortcut'&&f.app)XP.open(f.app);
    else if(f.type==='text')XP.open('notepad',null,false,f);
  }
  async function newFolder(){
    if(readOnly())return;
    const name=fileName(await XP.prompt(t("text_new_folder"),t("text_name_the_new_folder"),t("text_new_folder")));if(!name)return;
    const parent=storageFolder();
    if(state.files.some(f=>f.name===name&&f.parent===parent&&!f.deleted)){notify(t("text_new_folder"),t("text_a_folder_or_file_with_that_name_already_exists"));return;}
    XP.saveFile({id:XP.uniqueId(),name,type:'folder',parent});
  }
  async function newDocument(){
    if(readOnly())return;
    const parent=storageFolder();
    let name=fileName(await XP.prompt(t("text_new_text_document"),t("text_file_name"),t("text_new_document_txt")));if(!name)return;
    if(!name.endsWith('.txt'))name+='.txt';
    if(state.files.some(f=>f.name===name&&f.parent===parent&&!f.deleted)){notify(t("text_new_document"),t("text_that_name_is_already_taken"));return;}
    const id=XP.uniqueId();XP.saveFile({id,name,type:'text',parent,content:''});XP.openFile(id);
  }
  async function rename(){
    if(!canEdit())return;const f=selectedFile();
    const name=fileName(await XP.prompt(t("text_rename"),t("text_new_name"),f.name));if(!name)return;
    if(state.files.some(other=>other.id!==f.id&&other.parent===f.parent&&other.name===name&&!other.deleted)){notify(t("text_rename"),t("text_that_name_is_already_taken"));return;}
    XP.saveFile({...f,name});
  }
  async function remove(){
    const chosen=[...selectedIds].filter(id=>savedFile(id));
    const f=selectedFile();if(!f||readOnly())return;
    if(chosen.length>1){
      if(!await XP.confirm(folder==='recycle'?t("text_delete_files_permanently"):t("text_confirm_multiple_file_delete"),folder==='recycle'?t("text_are_you_sure_you_want_to_delete_selected_items_for_good",{count:chosen.length}):t("text_are_you_sure_you_want_to_send_selected_items_to_recycle_bin",{count:chosen.length})))return;
      if(folder==='recycle'){
        const ids=new Set(chosen.flatMap(id=>XP.descendants(realId(id))));state.files=state.files.filter(file=>!ids.has(file.id));persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));
      }else chosen.forEach(id=>XP.deleteFile(realId(id)));
      selected=null;selectedIds.clear();render();return;
    }
    if(folder==='recycle'){
      if(await XP.confirm(t("text_delete_file_permanently"),t("text_are_you_sure_you_want_to_delete_name_for_good",{name:f.name}))){
        const ids=XP.descendants(f.id);state.files=state.files.filter(f=>!ids.includes(f.id));persist();document.dispatchEvent(new CustomEvent('xp-files-changed'));
      }
    }else await XP.trashFile(f.id);
    selected=null;selectedIds.clear();
  }
  // New items land in the folder on screen, unless it is one that holds no files of its own.
  const pasteParent=storageFolder;
  const cut=()=>canEdit()&&XP.clip(realId(selected),true);
  const copy=()=>canEdit()&&XP.clip(realId(selected),false);
  const pasteHere=()=>{if(!readOnly()&&folder!=='recycle')XP.paste(pasteParent());};
  const fileActions=()=>[
    {label:t("text_open"),action:()=>selected&&openEntry(selected),disabled:!selected},
    {label:t("text_new_folder"),icon:'folder',action:newFolder,disabled:readOnly()},
    {label:t("text_new_text_document"),icon:'notepad',action:newDocument,disabled:readOnly()},null,
    {label:t("text_cut"),shortcut:'Ctrl+X',action:cut,disabled:!canEdit()},
    {label:t("text_copy"),shortcut:'Ctrl+C',action:copy,disabled:!canEdit()||folder==='recycle'},
    {label:t("text_paste"),shortcut:'Ctrl+V',action:pasteHere,disabled:!XP.canPaste()||readOnly()||folder==='recycle'},null,
    {label:t("text_rename"),shortcut:'F2',action:rename,disabled:!canEdit()},
    {label:folder==='recycle'?t("text_delete_permanently"):t("text_delete"),shortcut:'Del',action:remove,disabled:!selectedFile()||readOnly()},null,
    {label:t("text_close"),action:()=>w.close()}
  ];
  menubar(w,{
    [t("text_file")]:fileActions,
    [t("text_edit")]:()=>[{label:t("text_cut"),shortcut:'Ctrl+X',action:cut,disabled:!canEdit()},{label:t("text_copy"),shortcut:'Ctrl+C',action:copy,disabled:!canEdit()||folder==='recycle'},{label:t("text_paste"),shortcut:'Ctrl+V',action:pasteHere,disabled:!XP.canPaste()||readOnly()||folder==='recycle'},null,{label:t("text_rename"),action:rename,disabled:!canEdit()},{label:t("text_delete"),action:remove,disabled:!selectedFile()||readOnly()}],
    [t("text_view")]:()=>[...viewItems(),{label:t("text_refresh"),shortcut:'F5',action:render}],
    [t("text_favorites")]:[{label:t("text_my_documents"),icon:'documents',action:()=>navigate('documents')},{label:t("text_my_pictures"),icon:'pictures',action:()=>navigate('pictures')}],
    [t("text_tools")]:[{label:t("text_folder_options"),action:()=>XP.open('folderOptions')}],
    [t("text_help")]:[{label:t("text_help_and_support"),action:()=>XP.open('help')}]
  },true);
  const toolbar=document.createElement('div');toolbar.className='toolbar';
  toolbar.innerHTML=`<button data-action="back">${icon('back')}<span>${esc(t("text_back"))}</span></button><button data-action="forward" title="${esc(t("text_forward"))}">${icon('forward')}</button><button data-action="up" title="${esc(t("text_up_one_level"))}">${icon('up')}</button><span class="toolbar-separator"></span><button data-action="search">${icon('search')}<span class="toolbar-label">${esc(t("text_search"))}</span></button><button data-action="tree">${icon('folder')}<span class="toolbar-label">${esc(t("text_folders"))}</span></button><button data-action="view">${icon('documents')}<span class="toolbar-label">${esc(t("text_view"))}</span></button>`;w.body.append(toolbar);
  const addr=document.createElement('form');addr.className='address-bar';addr.innerHTML=`${esc(t("text_address"))} <div class="address-input">${icon('computer')}<input type="text" aria-label="${esc(t("text_folder_path"))}"></div><button class="go-button" type="submit"><b>→</b>${esc(t("text_go"))}</button>`;w.body.append(addr);
  addr.onsubmit=e=>{e.preventDefault();const target=resolveAddress($('input',addr).value);if(target)navigate(target);else{XP.sound('error');XP.dialog(t("text_windows_explorer"),t("text_address_not_valid"),{icon:'error'});$('input',addr).value=folderPath(folder);}};
  const layout=document.createElement('div');layout.className='explorer-layout';layout.innerHTML='<aside class="explorer-sidebar"></aside><div class="explorer-files"></div>';w.body.append(layout);
  const sidebar=$('.explorer-sidebar',layout),filesEl=$('.explorer-files',layout),bar=status(w,'');
  function item(name,ic,data,extra='',columns=''){return `<button class="file-item ${extra}" ${data}>${icon(ic)}<span>${esc(name)}</span>${columns}</button>`;}
  const VIEWS=[['tiles',t("text_tiles")],['icons',t("text_icons")],['list',t("text_list")],['details',t("text_details")]];
  const viewItems=()=>VIEWS.map(([key,label])=>({label,checked:view===key,action:()=>{view=key;state.folderViews={...(state.folderViews||{}),[folder]:view};persist();render();}}));
  // What the Details columns show about an entry.
  const TYPES={folder:t("text_file_folder"),text:t("text_text_document"),image:t("text_image"),shortcut:t("text_shortcut")};
  const typeName=file=>TYPES[file.type]||t("text_file");
  const sizeOf=file=>file.type==='folder'?null:Math.max(1,Math.ceil((file.content||'').length/1024));
  const sizeText=file=>{const size=sizeOf(file);return size===null?'':`${size.toLocaleString(locale())} KB`;};
  const dateText=file=>file.modified?new Date(file.modified).toLocaleString(locale(),{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  const displayName=file=>state.folderOptions?.hideExtensions!==false&&file.type!=='folder'?file.name.replace(/\.[^.]+$/,''):file.name;
  const columns=file=>folder==='recycle'?`<span class="col-original">${esc(folderPath(file.originalParent||file.parent))}</span><span class="col-date">${esc(file.deletedAt?new Date(file.deletedAt).toLocaleString(locale(),{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'')}</span>`:`<span class="col-size">${sizeText(file)}</span><span class="col-type">${esc(typeName(file))}</span><span class="col-date">${esc(dateText(file))}</span>`;
  // Clicking a column header sorts by it, and clicking it again turns the order around.
  const compare=(a,b)=>{
    const folders=(b.type==='folder')-(a.type==='folder');
    if(folders)return folders;
    if(sort.key==='size')return ((sizeOf(a)||0)-(sizeOf(b)||0))*sort.dir||a.name.localeCompare(b.name,'hu');
    if(sort.key==='type')return typeName(a).localeCompare(typeName(b),'hu')*sort.dir||a.name.localeCompare(b.name,'hu');
    if(sort.key==='modified')return ((a.modified||0)-(b.modified||0))*sort.dir||a.name.localeCompare(b.name,'hu');
    if(sort.key==='deleted')return ((a.deletedAt||0)-(b.deletedAt||0))*sort.dir||a.name.localeCompare(b.name,'hu');
    if(sort.key==='original')return folderPath(a.originalParent||a.parent).localeCompare(folderPath(b.originalParent||b.parent),'hu')*sort.dir||a.name.localeCompare(b.name,'hu');
    return a.name.localeCompare(b.name,'hu')*sort.dir;
  };
  const header=()=>view!=='details'?'':`<div class="details-header">${(folder==='recycle'?[['name',t("text_name")],['original',t("text_original_location")],['deleted',t("text_date_deleted")]]:[['name',t("text_name")],['size',t("text_size")],['type',t("text_type")],['modified',t("text_date_modified")]])
    .map(([key,label])=>`<button data-sort="${key}" class="col-${key==='modified'||key==='deleted'?'date':key}">${esc(label)}${sort.key===key?`<b>${sort.dir>0?'▲':'▼'}</b>`:''}</button>`).join('')}</div>`;
  function profileAt(id){
    const mounted=system[id];if(mounted?.profileRoot)return {owner:mounted.profileOwner,root:mounted.profileRoot,alias:id};
    const ref=refInfo(id);if(!ref)return null;const root=rootOf(ref.owner,ref.id);return {owner:ref.owner,root,alias:profileAliases[ref.owner]?.[root]};
  }
  const childFolders=id=>{
    const context=profileAt(id),owner=context?.owner||XP.session,parent=context?(system[id]?.profileRoot?context.root:realId(id)):id;
    return XP.profileFiles(owner).filter(f=>f.type==='folder'&&!f.deleted&&f.parent===parent)
      .sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(f=>({id:context?profileRef(owner,f.id):f.id,name:f.name,icon:'folder'}));
  };
  const systemChildren=id=>Object.values(system).filter(f=>f.parent===id&&f.type==='folder'&&(!f.hidden||state.folderOptions?.showHidden))
    .sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(f=>({id:f.id,name:f.name,icon:'folder'}));
  function treeChildren(id){
    if(id==='desktop')return [{id:'computer',name:t("text_my_computer"),icon:'computer'},{id:'documents',name:t("text_my_documents"),icon:'documents'},
      {id:'network',name:t("text_my_network_places"),icon:'network'},...childFolders('desktop'),{id:'recycle',name:t("text_recycle_bin"),icon:XP.recycleIcon()}];
    // XP hung the user's own documents under My Computer by name, not a second time as "Dokumentumok".
    if(id==='computer')return [{id:'disk',name:t("text_local_disk_c"),icon:'disk'},{id:'dvd',name:t("text_dvd_drive_d"),icon:'cd'},
      ...(sharedDocuments?[{id:sharedDocuments.id,name:t("text_shared_documents"),icon:'documents'}]:[]),{id:'documents',name:t("text_user_s_documents",{user:state.user}),icon:'documents'}];
    if(id==='documents')return [{id:'pictures',name:t("text_my_pictures"),icon:'pictures'},{id:'music',name:t("text_my_music"),icon:'music'},...childFolders('documents')];
    if(id==='network')return [{id:'network-entire',name:t("text_entire_network"),icon:'network'},{id:'network-workgroup',name:t("text_workgroup_computers"),icon:'computer'}];
    if(system[id]?.profileRoot||refInfo(id))return [...systemChildren(id),...childFolders(id)];
    if(system[id]||id==='disk')return systemChildren(id);
    return childFolders(id);
  }
  function treeNode(node,depth){
    const children=treeChildren(node.id);
    const open=expanded.has(node.id);
    return `<div class="tree-node" style="padding-left:${depth*15}px">
      <button class="tree-twist" data-twist="${esc(node.id)}" data-open="${open?1:0}" aria-label="${open?esc(t("text_collapse")):esc(t("text_expand"))}">${children.length?(open?'−':'+'):''}</button>
      <button class="tree-item ${folder===node.id?'selected':''}" data-folder="${esc(node.id)}">${icon(node.icon)}<span>${esc(node.name)}</span></button>
     </div>${open?children.map(child=>treeNode(child,depth+1)).join(''):''}`;
  }
  const treeMarkup=()=>`<section class="explorer-tree"><header>${esc(t("text_folders"))}<button class="tree-close" data-side="tree" aria-label="${esc(t("text_close"))}">×</button></header>${treeNode({id:'desktop',name:t("text_desktop"),icon:'showdesktop'},0)}</section>`;
  function render(keepFiles=false){
    folders.recycle.icon=XP.recycleIcon();
    const info=folderInfo(),details=selectedEntry();w.setTitle(label(info.name));w.setIcon(info.icon||'folder');$('input',addr).value=folderPath(folder);
    $('[data-action=back]',toolbar).disabled=!backStack.length;$('[data-action=forward]',toolbar).disabled=!forwardStack.length;
    $('[data-action=up]',toolbar).disabled=folder==='computer';$('[data-action=tree]',toolbar).classList.toggle('pressed',showTree);
    const actions=readOnly()?`<button data-side="system">${icon('computer')} ${esc(t("text_view_system_information"))}</button><button data-side="control">${icon('control')} ${esc(t("text_control_panel"))}</button>`:folder==='recycle'?`<button data-side="empty">${icon('recycle')} ${esc(t("text_empty_recycle_bin"))}</button><button data-side="restore" ${!selectedFile()?'disabled':''}>${icon('back')} ${esc(t("text_restore_this_item"))}</button>`:`<button data-side="new">${icon('folder')} ${esc(t("text_make_a_new_folder"))}</button><button data-side="notepad">${icon('notepad')} ${esc(t("text_new_document"))}</button>${canEdit()?`<button data-side="rename">${icon('documents')} ${esc(t("text_rename_this_item"))}</button><button data-side="delete">${icon('recycle')} ${esc(t("text_delete_this_item"))}</button>`:''}`;
    if(showTree){sidebar.innerHTML=treeMarkup();sidebar.classList.add('tree-mode');}else{sidebar.classList.remove('tree-mode');sidebar.innerHTML=`<section class="explorer-panel"><h3>${readOnly()?t("text_system_tasks"):folder==='recycle'?t("text_recycle_bin_tasks"):t("text_file_and_folder_tasks")}</h3><div>${actions}</div></section><section class="explorer-panel"><h3>${esc(t("text_other_places"))}</h3><div>${['computer','documents','pictures','music','network','recycle'].filter(f=>f!==folder).map(f=>`<button data-folder="${f}">${icon(folders[f].icon)} ${esc(t(folders[f].name))}</button>`).join('')}<button data-side="control">${icon('control')} ${esc(t("text_control_panel"))}</button></div></section><section class="explorer-panel"><h3>${esc(t("text_details"))}</h3><div><b>${esc(details?t(details.name):t(info.name))}</b><p>${details?`${entryType(details)}${details.modified?`<br>${esc(t("text_date_modified"))}: ${new Date(details.modified).toLocaleDateString(locale())}`:''}`:readOnly()?t("text_system_folder"):t("text_your_own_files_and_folders_live_here")}${(details?.readOnly||readOnly())?`<br>${esc(t("text_attributes_read_only"))}`:''}</p></div></section>`;}
    if(keepFiles)return;
    if(!readOnly()&&(folder==='recycle'||['documents','pictures'].includes(folder)||!!savedFile(folder)||!!system[folder]?.profileRoot))filesEl.dataset.dropFolder=storageFolder();
    else delete filesEl.dataset.dropFolder;
    filesEl.className=filesEl.className.replace(/\b(tiles|icons|list|details)-view\b/g,'').trim()+` ${view}-view`;
    let html='',count=0;
    if(folder==='computer'){
      html=`<div class="explorer-section">${esc(t("text_files_stored_on_this_computer"))}</div><div class="file-grid">${sharedDocuments?item(t("text_shared_documents"),'documents',`data-system="${esc(sharedDocuments.id)}"`):''}${item(t("text_user_s_documents",{user:state.user}),'documents','data-folder="documents"')}</div><div class="explorer-section" style="margin-top:25px">${esc(t("text_hard_disk_drives"))}</div><div class="file-grid">${item(t("text_local_disk_c"),'disk','data-folder="disk"','drive')}</div><div class="explorer-section" style="margin-top:25px">${esc(t("text_devices_with_removable_storage"))}</div><div class="file-grid">${item(dvd.name,'cd','data-cd','drive')}</div>`;count=4;
    }else if(folder==='network'){
      html=`<div class="explorer-section">${esc(t("text_my_network_places"))}</div><div class="file-grid">${item(t("text_entire_network"),'network','data-folder="network-entire"')}${item(t("text_workgroup_computers"),'computer','data-folder="network-workgroup"')}</div>`;count=2;
    }else if(profileContext){
      const owner=profileContext.owner,parent=system[folder]?.profileRoot?profileContext.root:realId(folder);
      const mounted=Object.values(system).filter(f=>f.parent===folder&&f.type==='folder'&&(!f.hidden||state.folderOptions?.showHidden)).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
      const files=XP.profileFiles(owner).filter(f=>!f.deleted&&f.parent===parent&&(!f.hidden||state.folderOptions?.showHidden)).sort(compare);
      const refs=files.map(file=>({file,id:profileRef(owner,file.id)}));
      count=mounted.length+files.length;
      html=`${header()}<div class="file-grid">${mounted.map(f=>item(f.name,f.icon,`data-system="${esc(f.id)}"`,selectedIds.has(f.id)?'selected':'',columns(f))).join('')}${profileContext.root==='pictures'?['bliss','azul','autumn'].map(key=>`<button class="file-item" data-wallpaper="${key}"><img src="${XP.wallpaperPath(key)}" alt=""><span>${key==='bliss'?'Bliss':key==='azul'?'Azul':'Autumn'}</span></button>`).join(''):''}${profileContext.root==='music'?item(t("text_windows_xp_system_sounds"),'player','data-player'):''}${refs.map(({file,id})=>item(displayName(file),XP.fileIcon(file),`data-file="${esc(id)}"`,`${selectedIds.has(id)?'selected':''} ${XP.clipped===file.id?'cut':''} ${file.type==='shortcut'?'shortcut':''}`,columns(file))).join('')}</div>`;
      if(profileContext.root==='pictures')count+=3;if(profileContext.root==='music')count++;
    }else if(readOnly()){
      const children=Object.values(system).filter(f=>f.parent===folder&&(!f.hidden||state.folderOptions?.showHidden)).sort((a,b)=>(b.type==='folder')-(a.type==='folder')||a.name.localeCompare(b.name,'hu'));
      count=children.length;html=`${header()}<div class="file-grid">${children.map(f=>item(displayName(f),f.icon,`data-system="${esc(f.id)}"`,selectedIds.has(f.id)?'selected':'',columns(f))).join('')}</div>`;
    }else{
      const files=state.files.filter(f=>(folder==='recycle'?f.deleted&&!state.files.find(parent=>parent.id===f.parent)?.deleted:!f.deleted&&f.parent===folder)&&(!f.hidden||state.folderOptions?.showHidden)).sort(compare);
      const ownFolders=folder==='documents'?[item(t("text_my_pictures"),'pictures','data-folder="pictures"'),item(t("text_my_music"),'music','data-folder="music"')].join(''):'';
      count=files.length+(folder==='documents'?2:0);html=`${header()}<div class="file-grid">${ownFolders}${folder==='pictures'?['bliss','azul','autumn'].map(key=>`<button class="file-item" data-wallpaper="${key}"><img src="${XP.wallpaperPath(key)}" alt=""><span>${key==='bliss'?'Bliss':key==='azul'?'Azul':'Autumn'}</span></button>`).join(''):''}${folder==='music'?item(t("text_windows_xp_system_sounds"),'player','data-player'):''}${files.map(f=>item(displayName(f),XP.fileIcon(f),`data-file="${esc(f.id)}"`,`${selectedIds.has(f.id)?'selected':''} ${XP.clipped===f.id?'cut':''} ${f.type==='shortcut'?'shortcut':''}`,columns(f))).join('')}</div>`;
      if(folder==='pictures')count+=3;if(folder==='music')count++;
    }
    if(!count)html+=`<div class="empty-folder">${icon(folder==='recycle'?'recycle':'folder')}${folder==='recycle'?esc(t("text_the_recycle_bin_is_empty")):esc(t("text_this_folder_is_empty"))}</div>`;
    filesEl.innerHTML=html;
    $$('.file-item',filesEl).forEach(b=>b.classList.toggle('selected',selectedIds.has(buttonId(b))));
    const selection=selectedIds.size===1?t("text_1_item_selected"):selectedIds.size>1?t("text_items_selected",{count:selectedIds.size}):'';
    $('span',bar).textContent=`${t("text_count_objects",{count})}${selection?' · '+selection:''}${readOnly()?' · '+t("text_read_only"):''}`;
  }
  toolbar.onclick=e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='back'&&backStack.length){forwardStack.push(location());navigate(backStack.pop(),false);}
    if(action==='forward'&&forwardStack.length){backStack.push(location());navigate(forwardStack.pop(),false);}
    if(action==='up'&&folder!=='computer')navigate(entry(folder)?.parent||'computer');
    if(action==='tree'){showTree=!showTree;render();}if(action==='view'){const box=e.target.closest('[data-action=view]').getBoundingClientRect();XP.menu(viewItems(),box.left,box.bottom);}if(action==='search')XP.open('search');
  };
  sidebar.onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    // The little box opens and closes a branch without leaving the folder you are in.
    if(b.dataset.twist){const id=b.dataset.twist;expanded.has(id)?expanded.delete(id):expanded.add(id);render(true);return;}
    if(b.dataset.side==='tree'){showTree=false;render();return;}
    if(b.dataset.folder)navigate(b.dataset.folder);
    const a=b.dataset.side;if(a==='new')newFolder();if(a==='notepad')newDocument();if(a==='rename')rename();if(a==='delete')remove();if(a==='empty')XP.emptyTrash();
    if(a==='restore'&&selectedFile()){XP.restoreFile(selected);selected=null;selectedIds.clear();render();}if(a==='control')XP.open('control');if(a==='system')XP.open('system');
  };
  filesEl.onclick=e=>{
    // A column header sorts by it; the same header again turns the order around.
    const column=e.target.closest('[data-sort]');
    if(column){const key=column.dataset.sort;sort=sort.key===key?{key,dir:-sort.dir}:{key,dir:1};render();return;}
    if(dragged)return;
    const b=e.target.closest('.file-item'),id=buttonId(b);if(!id)return;
    const buttons=$$('.file-item',filesEl),ids=buttons.map(buttonId).filter(Boolean);
    if(e.shiftKey&&selected){const from=ids.indexOf(selected),to=ids.indexOf(id);if(!e.ctrlKey)selectedIds.clear();if(from>=0&&to>=0)ids.slice(Math.min(from,to),Math.max(from,to)+1).forEach(value=>selectedIds.add(value));}
    else if(e.ctrlKey){selectedIds.has(id)?selectedIds.delete(id):selectedIds.add(id);}
    else{selectedIds.clear();selectedIds.add(id);}
    selected=selectedIds.has(id)?id:[...selectedIds].at(-1)||null;
    buttons.forEach(el=>el.classList.toggle('selected',selectedIds.has(buttonId(el))));
    const details=selectedEntry();$('span',bar).textContent=selectedIds.size>1?t("text_items_selected",{count:selectedIds.size}):details?`${details.name} · ${entryType(details)}${details.readOnly?' · '+t("text_read_only"):''}`:t("text_no_selection");render(true);
    if(state.folderOptions?.singleClick&&b&&!e.ctrlKey&&!e.shiftKey)activate(b);
  };
  function activate(target){
    const b=target.closest('.file-item');if(!b||XP.modal)return;
    const id=buttonId(b);if(id)openEntry(id);
    if(b.dataset.wallpaper)XP.open('image',null,XP.wallpaperPath(b.dataset.wallpaper),b.dataset.wallpaper);
    if(b.hasAttribute('data-player'))XP.open('player');
  }
  filesEl.ondblclick=e=>{if(!state.folderOptions?.singleClick)activate(e.target);};filesEl.onpointerup=e=>{if(e.pointerType==='touch')activate(e.target);};
  // Dragging a file out of the window: the icon follows the pointer and whatever is
  // under it lights up, so the same gesture works towards the desktop or another folder.
  filesEl.onpointerdown=e=>{
    if(e.button!==0||XP.modal)return;
    const button=e.target.closest('.file-item'),displayId=button?.dataset.file,id=realId(displayId);
    if(!displayId||readOnly()||folder==='recycle')return;
    const startX=e.clientX,startY=e.clientY;let ghost=null,target=null;
    const move=ev=>{
      if(!ghost){
        if(Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY)<6)return;
        ghost=XP.dragGhost(button);
      }
      ghost.style.left=`${ev.clientX+10}px`;ghost.style.top=`${ev.clientY+8}px`;
      target=XP.dropTarget(ev.clientX,ev.clientY);
      if(target?.type==='folder'&&target.id===storageFolder())target=null;
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
    e.preventDefault();e.stopPropagation();const clicked=buttonId(e.target.closest('.file-item'));if(clicked&&!selectedIds.has(clicked)){selected=clicked;selectedIds=new Set([clicked]);}else if(!clicked){selected=null;selectedIds.clear();}render();
    const builtIn=selected&&!selectedFile();
    const actions=folder==='recycle'?[
      {label:t("text_restore"),action:()=>selected&&XP.restoreFile(selected),disabled:!selectedFile()},
      {label:t("text_delete_permanently"),action:remove,disabled:!selectedFile()},null,{label:t("text_empty_recycle_bin"),action:XP.emptyTrash}
    ]:builtIn?[
      {label:t("text_open"),action:()=>openEntry(selected)},null,{label:t("text_properties"),action:()=>properties(selected)}
    ]:[...fileActions().slice(0,-2),{label:t("text_download"),disabled:!selected||!['text','image'].includes(selectedFile()?.type),action:()=>{
      const f=selectedFile();if(!f)return;
      if(f.type==='image'){const a=document.createElement('a');a.href=f.content;a.download=f.name;a.click();}else XP.download(f.name,f.content);
    }}];
    const chosen=selectedFile();
    if(chosen&&!readOnly())actions.push(null,{label:t("text_send_to"),items:[
      {label:t("text_desktop_create_shortcut"),icon:'showdesktop',action:()=>{if(XP.shortcutToFile(chosen.id))XP.notify(t("text_shortcut"),t("text_the_shortcut_to_name_is_on_the_desktop",{name:chosen.name}));}},
      {label:t("text_my_documents"),icon:'documents',action:()=>XP.copyInto(chosen.id,'documents')}
    ]});
    XP.menu(actions,e.clientX,e.clientY);
  };
  w.el.addEventListener('keydown',e=>{
    if(e.key==='F2'){e.preventDefault();rename();}if(e.key==='Delete')remove();
    if(e.ctrlKey&&!e.target.closest('input,textarea')){const key=e.key.toLowerCase();if(key==='a'){e.preventDefault();selectedIds=new Set($$('.file-item',filesEl).map(buttonId).filter(Boolean));selected=[...selectedIds][0]||null;render(true);}if(key==='x'){e.preventDefault();cut();}if(key==='c'){e.preventDefault();copy();}if(key==='v'){e.preventDefault();pasteHere();}}
    if(e.key==='Enter'&&e.target.closest('.file-item')){e.preventDefault();activate(e.target);}
    else if(e.key==='Enter'&&selected&&e.target===filesEl){e.preventDefault();openEntry(selected);}
    if(e.key==='F5'){e.preventDefault();render();}
  });
  XP.onFiles(w,()=>{
    if(folder!=='recycle'&&!entry(folder)){folder='documents';profileContext=null;}
    selectedIds=new Set([...selectedIds].filter(id=>entry(id)));if(selected&&!entry(selected))selected=[...selectedIds][0]||null;render();
  });
  w.onUnpark=()=>render();
  render();return w;
});
for(const app of ['computer','documents','pictures','music','recycle'])register(app,()=>XP.open('explorer',app));
})();
