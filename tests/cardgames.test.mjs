import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const SPADE=0,HEART=1,CLUB=2,DIAMOND=3;
function load(){
 const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){},dispatchEvent(){},createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},Audio:class{play(){return Promise.resolve();}},CustomEvent:class{},console,Math});
 vm.runInContext(readFileSync(new URL('js/core.js',root),'utf8'),context);context.XP=context.window.XP;
 vm.runInContext(readFileSync(new URL('js/cardgames.js',root),'utf8'),context);
 return context.XP.cardRules;
}
const card=(rank,suit)=>({rank,suit,face:true});
const name=c=>[null,'A','2','3','4','5','6','7','8','9','10','J','Q','K'][c.rank]+'SHCD'[c.suit];
const same=(a,b)=>a.rank===b.rank&&a.suit===b.suit;
// The rules run inside a vm realm, so lists come back with a foreign Array prototype.
const list=v=>Array.from(v);

test('FreeCell reproduces the original Microsoft deal numbers card for card',()=>{
 const rules=load();
 const columns=rules.freecellColumns(1);
 assert.deepEqual(list(columns[0].map(name)),['JD','2D','9H','JC','5D','7H','7C']);
 assert.deepEqual(list(columns[7].map(name)),['8C','10C','6S','9C','2H','6H']);
 assert.deepEqual(list(columns.map(c=>c.length)),[7,7,7,7,6,6,6,6]);
 const all=columns.flat();
 assert.equal(all.length,52);
 assert.equal(new Set(all.map(name)).size,52);
 assert.deepEqual(list(rules.freecellColumns(617)[0].map(name)),list(rules.freecellColumns(617)[0].map(name)));
 assert.notDeepEqual(list(rules.freecellColumns(2)[0].map(name)),list(columns[0].map(name)));
});

test('FreeCell only moves as many cards as the free cells and empty columns allow',()=>{
 const rules=load();
 assert.equal(rules.freecellCapacity(4,0,false),5);
 assert.equal(rules.freecellCapacity(0,0,false),1);
 assert.equal(rules.freecellCapacity(2,2,false),12);
 // Moving into an empty column cannot use that column as a staging area.
 assert.equal(rules.freecellCapacity(2,2,true),6);
 assert.equal(rules.freecellCapacity(0,1,true),1);
 assert.ok(rules.tableauRun([card(8,SPADE),card(7,HEART),card(6,CLUB)]));
 assert.ok(!rules.tableauRun([card(8,SPADE),card(7,CLUB)]));
 assert.ok(!rules.tableauRun([card(8,SPADE),card(6,HEART)]));
 assert.ok(!rules.tableauRun([]));
});

test('FreeCell collects a card automatically only once no lower card can need it',()=>{
 const rules=load();
 const empty=[[],[],[],[]];
 assert.ok(rules.freecellSafe(card(1,SPADE),empty));
 assert.ok(rules.freecellSafe(card(2,HEART),empty));
 assert.ok(!rules.freecellSafe(card(5,HEART),empty));
 // The black fours are home, so no black three can still need the red five.
 const foundations=[[1,2,3,4].map(r=>card(r,SPADE)),[],[1,2,3,4].map(r=>card(r,CLUB)),[1,2,3].map(r=>card(r,DIAMOND))];
 assert.ok(rules.freecellSafe(card(5,HEART),foundations));
 foundations[2]=[1,2,3].map(r=>card(r,CLUB));
 assert.ok(!rules.freecellSafe(card(5,HEART),foundations));
});

test('Spider deals 104 cards in the chosen suits and spots a finished king-to-ace run',()=>{
 const rules=load();
 for(const [count,suits] of [[1,1],[2,2],[4,4]]){
  const {columns,stock}=rules.spiderDeal(count);
  const all=[...columns.flat(),...stock];
  assert.equal(all.length,104);
  assert.equal(new Set(all.map(c=>c.suit)).size,suits);
  assert.equal(stock.length,50);
  assert.deepEqual(list(columns.map(c=>c.length)),[6,6,6,6,5,5,5,5,5,5]);
  assert.ok(columns.every(col=>col.at(-1).face&&col.slice(0,-1).every(c=>!c.face)));
  for(let r=1;r<=13;r++)assert.equal(all.filter(c=>c.rank===r).length,8);
 }
 const run=[13,12,11,10,9,8,7,6,5,4,3,2,1].map(r=>card(r,SPADE));
 assert.ok(rules.spiderRun(run));
 assert.equal(rules.spiderComplete([card(5,HEART),...run]),1);
 assert.equal(rules.spiderComplete(run.slice(1)),-1);
 const mixed=[...run];mixed[4]={...mixed[4],suit:HEART};
 assert.equal(rules.spiderComplete(mixed),-1);
 assert.ok(!rules.spiderRun([card(9,SPADE),{...card(8,SPADE),face:false}]));
});

