import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual startup handlers against a deterministic clock.
function startSession(outcomes=['played']){
  let now=0,nextId=1;
  const timers=new Map(),elements=new Map(),listeners=new Map(),sounds=[],notices=[],apps=new Map();let lastWindow;
  const element=()=>({hidden:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},clientHeight:900,clientWidth:1280,replaceChildren(){},append(){},setAttribute(){},addEventListener(){},remove(){},pause(){},currentTime:0});
  const $=selector=>{if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);};
  const xp={t:(text,params)=>String(text).replace(/\{(\w+)\}/g,(all,name)=>params&&params[name]!==undefined?params[name]:all), $, $$:selector=>selector.startsWith('.welcome-user')?[$('.welcome-user')]:[],esc:String,icon:()=>'',avatar:()=>'',avatarPath:()=>'',recycleIcon:()=>'recycle',accounts:()=>[{id:'admin',name:'Test',avatar:'chess',type:'admin',active:true,enabled:true}],switchUser:()=>false,parkSession(){},closeParked(){},state:{files:[],iconPositions:{},user:'Test',showWelcome:false},register(name,fn){apps.set(name,fn);},persist(){},notify(title){notices.push(title);},hideMenus(){},applySettings(){},windows:new Map(),open(name){return apps.get(name)?.();},createWindow(){lastWindow={el:element(),body:element(),cleanup:[],close(){}};return lastWindow;},sound(name){sounds.push({name,time:now});const result=name==='startup'?(outcomes.shift()||'played'):'played';return typeof result==='function'?result():Promise.resolve(result);}};
  const context=vm.createContext({XP:xp,document:{body:element(),createElement:element,addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(callback);}},window:{addEventListener(){}},innerWidth:1280,innerHeight:930,setTimeout(callback,delay){const id=nextId++;timers.set(id,{at:now+delay,callback});return id;},clearTimeout:id=>timers.delete(id),setInterval(){}});
  vm.runInContext(readFileSync(new URL('../js/desktop-grid.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../js/start.js',import.meta.url),'utf8'),context);
  const advance=async ms=>{const target=now+ms;while(true){const due=[...timers.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);now=due[1].at;due[1].callback();await Promise.resolve();}now=target;await Promise.resolve();};
  const power=action=>{xp.open(action==='logoff'?'logoff':'power');lastWindow.body.onclick({target:{closest:()=>({dataset:{power:action}})}});};
  return {$,sounds,notices,advance,listeners,power,state:xp.state};
}

// Booting stops at the logon screen; the desktop is only reached by clicking the account.
const BOOT=5500,WELCOME=2000;

test('Startup waits on the loading screen, then on the logon screen until the name is clicked',async()=>{
  const {$,sounds,advance}=startSession();
  await advance(BOOT-1);assert.equal($('#boot-screen').hidden,false);assert.equal(sounds.length,0);
  await advance(1);assert.equal($('#boot-screen').hidden,true);assert.equal($('#welcome-screen').hidden,false);
  // Nothing happens on its own from here, however long it waits.
  await advance(30000);assert.equal(sounds.length,0);assert.equal($('#welcome-screen').hidden,false);
  $('.welcome-user').onclick();
  await advance(WELCOME-1);assert.equal(sounds.length,0);assert.equal($('#welcome-screen').hidden,false);
  await advance(1);
  assert.deepEqual(sounds,[{name:'startup',time:BOOT+30000+WELCOME}]);
  assert.equal($('#welcome-screen').hidden,true);
});

test('Desktop clicks cannot replay the startup sound; another boot plays it once again',async()=>{
  const {$,sounds,advance,listeners}=startSession();
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  for(let i=0;i<3;i++)for(const callback of listeners.get('pointerdown')||[])callback({});
  assert.equal(sounds.length,1);
  $('#power-on').onclick();await advance(BOOT);assert.equal(sounds.length,1,'the logon screen makes no sound');
  $('.welcome-user').onclick();await advance(WELCOME);
  assert.equal(sounds.length,2);assert.equal($('#welcome-screen').hidden,true);
});

test('A refused sound leaves the user on the logon screen to try once more',async()=>{
  const {$,sounds,advance}=startSession(['blocked','played']);
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.equal(sounds.length,1);
  assert.equal($('#welcome-screen').hidden,false,'the desktop is not shown without its sound');
  await $('.welcome-user').onclick();
  assert.equal(sounds.length,2);assert.equal($('#welcome-screen').hidden,true);
});

test('Logoff, restart and shutdown followed by power-on each replay the startup sound',async()=>{
  const {$,sounds,advance,power}=startSession();
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  power('logoff');$('.welcome-user').onclick();await advance(WELCOME);
  power('restart');await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  power('shutdown');$('#power-on').onclick();await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.equal(sounds.filter(s=>s.name==='startup').length,4);assert.equal($('#welcome-screen').hidden,true);
});

test('Muted sound settings allow login without retrying playback',async()=>{
  const {$,sounds,advance}=startSession(['muted']);
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.equal($('#welcome-screen').hidden,true);assert.equal(sounds.length,1);
});

test('An obsolete pending playback cannot dismiss the loading screen of a newer boot',async()=>{
  let finish;const {$,advance}=startSession([()=>new Promise(resolve=>finish=resolve)]);
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  $('#power-on').onclick();finish('played');await advance(0);
  assert.equal($('#boot-screen').hidden,false);
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.equal($('#welcome-screen').hidden,true);
});

test('An unreadable audio file does not leave the desktop inaccessible',async()=>{
  const {$,advance}=startSession(['error']);
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.equal($('#welcome-screen').hidden,true);
});

test('The welcome tip greets the first arrival only',async()=>{
  const {$,sounds,notices,advance,state,power}=startSession(['played','played','played']);
  state.showWelcome=true;
  await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.deepEqual(notices,['Üdv a Windows XP-ben!']);
  assert.equal(state.showWelcome,false,'the desktop remembers having said it');
  // Logging out and back in does not repeat it, and neither does another boot.
  power('logoff');$('.welcome-user').onclick();await advance(WELCOME);
  power('restart');await advance(BOOT);$('.welcome-user').onclick();await advance(WELCOME);
  assert.deepEqual(notices,['Üdv a Windows XP-ben!']);
  assert.ok(sounds.length>1,'the startup sound still plays each time');
});
