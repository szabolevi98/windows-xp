import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {installHungarian} from './i18n-test-helper.mjs';

const root=new URL('../',import.meta.url);

function loadMineRules(){
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){},createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console,Math});
 installHungarian(context);
 vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);
 context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/games.js',root),'utf8'),context);
 return context.XP.mineRules;
}

const plain=value=>JSON.parse(JSON.stringify(value));

test('Minesweeper has the three Windows XP boards',()=>{
 const {presets}=loadMineRules();
 assert.deepEqual(plain(presets.beginner),{cols:9,rows:9,total:10});
 assert.deepEqual(plain(presets.intermediate),{cols:16,rows:16,total:40});
 assert.deepEqual(plain(presets.expert),{cols:30,rows:16,total:99});
});

test('A custom Minesweeper field follows the classic size and density limits',()=>{
 const {custom}=loadMineRules();
 assert.deepEqual(plain(custom(12,10,20)),{cols:12,rows:10,total:20});
 assert.deepEqual(plain(custom(1,100,1)),{cols:9,rows:24,total:10});
 // WinMine capped mines at (width - 1) × (height - 1): 29 × 23 = 667.
 assert.deepEqual(plain(custom(50,50,9999)),{cols:30,rows:24,total:667});
});

test('The movable card games expose drag sources while retaining click controls',()=>{
 const solitaire=readFileSync(new URL('js/games.js',root),'utf8');
 const cards=readFileSync(new URL('js/cardgames.js',root),'utf8');
 assert.match(solitaire,/XP\.enableCardDrag\?\.\(body/);
 assert.match(cards,/function enableCardDrag\(/);
 assert.ok((cards.match(/enableCardDrag\(body/g)||[]).length>=3,'FreeCell and Spider use the shared drag controller');
 assert.match(solitaire,/body\.onclick=/);
 assert.match(cards,/body\.onclick=/);
});
