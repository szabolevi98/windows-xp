import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual startup handlers against a deterministic clock.
function startSession(outcomes=['played']){
  let now=0,nextId=1;
  const timers=new Map(),elements=new Map(),listeners=new Map(),sounds=[],apps=new Map();let lastWindow;
  const element=()=>({hidden:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},clientHeight:900,clientWidth:1280,replaceChildren(){},append(){},setAttribute(){},addEventListener(){},pause(){},currentTime:0});
  const $=selector=>{if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);};
  const xp={$, $$:()=>[],esc:String,icon:()=>'',state:{files:[],iconPositions:{},user:'Test',showWelcome:false},register(name,fn){apps.set(name,fn);},persist(){},notify(){},hideMenus(){},applySettings(){},windows:new Map(),open(name){return apps.get(name)?.();},createWindow(){lastWindow={el:element(),body:element(),close(){}};return lastWindow;},sound(name){sounds.push({name,time:now});const result=name==='startup'?(outcomes.shift()||'played'):'played';return typeof result==='function'?result():Promise.resolve(result);}};
  const context=vm.createContext({XP:xp,document:{createElement:element,addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(callback);}},window:{addEventListener(){}},innerWidth:1280,innerHeight:930,setTimeout(callback,delay){const id=nextId++;timers.set(id,{at:now+delay,callback});return id;},clearTimeout:id=>timers.delete(id),setInterval(){}});
  vm.runInContext(readFileSync(new URL('../js/desktop-grid.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../js/start.js',import.meta.url),'utf8'),context);
  const advance=async ms=>{const target=now+ms;while(true){const due=[...timers.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);now=due[1].at;due[1].callback();await Promise.resolve();}now=target;await Promise.resolve();};
  const power=action=>{xp.open(action==='logoff'?'logoff':'power');lastWindow.body.onclick({target:{closest:()=>({dataset:{power:action}})}});};
  return {$,sounds,advance,listeners,power};
}

test('Startup holds the loading screen for 5.5 seconds and plays sound with the desktop',async()=>{
  const {$,sounds,advance}=startSession();await advance(5499);assert.equal($('#boot-screen').hidden,false);assert.equal(sounds.length,0);
  await advance(1);assert.equal($('#boot-screen').hidden,true);assert.equal($('#welcome-screen').hidden,false);assert.equal(sounds.length,0);
  await advance(1999);assert.equal(sounds.length,0);await advance(1);
  assert.deepEqual(sounds,[{name:'startup',time:7500}]);assert.equal($('#welcome-screen').hidden,true);
});

test('Desktop clicks cannot replay the startup sound; another boot plays it once again',async()=>{
  const {$,sounds,advance,listeners}=startSession();await advance(7500);
  for(let i=0;i<3;i++)for(const callback of listeners.get('pointerdown')||[])callback({});
  assert.equal(sounds.length,1);$('#power-on').onclick();await advance(7499);assert.equal(sounds.length,1);await advance(1);assert.equal(sounds.length,2);assert.equal($('#welcome-screen').hidden,true);
});

test('An autoplay block after reload offers a login click and starts the sound before showing the desktop',async()=>{
  for(let reload=0;reload<2;reload++){
    const {$,sounds,advance}=startSession(['blocked','played']);await advance(7500);
    assert.equal($('#welcome-screen').hidden,false);assert.equal(typeof $('.welcome-user').onclick,'function');
    const login=$('.welcome-user').onclick();assert.equal(sounds.length,2);
    await login;assert.equal($('#welcome-screen').hidden,true);
    await $('.welcome-user').onclick();assert.equal(sounds.length,2);
  }
});

test('Logoff, restart and shutdown followed by power-on each replay the startup sound',async()=>{
  const {$,sounds,advance,power}=startSession();await advance(7500);
  power('logoff');$('.welcome-user').onclick();await advance(2000);
  power('restart');await advance(7500);
  power('shutdown');$('#power-on').onclick();await advance(7500);
  assert.equal(sounds.filter(s=>s.name==='startup').length,4);assert.equal($('#welcome-screen').hidden,true);
});

test('Muted sound settings allow login without retrying playback',async()=>{
  const muted=startSession(['muted']);await muted.advance(7500);assert.equal(muted.$('#welcome-screen').hidden,true);
  assert.equal(muted.sounds.length,1);
});

test('An obsolete pending playback cannot dismiss the loading screen of a newer boot',async()=>{
  let finish;const {$,advance}=startSession([()=>new Promise(resolve=>finish=resolve)]);
  await advance(7500);$('#power-on').onclick();finish('played');await advance(0);
  assert.equal($('#boot-screen').hidden,false);await advance(7500);assert.equal($('#welcome-screen').hidden,true);
});

test('An unreadable audio file does not leave the desktop inaccessible',async()=>{
  const {$,advance}=startSession(['error']);await advance(7500);assert.equal($('#welcome-screen').hidden,true);
});
