import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

// The language layer runs without a browser: a language, a store and a page will do.
function boot({languages=['hu-HU','hu'],saved=null}={}){
 const store=new Map();if(saved)store.set('windows-xp-simulator-lang',saved);
 const element={dataset:{},textContent:'',setAttribute(){},querySelectorAll:()=>[]};
 const context=vm.createContext({window:{},document:{documentElement:{},dispatchEvent(){},querySelectorAll:()=>[]},
  navigator:{language:languages[0],languages},
  localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)},
  CustomEvent:class{},console});
 vm.runInContext(read('lang/hu.js'),context);
 vm.runInContext(read('lang/en.js'),context);
 vm.runInContext(read('lang/de.js'),context);
 vm.runInContext(read('js/lang.js'),context);
 return {i18n:context.window.XP_I18N,store,element};
}

test('The browser decides the language, and English steps in when it is not one of ours',()=>{
 assert.equal(boot({languages:['hu-HU','hu']}).i18n.language,'hu');
 assert.equal(boot({languages:['de-AT','de']}).i18n.language,'de');
 assert.equal(boot({languages:['en-GB']}).i18n.language,'en');
 // An unsupported language falls back to English, not Hungarian.
 assert.equal(boot({languages:['fr-FR','fr']}).i18n.language,'en');
 assert.equal(boot({languages:[]}).i18n.language,'en');
 // A chosen language beats the browser and survives a reload.
 assert.equal(boot({languages:['hu'],saved:'de'}).i18n.language,'de');
 const {i18n,store}=boot({languages:['hu']});
 assert.equal(i18n.setLanguage('en'),true);
 assert.equal(store.get('windows-xp-simulator-lang'),'en');
 assert.equal(i18n.setLanguage('klingon'),false,'an unknown language is refused');
});

test('A missing translation leaves the Hungarian sentence on screen',()=>{
 const {i18n}=boot({languages:['en']});
 assert.equal(i18n.t('Sajátgép'),'My Computer');
 assert.equal(i18n.t('Ilyen mondat nincs a szótárban'),'Ilyen mondat nincs a szótárban');
 // Substitution works in the translation and in the Hungarian fallback alike.
 assert.equal(i18n.t('{count} program fut',{count:2}),'2 programs running');
 assert.equal(i18n.t('Nincs ilyen: {name}',{name:'X'}),'Nincs ilyen: X');
 i18n.setLanguage('de');
 assert.equal(i18n.t('Sajátgép'),'Arbeitsplatz');
 assert.equal(i18n.t('Lomtár'),'Papierkorb');
 i18n.setLanguage('hu');
 assert.equal(i18n.t('Sajátgép'),'Sajátgép','in Hungarian the source sentence is the text');
});

test('The two dictionaries cover exactly the same sentences',()=>{
 const {i18n}=boot();
 const context={window:{},document:{documentElement:{},querySelectorAll:()=>[]},navigator:{language:'hu',languages:['hu']},
  localStorage:{getItem:()=>null,setItem(){}},CustomEvent:class{},console};
 vm.createContext(context);
 vm.runInContext(read('lang/en.js'),context);
 vm.runInContext(read('lang/de.js'),context);
 const en=Object.keys(context.window.XP_STRINGS.en),de=Object.keys(context.window.XP_STRINGS.de);
 assert.deepEqual(en.filter(key=>!de.includes(key)),[],'what English has, German has');
 assert.deepEqual(de.filter(key=>!en.includes(key)),[],'and the other way round');
 assert.ok(en.length>100,'the system strings are in there');
 // No translation may be left empty.
 for(const table of [context.window.XP_STRINGS.en,context.window.XP_STRINGS.de])
  for(const [key,value] of Object.entries(table)) assert.ok(value&&value.trim(),`empty translation: ${key}`);
 assert.ok(i18n.languages.map(l=>l.code).join()==='hu,en,de');
});

test('The dictionaries load before the desktop, and the menu tables stay in the source language',()=>{
 const html=read('index.html');
 for(const file of ['lang/hu.js','lang/en.js','lang/de.js','js/lang.js'])
  assert.ok(html.indexOf(file)>0&&html.indexOf(file)<html.indexOf('js/core.js'),`${file} loads before core.js`);
 // Static text is translated through data-i18n marks.
 assert.match(html,/data-i18n="A Windows betöltése…"/);
 assert.match(html,/data-i18n-title="Hangerő"/);
 const core=read('js/core.js');
 assert.match(core,/const t = \(text, params\) => i18n\.t\(text, params\)/);
 assert.match(core,/window\.XP_I18N \|\| \{t:/,'it starts even without the language layer');
 const start=read('js/start.js');
 // The tables stay Hungarian; the translation happens as they are drawn.
 assert.match(start,/\{id:'computer',label:'Sajátgép'/);
 assert.match(start,/label:t\(i\.label\)/);
 assert.match(start,/function startItem\(label,ic,app,subtitle='',minor=false\)\{label=t\(label\);/);
 // The language is set from the Control Panel, where XP kept it.
 const utils=read('js/utilities.js');
 assert.match(utils,/register\('regional'/);
 assert.match(utils,/XP\.setLanguage\(draft\.language\)/);
 assert.match(utils,/items:\['datetime','regional'\]/);
});

// A stale dictionary in the browser cache showed half a German desktop in Hungarian,
// so the version marker is part of the contract now.
test('Every dictionary and the language layer load with a version',()=>{
 const html=read('index.html');
 for(const file of ['lang/hu.js','lang/en.js','lang/de.js','js/lang.js'])
  assert.match(html,new RegExp(`src="${file.replace('/','\\/')}\\?v=\\d+"`),`${file} carries a version`);
});

test('Every sentence the code asks for has a translation',()=>{
 const context={window:{},console};
 vm.createContext(context);
 vm.runInContext(read('lang/en.js'),context);
 const en=context.window.XP_STRINGS.en;
 const call=/(?<![\w$.])t\('((?:[^'\\]|\\.)*)'/g;
 const missing=[];
 let seen=0;
 for(const file of ['core','start','explorer','apps','utilities','internet','web-pages','outlook',
  'player','games','cardgames','pinball','taskmgr','compmgmt']){
  const source=read(`js/${file}.js`);
  for(const match of source.matchAll(call)){
   seen++;
   const key=match[1].replace(/\\(['"\\])/g,'$1').replace(/\\n/g,'\n');
   if(!(key in en)) missing.push(`${file}.js: ${key}`);
  }
 }
 assert.ok(seen>1000,`the programs speak through the translator (${seen} sentences)`);
 assert.deepEqual(missing,[],'no sentence is left without a translation');
});
