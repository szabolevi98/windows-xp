import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/storage.js',import.meta.url),'utf8');
const KEY='windows-xp-simulator-v1',LANG='windows-xp-simulator-lang';
const desktop=()=>({version:1,files:[{id:'note',name:'Árvíztűrő.txt',parent:'documents',type:'text',content:'eredeti'}],session:'admin',profiles:{guest:{files:[],user:'Vendég'}}});
function boot(store=new Map(),initialRaw) {
 if(initialRaw!==undefined)store.set(KEY,initialRaw);
 const events={},changes=[],writes=[];
 const localStorage={getItem:k=>store.get(k)??null,setItem(k,v){writes.push(k);store.set(k,v);},removeItem:k=>store.delete(k)};
 const context=vm.createContext({window:{addEventListener:(type,fn)=>events[type]=fn},localStorage});
 vm.runInContext(source,context);
 const api=context.window.XP_STORAGE,manager=api.create({key:KEY,defaults:desktop,onChange:kind=>changes.push(kind)});
 return {api,manager,store,writes,changes,events,localStorage};
}
const backup=state=>({format:'windows-xp-backup',version:1,language:'de',state});

test('Malformed JSON and invalid nested files are preserved without startup writes',()=>{
 for(const raw of ['{broken',JSON.stringify({version:1,files:[null]}),JSON.stringify({version:7,files:[]})]) {
  const {manager,store,writes}=boot(new Map(),raw);
  assert.equal(manager.kind,'recovery');assert.equal(manager.recovery,raw);
  assert.equal(manager.write(manager.initial),false);assert.equal(store.get(KEY),raw);assert.equal(writes.length,0);
 }
});
test('Valid legacy saves and both account file systems round-trip',()=>{
 const state=desktop();state.profiles.guest.files.push({id:'guest-note',name:'Vendég.txt',parent:'documents',type:'text',content:'vendég'});
 const {api,manager}=boot(new Map(),JSON.stringify(state));
 assert.equal(manager.kind,'saved');
 const parsed=api.parseBackup(JSON.stringify(backup(manager.initial)));
 assert.equal(parsed.state.files[0].content,'eredeti');assert.equal(parsed.state.profiles.guest.files[0].content,'vendég');assert.equal(parsed.language,'de');
});
test('Invalid imports reject recursive graphs, malformed collections and unsafe image sources',()=>{
 const {api}=boot();
 const invalid=[{...desktop(),files:[null]},{...desktop(),favorites:[null]},{...desktop(),webDemo:{messages:[null]}},{...desktop(),outlook:{own:[null]}},{...desktop(),files:[{id:'a',name:'Loop',parent:'a',type:'folder'}]},{...desktop(),files:[{id:'a',name:'Image',parent:'pictures',type:'image',content:'https://example.test/remote.png'}]}];
 for(const state of invalid)assert.throws(()=>api.parseBackup(JSON.stringify(backup(state))));
 assert.throws(()=>api.parseBackup('{"format":"windows-xp-backup","version":1,"language":"en","state":{"version":1,"files":[],"__proto__":{}}}'));
 assert.throws(()=>api.parseBackup(JSON.stringify({...backup(desktop()),language:'unknown'})));
});
test('A stale second page cannot overwrite documents written by the first page',()=>{
 const shared=new Map([[KEY,JSON.stringify(desktop())]]),first=boot(shared),second=boot(shared);
 first.manager.initial.files[0].content='első oldal';assert.equal(first.manager.write(first.manager.initial),true);
 second.manager.initial.files[0].content='elavult oldal';assert.equal(second.manager.write(second.manager.initial),false);
 assert.equal(second.manager.kind,'conflict');assert.equal(JSON.parse(shared.get(KEY)).files[0].content,'első oldal');
});
test('Storage events, including clearing storage, mark another page as stale',()=>{
 const {manager,store,events}=boot(new Map(),JSON.stringify(desktop()));
 store.delete(KEY);events.storage({key:null});assert.equal(manager.kind,'conflict');
 assert.equal(manager.write(manager.initial),false);assert.equal(store.has(KEY),false);
});
test('Quota failures are reported and can be retried without losing in-memory work',()=>{
 const {manager,localStorage,store}=boot(new Map(),JSON.stringify(desktop())),set=localStorage.setItem;
 manager.initial.files[0].content='még nincs elmentve';localStorage.setItem=()=>{throw new Error('QuotaExceededError');};
 assert.equal(manager.write(manager.initial),false);assert.equal(manager.kind,'error');assert.equal(JSON.parse(store.get(KEY)).files[0].content,'eredeti');
 localStorage.setItem=set;assert.equal(manager.write(manager.initial),true);assert.equal(manager.kind,'saved');
});
test('Restore writes language and both profiles, and old pagehide writes cannot undo it',()=>{
 const {manager,store}=boot(new Map(),JSON.stringify(desktop()));
 const restored=desktop();restored.files[0].content='visszaállítva';
 assert.equal(manager.replace(backup(restored),manager.current()),true);
 assert.equal(store.get(LANG),'de');assert.equal(manager.write(manager.initial),false);
 assert.equal(JSON.parse(store.get(KEY)).files[0].content,'visszaállítva');
});
test('Failed restore leaves the original desktop and original language in storage',()=>{
 const {manager,localStorage,store}=boot(new Map([[LANG,'hu']]),JSON.stringify(desktop())),raw=store.get(KEY),set=localStorage.setItem;
 localStorage.setItem=(key,value)=>{if(key===KEY)throw new Error('QuotaExceededError');set(key,value);};
 assert.equal(manager.replace(backup(desktop()),raw),false);assert.equal(store.get(KEY),raw);assert.equal(store.get(LANG),'hu');
});
test('Restore refuses changes made after the import preview',()=>{
 const {manager,store}=boot(new Map(),JSON.stringify(desktop())),preview=manager.current();
 store.set(KEY,JSON.stringify({...desktop(),user:'Újabb mentés'}));
 assert.equal(manager.replace(backup(desktop()),preview),false);assert.equal(JSON.parse(store.get(KEY)).user,'Újabb mentés');
});
test('An unchanged state does not serialize into another storage write',()=>{
 const {manager,writes}=boot(new Map(),JSON.stringify(desktop()));
 assert.equal(manager.write(manager.initial),true);assert.equal(writes.length,0);
});
