import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function boot(saved){
  const storage=new Map();if(saved)storage.set('windows-xp-simulator-v1',JSON.stringify(saved));
  const element={hidden:true,querySelector:()=>element};
  const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},querySelector:()=>element},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,setTimeout:()=>0,clearTimeout(){}});
  vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
  for(const file of ['internet','web-pages','player'])vm.runInContext(readFileSync(new URL(`js/${file}.js`,root),'utf8'),context);
  return {xp:context.XP,storage};
}
test('Every local website has a unique address, working internal links and bundled images',()=>{
  const {xp}=boot(),pages=xp.webPages;
  assert.equal(pages.length,20);assert.equal(new Set(pages.map(p=>p.id)).size,pages.length);assert.equal(new Set(pages.map(p=>p.url)).size,pages.length);
  for(const page of pages){const html=page.render?page.render():page.body;
    for(const [,id] of html.matchAll(/data-page="([^"]+)"/g))assert.ok(pages.some(p=>p.id===id),`${page.id} → ${id}`);
    for(const [,src] of html.matchAll(/src="([^"]+)"/g)){assert.doesNotMatch(src,/^(https?:)?\/\//);assert.ok(existsSync(new URL(src,root)),`${page.id}: ${src}`);}
  }
});
test('Expanded search finds shops, weather, mail and the original top results',()=>{
  const {xp}=boot();
  for(const [query,id] of [['webshop','shop'],['időjárás','weather'],['postafiók','mail'],['macska','cats'],['játékok','games']])assert.equal(xp.searchWeb(query)[0].id,id);
});
test('The cart clamps quantities, calculates totals and survives a reload',()=>{
  const {xp,storage}=boot(),web=xp.webDemo;
  web.changeCart('pc',1);web.changeCart('disc',2);assert.equal(web.cartTotal(),132880);
  for(let i=0;i<20;i++)web.changeCart('pc',1);assert.equal(web.cartItems().find(p=>p.id==='pc').quantity,9);
  web.changeCart('disc',-100);web.changeCart('unknown',1);assert.equal(web.cartTotal(),1169100);
  const restored=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
  assert.equal(restored.webDemo.cartTotal(),1169100);assert.equal(restored.webDemo.cartItems().length,1);
});
test('Guestbook entries and mail drafts persist, stay bounded and escape HTML',()=>{
  const {xp,storage}=boot(),web=xp.webDemo;
  assert.equal(web.postMessage(' ','Empty'),false);
  for(let i=0;i<32;i++)web.postMessage('Név '+i,'Üzenet');
  web.postMessage('<script>','<img src=x onerror=alert(1)>');
  web.saveDraft({to:'Kati',subject:'Árvíztűrő',body:'Őrzött piszkozat'});
  const restored=boot(JSON.parse(storage.get('windows-xp-simulator-v1'))).xp;
  assert.equal(restored.state.webDemo.messages.length,30);
  const html=restored.webPages.find(p=>p.id==='forum').render();
  assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<script>|<img src=x/);
  assert.equal(restored.state.webDemo.draft.body,'Őrzött piszkozat');
  web.saveDraft({body:'a'.repeat(5000)});assert.equal(xp.state.webDemo.draft.body.length,4000);
});
test('The player stops at the end, repeats only when selected, and shuffle never repeats the same track',()=>{
  const next=boot().xp.playerNextTrack;
  assert.equal(next(0,4,{ended:true}),1);assert.equal(next(3,4,{ended:true}),-1);
  assert.equal(next(3,4,{ended:true,repeat:true}),0);assert.equal(next(3,4,{}),0);
  for(let i=0;i<4;i++)for(const random of [0,.2,.6,.99999])assert.notEqual(next(i,4,{shuffle:true},()=>random),i);
  assert.equal(next(0,1,{ended:true,shuffle:true}),-1);assert.equal(next(0,1,{ended:true,repeat:true,shuffle:true}),0);
});
test('Resize grips are visible in normal windows and hidden only when maximized',()=>{
  const css=readFileSync(new URL('styles.css',root),'utf8');
  const hiddenRules=[...css.matchAll(/([^{}]+)\{[^{}]*display:\s*none[^{}]*\}/g)];
  for(const [,selectors] of hiddenRules)for(const selector of selectors.split(','))if(selector.includes('.resize-edge'))assert.ok(selector.includes('.maximized'),selector);
  for(const edge of ['n','s','e','w','ne','nw','se','sw'])assert.match(css,new RegExp('\\.resize-'+edge+'\\{'));
});
