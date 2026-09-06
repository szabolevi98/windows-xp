import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function boot(saved){
 const storage=new Map();if(saved)storage.set('windows-xp-simulator-v1',JSON.stringify(saved));
 // Enough of an element for the balloon notice, which refusals raise.
 const element={hidden:true,innerHTML:'',onclick:null,querySelector:()=>element};
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){},querySelector:()=>element},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
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
test('A file can be moved between folders, but not onto a name that is taken or into itself',()=>{
 const {xp}=boot();
 xp.saveFile({id:'note',name:'Jegyzet.txt',type:'text',parent:'documents',content:'szoveg'});
 assert.equal(xp.moveFile('note','desktop'),true);
 assert.equal(xp.state.files.find(f=>f.id==='note').parent,'desktop');
 assert.equal(xp.state.files.find(f=>f.id==='note').content,'szoveg');
 // Moving somewhere it already is changes nothing.
 assert.equal(xp.moveFile('note','desktop'),false);
 // A folder cannot swallow itself or anything it contains.
 xp.saveFile({id:'outer',name:'Kint',type:'folder',parent:'documents'});
 xp.saveFile({id:'inner',name:'Bent',type:'folder',parent:'outer'});
 assert.equal(xp.moveFile('outer','outer'),false);
 assert.equal(xp.moveFile('outer','inner'),false);
 assert.equal(xp.state.files.find(f=>f.id==='outer').parent,'documents');
 // Two items in one folder cannot share a name.
 xp.saveFile({id:'twin',name:'Jegyzet.txt',type:'text',parent:'documents',content:''});
 assert.equal(xp.moveFile('twin','desktop'),false);
 assert.equal(xp.state.files.find(f=>f.id==='twin').parent,'documents');
 // A deleted file is not somewhere to move things.
 xp.deleteFile('twin');
 assert.equal(xp.moveFile('twin','desktop'),false);
});

test('Copying duplicates the whole subtree under a free name; cutting moves it once',()=>{
 const {xp}=boot();
 xp.saveFile({id:'folder',name:'Mappa',type:'folder',parent:'documents'});
 xp.saveFile({id:'note',name:'Bent.txt',type:'text',parent:'folder',content:'tartalom'});
 // A copy is a new tree: fresh ids, same content, and the name steps aside.
 assert.equal(xp.clip('folder',false),true);
 assert.equal(xp.clipped,null);
 assert.equal(xp.paste('documents'),true);
 const copy=xp.state.files.find(f=>!f.deleted&&f.name==='Mappa (2)');
 const copiedNote=xp.state.files.find(f=>!f.deleted&&f.parent===copy.id);
 assert.equal(copiedNote.name,'Bent.txt');
 assert.equal(copiedNote.content,'tartalom');
 assert.notEqual(copiedNote.id,'note');
 assert.equal(xp.state.files.find(f=>f.id==='note').parent,'folder');
 // Pasting again keeps counting instead of colliding.
 xp.paste('documents');
 assert.ok(xp.state.files.some(f=>!f.deleted&&f.name==='Mappa (3)'));
 // The clipboard survives a copy, so it can be pasted somewhere else too.
 assert.equal(xp.canPaste(),true);
 // A cut is marked, moves once, and then the clipboard is spent.
 assert.equal(xp.clip('note',true),true);
 assert.equal(xp.clipped,'note');
 assert.equal(xp.paste('desktop'),true);
 assert.equal(xp.state.files.find(f=>f.id==='note').parent,'desktop');
 assert.equal(xp.canPaste(),false);
 assert.equal(xp.paste('documents'),false);
 // Nothing that is gone can be cut or copied.
 xp.deleteFile('folder');
 assert.equal(xp.clip('folder',true),false);
 // An extension is kept on the far side of the counter.
 xp.saveFile({id:'pic',name:'Rajz.png',type:'image',parent:'documents',content:'data:,'});
 xp.clip('pic',false);xp.paste('documents');
 assert.ok(xp.state.files.some(f=>!f.deleted&&f.name==='Rajz (2).png'));
});

test('The Recycle Bin shows whether it holds anything',()=>{
 const {xp}=boot();
 assert.equal(xp.recycleIcon(),'recycle');
 xp.saveFile({id:'note',name:'Jegyzet.txt',type:'text',parent:'documents',content:''});
 assert.equal(xp.recycleIcon(),'recycle');
 xp.deleteFile('note');
 assert.equal(xp.recycleIcon(),'recycle-full');
 xp.restoreFile('note');
 assert.equal(xp.recycleIcon(),'recycle');
 // Emptying it for good leaves the bin empty as well.
 xp.deleteFile('note');
 xp.state.files=xp.state.files.filter(f=>!f.deleted);
 assert.equal(xp.recycleIcon(),'recycle');
 // Both faces resolve to a file that ships.
 for(const name of ['recycle','recycle-full'])assert.ok(existsSync(new URL(xp.iconPath(name),root)),name);
 assert.match(xp.iconPath('recycle-full'),/\.png$/);
});

