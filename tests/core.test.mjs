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
 const children=xp.state.files.filter(f=>f.parent===folder.id);assert.equal(children.length,6);
 assert.deepEqual(Array.from(children,f=>f.app).sort(),['freecell','hearts','mines','pinball','solitaire','spider']);assert.ok(children.every(f=>f.type==='shortcut'));
 xp.deleteFile(folder.id);
 const next=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.files.filter(f=>f.id===folder.id).length,1);assert.ok(next.state.files.find(f=>f.id===folder.id).deleted);
 assert.equal(next.state.files.filter(f=>f.type==='shortcut').length,6);
});

test('Game shortcuts launch the corresponding application and have the original game icons',()=>{
 const {xp,context}=boot();const opened={};
 const games=['mines','solitaire','pinball','freecell','spider','hearts'];
 context.document.querySelector=()=>({hidden:false,classList:{remove(){}},setAttribute(){}});
 games.forEach(app=>xp.register(app,()=>opened[app]=(opened[app]||0)+1));
 for(const app of games){
  const shortcut=xp.state.files.find(f=>f.type==='shortcut'&&f.app===app);
  assert.equal(xp.fileIcon(shortcut),app);xp.openFile(shortcut.id);
 }
 assert.deepEqual(opened,Object.fromEntries(games.map(app=>[app,1])));
 assert.equal(xp.iconPath("pinball"),"assets/icons/pinball.ico");
});

test('The card games join an existing games folder once, wherever the user moved it',()=>{
 const {xp}=boot();const saved=JSON.parse(JSON.stringify(xp.state));
 delete saved.cardGamesAdded;saved.files=saved.files.filter(f=>!['freecell','spider','hearts'].includes(f.app));
 const folder=saved.files.find(f=>f.id==='folder-games');folder.name='Kártyák';folder.parent='documents';
 const migrated=boot(saved).xp;
 for(const app of ['freecell','spider','hearts']){
  const added=migrated.state.files.filter(f=>f.app===app);
  assert.equal(added.length,1);assert.equal(added[0].parent,folder.id);
 }
 const again=boot(JSON.parse(JSON.stringify(migrated.state))).xp;
 assert.equal(again.state.files.filter(f=>f.app==='hearts').length,1);
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

test('The desktop belongs to Adminisztrátor, but a name the user chose is kept',()=>{
 assert.equal(boot().xp.state.user,'Adminisztrátor');
 assert.equal(boot({version:1,user:'Levente',files:[]}).xp.state.user,'Adminisztrátor');
 assert.equal(boot({version:1,user:'Teszt',files:[]}).xp.state.user,'Teszt');
 // Renaming happens once, so a user who types the old name back in the control panel keeps it.
 assert.equal(boot({version:1,user:'Levente',administratorRenamed:true,files:[]}).xp.state.user,'Levente');
});

test('Resizing honours the minimum size and stops at the edge of the desktop',()=>{
 const {xp}=boot();
 const rect={left:100,top:100,width:400,height:300};
 const area={minWidth:300,minHeight:180,width:1000,height:700};
 const box=(dir,dx,dy)=>{const r=xp.resizeBox(dir,rect,dx,dy,area);return {left:r.left,top:r.top,width:r.width,height:r.height};};
 assert.deepEqual(box('e',60,0),{left:100,top:100,width:460,height:300});
 assert.deepEqual(box('s',0,25),{left:100,top:100,width:400,height:325});
 // The left and top edges move the window while they resize it.
 assert.deepEqual(box('w',-40,0),{left:60,top:100,width:440,height:300});
 assert.deepEqual(box('n',0,-30),{left:100,top:70,width:400,height:330});
 // Shrinking past the minimum pins the opposite edge instead of dragging the window along.
 assert.deepEqual(box('w',5000,0),{left:200,top:100,width:300,height:300});
 assert.deepEqual(box('n',0,5000),{left:100,top:220,width:400,height:180});
 // Nothing may be dragged outside the desktop.
 assert.deepEqual(box('w',-5000,0),{left:0,top:100,width:500,height:300});
 assert.deepEqual(box('n',0,-5000),{left:100,top:0,width:400,height:400});
 assert.deepEqual(box('se',5000,5000),{left:100,top:100,width:900,height:600});
});

test('The taskbar has the tray flyout and every window edge can be grabbed',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/id="tray-toggle"/);
 assert.match(html,/id="tray-hidden" class="tray-hidden" hidden/);
 assert.equal((html.match(/data-tray="/g)||[]).length,3);
 assert.match(html,/id="show-desktop"[^>]*>\s*<img src="assets\/icons\/showdesktop\.png"/);
 // The dotted handle only belongs on an unlocked taskbar, and XP locks it by default.
 assert.doesNotMatch(html,/class="grip"/);
 const core=readFileSync(new URL('js/core.js',root),'utf8');
 assert.match(core,/\['n','s','e','w','ne','nw','se','sw'\]/);
 assert.match(core,/data-resize="se"/);
 const css=readFileSync(new URL('styles.css',root),'utf8');
 for(const dir of ['n','s','e','w','ne','nw','se','sw'])assert.ok(css.includes(`.resize-${dir}{`),`.resize-${dir} is styled`);
 assert.ok(css.includes('.tray-hidden[hidden]{display:none}'));
});

test('A dialog is as tall as its message, so nothing hides behind the title bar',()=>{
 const {xp,context}=boot();
 context.document.querySelector=()=>({getBoundingClientRect:()=>({height:700})});
 const dialog=(copy,row=41,bar=29)=>{
  const parts={'.title-bar':{offsetHeight:bar},'.dialog-body':{scrollHeight:copy},'.button-row':{offsetHeight:row}};
  const win={el:{style:{},querySelector:selector=>parts[selector]},body:{}};
  xp.fitDialog(win);return win.el.style;
 };
 // 29 title bar + message + 41 buttons + 3 border
 assert.equal(dialog(80).height,'153px');
 assert.equal(dialog(80).top,'256px');
 assert.equal(dialog(300).height,'373px');
 // Short messages keep the classic dialog proportions.
 assert.equal(dialog(20).height,'130px');
 // A message taller than the desktop stops at its edge and scrolls inside instead.
 assert.equal(dialog(2000).height,'676px');
 assert.equal(dialog(2000).top,'0px');
});

test('The local games site can start every game the desktop has',()=>{
 const {xp}=boot();
 const page=xp.searchWeb('játékok')[0];
 assert.equal(page.url,'www.jatekbarlang.hu');
 const games=xp.state.files.filter(f=>f.type==='shortcut').map(f=>f.app).sort();
 assert.deepEqual(Array.from(games),['freecell','hearts','mines','pinball','solitaire','spider']);
 for(const app of games)assert.ok(page.body.includes(`data-app="${app}"`),`${app} has a launch button on the page`);
 // Every one of them is also findable by name.
 for(const term of ['freecell','pinball','hearts','pókpasziánsz'])assert.equal(xp.searchWeb(term)[0]?.id,'games',`${term} leads to the games site`);
});
