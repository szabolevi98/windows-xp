import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {installHungarian,key} from './i18n-test-helper.mjs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

// An element that remembers its classes, so parking can be observed.
function element(){
 const classes=new Set();
 return {hidden:true,innerHTML:'',style:{},dataset:{},title:'',className:'',
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),
   toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)},
  querySelector:()=>element(),append(){},remove(){this.removed=true;},replaceChildren(){},
  setAttribute(){},addEventListener(){}};
}
function boot(){
 const context=vm.createContext({window:{addEventListener(){}},
  document:{documentElement:{dataset:{}},body:element(),addEventListener(){},dispatchEvent(){},querySelector:()=>element(),createElement:element},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},
  Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
 installHungarian(context);vm.runInContext(read('js/core.js'),context);
 return context.window.XP;
}
// A stand-in for a running program: a window with something to clean up.
function fakeWindow(xp,id,app){
 const win={id,app,icon:app,title:app,el:element(),cleanup:[],stopped:false,parkedTimes:0,wokeTimes:0};
 win.cleanup.push(()=>win.stopped=true);
 win.onPark=()=>win.parkedTimes++;
 win.onUnpark=()=>win.wokeTimes++;
 xp.windows.set(id,win);
 return win;
}

test('Switching users parks the running programs instead of closing them',()=>{
 const xp=boot();
 const notepad=fakeWindow(xp,'win-1','notepad'),pinball=fakeWindow(xp,'win-2','pinball');
 assert.equal(xp.switchUser('guest'),true);
 // The other account sees an empty desk, but nothing was shut down.
 assert.equal(xp.windows.size,0);
 assert.equal(notepad.stopped,false);
 assert.equal(pinball.stopped,false);
 assert.equal(notepad.parked,true);
 assert.equal(notepad.el.classList.contains('parked'),true,'the window is hidden where it stands');
 assert.equal(notepad.el.removed,undefined,'and never taken out of the page');
 assert.equal(notepad.parkedTimes,1);
 // The logon screen can say how many programs are still running there.
 assert.equal(xp.accountInfo('admin').running,2);
 assert.equal(xp.accountInfo('guest').running,0);

 const calculator=fakeWindow(xp,'win-3','calculator');
 assert.equal(xp.switchUser('admin'),true);
 // Back to the same two windows, the same objects, awake again.
 assert.deepEqual([...xp.windows.keys()],['win-1','win-2']);
 assert.equal(xp.windows.get('win-1'),notepad);
 assert.equal(notepad.parked,false);
 assert.equal(notepad.el.classList.contains('parked'),false);
 assert.equal(notepad.wokeTimes,1);
 // And the guest's program is now the one waiting.
 assert.equal(calculator.parked,true);
 assert.equal(calculator.stopped,false);
 assert.equal(xp.accountInfo('guest').running,1);
});

test('Coming back to the account you parked wakes its programs',()=>{
 const xp=boot();
 const notepad=fakeWindow(xp,'win-1','notepad');
 assert.equal(xp.parkSession(),true);
 assert.equal(xp.windows.size,0);
 assert.equal(xp.accountInfo('admin').running,1);
 // Clicking your own name on the logon screen brings the session back.
 assert.equal(xp.switchUser('admin'),true);
 assert.equal(xp.windows.get('win-1'),notepad);
 assert.equal(notepad.parked,false);
 assert.equal(notepad.wokeTimes,1);
 // With nothing running there is nothing to park.
 xp.windows.clear();
 assert.equal(xp.parkSession(),false);
});

test('Restarting the machine ends the parked sessions too',()=>{
 const xp=boot();
 const notepad=fakeWindow(xp,'win-1','notepad');
 xp.switchUser('guest');
 assert.equal(notepad.stopped,false);
 xp.closeParked();
 assert.equal(notepad.stopped,true,'its timers are stopped');
 assert.equal(notepad.el.removed,true,'and the window leaves the page');
 assert.equal(xp.accountInfo('admin').running,0);
});

test('A parked program keeps to itself while somebody else works',()=>{
 const core=read('js/core.js');
 // Hidden where it stands: moving the element would reload anything it holds, the Pinball frame included.
 assert.match(read('styles.css'),/\.window\.parked,\.modal-shade\.parked\{display:none!important\}/);
 assert.match(core,/win\.el\.classList\.add\('parked'\)/);
 assert.doesNotMatch(core,/parkSession[\s\S]{0,400}win\.el\.remove\(\)/,'parking never detaches the window');
 // A parked window does not redraw from the other account's files.
 assert.match(core,/const guarded=\(\)=>\{if\(!win\.parked\)fn\(\);\}/);
 assert.match(read('js/taskmgr.js'),/setInterval\(\(\)=>\{\s*\n\s*if\(w\.parked\)return;/);
 // Nor does it play music at them.
 assert.match(read('js/player.js'),/w\.onPark=\(\)=>\{playingWhenParked=!media\.paused&&!media\.ended;media\.pause\(\);\}/);
 assert.match(read('js/player.js'),/w\.onUnpark=\(\)=>\{if\(playingWhenParked\)play\(\);\}/);
 // The Task Manager lists the other session as disconnected.
 assert.ok(read('js/taskmgr.js').includes(`account.active?t("${key('Aktív')}"):t("${key('Leválasztva')}")`));
});

test('The bin asks before it takes anything, and the windows sound like XP',()=>{
 const core=read('js/core.js');
 // XP never binned a file without asking first.
 assert.match(core,/async function trashFile\(id\)/);
 assert.ok(core.includes(key('Biztosan a Lomtárba helyezi ezt: „{name}”?')));
 assert.ok(core.includes(`t("${key('Mappa törlésének megerősítése')}"):t("${key('Fájl törlésének megerősítése')}")`));
 assert.match(core,/if\(!answer\)return false;/,'saying no leaves the file alone');
 assert.match(core,/if\(target\.type==='recycle'\)\{trashFile\(id\)/,'dropping on the bin asks too');
 const start=read('js/start.js');
 assert.match(start,/XP\.trashFile\(item\.file\)/);
 assert.doesNotMatch(start,/XP\.deleteFile\(item\.file\)/,'nothing on the desktop deletes silently');
 assert.match(read('js/explorer.js'),/await XP\.trashFile\(f\.id\)/);

 // The events the default sound scheme covered.
 assert.match(core,/if\(!quiet\)sound\('minimize'\);/,'minimizing has its sound');
 assert.match(core,/function maximize\(win\)\{if\(win\.fixed\)return;sound\('restore'\)/);
 assert.match(core,/const waking=win\.minimized&&!win\.parked;/);
 assert.match(core,/if\(waking\)\{sound\('restore'\)/,'restoring from the taskbar sounds too');
 // Show desktop is one gesture, so it makes one sound.
 assert.match(start,/XP\.sound\('minimize'\);hiddenWindows\.forEach\(id=>XP\.minimize\(XP\.windows\.get\(id\),true\)\)/);
 // Logging off and shutting down were two different sounds.
 assert.match(start,/if\(a==='logoff'\)\{XP\.sound\('logoff'\)/);
 assert.match(start,/if\(a==='shutdown'\)\{closeAll\(\);XP\.closeParked\(\);XP\.sound\('shutdown'\)/);
 for(const file of ['minimize','restore','logoff'])
  assert.match(read('assets/sources.json'),new RegExp(`sounds/${file}\\.wav`),`${file}.wav is credited`);
});

test('The taskbar groups a crowded program, and every window carries its own menu',()=>{
 const core=read('js/core.js');
 // One button per program once the bar runs out of room, labelled the way XP labelled it.
 assert.match(core,/const fits=Math\.max\(1,Math\.floor\(\(container\.clientWidth\|\|600\)\/154\)\)/);
 assert.match(core,/const grouping=list\.length>fits/);
 assert.match(core,/function groupButton\(app,family\)/);
 assert.match(core,/const label=`\$\{family\.length\} \$\{programName\(family\[0\]\)\}`/);
 assert.ok(core.includes(`label:t("${key('Csoport kis mérete')}")`));
 assert.ok(core.includes(`label:t("${key('Csoport bezárása')}")`));
 assert.match(core,/const PROGRAMS=\{notepad:'Jegyzettömb'/,'the group knows the program name');
 // The window menu lives in one place and is reached three ways.
 assert.match(core,/function windowMenu\(win\)/);
 assert.match(core,/bar\.oncontextmenu=e=>\{[^}]*menu\(windowMenu\(win\)/,'title bar right click');
 assert.match(core,/\$\('img',bar\)\.onclick=/,'the title bar icon opens it too');
 assert.match(core,/if\(e\.altKey&&e\.key===' '&&active\)/,'and Alt+Space');
});

test('Windows fly to the taskbar and back, and the menus fade in',()=>{
 const core=read('js/core.js');
 // The window travels to its own task button, which it can only find if the button says so.
 assert.match(core,/b\.dataset\.win=win\.id/);
 assert.match(core,/const taskRect=win=>\$\(`\[data-win="\$\{win\.id\}"\]`\)/);
 assert.match(core,/function flyWindow\(win,rect,back\)/);
 assert.match(core,/flyWindow\(win,target\)\.then\(\(\)=>\{if\(win\.minimized\)win\.el\.hidden=true;\}\)/,'it hides only once it has arrived');
 assert.match(core,/if\(waking\)\{sound\('restore'\);const from=taskRect\(win\);win\.el\.hidden=false;flyWindow\(win,from,true\);\}/);
 // A frame callback never arrives in a hidden page, so the start state is forced by a reflow.
 assert.match(core,/void win\.el\.offsetWidth;/);
 assert.doesNotMatch(core,/requestAnimationFrame\(\(\)=>\{\s*style\.transition/);
 // Somebody who asked for less motion gets none of it.
 assert.match(core,/const motionOff=\(\)=>window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)\?\.matches/);
 const css=read('styles.css');
 for(const rule of ['menu-appear','start-appear','balloon-appear'])
  assert.match(css,new RegExp(`@keyframes ${rule}`),`${rule} is defined`);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('The pointers are the ones XP shipped, in the scheme the mouse settings name',()=>{
 const css=read('styles.css');
 // Buttons and title bars carry a cursor of their own in the browser, so they are named too.
 assert.match(css,/\*\{cursor:inherit\}/);
 assert.match(css,/body,button,\.title-bar,input\[type=range\]\{cursor:var\(--cursor-arrow\),default\}/);
 assert.match(css,/textarea,\[contenteditable\]\{cursor:var\(--cursor-beam\),text\}/);
 // Each edge and corner gets the arrow that belongs to it.
 assert.match(css,/\.resize-n,\.resize-s\{cursor:var\(--cursor-size-ns\),ns-resize\}/);
 assert.match(css,/\.resize-e,\.resize-w\{cursor:var\(--cursor-size-we\),ew-resize\}/);
 assert.match(css,/\.resize-ne,\.resize-sw\{cursor:var\(--cursor-size-nesw\),nesw-resize\}/);
 assert.match(css,/\.resize-nw,\.resize-se,\.resize-handle\{cursor:var\(--cursor-size-nwse\),nwse-resize\}/);
 assert.match(css,/\.paint-canvas,\.paint-surface canvas\{cursor:var\(--cursor-cross\),crosshair\}/);
 // The default is the white pointer with the dark outline, the one XP started with.
 assert.match(css,/:root\{\s*--cursor-arrow:url\('assets\/cursors\/default\/arrow\.cur\?v=\d+'\)/);
 for(const scheme of ['black','3d-white'])
  assert.ok(css.includes(`:root[data-cursors="${scheme}"]`),`the ${scheme} scheme is defined`);
 // Every cursor file is on the machine and credited.
 const sources=read('assets/sources.json');
 for(const scheme of ['default','black','3d-white'])
  for(const name of ['arrow','beam','cross','move','no','size-nesw','size-ns','size-nwse','size-we']){
   assert.ok(existsSync(new URL(`assets/cursors/${scheme}/${name}.cur`,root)),`${scheme}/${name}.cur is bundled`);
   assert.ok(sources.includes(`cursors/${scheme}/${name}.cur`),`${scheme}/${name}.cur is credited`);
  }
 // The white arrow is the black one with its two palette entries swapped.
 const palette=file=>{const data=readFileSync(new URL(`assets/cursors/${file}`,root));
  const image=data.readUInt32LE(18),colours=image+data.readUInt32LE(image);
  return [data.readUInt32LE(colours),data.readUInt32LE(colours+4)];};
 assert.deepEqual(palette('default/arrow.cur'),palette('black/arrow.cur').reverse(),'the default arrow is the white one');
 // The scheme is a setting, and the Control Panel offers it where XP did.
 const utils=read('js/utilities.js');
 assert.match(utils,/register\('mouse'/);
 assert.match(utils,/items:\['printers','mouse'\]/);
 assert.match(read('js/core.js'),/document\.documentElement\.dataset\.cursors=state\.cursors\|\|'default'/);
});

test('The caption buttons are drawn, not typed',()=>{
 const core=read('js/core.js'),css=read('styles.css');
 // The close button carries no character: its X is two rotated bars.
 assert.doesNotMatch(core,/window-control close"[^>]*>×/);
 assert.match(css,/\.window-control\.close:before,\.window-control\.close:after\{content:''/);
 assert.match(css,/\.window-control\.close:before\{transform:rotate\(45deg\)/);
 assert.match(css,/\.window-control\.close:after\{transform:rotate\(-45deg\)/);
 // The minimize bar sits low, the maximize box carries the thicker top edge.
 assert.match(css,/\.window-control\.minimize:after\{[^}]*height:2px/);
 assert.match(css,/\.window-control\.maximize:after\{[^}]*border-top-width:2px/);
 // Maximized, the same button shows the two overlapping squares of Restore.
 assert.match(css,/\.window\.maximized \.window-control\.maximize:after\{[^}]*box-shadow:2px -2px/);
 // The classic theme draws the same glyphs in black.
 assert.match(css,/data-theme=classic\] \.window-control\.close:before[^{]*\{[^}]*background:#000/);
});
