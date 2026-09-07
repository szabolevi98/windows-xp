import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);

function load(){
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){},createElement:()=>({})},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console,Math});
 vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/taskmgr.js',root),'utf8'),context);
 return context.XP;
}

test('The process list is the services the machine always runs plus one process per open program',()=>{
 const xp=load();
 const idle=xp.taskProcesses([]);
 // Nothing is open, so every process on the list belongs to the system.
 assert.ok(idle.length>=12,'the standing services are all there');
 assert.ok(idle.every(process=>process.app===null),'none of them belongs to a window');
 for(const name of ['System Idle Process','csrss.exe','winlogon.exe','lsass.exe','explorer.exe'])
  assert.ok(idle.some(process=>process.name===name),`${name} is running`);

 const busy=xp.taskProcesses(['notepad','calculator','ie'],'Levente');
 assert.equal(busy.length,idle.length+3,'each open program adds exactly one process');
 const own=busy.slice(idle.length);
 // A program appears under the image name it would really run as, owned by whoever is signed in.
 assert.deepEqual(JSON.parse(JSON.stringify(own.map(process=>process.name))),['notepad.exe','calc.exe','iexplore.exe']);
 assert.ok(own.every(process=>process.user==='Levente'));
 assert.ok(own.every(process=>process.memory>0),'each one reports its memory');
 // The signed-in name only reaches the programs; services keep their own accounts.
 assert.equal(busy.find(process=>process.name==='csrss.exe').user,'SYSTEM');
 // A program with no name of its own still gets a plausible one.
 assert.equal(xp.taskProcesses(['whatever']).at(-1).name,'whatever.exe');
});

test('The Task Manager is a program of its own, reachable the way XP offered it',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/js\/taskmgr\.js/,'the program is loaded');
 assert.match(html,/taskmgr\.css/,'its styles are loaded');
 const source=readFileSync(new URL('js/taskmgr.js',root),'utf8');
 // Ctrl+Shift+Esc and Ctrl+Alt+Del both opened it, and both still do.
 assert.match(source,/ctrlKey&&event\.shiftKey&&event\.key==='Escape'/);
 assert.match(source,/ctrlKey&&event\.altKey&&event\.key==='Delete'/);
 assert.match(source,/XP\.singleton\('taskmgr'\)/,'only one copy ever runs');
 assert.match(source,/clearInterval\(tick\)/,'the live graphs stop when the window closes');
 // Every tab XP had.
 for(const tab of ['Alkalmazások','Folyamatok','Teljesítmény','Hálózat','Felhasználók'])
  assert.ok(source.includes(tab),`the ${tab} tab is there`);
 assert.match(readFileSync(new URL('js/start.js',root),'utf8'),/\['Feladatkezelő','computer','taskmgr'\]/,'it is listed under All Programs');
 // Both the Run box and the command prompt know its executable name.
 assert.match(readFileSync(new URL('js/utilities.js',root),'utf8'),/taskmgr:'taskmgr'/);
 assert.match(readFileSync(new URL('js/apps.js',root),'utf8'),/taskmgr:'taskmgr'/);
});
