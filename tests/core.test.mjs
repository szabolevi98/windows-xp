import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function boot(saved){
 const storage=new Map();if(saved)storage.set('windows-xp-simulator-v1',JSON.stringify(saved));
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
 vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/internet.js',root),'utf8'),context);
 return {xp:context.XP,storage,context};
}
test('Saved Hungarian document survives a fresh application state',()=>{
 const {xp,storage}=boot();xp.saveFile({id:'saved',name:'Ékezetes.txt',parent:'documents',type:'text',content:'Árvíztűrő tükörfúrógép\nMásodik sor'});
 const next=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.files.find(f=>f.id==='saved').content,'Árvíztűrő tükörfúrógép\nMásodik sor');
});
test('Deleting a folder trashes its complete subtree, preserving unrelated files',()=>{
 const {xp}=boot();xp.saveFile({id:'parent',name:'Mappa',type:'folder',parent:'documents'});xp.saveFile({id:'child',name:'Belső',type:'folder',parent:'parent'});xp.saveFile({id:'note',name:'Jegyzet',type:'text',parent:'child',content:'megmarad'});xp.deleteFile('parent');
 assert.ok(['parent','child','note'].every(id=>xp.state.files.find(f=>f.id===id).deleted));
 assert.equal(xp.state.files.find(f=>f.id==='welcome').deleted,undefined);
});
test('Restoring a nested file restores the enclosing folder and its original content',()=>{
 const {xp}=boot();xp.saveFile({id:'folder',name:'Mappa',type:'folder',parent:'documents'});xp.saveFile({id:'note',name:'Jegyzet.txt',type:'text',parent:'folder',content:'eredeti'});xp.deleteFile('folder');xp.restoreFile('note');
 assert.equal(xp.state.files.find(f=>f.id==='folder').deleted,undefined);assert.equal(xp.state.files.find(f=>f.id==='note').deleted,undefined);assert.equal(xp.state.files.find(f=>f.id==='note').parent,'folder');assert.equal(xp.state.files.find(f=>f.id==='note').content,'eredeti');
});
test('Search ranks relevant pages and understands Hungarian accents',()=>{
 const {xp}=boot();assert.equal(xp.searchWeb('macska')[0].id,'cats');assert.equal(xp.searchWeb('játékok')[0].id,'games');assert.equal(xp.searchWeb('jatekok')[0].id,'games');assert.equal(xp.searchWeb('programozás')[0].id,'html');assert.equal(xp.searchWeb('nincsenilyen-123456').length,0);
});

test('Existing desktops gain the games folder once while retaining documents, settings and personal placements',()=>{
 const saved={version:1,user:'Teszt',volume:24,files:[{id:'personal',name:'Fontos.txt',type:'text',parent:'desktop',content:'megmarad'}],iconPositions:{computer:{x:600,y:30},personal:{x:150,y:200}}};
 const {xp,storage}=boot(saved);assert.equal(xp.state.user,'Teszt');assert.equal(xp.state.volume,24);assert.equal(xp.state.files.find(f=>f.id==='personal').content,'megmarad');
 assert.equal(xp.state.iconPositions.computer,undefined);assert.equal(xp.state.iconPositions.personal.x,150);
 const folder=xp.state.files.find(f=>f.parent==='desktop'&&f.name==='Játékok');assert.ok(folder);
 const children=xp.state.files.filter(f=>f.parent===folder.id);assert.equal(children.length,3);
 assert.deepEqual(Array.from(children,f=>f.app).sort(),['mines','pinball','solitaire']);assert.ok(children.every(f=>f.type==='shortcut'));
 xp.deleteFile(folder.id);
 const next=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.files.filter(f=>f.id===folder.id).length,1);assert.ok(next.state.files.find(f=>f.id===folder.id).deleted);
 assert.equal(next.state.files.filter(f=>f.type==='shortcut').length,3);
});

test('Game shortcuts launch the corresponding application and have the original game icons',()=>{
 const {xp,context}=boot();let mines=0,solitaire=0,pinball=0;
 context.document.querySelector=()=>({hidden:false,classList:{remove(){}},setAttribute(){}});
 xp.register('mines',()=>mines++);xp.register('solitaire',()=>solitaire++);xp.register('pinball',()=>pinball++);
 for(const app of ['mines','solitaire','pinball']){
  const shortcut=xp.state.files.find(f=>f.type==='shortcut'&&f.app===app);
  assert.equal(xp.fileIcon(shortcut),app);xp.openFile(shortcut.id);
 }
 assert.equal(mines,1);assert.equal(solitaire,1);assert.equal(pinball,1);assert.equal(xp.iconPath("pinball"),"assets/icons/pinball.ico");
});

