'use strict';
(() => {
  const {$,esc,t}=XP;
  const MAX_BYTES=2*1024*1024,MAX_SIDE=4096;
  const invalid=()=>{throw new Error('text_import_invalid');};
  const base64=bytes=>{
    let binary='';
    for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(binary);
  };
  async function decodePng(bytes,content){
    if(typeof createImageBitmap==='function'){
      const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      const size={width:image.width,height:image.height};image.close();return size;
    }
    return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=reject;image.src=content;});
  }
  async function read(file,decode=decodePng){
    if(!file||!Number.isFinite(file.size)||file.size<0||file.size>MAX_BYTES||!/\.(txt|png)$/i.test(file.name))invalid();
    const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>MAX_BYTES)invalid();
    if(/\.txt$/i.test(file.name)){
      let content;try {content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch {invalid();}
      if(content.includes('\0'))invalid();
      return {name:file.name,type:'text',content};
    }
    if(bytes.length<33||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n)||[0,0,0,13,73,72,68,82].some((n,i)=>bytes[i+8]!==n))invalid();
    const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),width=header.getUint32(16),height=header.getUint32(20);
    if(!width||!height||width>MAX_SIDE||height>MAX_SIDE)invalid();
    const content='data:image/png;base64,'+base64(bytes);
    let size;try {size=await decode(bytes,content);}catch {invalid();}
    if(size.width!==width||size.height!==height)invalid();
    return {name:file.name,type:'image',content,width,height};
  }
  function add(candidate){
    if(!candidate||!['text','image'].includes(candidate.type)||typeof candidate.content!=='string')invalid();
    // File names are local labels. Imports always create a new file, never replace one.
    const extension=candidate.type==='text'?'.txt':'.png',parent=candidate.type==='text'?'documents':'pictures';
    let name=XP.fileName(candidate.name);if(!name)invalid();
    if(!name.toLowerCase().endsWith(extension))name=name.slice(0,96)+extension;
    name=XP.uniqueName(name,parent);if(!name)invalid();
    const file={id:XP.uniqueId(),name,type:candidate.type,parent,content:candidate.content};
    return {file,saved:XP.saveFile(file)};
  }
  XP.importFiles={read,add};
  XP.register('import',()=>{
    if(XP.singleton('import'))return;
    const w=XP.createWindow({title:t('text_import_file'),icon:'documents',app:'import',width:570,height:490});
    const account=XP.session;
    w.body.innerHTML=`<div class="backup-body import-body"><h2>${esc(t('text_import_file'))}</h2><p>${esc(t('text_import_help'))}</p><label class="settings-field"><span>${esc(t('text_import_choose'))}</span><input type="file" accept=".txt,.png,text/plain,image/png" data-import-file></label><p data-import-status role="status"></p><div class="import-preview" data-import-preview></div><div class="button-row"><button class="xp-button" data-import-add disabled>${esc(t('text_import_add'))}</button><button class="xp-button" data-open="backup" hidden>${esc(t('text_backup'))}</button></div></div>`;
    const input=$('[data-import-file]',w.body),button=$('[data-import-add]',w.body),message=$('[data-import-status]',w.body),preview=$('[data-import-preview]',w.body);
    let candidate=null,sequence=0;
    function clear(){sequence++;candidate=null;input.value='';button.disabled=true;message.textContent='';preview.replaceChildren();}
    w.onPark=clear;w.cleanup.push(()=>sequence++);
    input.onchange=async()=>{
      const selection=++sequence;candidate=null;button.disabled=true;preview.replaceChildren();$('[data-open=backup]',w.body).hidden=true;
      const file=input.files[0];message.textContent=file?t('text_import_reading'):'';if(!file)return;
      try {
        const result=await read(file);
        if(selection!==sequence||w.parked||XP.session!==account)return;
        candidate=result;message.textContent=t('text_import_preview',{name:result.name,folder:t(result.type==='text'?'text_my_documents':'text_my_pictures')});
        if(result.type==='text'){const text=document.createElement('pre');text.textContent=result.content.slice(0,1000);preview.append(text);}
        else {const image=document.createElement('img');image.src=result.content;image.alt=result.name;preview.append(image);const dimensions=document.createElement('p');dimensions.textContent=`${result.width} × ${result.height}`;preview.append(dimensions);}
        button.disabled=false;
      }catch {if(selection===sequence)message.textContent=t('text_import_invalid');}
    };
    button.onclick=()=>{
      if(!candidate||w.parked||XP.session!==account)return;
      try {
        const result=add(candidate);candidate=null;button.disabled=true;
        message.textContent=t(result.saved?'text_import_saved':'text_import_unsaved',{name:result.file.name});
        $('[data-open=backup]',w.body).hidden=result.saved;
        if(result.saved)XP.openFile(result.file.id);
      }catch {message.textContent=t('text_import_invalid');}
    };
    return w;
  });
})();