test('An empty bin is emptied without asking, and without touching anything',async()=>{
 const {xp}=boot();
 // No confirmation dialog is raised, which in this harness would need a real DOM:
 // reaching one here would throw, so the early return is what keeps this quiet.
 assert.equal(await xp.emptyTrash(),false);
 assert.equal(xp.state.files.some(f=>f.deleted),false);
 const before=xp.state.files.length;
 xp.saveFile({id:'note',name:'Jegyzet.txt',type:'text',parent:'documents',content:'x'});
 xp.deleteFile('note');
 assert.equal(xp.state.files.length,before+1,'a deleted file is kept until the bin is emptied');
 assert.equal(xp.recycleIcon(),'recycle-full');
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
test('The share card points at an image that ships, at the size it claims',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 const meta=name=>html.match(new RegExp(`<meta property="${name}" content="([^"]+)"`))?.[1];
 const site='https://windows-xp.levente.net/';
 assert.equal(meta('og:url'),site);
 for(const tag of ['og:title','og:description','og:type'])assert.ok(meta(tag),tag);
 // Facebook and Slack need an absolute URL, so the local file has to be found through it.
 const image=meta('og:image');
 assert.ok(image.startsWith(site),image);
 const file=new URL('assets/'+image.slice((site+'assets/').length),root);
 assert.ok(existsSync(file),image);
 // A JPEG's real size, read off its start-of-frame marker.
 const bytes=readFileSync(file);
 let at=2,size=null;
 while(at<bytes.length-9&&!size){
  if(bytes[at]!==0xff){at++;continue;}
  const marker=bytes[at+1];
  if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker)){size={height:bytes.readUInt16BE(at+5),width:bytes.readUInt16BE(at+7)};break;}
  at+=2+bytes.readUInt16BE(at+2);
 }
 assert.deepEqual(size,{width:Number(meta('og:image:width')),height:Number(meta('og:image:height'))});
 assert.equal(size.width,1200);assert.equal(size.height,630);
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
 assert.equal((html.match(/data-tray="/g)||[]).length,2);
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

test('The Security Centre starts protected and remembers a switch that was turned off',()=>{
 const {xp,storage}=boot();
 assert.equal(xp.state.security.firewall,true);
 assert.equal(xp.state.security.updates,true);
 xp.state.security.firewall=false;xp.persist();
 const next=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.security.firewall,false);
 assert.equal(next.state.security.updates,true);
 // A save made before the Security Centre existed still comes up protected.
 assert.equal(boot({version:1,user:'Teszt',files:[]}).xp.state.security.firewall,true);
});

test('The Security Centre is a window, reachable from the tray, the control panel and the prompt',()=>{
 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 assert.match(utils,/register\('security'/);
 assert.match(utils,/title:'Windows Biztonsági központ'/);
 assert.match(utils,/security:\{name:'Biztonsági központ'[^}]*XP\.open\('security'\)/);
 assert.match(utils,/wscui:'security'/);
 assert.match(readFileSync(new URL('js/apps.js',root),'utf8'),/wscui:'security'/);
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 // The shield opens the window now; the icons left in the flyout still show a notice.
 assert.doesNotMatch(start,/security:\['Biztonsági központ'/);
 assert.match(start,/else XP\.open\(button\.dataset\.tray\)/);
});

test('Every control panel category leads to applets that exist, in both views',()=>{
 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 const block=utils.slice(utils.indexOf('const applets={'),utils.indexOf('let classic='));
 const applets=new Set(Array.from(block.matchAll(/^\s*([a-z]+):\{name:/gm),m=>m[1]));
 const categories=Array.from(block.matchAll(/id:'([a-z]+)',name:'([^']+)'/g),m=>m[1]);
 assert.ok(applets.size>=12,'the classic view lists the individual applets');
 assert.ok(categories.length>=9,'the category view keeps the original XP categories');
 const items=Array.from(block.matchAll(/items:\[([^\]]+)\]/g)).flatMap(m=>m[1].split(',').map(s=>s.trim().replace(/'/g,'')));
 for(const id of items)assert.ok(applets.has(id),`the ${id} applet exists`);
 // Every applet is reachable from some category, so the two views show the same set.
 for(const id of applets)assert.ok(items.includes(id),`${id} sits in a category`);
 assert.match(utils,/state\.controlClassic/,'the chosen view is remembered');
});

test('Every Paint tool shows one whole icon and no piece of its neighbours',()=>{
 const css=readFileSync(new URL('styles.css',root),'utf8');
 // The strip is drawn on a box exactly one cell wide, so nothing either side can show through.
 assert.match(css,/\.paint-tool:before\{[^}]*width:16px;height:16px[^}]*paint-tools\.png/);
 assert.doesNotMatch(css,/\.paint-tool[^:{]*\{[^}]*background-image:url\('assets\/icons\/paint-tools\.png'\)/);
 const apps=readFileSync(new URL('js/apps.js',root),'utf8');
 const list=apps.slice(apps.indexOf('const tools=['),apps.indexOf('layout.innerHTML'));
 const tools=Array.from(list.matchAll(/\['([a-z]+)','/g),m=>m[1]);
 assert.equal(tools.length,9,'the toolbox still holds nine tools');
 for(const tool of tools)assert.match(css,new RegExp(`\\.paint-tool\\[data-tool=${tool}\\]\\{--tool:\\d+\\}`),`${tool} names a cell`);
 const cells=Array.from(css.matchAll(/\.paint-tool\[data-tool=[a-z]+\]\{--tool:(\d+)\}/g),m=>Number(m[1]));
 assert.equal(new Set(cells).size,cells.length,'no two tools share a cell');
 // The cells have to exist in the image itself.
 const sprite=readFileSync(new URL('assets/icons/paint-tools.png',root));
 const width=sprite.readUInt32BE(16),height=sprite.readUInt32BE(20);
 assert.equal(height,16);
 for(const cell of cells)assert.ok(cell*16<width,`cell ${cell} is inside the ${width}px strip`);
});

test('The interface never tells the user it is a simulation',()=>{
 const files=['js/core.js','js/apps.js','js/internet.js','js/utilities.js','js/start.js','js/games.js',
  'js/cardgames.js','js/explorer.js','js/pinball.js','js/desktop-grid.js','index.html'];
 // The <head> metadata describes the page to search engines and link previews;
 // it is never shown inside the desktop, so it may say what this is.
 const inCharacter=file=>readFileSync(new URL(file,root),'utf8').replace(/<meta [^>]*>/g,'');
 for(const file of files)assert.doesNotMatch(inCharacter(file),/szimul/i,`${file} stays in character`);
});

test('The settings sit where XP kept them, and one Service Pack is claimed everywhere',()=>{
 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 const labels=name=>{
  const block=utils.slice(utils.indexOf(name));
  const line=block.slice(block.indexOf('tabs:['));
  return Array.from(line.slice(0,line.indexOf('\n')).matchAll(/\['[a-z]+','([^']+)'\]/g),m=>m[1]);
 };
 assert.deepEqual(labels('function displayProperties('),['Témák','Asztal','Képernyőkímélő','Megjelenés','Beállítások']);
 assert.deepEqual(labels('function systemProperties('),['Általános','Számítógépnév','Hardver','Speciális','Automatikus frissítések']);
 assert.deepEqual(labels('function soundProperties('),['Hangerő','Hangok','Hang']);
 // Neither the account name nor the system facts belong on the display sheet.
 const display=utils.slice(utils.indexOf('function displayProperties('),utils.indexOf('function systemProperties('));
 assert.doesNotMatch(display,/Felhasználó neve/);
 assert.doesNotMatch(display,/system-facts/);
 // The name is changed where the account is.
 assert.match(utils,/function userAccounts\(\)/);
 assert.match(utils,/A fiók nevének megváltoztatása/);
 const packs=new Set(Array.from(utils.matchAll(/Service Pack (\d)/g),m=>m[1]));
 assert.deepEqual(Array.from(packs),['3']);
});

test('The desktop remembers the account picture, the computer name and the screensaver',()=>{
 const {xp,storage}=boot();
 assert.equal(xp.state.avatar,'chess');
 assert.equal(xp.state.accountType,'admin');
 assert.equal(xp.state.computerName,'OTTHONI-PC');
 assert.equal(xp.state.wallpaperFit,'fill');
 assert.equal(xp.state.screensaver.name,'none');
 Object.assign(xp.state,{avatar:'guitar',computerName:'NAPPALI-PC',wallpaperFit:'tile',screensaver:{name:'stars',minutes:3}});
 xp.persist();
 const next=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
 assert.equal(next.state.avatar,'guitar');
 assert.equal(next.state.computerName,'NAPPALI-PC');
 assert.equal(next.state.wallpaperFit,'tile');
 assert.equal(next.state.screensaver.minutes,3);
 // A save made before any of this still comes up with the defaults.
 assert.equal(boot({version:1,user:'Teszt',files:[]}).xp.state.avatar,'chess');
 // Pictures chosen before the original tiles arrived named an application icon, not a photograph.
 assert.equal(boot({version:1,user:'Teszt',avatar:'favorite',files:[]}).xp.state.avatar,'chess');
});

test('Account pictures come from the bundled tiles, and a name from elsewhere cannot escape that folder',()=>{
 const {xp}=boot();
 assert.ok(xp.avatars.includes('chess')&&xp.avatars.includes('guitar'));
 for(const name of xp.avatars)assert.equal(xp.avatarPath(name),`assets/avatars/${name}.png`);
 for(const name of ['user','favorite','../../etc/passwd','',null,undefined])
  assert.equal(xp.avatarPath(name),'assets/avatars/chess.png');
 // The picker offers exactly the bundled tiles, so no entry can point at a missing file.
 assert.match(readFileSync(new URL('js/utilities.js',root),'utf8'),/const pictures=XP\.avatars\.map/);
});
