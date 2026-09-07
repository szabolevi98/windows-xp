import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
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
  document:{body:element(),addEventListener(){},dispatchEvent(){},querySelector:()=>element(),createElement:element},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},
  Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
 vm.runInContext(read('js/core.js'),context);
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
 assert.match(read('js/taskmgr.js'),/account\.active\?'Aktív':'Leválasztva'/);
});
