import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {installHungarian} from './i18n-test-helper.mjs';
const root=new URL('../',import.meta.url);

function load(){
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){},createElement:()=>({})},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console,Math});
 installHungarian(context);vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/outlook.js',root),'utf8'),context);
 return context.XP;
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('The mailbox tallies each folder and only counts unread post as unread',()=>{
 const xp=load();
 const messages=[
  {id:'a',folder:'inbox'},{id:'b',folder:'inbox'},{id:'c',folder:'inbox'},
  {id:'own1',folder:'sent'},{id:'own2',folder:'drafts'}
 ];
 const empty=xp.mailboxCounts(messages,[],{});
 assert.deepEqual(plain(empty.inbox),{total:3,unread:3});
 // Nothing the user wrote themselves is ever "unread".
 assert.deepEqual(plain(empty.sent),{total:1,unread:0});
 assert.deepEqual(plain(empty.drafts),{total:1,unread:0});
 assert.deepEqual(plain(empty.deleted),{total:0,unread:0});
 const opened=xp.mailboxCounts(messages,['a','b'],{});
 assert.deepEqual(plain(opened.inbox),{total:3,unread:1});
 // A deleted message leaves the inbox and takes its unread mark with it.
 const binned=xp.mailboxCounts(messages,['a'],{c:'deleted'});
 assert.deepEqual(plain(binned.inbox),{total:2,unread:1});
 assert.deepEqual(plain(binned.deleted),{total:1,unread:1});
});

test('Outlook Express is a program of its own, reachable the way XP offered it',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/js\/outlook\.js/,'the program is loaded');
 assert.match(html,/outlook\.css/,'its styles are loaded');
 // The tray icon opens the program instead of raising a canned notice.
 assert.match(html,/data-tray="outlook"/);
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 assert.match(start,/\['Outlook Express','mail','outlook'\]/,'it is listed under All Programs');
 // XP pinned Internet and E-mail at the top of the Start menu, and put both on the desktop.
 assert.match(start,/app==='outlook'\?startItem\('Email','mail',app,'Outlook Express',false,true\)/,'it is pinned to the Start menu');
 assert.doesNotMatch(start,/startItem\('Dokumentumok','documents','documents','A saját fájljaid'\)/,'Documents gave up the pinned slot but keeps its place on the right');
 assert.match(start,/\{id:'outlook',label:'Outlook Express',icon:'mail',app:'outlook'\}/,'it has a desktop icon');
 assert.doesNotMatch(start,/mail:\['Outlook Express'/,'the tray notice is gone');
 // Both the Run box and the command prompt know its executable name.
 assert.match(readFileSync(new URL('js/utilities.js',root),'utf8'),/msimn:'outlook'/);
 assert.match(readFileSync(new URL('js/apps.js',root),'utf8'),/msimn:'outlook'/);
});

test('Every program the Start menu lists is one the desktop can actually open',()=>{
 const sources=['apps','cardgames','explorer','games','internet','outlook','pinball','player','start','taskmgr','utilities']
  .map(name=>readFileSync(new URL(`js/${name}.js`,root),'utf8')).join('\n');
 const registered=new Set(Array.from(sources.matchAll(/register\('([a-z0-9-]+)'/g),m=>m[1]));
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 // All Programs is a nested list now: folders hold arrays, plain entries an app id.
 const menu=start.slice(start.indexOf('const programsMenu='),start.indexOf('function programsMarkup'));
 const listed=Array.from(menu.matchAll(/\['[^']+','[a-z0-9-]+','([a-z0-9-]+)'\]/g),m=>m[1]);
 assert.ok(listed.length>=15,'the list still holds every program');
 for(const app of listed)assert.ok(registered.has(app),`${app} is a registered program`);
 for(const app of ['ie','outlook','player','notepad','paint','calculator','cmd','explorer','help'])
  assert.ok(listed.includes(app),`${app} appears under All Programs`);
});