test('Pinball is added once to a renamed and moved existing games folder',()=>{
 const {xp}=boot();const saved=JSON.parse(JSON.stringify(xp.state));
 delete saved.pinballAdded;saved.files=saved.files.filter(f=>f.app!=='pinball');
 const folder=saved.files.find(f=>f.id==='folder-games');folder.name='Kedvencek';folder.parent='documents';
 const migrated=boot(saved).xp;
 assert.equal(migrated.state.files.filter(f=>f.app==='pinball').length,1);
 assert.equal(migrated.state.files.find(f=>f.app==='pinball').parent,folder.id);
 assert.equal(migrated.state.files.find(f=>f.id===folder.id).name,'Kedvencek');
 const again=boot(migrated.state).xp;assert.equal(again.state.files.filter(f=>f.app==='pinball').length,1);
});

test('Pinball migration respects removed games folders and deleted shortcuts',()=>{
 const {xp}=boot();const saved=JSON.parse(JSON.stringify(xp.state));
 saved.files.find(f=>f.app==='pinball').deleted=123;
 assert.equal(boot(saved).xp.state.files.find(f=>f.app==='pinball').deleted,123);
 delete saved.pinballAdded;saved.files=saved.files.filter(f=>f.app!=='pinball');
 saved.files.find(f=>f.id==='folder-games').deleted=456;
 assert.equal(boot(saved).xp.state.files.find(f=>f.app==='pinball').deleted,456);
 saved.files=saved.files.filter(f=>f.id!=='folder-games');
 assert.equal(boot(saved).xp.state.files.some(f=>f.app==='pinball'),false);
});
test('Untrusted display text and filenames cannot introduce HTML or paths',()=>{
 const {xp}=boot();assert.equal(xp.esc('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');assert.equal(xp.fileName('../a/b:c?.txt'),'..abc.txt');assert.ok(!xp.fileName('a\u0000b').includes('\u0000'));
});
test('Storage exhaustion reports a failed save',()=>{
 const {xp,context}=boot();context.localStorage.setItem=()=>{throw new Error('QuotaExceededError');};assert.equal(xp.persist(),false);
});

test('Startup audio restarts from the beginning and reports autoplay denial instead of hiding it',async()=>{
 const {xp,context}=boot();let attempts=0,pauses=0;
 const audio={currentTime:6,volume:1,pause(){pauses++;},play(){assert.equal(this.currentTime,0);assert.equal(this.volume,.55);attempts++;return attempts===1?Promise.reject({name:'NotAllowedError'}):Promise.resolve();}};
 context.document.querySelector=()=>audio;
 assert.equal(await xp.sound('startup'),'blocked');audio.currentTime=6;
 assert.equal(await xp.sound('startup'),'played');audio.currentTime=6;
 assert.equal(await xp.sound('startup'),'played');assert.equal(attempts,3);assert.equal(pauses,3);
});

test('Disabled sounds skip playback and media failures are distinguishable from autoplay denial',async()=>{
 const {xp,context}=boot();let attempts=0;
 context.document.querySelector=()=>({pause(){},play(){attempts++;return Promise.reject({name:'NotSupportedError'});}});
 xp.state.sounds=false;assert.equal(await xp.sound('startup'),'muted');assert.equal(attempts,0);
 xp.state.sounds=true;xp.state.volume=0;assert.equal(await xp.sound('startup'),'muted');assert.equal(attempts,0);
 xp.state.volume=55;assert.equal(await xp.sound('startup'),'error');assert.equal(attempts,1);
});
test('Every downloaded asset is present locally at its recorded size',()=>{
 const manifest=JSON.parse(readFileSync(new URL('assets/sources.json',root),'utf8'));assert.ok(manifest.length>=55);
 for(const asset of manifest){const file=new URL('assets/'+asset.file,root);assert.ok(existsSync(file),asset.file);assert.equal(statSync(file).size,asset.bytes,asset.file);}
});
test('The entry point loads only local resources and blocks external connections',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/frame-src 'self'/);assert.match(html,/form-action 'none'/);
 for(const [,src]of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(!/^https?:/.test(src),src);assert.ok(existsSync(new URL(src,root)),src);}
});
