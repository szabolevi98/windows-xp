import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {key} from './i18n-test-helper.mjs';
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

test('Stable keys resolve in every language and an unknown key remains readable',()=>{
 const {i18n}=boot({languages:['en']});
 assert.equal(i18n.t(key('Sajátgép')),'My Computer');
 assert.equal(i18n.t('text_missing_example'),'text_missing_example');
 assert.equal(i18n.t(key('{count} program fut'),{count:2}),'2 programs running');
 i18n.setLanguage('de');
 assert.equal(i18n.t(key('Sajátgép')),'Arbeitsplatz');
 assert.equal(i18n.t(key('Lomtár')),'Papierkorb');
 i18n.setLanguage('hu');
 assert.equal(i18n.t(key('Sajátgép')),'Sajátgép');
 assert.equal(i18n.t('Sajátgép'),'Sajátgép','old saved Hungarian labels remain compatible');
});

test('All three dictionaries cover exactly the same stable keys',()=>{
 const {i18n}=boot();
 const context={window:{},document:{documentElement:{},querySelectorAll:()=>[]},navigator:{language:'hu',languages:['hu']},
  localStorage:{getItem:()=>null,setItem(){}},CustomEvent:class{},console};
 vm.createContext(context);
 vm.runInContext(read('lang/hu.js'),context);vm.runInContext(read('lang/en.js'),context);vm.runInContext(read('lang/de.js'),context);
 const hu=Object.keys(context.window.XP_STRINGS.hu),en=Object.keys(context.window.XP_STRINGS.en),de=Object.keys(context.window.XP_STRINGS.de);
 assert.deepEqual(hu,en,'Hungarian and English use the same keys');
 assert.deepEqual(en.filter(key=>!de.includes(key)),[],'what English has, German has');
 assert.deepEqual(de.filter(key=>!en.includes(key)),[],'and the other way round');
 assert.ok(en.length>100,'the system strings are in there');
 // No translation may be left empty.
 for(const table of [context.window.XP_STRINGS.hu,context.window.XP_STRINGS.en,context.window.XP_STRINGS.de])
  for(const [key,value] of Object.entries(table)) assert.ok(value&&value.trim(),`empty translation: ${key}`);
 assert.ok(hu.every(key=>/^text_[a-z0-9_]+$/.test(key)),'application text uses stable machine keys');
 assert.ok(i18n.languages.map(l=>l.code).join()==='hu,en,de');
});

test('The dictionaries load before the desktop, and markup uses stable keys',()=>{
 const html=read('index.html');
 for(const file of ['lang/hu.js','lang/en.js','lang/de.js','js/lang.js'])
  assert.ok(html.indexOf(file)>0&&html.indexOf(file)<html.indexOf('js/core.js'),`${file} loads before core.js`);
 // Static text is translated through data-i18n marks.
 assert.match(html,/data-i18n="text_loading_windows"/);
 assert.match(html,/data-i18n-title="text_volume"/);
 const core=read('js/core.js');
 assert.match(core,/const t = \(text, params\) => i18n\.t\(text, params\)/);
 assert.match(core,/window\.XP_I18N \|\| \{t:/,'it starts even without the language layer');
 const start=read('js/start.js');
 // Older data tables are resolved when they are drawn; literal calls use keys.
 assert.match(start,/\{id:'computer',label:'Sajátgép'/);
 assert.match(start,/label:t\(i\.label\)/);
 assert.match(start,/function startItem\(label,ic,app,subtitle='',minor=false,pinned=false\)\{label=t\(label\);/);
 assert.doesNotMatch(start,/(?<![\w$.])t\(\s*['"][ÁÉÍÓÖŐÚÜŰáéíóöőúüű]/,'literal calls do not use Hungarian text as identifiers');
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
 vm.runInContext(read('lang/hu.js'),context);vm.runInContext(read('lang/en.js'),context);vm.runInContext(read('lang/de.js'),context);
 const dictionaries=context.window.XP_STRINGS;
 const call=/(?<![\w$.])t\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
 const missing=[];
 let seen=0;
 for(const file of ['core','start','explorer','apps','utilities','internet','web-pages','outlook',
  'player','games','cardgames','pinball','taskmgr','compmgmt']){
  const source=read(`js/${file}.js`);
  for(const match of source.matchAll(call)){
   seen++;
   const key=(match[1]??match[2]).replace(/\\(['"\\])/g,'$1').replace(/\\n/g,'\n');
   if(!/^text_[a-z0-9_]+$/.test(key)||!['hu','en','de'].every(language=>key in dictionaries[language]))missing.push(`${file}.js: ${key}`);
  }
 }
 for(const match of read('index.html').matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)){
  seen++;const key=match[1];
  if(!/^text_[a-z0-9_]+$/.test(key)||!['hu','en','de'].every(language=>key in dictionaries[language]))missing.push(`index.html: ${key}`);
 }
 assert.ok(seen>1000,`the programs speak through the translator (${seen} sentences)`);
 assert.deepEqual(missing,[],'no sentence is left without a translation');
});

test('Dates, clocks and numbers follow the chosen language',()=>{
 assert.equal(boot({languages:['hu']}).i18n.locale,'hu-HU');
 assert.equal(boot({languages:['en-GB']}).i18n.locale,'en-US');
 assert.equal(boot({languages:['de']}).i18n.locale,'de-DE');
 const {i18n}=boot({languages:['hu']});
 i18n.setLanguage('de');
 assert.equal(i18n.locale,'de-DE','the locale follows the switch');
 // No program may pin the Hungarian format any more.
 for(const file of ['core','start','explorer','apps','utilities','taskmgr','web-pages','outlook','player'])
  // core.js keeps one, as the format it falls back on without the language layer.
  assert.doesNotMatch(read(`js/${file}.js`).replace("locale:'hu-HU'",''),/'hu-HU'/,
   `${file}.js formats through the locale`);
});
