import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),iniPath='/libsdl/SpaceCadetPinball/imgui_pb.ini';
function host(){
 const handlers={},keyboard={},sent=[],events=[],timers=new Map(),files=new Map();let timerId=0,closed=0,pausedLoops=0;
 const canvas={addEventListener(){},focus(){events.push({type:'canvas-focus'});},dispatchEvent(event){events.push(event);}};
 const loading={hidden:false,textContent:''};
 const parent={postMessage(message){sent.push(message);}};
 const document={getElementById:id=>id==='canvas'?canvas:loading,createElement:()=>({}),body:{append(){}},addEventListener:(type,fn)=>keyboard[type]=fn};
 const context=vm.createContext({document,parent,location:{origin:'http://localhost'},window:{focus(){events.push({type:'window-focus'});},addEventListener:(type,fn)=>handlers[type]=fn},console,Uint8Array,atob,
  KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id),
  FS:{mkdirTree(){},writeFile:(path,value)=>files.set(path,value),readFile:path=>{if(!files.has(path))throw Error('absent');return files.get(path);}}
 });
 vm.runInContext(readFileSync(new URL('assets/pinball/host.js',root),'utf8'),context);
 const message=(data,source=parent,origin='http://localhost')=>handlers.message({source,origin,data:{channel:'xp-space-cadet',...data}});
 const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());};
 function ready(ini=''){
  message({type:'init',volume:.55,ini});context.Module.preRun.forEach(fn=>fn());
  context.Module.SDL2={audioContext:{destination:{},createGain:()=>({gain:{value:1},connect(){}}),resume:()=>Promise.resolve(),suspend:()=>Promise.resolve(),close(){closed++;return Promise.resolve();}},audio:{scriptProcessorNode:{disconnect(){},connect(){}}}};
  context.Module.pauseMainLoop=()=>pausedLoops++;
  context.Module.postRun.forEach(fn=>fn());flush();events.length=0;
 }
 return {context,handlers,keyboard,sent,events,files,message,flush,ready,get closed(){return closed;},get pausedLoops(){return pausedLoops;}};
}
test('Pinball accepts initialization only from its own parent and restores local settings',()=>{
 const h=host();h.message({type:'init'},{});assert.equal(h.context.Module,undefined);
 h.message({type:'init'},undefined,'https://example.com');assert.equal(h.context.Module,undefined);
 h.ready('[Pinball][Settings]\nSounds=1\n');assert.equal(h.files.get(iniPath),'[Pinball][Settings]\nSounds=1\n');assert.ok(h.sent.some(m=>m.type==='ready'));
});
test('Pausing releases held controls and resumes only once, respecting mute',()=>{
 const h=host();h.ready();h.message({type:'key',code:'KeyZ',down:true});
 h.message({type:'state',paused:true,volume:.55});
 assert.ok(h.events.some(e=>e.code==='KeyZ'&&e.type==='keyup'));assert.equal(h.context.GAME_SOUND_ENABLED,false);
 const pauses=h.events.filter(e=>e.code==='F3'&&e.type==='keydown').length;
 h.message({type:'state',paused:true,volume:.55});assert.equal(h.events.filter(e=>e.code==='F3'&&e.type==='keydown').length,pauses);
 h.flush();h.message({type:'state',paused:false,volume:0});assert.equal(h.context.GAME_SOUND_ENABLED,false);
 h.message({type:'state',paused:false,volume:.7});assert.equal(h.context.GAME_SOUND_ENABLED,true);
});
test('Losing focus releases the plunger and a new game resets a paused table',()=>{
 const h=host();h.ready();h.message({type:'key',code:'Space',down:true});h.handlers.blur();
 assert.equal(h.events.at(-1).type,'keyup');assert.equal(h.events.at(-1).code,'Space');
 h.message({type:'state',paused:true,volume:.5});h.flush();h.message({type:'new'});
 assert.ok(h.events.some(e=>e.type==='keydown'&&e.code==='F2'));assert.equal(h.context.GAME_SOUND_ENABLED,true);
});
test('Closing Pinball saves settings, stops the loop and closes audio exactly once',()=>{
 const h=host();h.ready();h.files.set(iniPath,'[Pinball][Settings]\nSounds=0\n');h.handlers.pagehide();h.handlers.pagehide();
 assert.equal(h.sent.filter(m=>m.type==='save').length,1);assert.equal(h.sent.find(m=>m.type==='save').ini,h.files.get(iniPath));
 assert.equal(h.closed,1);assert.equal(h.pausedLoops,1);
 h.message({type:'key',code:'KeyZ',down:true});assert.ok(!h.events.some(e=>e.code==='KeyZ'&&e.type==='keydown'));
});

test('Reactivating the Pinball chrome focuses the game before unpausing, even for repeated identical state',()=>{
 const h=host();h.ready();h.message({type:'state',paused:true,volume:.5});h.flush();h.events.length=0;
 h.message({type:'state',paused:false,volume:.5,focus:true});
 assert.equal(h.events[0].type,'window-focus');assert.equal(h.events[1].type,'canvas-focus');
 assert.ok(h.events.slice(2).some(e=>e.code==='F3'&&e.type==='keydown'));
 h.events.length=0;h.message({type:'state',paused:false,volume:.5,focus:true});
 assert.deepEqual(h.events.map(e=>e.type),['window-focus','canvas-focus']);
 h.events.length=0;h.message({type:'state',paused:true,volume:.5,focus:false});
 assert.ok(h.events.every(e=>!e.type.includes('focus')));
});

test('Rapid pause and resume still deliver two distinct game commands',()=>{
 const h=host();h.ready();
 h.message({type:'state',paused:true,volume:.5});
 h.message({type:'state',paused:false,volume:.5});
 assert.equal(h.events.filter(e=>e.code==='F3'&&e.type==='keydown').length,2);
});
test('Pinball has local-only resources and confines dynamic evaluation to its game document',()=>{
 const main=readFileSync(new URL('index.html',root),'utf8');assert.doesNotMatch(main,/unsafe-eval/);
 const page=readFileSync(new URL('assets/pinball/index.html',root),'utf8');assert.match(page,/connect-src 'none'/);assert.match(page,/frame-src 'none'/);
 for(const [,src] of page.matchAll(/(?:src|href)="([^"]+)"/g))assert.doesNotMatch(src,/^(?:https?:)?\/\//);
 const hostCode=readFileSync(new URL('assets/pinball/host.js',root),'utf8');assert.match(hostCode,/script.src='vendor.js'/);
});
