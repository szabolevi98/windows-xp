import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {installHungarian,key} from './i18n-test-helper.mjs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

// Signing in and out touches the desktop itself, so the shim needs a little more of a page.
function boot(saved){
 const storage=new Map();if(saved)storage.set('windows-xp-simulator-v1',saved);
 const element=()=>({hidden:true,innerHTML:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},
  querySelector:()=>element(),append(){},remove(){},setAttribute(){},addEventListener(){}});
 const context=vm.createContext({window:{addEventListener(){}},
  document:{documentElement:{dataset:{}},body:element(),addEventListener(){},dispatchEvent(){},querySelector:()=>element(),createElement:element},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console});
 installHungarian(context);vm.runInContext(read('js/core.js'),context);
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

test('Each account keeps its own desk while the machine retains both profile file systems',()=>{
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
 assert.ok(xp.profileFiles('guest').some(f=>f.name==='Vendég.txt'),'Explorer can mount the saved Guest profile for the administrator');
 assert.equal(xp.profileFiles('admin'),xp.state.files,'the active profile mount is the same live file list as My Documents');

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

test('The Guest wears the suitcase picture XP gave it, and cannot be talked out of it',()=>{
 const {xp}=boot();
 assert.equal(xp.accountInfo('guest').avatar,'guest');
 assert.match(xp.avatarPath('guest'),/avatars\/guest\.png$/,'it has a picture file of its own');
 xp.switchUser('guest');
 assert.equal(xp.state.avatar,'guest');
 // Even a profile that saved another picture signs in with the suitcase.
 xp.state.avatar='frog';xp.persist();
 xp.switchUser('admin');
 assert.equal(xp.accountInfo('guest').avatar,'guest');
 xp.switchUser('guest');
 assert.equal(xp.state.avatar,'guest');
 assert.equal(xp.state.user,'Vendég');
});

test('The logon screen, the power dialog and User Accounts all know about the Guest',()=>{
 const start=read('js/start.js');
 // Every account the machine offers gets a name to click.
 assert.match(start,/XP\.accounts\(\)\.map\(account=>/);
 assert.match(start,/data-account="\$\{account\.id\}"/);
 assert.match(start,/function bindLogin\(after\)/);
 assert.match(start,/XP\.switchUser\(button\.dataset\.account\)/);
 const explorer=read('js/explorer.js');
 assert.match(explorer,/XP\.profileFiles\(owner\)/,'Explorer reads the inactive profile without signing into it');
 assert.match(explorer,/w\.onUnpark=\(\)=>render\(\)/,'an Explorer parked during a user switch refreshes on return');
 // Fast user switching sits beside logging off: it parks the session instead of closing it.
 assert.ok(start.includes(`data-power="switch">\${icon('switchuser')} \${t("${key('Felhasználóváltás')}")}`));
 assert.match(start,/if\(a==='switch'\)\{XP\.sound\('logoff'\);XP\.parkSession\(\);loginScreen\(true\);\}/);
 assert.match(start,/if\(a==='logoff'\)\{XP\.sound\('logoff'\);loginScreen\(\);\}/);

 const utils=read('js/utilities.js');
 assert.ok(utils.includes(key('A Vendég fiók bekapcsolása')));
 assert.ok(utils.includes(key('A Vendég fiók kikapcsolása')));
 assert.ok(utils.includes(key('A Vendég fiók ki van kapcsolva')));
 // A guest is told the account is not theirs to change.
 assert.match(utils,/const asGuest=\(\)=>XP\.session==='guest'/);
 assert.ok(utils.includes(key('A Vendég fiókkal a saját asztalodon dolgozhatsz. A fiók nevét, képét és beállításait a számítógép rendszergazdája kezeli.')));
 assert.doesNotMatch(utils,/data-for="guest"/,'nobody edits the Guest picture');
 assert.ok(utils.includes(`typeName=type=>type==='guest'?t("${key('Vendég fiók')}")`));
});
