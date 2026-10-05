import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {installHungarian} from './i18n-test-helper.mjs';
const root=new URL('../',import.meta.url);
function boot(saved){
 const store=new Map();if(saved)store.set('windows-xp-simulator-v1',JSON.stringify(saved));
 const element={querySelector:()=>element,hidden:true};
 const context=vm.createContext({window:{addEventListener(){}},document:{querySelector:()=>element,addEventListener(){},dispatchEvent(){}},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)},setTimeout:()=>0,clearTimeout(){},TextDecoder,Uint8Array,DataView,btoa:s=>Buffer.from(s,'binary').toString('base64'),Audio:class{play(){return Promise.resolve();}},console});
 installHungarian(context);vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/import.js',root),'utf8'),context);
 return {xp:context.XP,context,store};
}
const file=(name,bytes)=>({name,size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64'));

test('UTF-8 imports preserve accents, BOM handling, line endings and literal markup',async()=>{
 const {xp}=boot(),text='Árvíztűrő tükörfúrógép\r\n<script>literal</script>';
 const candidate=await xp.importFiles.read(file('Próba.TXT',new TextEncoder().encode('\ufeff'+text)));
 assert.equal(candidate.content,text);assert.equal(candidate.type,'text');
 const {file:added,saved}=xp.importFiles.add(candidate);assert.equal(saved,true);assert.equal(added.parent,'documents');
 assert.equal(xp.state.files.find(f=>f.id===added.id).content,text);
});
test('PNG imports verify the signature, dimensions and decoder result before adding',async()=>{
 const {xp}=boot();let decoded=false;
 const candidate=await xp.importFiles.read(file('Picture.PNG',png),async()=>{decoded=true;return {width:1,height:1};});
 assert.equal(decoded,true);assert.equal(candidate.width,1);assert.match(candidate.content,/^data:image\/png;base64,/);
 const added=xp.importFiles.add(candidate).file;assert.equal(added.parent,'pictures');assert.equal(added.type,'image');
 const backup=xp.storage.parseBackup(JSON.stringify({format:'windows-xp-backup',version:1,language:'hu',state:xp.state}));
 assert.equal(backup.state.files.find(f=>f.id===added.id).content,candidate.content);
});
test('Unsupported, binary, invalid UTF-8 and oversized text cannot mutate the file system',async()=>{
 const {xp}=boot(),before=xp.state.files.length;
 for(const entry of [file('code.html',[65]),file('binary.txt',[0,1]),file('bad.txt',[0xff]),file('fake.png',[1,2]),{name:'large.txt',size:2*1024*1024+1,arrayBuffer:()=>{throw Error('must not read');}},file('too-big.txt',new Uint8Array(2*1024*1024+1))])await assert.rejects(xp.importFiles.read(entry));
 assert.equal(xp.state.files.length,before);
});
test('PNG dimension bombs and malformed decoded images are rejected',async()=>{
 const {xp}=boot(),large=Uint8Array.from(png);new DataView(large.buffer).setUint32(16,4097);let called=false;
 await assert.rejects(xp.importFiles.read(file('large.png',large),async()=>{called=true;return {width:4097,height:1};}));assert.equal(called,false);
 await assert.rejects(xp.importFiles.read(file('bad.png',png),async()=>{throw Error('decode failed');}));
 await assert.rejects(xp.importFiles.read(file('mismatch.png',png),async()=>({width:2,height:1})));
});
test('Repeated imports create distinct names and never overwrite an existing document',()=>{
 const {xp}=boot();xp.saveFile({id:'original',name:'Own.txt',parent:'documents',type:'text',content:'original'});
 const first=xp.importFiles.add({name:'Own.txt',type:'text',content:'first'}).file,second=xp.importFiles.add({name:'Own.txt',type:'text',content:'second'}).file;
 assert.equal(first.name,'Own (2).txt');assert.equal(second.name,'Own (3).txt');assert.notEqual(first.id,second.id);
 assert.equal(xp.state.files.find(f=>f.id==='original').content,'original');
});
test('A failed import save is reported while retaining the imported work for backup',()=>{
 const {xp,context,store}=boot();xp.persist();const original=store.get('windows-xp-simulator-v1');
 context.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
 const result=xp.importFiles.add({name:'Unsaved.txt',type:'text',content:'keep me'});
 assert.equal(result.saved,false);assert.equal(store.get('windows-xp-simulator-v1'),original);
 assert.equal(xp.state.files.find(f=>f.id===result.file.id).content,'keep me');
});
test('Imported documents and simulator preferences survive reload in the same profile',async()=>{
 const {xp,store}=boot();xp.state.fastStartup=true;xp.state.mineZoom=2;
 const candidate=await xp.importFiles.read(file('Saved.txt',new TextEncoder().encode('saved'))),added=xp.importFiles.add(candidate).file;
 const next=boot(JSON.parse(store.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.files.find(f=>f.id===added.id).content,'saved');assert.equal(next.state.fastStartup,true);assert.equal(next.state.mineZoom,2);
});
test('Imports stay in their own account while fast startup remains a machine preference',()=>{
 const {xp,context}=boot(),element=context.document.querySelector();
 Object.assign(element,{dataset:{},style:{},clientWidth:1280,clientHeight:720,replaceChildren(){},classList:{toggle(){}}});context.document.body=element;context.document.documentElement=element;
 xp.state.fastStartup=true;xp.state.mineZoom=2;
 const admin=xp.importFiles.add({name:'Admin.txt',type:'text',content:'admin only'}).file;
 xp.switchUser('guest');assert.equal(xp.state.fastStartup,true);assert.equal(xp.state.files.some(f=>f.id===admin.id),false);
 assert.equal(xp.state.mineZoom,undefined);xp.state.mineZoom=1.5;
 const guest=xp.importFiles.add({name:'Guest.txt',type:'text',content:'guest only'}).file;
 xp.switchUser('admin');assert.equal(xp.state.fastStartup,true);assert.equal(xp.state.mineZoom,2);
 assert.equal(xp.state.files.some(f=>f.id===guest.id),false);assert.equal(xp.state.files.find(f=>f.id===admin.id).content,'admin only');
 assert.equal(xp.state.profiles.guest.files.find(f=>f.id===guest.id).content,'guest only');
});
