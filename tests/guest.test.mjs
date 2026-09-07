import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

// Signing in and out touches the desktop itself, so the shim needs a little more of a page.
function boot(saved){
 const storage=new Map();if(saved)storage.set('windows-xp-simulator-v1',saved);
 const element=()=>({hidden:true,innerHTML:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},
  querySelector:()=>element(),append(){},remove(){},setAttribute(){},addEventListener(){}});
 const context=vm.createContext({window:{addEventListener(){}},
  document:{body:element(),addEventListener(){},dispatchEvent(){},querySelector:()=>element(),createElement:element},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
 vm.runInContext(read('js/core.js'),context);
 return {xp:context.window.XP,storage};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const names=xp=>xp.state.files.filter(f=>f.parent==='desktop'&&!f.deleted).map(f=>f.name).sort();

test('The Guest stands on the logon screen from the start, and can be switched off',()=>{
 const {xp}=boot();
 assert.deepEqual(plain(xp.accounts().map(a=>a.id)),['admin','guest'],'both accounts are offered');
 assert.equal(xp.accountInfo('guest').enabled,true);
 assert.equal(xp.accountInfo('guest').name,'Vendég');
 assert.equal(xp.setGuest(false),true);
 assert.deepEqual(plain(xp.accounts().map(a=>a.id)),['admin']);
 assert.equal(xp.switchUser('guest'),false,'a switched-off account cannot be signed into');
 assert.equal(xp.session,'admin');
});

test('A desktop set up before the Guest existed gets it switched on once',()=>{
 const legacy=JSON.stringify({version:1,user:'Adminisztrátor',files:[]});
 const {xp,storage}=boot(legacy);
 assert.equal(xp.state.guest.enabled,true,'the account is there without anybody turning it on');
 // Switching it off afterwards sticks; the one-time change does not come back.
 xp.setGuest(false);
 const later=boot(storage.get('windows-xp-simulator-v1')).xp;
 assert.equal(later.state.guest.enabled,false);
});

test('Each account keeps its own desk, and neither can see the other one',()=>{
 const {xp,storage}=boot();
 xp.saveFile({id:'admin-note',name:'Admin.txt',type:'text',parent:'desktop',content:'admin'});
 xp.state.wallpaper='azul';xp.persist();
 assert.ok(names(xp).includes('Admin.txt'));

 assert.equal(xp.switchUser('guest'),true);
 assert.equal(xp.session,'guest');
 assert.equal(xp.state.user,'Vendég');
 assert.equal(xp.state.accountType,'guest');
 // A brand new desk: the standard folders, the standard wallpaper, none of the other account's files.
 assert.equal(xp.state.wallpaper,'bliss');
 assert.ok(!names(xp).includes('Admin.txt'),'the administrator’s files stay with the administrator');
 assert.ok(xp.state.files.some(f=>f.name==='Játékok'),'the guest desk is set up like any other');
 xp.saveFile({id:'guest-note',name:'Vendég.txt',type:'text',parent:'desktop',content:'vendég'});

 assert.equal(xp.switchUser('admin'),true);
 assert.equal(xp.state.wallpaper,'azul','the administrator finds the desk left behind');
 assert.ok(names(xp).includes('Admin.txt'));
 assert.ok(!names(xp).includes('Vendég.txt'));

 // Both desks survive the round trip, and a reload of the machine.
 xp.switchUser('guest');
 assert.ok(names(xp).includes('Vendég.txt'));
 const later=boot(storage.get('windows-xp-simulator-v1')).xp;
 assert.equal(later.session,'guest','the machine comes back with whoever was signed in');
 assert.ok(names(later).includes('Vendég.txt'));
 later.switchUser('admin');
 assert.ok(names(later).includes('Admin.txt'));
});

test('The Guest may not switch itself off, and the machine keeps what belongs to it',()=>{
 const {xp}=boot();
 xp.state.computerName='OTTHONI-PC';
 xp.switchUser('guest');
 assert.equal(xp.setGuest(false),false,'only the administrator turns the account off');
 assert.equal(xp.state.guest.enabled,true);
 // The computer name belongs to the machine, not to whoever is signed in.
 assert.equal(xp.state.computerName,'OTTHONI-PC');
 xp.switchUser('admin');
 assert.equal(xp.setGuest(false),true);
 assert.deepEqual(plain(xp.accounts().map(a=>a.id)),['admin']);
 assert.equal(xp.switchUser('guest'),false,'and the account is out of reach again');
});

test('The administrator can set the Guest picture without signing in as the Guest',()=>{
 const {xp}=boot();
 assert.equal(xp.setAccountAvatar('guest','frog'),true);
 assert.equal(xp.accountInfo('guest').avatar,'frog');
 assert.equal(xp.state.avatar,'chess','the administrator keeps their own picture');
 xp.switchUser('guest');
 assert.equal(xp.state.avatar,'frog','the guest signs in with it');
 // Nonsense pictures are refused.
 assert.equal(xp.setAccountAvatar('guest','nincs-ilyen'),false);
});

test('The logon screen, the power dialog and User Accounts all know about the Guest',()=>{
 const start=read('js/start.js');
 // Every account the machine offers gets a name to click.
 assert.match(start,/XP\.accounts\(\)\.map\(account=>/);
 assert.match(start,/data-account="\$\{account\.id\}"/);
 assert.match(start,/function bindLogin\(after\)/);
 assert.match(start,/XP\.switchUser\(button\.dataset\.account\)/);
 // Fast user switching sits beside logging off, and both land on the logon screen.
 assert.match(start,/data-power="switch">\$\{icon\('user'\)\} Felhasználóváltás/);
 assert.match(start,/if\(a==='logoff'\|\|a==='switch'\)\{XP\.sound\('shutdown'\);loginScreen\(\);\}/);

 const utils=read('js/utilities.js');
 assert.match(utils,/A Vendég fiók bekapcsolása/);
 assert.match(utils,/A Vendég fiók kikapcsolása/);
 assert.match(utils,/A Vendég fiók ki van kapcsolva/);
 // A guest is offered their picture and nothing else.
 assert.match(utils,/const asGuest=\(\)=>XP\.session==='guest'/);
 assert.match(utils,/asGuest\(\)\s*\n?\s*\?`<li><button data-go="picture" data-for="self">A képem megváltoztatása<\/button><\/li>`/);
 assert.match(utils,/typeName=type=>type==='guest'\?'Vendég fiók'/);
});