test('Hearts opens with the two of clubs and keeps points out of the first trick',()=>{
 const rules=load();
 const hand=[card(2,CLUB),card(1,HEART),card(12,SPADE),card(9,DIAMOND)];
 assert.deepEqual(list(rules.heartsLegal(hand,[],false,true).map(name)),['2C']);
 // Hearts cannot be led before one has been played, unless nothing else is left.
 const noClubs=[card(1,HEART),card(9,DIAMOND)];
 assert.deepEqual(list(rules.heartsLegal(noClubs,[],false,false).map(name)),['9D']);
 assert.deepEqual(list(rules.heartsLegal(noClubs,[],true,false).map(name)),['AH','9D']);
 assert.deepEqual(list(rules.heartsLegal([card(1,HEART),card(3,HEART)],[],false,false).map(name)),['AH','3H']);
 // Following suit is compulsory.
 const trick=[{player:0,card:card(2,CLUB)}];
 assert.deepEqual(list(rules.heartsLegal(hand,trick,false,true).map(name)),['2C']);
 const void_=[card(1,HEART),card(12,SPADE),card(9,DIAMOND)];
 assert.deepEqual(list(rules.heartsLegal(void_,trick,false,true).map(name)),['9D']);
 assert.deepEqual(list(rules.heartsLegal(void_,trick,false,false).map(name)),['AH','QS','9D']);
 assert.deepEqual(list(rules.heartsLegal([card(1,HEART),card(12,SPADE)],trick,false,true).map(name)),['AH','QS']);
});

test('Hearts counts the trick, the penalty cards and a shot at the moon',()=>{
 const rules=load();
 const trick=[{player:2,card:card(5,CLUB)},{player:3,card:card(13,CLUB)},{player:0,card:card(1,HEART)},{player:1,card:card(2,CLUB)}];
 assert.equal(rules.heartsWinner(trick),3);
 assert.equal(rules.heartsPoints(trick.map(t=>t.card)),1);
 assert.equal(rules.heartsWinner([{player:1,card:card(1,DIAMOND)},{player:2,card:card(13,DIAMOND)}]),1);
 assert.equal(rules.heartsPoints([card(12,SPADE),card(4,HEART),card(12,HEART)]),15);
 assert.equal(rules.heartsPoints([card(12,CLUB),card(1,SPADE)]),0);
 assert.deepEqual(list(rules.heartsRoundScores([4,9,13,0])),[4,9,13,0]);
 assert.deepEqual(list(rules.heartsRoundScores([0,26,0,0])),[26,0,26,26]);
});

test('The Hearts opponents duck under a trick and unload the queen when they are void',()=>{
 const rules=load();
 const trick=[{player:0,card:card(10,DIAMOND)}];
 // Holding both a safe and a losing diamond, the highest card that still loses is right.
 const chosen=rules.heartsChoice([card(9,DIAMOND),card(4,DIAMOND),card(1,DIAMOND)],trick,{broken:true});
 assert.ok(same(chosen,card(9,DIAMOND)));
 // Nothing below the winner leaves only the cheapest card.
 assert.ok(same(rules.heartsChoice([card(13,DIAMOND),card(1,DIAMOND)],trick,{broken:true}),card(13,DIAMOND)));
 // A void hand throws the queen away first.
 assert.ok(same(rules.heartsChoice([card(12,SPADE),card(1,HEART),card(3,CLUB)],trick,{broken:true}),card(12,SPADE)));
 // With the queen gone the high hearts go instead.
 assert.ok(same(rules.heartsChoice([card(1,HEART),card(2,HEART),card(3,CLUB)],trick,{broken:true,queenGone:true}),card(1,HEART)));
 // Leading, the king of spades stays back while the queen is still out.
 assert.ok(same(rules.heartsChoice([card(13,SPADE),card(6,CLUB)],[],{broken:false}),card(6,CLUB)));
 assert.deepEqual(list(rules.heartsPassChoice([card(12,SPADE),card(2,CLUB),card(3,CLUB),card(1,HEART),card(4,DIAMOND)]).map(name)),['QS','AH','4D']);
});

test('A full Hearts hand plays out legally and always accounts for all 26 points',()=>{
 const rules=load();
 for(let round=0;round<30;round++){
  const hands=rules.heartsDeal();
  assert.deepEqual(list(hands.map(h=>h.length)),[13,13,13,13]);
  let leader=hands.findIndex(h=>h.some(c=>c.suit===CLUB&&c.rank===2));
  let broken=false,queenGone=false;const taken=[0,0,0,0];
  for(let t=0;t<13;t++){
   const trick=[];
   for(let i=0;i<4;i++){
    const player=(leader+i)%4;
    const legal=rules.heartsLegal(hands[player],trick,broken,t===0);
    assert.ok(legal.length>0);
    const choice=rules.heartsChoice(hands[player],trick,{broken,first:t===0,queenGone});
    assert.ok(choice,'the opponents always find a card');
    assert.ok(legal.some(c=>same(c,choice)),`illegal card ${name(choice)} in trick ${t}`);
    if(t===0&&i===0)assert.ok(same(choice,card(2,CLUB)));
    hands[player]=hands[player].filter(c=>!same(c,choice));
    trick.push({player,card:choice});
    if(choice.suit===HEART)broken=true;
    if(choice.suit===SPADE&&choice.rank===12)queenGone=true;
   }
   leader=rules.heartsWinner(trick);
   taken[leader]+=rules.heartsPoints(trick.map(t2=>t2.card));
  }
  assert.ok(hands.every(h=>h.length===0));
  assert.equal(taken.reduce((a,b)=>a+b,0),26);
  assert.equal(rules.heartsRoundScores(taken).reduce((a,b)=>a+b,0)%26,0);
 }
});

test('The card games ship as local resources and are wired into the shell',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 for(const file of ['cardgames.css','js/cardgames.js'])assert.ok(html.includes(file),`${file} is loaded by the entry point`);
 for(const [,src] of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.doesNotMatch(src,/^(?:https?:)?\/\//);
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 for(const app of ['freecell','spider','hearts'])assert.ok(start.includes(`'${app}'`),`${app} is in the start menu`);
 const code=readFileSync(new URL('js/cardgames.js',root),'utf8');
 assert.doesNotMatch(code,/innerHTML=[^;]*\$\{state\.user\}/);
});
