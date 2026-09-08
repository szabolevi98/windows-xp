'use strict';
(() => {
const {$,$$,state,register,createWindow,menubar,status,persist,notify,dialog,t,esc}=XP;
const SUITS=['♠','♥','♣','♦'],NAMES=[null,'A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const red=c=>c.suit===1||c.suit===3;
const label=c=>NAMES[c.rank]+SUITS[c.suit];
const high=c=>c.rank===1?14:c.rank;
const key=c=>`${c.rank}-${c.suit}`;
const shuffle=deck=>{for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;};
function cardHtml(c,attrs='',active=false,style=''){
 const shown=c.face!==false;
 return `<button class="playing-card ${shown?red(c)?'red':'':'back'} ${active?'selected':''}" ${attrs} style="${style}" aria-label="${shown?label(c):'Fedett lap'}">${shown?`${NAMES[c.rank]}<span class="suit">${SUITS[c.suit]}</span><span class="big-suit">${SUITS[c.suit]}</span>`:''}</button>`;
}
// The rules are kept free of the DOM so the regression tests can play whole hands without a browser.
const rules={};
XP.cardRules=rules;

// --- FreeCell ------------------------------------------------------------
// The original deal numbers come from Microsoft's linear congruential shuffle, so game 617 really is game 617.
rules.msDeal=number=>{
 let seed=((number%4294967296)+4294967296)%4294967296;
 const next=()=>{seed=(seed*214013+2531011)%4294967296;return Math.floor(seed/65536)%32768;};
 const deck=Array.from({length:52},(_,i)=>i),dealt=[],suitOf=[2,3,1,0];
 for(let left=52;left>0;left--){const j=next()%left;dealt.push(deck[j]);deck[j]=deck[left-1];}
 return dealt.map(c=>({rank:Math.floor(c/4)+1,suit:suitOf[c%4],face:true}));
};
rules.freecellColumns=number=>{const cards=rules.msDeal(number);let at=0;return Array.from({length:8},(_,i)=>cards.slice(at,at+=i<4?7:6));};
rules.tableauRun=cards=>cards.length>0&&cards.every((c,i)=>!i||(cards[i-1].rank===c.rank+1&&red(cards[i-1])!==red(c)));
rules.freecellCapacity=(freeCells,emptyColumns,intoEmpty)=>(freeCells+1)*2**Math.max(0,emptyColumns-(intoEmpty?1:0));
// A card is safe to collect automatically when it can no longer be needed by a lower card of the other colour.
rules.freecellSafe=(card,foundations)=>{
 if(card.rank<=2)return true;
 const opposite=red(card)?[0,2]:[1,3],twin=(red(card)?[1,3]:[0,2]).find(s=>s!==card.suit);
 return opposite.every(s=>foundations[s].length>=card.rank-1)&&foundations[twin].length>=card.rank-2;
};

register('freecell',()=>{
 if(XP.singleton('freecell'))return;
 const w=createWindow({title:t("text_freecell"),icon:'freecell',app:'freecell',width:660,height:565,minWidth:430,minHeight:380});
 let columns=[],cells=[null,null,null,null],foundations=[[],[],[],[]],selected=null,number=1,moves=0,snapshots=[],finished=false;
 const stats=()=>state.freecellStats||{played:0,won:0,streak:0,best:0};
 const freeCount=()=>cells.filter(c=>!c).length;
 const emptyCount=()=>columns.filter(c=>!c.length).length;
 function record(win){
  if(finished)return;finished=true;
  const s={...stats()};s.played++;if(win){s.won++;s.streak=Math.max(0,s.streak)+1;s.best=Math.max(s.best,s.streak);}else s.streak=0;
  state.freecellStats=s;persist();
 }
 function reset(next=number){
  if(moves&&!finished)record(false);
  number=Math.min(1000000,Math.max(1,Math.floor(next)||1));columns=rules.freecellColumns(number);
  cells=[null,null,null,null];foundations=[[],[],[],[]];selected=null;moves=0;snapshots=[];finished=false;
  w.setTitle(t("text_freecell_game_n",{n:number}));render();
 }
 function saveMove(){snapshots.push(JSON.stringify({columns,cells,foundations,moves}));if(snapshots.length>200)snapshots.shift();}
 function undo(){if(!snapshots.length)return;({columns,cells,foundations,moves}=JSON.parse(snapshots.pop()));selected=null;render();}
 async function pick(){
  const answer=await dialog(t("text_game_number"),t("text_enter_the_deal_number_1_1_000_000_it_follows_the_original_freecell_numbering"),{input:t("text_game_number"),value:String(number),buttons:['OK',t("text_cancel")]});
  if(answer!==null&&String(answer).trim())reset(Number(String(answer).trim()));
 }
 menubar(w,{
  [t("text_game")]:()=>[{label:t("text_new_game"),shortcut:'F2',action:()=>reset(1+Math.floor(Math.random()*32000))},{label:t("text_select_game"),shortcut:'F3',action:pick},{label:t("text_restart_this_game"),action:()=>reset(number)},null,{label:t("text_undo"),shortcut:'Ctrl+Z',disabled:!snapshots.length,action:undo},{label:t("text_auto_collect"),action:()=>{collect(true);render();}},null,{label:t("text_statistics"),action:()=>{const s=stats();XP.dialog(t("text_freecell_statistics"),t("text_games_played_played_games_won_won_winning_percentage_rate_current_stre_eecc9d44",{played:s.played,won:s.won,rate:s.played?Math.round(s.won/s.played*100):0,streak:s.streak,best:s.best}));}},null,{label:t("text_exit"),action:()=>w.close()}],
  [t("text_help")]:[{label:t("text_game_rules"),action:()=>XP.dialog('FreeCell',t("text_the_goal_is_to_move_all_52_cards_ace_to_king_to_the_four_home_cells_at_16020498"))}]
 });
 const body=document.createElement('div');body.className='solitaire-body freecell-body';w.body.append(body);
 const bar=status(w,t("text_moves_0"),'Szabad helyek: 4');
 function stack(){
  if(!selected)return[];
  if(selected.kind==='cell')return cells[selected.index]?[cells[selected.index]]:[];
  if(selected.kind==='foundation')return foundations[selected.index].length?[foundations[selected.index].at(-1)]:[];
  return columns[selected.col].slice(selected.index);
 }
 function detach(){
  if(selected.kind==='cell')cells[selected.index]=null;
  else if(selected.kind==='foundation')foundations[selected.index].pop();
  else columns[selected.col].splice(selected.index);
 }
 function moveTo(kind,target){
  const cards=stack();if(!cards.length)return false;
  const first=cards[0];
  if(kind==='cell'){
   if(cards.length!==1||cells[target]||(selected.kind==='cell'&&selected.index===target))return false;
   saveMove();detach();cells[target]=first;
  }else if(kind==='foundation'){
   if(cards.length!==1||first.suit!==target||first.rank!==foundations[target].length+1)return false;
   if(selected.kind==='foundation'&&selected.index===target)return false;
   saveMove();detach();foundations[target].push(first);
  }else{
   if(selected.kind==='column'&&selected.col===target)return false;
   const pile=columns[target],last=pile.at(-1);
   if(!rules.tableauRun(cards))return false;
   if(last?last.rank!==first.rank+1||red(last)===red(first):false)return false;
   if(cards.length>rules.freecellCapacity(freeCount(),emptyCount(),!pile.length))return false;
   saveMove();detach();pile.push(...cards);
  }
  moves++;selected=null;collect(false);render();
  if(foundations.every(p=>p.length===13)){record(true);XP.sound('notify');notify(t("text_congratulations"),t("text_you_solved_game_n_in_moves_moves",{n:number,moves}));}
  return true;
 }
 function collect(all){
  let changed=true;
  while(changed){
   changed=false;
   const sources=[...cells.map((c,i)=>c?{kind:'cell',index:i,card:c}:null),...columns.map((col,i)=>col.length?{kind:'column',col:i,index:col.length-1,card:col.at(-1)}:null)].filter(Boolean);
   for(const s of sources){
    const c=s.card;
    if(c.rank!==foundations[c.suit].length+1)continue;
    if(!all&&!rules.freecellSafe(c,foundations))continue;
    if(s.kind==='cell')cells[s.index]=null;else columns[s.col].pop();
    foundations[c.suit].push(c);changed=true;break;
   }
  }
  if(all&&foundations.every(p=>p.length===13)){record(true);XP.sound('notify');notify(t("text_congratulations"),t("text_you_solved_game_n_in_moves_moves",{n:number,moves}));}
 }
 function render(){
  const chosen=(kind,a,b)=>selected?.kind===kind&&(kind==='column'?selected.col===a:selected.index===a);
  body.innerHTML=`<div class="card-top">${cells.map((c,i)=>c?cardHtml(c,`data-cell="${i}"`,chosen('cell',i)):`<button class="card-slot" data-cell="${i}" aria-label="${esc(t("text_free_cell_n",{n:i+1}))}"></button>`).join('')}<span class="spacer"></span>${foundations.map((pile,i)=>pile.length?cardHtml(pile.at(-1),`data-foundation="${i}"`,chosen('foundation',i)):`<button class="card-slot foundation" data-foundation="${i}" aria-label="${esc(t("text_suit_foundation",{suit:SUITS[i]}))}">${SUITS[i]}</button>`).join('')}</div><div class="solitaire-columns">${columns.map((col,c)=>`<div class="card-column" data-column="${c}"><button class="card-slot" data-empty="${c}" aria-label="${esc(t("text_column_n",{n:c+1}))}"></button>${col.map((card,i)=>cardHtml(card,`data-col="${c}" data-index="${i}"`,selected?.kind==='column'&&selected.col===c&&i>=selected.index,`--card-i:${i}`)).join('')}</div>`).join('')}</div><div class="solitaire-help">${esc(t("text_click_a_card_then_its_destination_double_click_sends_it_home"))}</div>`;
  $('span',bar).textContent=t("text_moves")+moves;
  $('.status-part',bar).textContent=`Szabad helyek: ${freeCount()} · Egyszerre ${rules.freecellCapacity(freeCount(),emptyCount(),false)} lap`;
  const max=Math.max(1,...columns.map(c=>c.length));
  $$('.card-column',body).forEach(el=>el.style.minHeight=Math.max(240,max*22+65)+'px');
 }
 body.onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.cell!==undefined){const i=Number(b.dataset.cell);if(selected&&moveTo('cell',i))return;selected=cells[i]&&!(selected?.kind==='cell'&&selected.index===i)?{kind:'cell',index:i}:null;render();return;}
  if(b.dataset.foundation!==undefined){const i=Number(b.dataset.foundation);if(selected&&moveTo('foundation',i))return;selected=foundations[i].length&&!(selected?.kind==='foundation'&&selected.index===i)?{kind:'foundation',index:i}:null;render();return;}
  const col=Number(b.dataset.col??b.dataset.empty);if(Number.isNaN(col))return;
  if(selected&&moveTo('column',col))return;
  const idx=Number(b.dataset.index);
  selected=Number.isFinite(idx)&&!(selected?.kind==='column'&&selected.col===col&&selected.index===idx)?{kind:'column',col,index:idx}:null;
  render();
 };
 // Cards are redrawn on selection, so a double click is recognised from the second press instead of dblclick.
 let last={id:'',time:0};
 body.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const b=e.target.closest('[data-col],[data-cell]');if(!b||b.classList.contains('card-slot'))return;
  const id=b.dataset.cell!==undefined?`cell${b.dataset.cell}`:`${b.dataset.col}:${b.dataset.index}`,now=Date.now();
  if(id===last.id&&now-last.time<350){
   selected=b.dataset.cell!==undefined?{kind:'cell',index:Number(b.dataset.cell)}:{kind:'column',col:Number(b.dataset.col),index:Number(b.dataset.index)};
   const cards=stack();
   if(cards.length===1){e.preventDefault();moveTo('foundation',cards[0].suit);}
  }
  last={id,time:now};
 });
 w.el.addEventListener('keydown',e=>{
  if(e.key==='F2'){e.preventDefault();reset(1+Math.floor(Math.random()*32000));}
  if(e.key==='F3'){e.preventDefault();pick();}
  if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
 });
 w.onClose=()=>{if(moves&&!finished)record(false);};
 reset(1+Math.floor(Math.random()*32000));
 return w;
});

// --- Pókpasziánsz --------------------------------------------------------
rules.spiderDeal=suitCount=>{
 const suits=suitCount===1?[0]:suitCount===2?[0,1]:[0,1,2,3],copies=8/suits.length,deck=[];
 for(const s of suits)for(let c=0;c<copies;c++)for(let r=1;r<=13;r++)deck.push({rank:r,suit:s,face:false});
 shuffle(deck);
 const columns=Array.from({length:10},(_,i)=>deck.splice(0,i<4?6:5));
 columns.forEach(col=>col.at(-1).face=true);
 return {columns,stock:deck};
};
rules.spiderRun=cards=>cards.length>0&&cards.every((c,i)=>c.face!==false&&(!i||(cards[i-1].suit===c.suit&&cards[i-1].rank===c.rank+1)));
// A finished king-to-ace suit leaves the table; returns where it starts in the column, or -1.
rules.spiderComplete=column=>{
 if(column.length<13)return -1;
 const tail=column.slice(-13);
 return tail[0].rank===13&&tail.at(-1).rank===1&&rules.spiderRun(tail)?column.length-13:-1;
};

register('spider',()=>{
 if(XP.singleton('spider'))return;
 const w=createWindow({title:t("text_spider_solitaire"),icon:'spider',app:'spider',width:700,height:585,minWidth:440,minHeight:380});
 let columns=[],stock=[],done=0,selected=null,score=500,moves=0,suitCount=1,snapshots=[];
 function reset(count=suitCount){
  suitCount=count;const deal=rules.spiderDeal(count);
  columns=deal.columns;stock=deal.stock;done=0;selected=null;score=500;moves=0;snapshots=[];
  w.setTitle(t("text_spider_solitaire_count_suit_s",{count}));render();
 }
 function saveMove(){snapshots.push(JSON.stringify({columns,stock,done,score,moves}));if(snapshots.length>200)snapshots.shift();}
 function undo(){if(!snapshots.length)return;({columns,stock,done,score,moves}=JSON.parse(snapshots.pop()));selected=null;render();}
 menubar(w,{
  [t("text_game")]:()=>[{label:t("text_new_game"),shortcut:'F2',action:()=>reset()},null,{label:t("text_one_suit"),checked:suitCount===1,action:()=>reset(1)},{label:t("text_two_suits"),checked:suitCount===2,action:()=>reset(2)},{label:t("text_four_suits"),checked:suitCount===4,action:()=>reset(4)},null,{label:t("text_deal_from_the_stock"),disabled:!stock.length,action:deal},{label:t("text_undo"),shortcut:'Ctrl+Z',disabled:!snapshots.length,action:undo},null,{label:t("text_exit"),action:()=>w.close()}],
  [t("text_help")]:[{label:t("text_game_rules"),action:()=>XP.dialog(t("text_spider_solitaire"),t("text_the_goal_is_eight_complete_runs_from_king_to_ace_in_a_single_suit_a_fi_0b383d06"))}]
 });
 const body=document.createElement('div');body.className='solitaire-body spider-body';w.body.append(body);
 const bar=status(w,t("text_score_500"),t("text_runs_finished_0_8"));
 function deal(){
  if(!stock.length)return;
  if(columns.some(c=>!c.length)){XP.sound('error');XP.dialog(t("text_spider_solitaire"),t("text_you_cannot_deal_while_a_column_is_empty"),{icon:'error'});return;}
  saveMove();columns.forEach(col=>{const c=stock.pop();c.face=true;col.push(c);});moves++;score--;selected=null;sweep();render();
 }
 function sweep(){
  columns.forEach((col,i)=>{
   const at=rules.spiderComplete(col);
   if(at<0)return;
   col.splice(at);done++;score+=100;
   const top=col.at(-1);if(top&&!top.face)top.face=true;
  });
  if(done===8){XP.sound('notify');notify(t("text_congratulations"),t("text_you_solved_spider_solitaire_with_count_suit_s_score_score",{count:suitCount,score}));}
 }
 function moveTo(target){
  if(!selected||selected.col===target)return false;
  const cards=columns[selected.col].slice(selected.index);
  if(!rules.spiderRun(cards))return false;
  const last=columns[target].at(-1);
  if(last&&last.rank!==cards[0].rank+1)return false;
  saveMove();columns[selected.col].splice(selected.index);
  const top=columns[selected.col].at(-1);if(top&&!top.face)top.face=true;
  columns[target].push(...cards);moves++;score--;selected=null;sweep();render();return true;
 }
 function render(){
  let offsets;
  body.innerHTML=`<div class="spider-head"><div class="spider-done">${Array.from({length:done},()=>'<span class="done-pile"></span>').join('')||`<span class="spider-hint">${esc(t("text_eight_finished_runs_win_the_game"))}</span>`}</div><div class="spider-stock">${stock.length?`<button class="playing-card back" data-deal aria-label="${esc(t("text_deal_from_the_stock_count_deals_left",{count:Math.ceil(stock.length/10)}))}"></button><span>${Math.ceil(stock.length/10)}×</span>`:`<span class="spider-hint">${esc(t("text_the_stock_is_empty"))}</span>`}</div></div><div class="solitaire-columns">${columns.map((col,c)=>{
   let y=0;offsets=col.map(card=>{const at=y;y+=card.face?20:8;return at;});
   return `<div class="card-column" data-column="${c}"><button class="card-slot" data-empty="${c}" aria-label="${esc(t("text_column_n",{n:c+1}))}"></button>${col.map((card,i)=>cardHtml(card,`data-col="${c}" data-index="${i}"`,selected?.col===c&&i>=selected.index,`--card-y:${offsets[i]}`)).join('')}</div>`;
  }).join('')}</div>`;
  $('span',bar).textContent=t("text_score")+score;
  $('.status-part',bar).textContent=t("text_completed_runs_done_of_8",{done});
  const max=Math.max(1,...columns.map(col=>col.reduce((y,card)=>y+(card.face?20:8),0)));
  $$('.card-column',body).forEach(el=>el.style.minHeight=Math.max(230,max+60)+'px');
 }
 body.onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-deal')){deal();return;}
  const col=Number(b.dataset.col??b.dataset.empty);if(Number.isNaN(col))return;
  if(selected&&moveTo(col))return;
  const idx=Number(b.dataset.index);
  if(!Number.isFinite(idx)||!columns[col][idx]?.face||!rules.spiderRun(columns[col].slice(idx))){selected=null;render();return;}
  selected=selected?.col===col&&selected.index===idx?null:{col,index:idx};
  render();
 };
 w.el.addEventListener('keydown',e=>{
  if(e.key==='F2'){e.preventDefault();reset();}
  if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
 });
 reset(1);
 return w;
});

// --- Hearts --------------------------------------------------------------
const QUEEN={rank:12,suit:0},HEARTS=1,CLUBS=2;
const isQueen=c=>c.suit===QUEEN.suit&&c.rank===QUEEN.rank;
rules.heartsDeal=()=>{
 const deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push({rank:r,suit:s});
 shuffle(deck);
 return [0,1,2,3].map(i=>deck.slice(i*13,i*13+13).sort((a,b)=>a.suit-b.suit||high(a)-high(b)));
};
rules.heartsLegal=(hand,trick,broken,first)=>{
 if(!trick.length){
  const two=first?hand.filter(c=>c.suit===CLUBS&&c.rank===2):[];
  if(two.length)return two;
  const open=broken?hand:hand.filter(c=>c.suit!==HEARTS);
  return open.length?open:hand;
 }
 const led=trick[0].card.suit,follow=hand.filter(c=>c.suit===led);
 let legal=follow.length?follow:hand;
 if(first&&!follow.length){const safe=legal.filter(c=>c.suit!==HEARTS&&!isQueen(c));if(safe.length)legal=safe;}
 return legal;
};
rules.heartsWinner=trick=>{
 const led=trick[0].card.suit;
 return trick.reduce((best,play)=>play.card.suit===led&&high(play.card)>high(best.card)?play:best,trick[0]).player;
};
rules.heartsPoints=cards=>cards.reduce((n,c)=>n+(c.suit===HEARTS?1:isQueen(c)?13:0),0);
rules.heartsRoundScores=taken=>{const moon=taken.findIndex(p=>p===26);return taken.map((p,i)=>moon<0?p:i===moon?0:26);};
rules.heartsPassChoice=hand=>{
 const spades=hand.filter(c=>c.suit===0).length;
 const weight=c=>isQueen(c)?100:c.suit===0&&high(c)>12?spades>4?20:90:c.suit===HEARTS?high(c)+8:high(c);
 return [...hand].sort((a,b)=>weight(b)-weight(a)).slice(0,3);
};
rules.heartsChoice=(hand,trick,info={})=>{
 const legal=rules.heartsLegal(hand,trick,info.broken,info.first);
 if(legal.length<2)return legal[0];
 const low=[...legal].sort((a,b)=>high(a)-high(b));
 if(!trick.length){
  // Keep the queen's guards back while she is still out there.
  const guarded=info.queenGone?low:low.filter(c=>!(c.suit===0&&high(c)>=12));
  const pool=guarded.length?guarded:low;
  const plain=pool.filter(c=>c.suit!==HEARTS);
  return (plain.length?plain:pool)[0];
 }
 const led=trick[0].card.suit,follow=legal.filter(c=>c.suit===led);
 if(follow.length){
  const best=Math.max(...trick.filter(t=>t.card.suit===led).map(t=>high(t.card)));
  const under=follow.filter(c=>high(c)<best).sort((a,b)=>high(b)-high(a));
  if(under.length)return under[0];
  const sorted=[...follow].sort((a,b)=>high(a)-high(b));
  return trick.length===3&&!rules.heartsPoints(trick.map(t=>t.card))?sorted.at(-1):sorted[0];
 }
 const queen=legal.find(isQueen);if(queen)return queen;
 const guard=legal.filter(c=>c.suit===0&&high(c)>12).sort((a,b)=>high(b)-high(a))[0];
 if(guard&&!info.queenGone)return guard;
 const hearts=legal.filter(c=>c.suit===HEARTS).sort((a,b)=>high(b)-high(a));
 return hearts.length?hearts[0]:low.at(-1);
};

register('hearts',()=>{
 if(XP.singleton('hearts'))return;
 const w=createWindow({title:t("text_hearts"),icon:'hearts',app:'hearts',width:700,height:585,minWidth:440,minHeight:400});
 const names=[state.user||t("text_you"),t("text_west"),t("text_north"),t("text_east")];
 const seats=['south','west','north','east'];
 let hands=[],scores=[0,0,0,0],taken=[0,0,0,0],trick=[],turn=0,leader=0,tricks=0,broken=false,phase='pass',passIndex=0,chosen=[],queenGone=false,over=false;
 const directions=[{label:'balra',shift:1},{label:'jobbra',shift:3},{label:t("text_across"),shift:2},{label:t("text_no_pass"),shift:0}];
 const timers=new Set();
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
 w.cleanup.push(()=>{timers.forEach(clearTimeout);timers.clear();});
 function reset(full=true){
  if(full){scores=[0,0,0,0];passIndex=0;over=false;}
  hands=rules.heartsDeal();taken=[0,0,0,0];trick=[];tricks=0;broken=false;queenGone=false;chosen=[];
  phase=directions[passIndex%4].shift?'pass':'play';
  if(phase==='play')startPlay();else render();
 }
 function startPlay(){
  leader=hands.findIndex(h=>h.some(c=>c.suit===CLUBS&&c.rank===2));
  turn=leader;phase='play';render();step();
 }
 function passCards(){
  const shift=directions[passIndex%4].shift;
  const giving=[chosen,...[1,2,3].map(p=>rules.heartsPassChoice(hands[p]))];
  hands=hands.map((hand,p)=>hand.filter(c=>!giving[p].some(g=>key(g)===key(c))));
  giving.forEach((cards,p)=>hands[(p+shift)%4].push(...cards));
  hands.forEach(hand=>hand.sort((a,b)=>a.suit-b.suit||high(a)-high(b)));
  chosen=[];startPlay();
 }
 function play(player,card){
  hands[player]=hands[player].filter(c=>key(c)!==key(card));
  trick.push({player,card});
  if(card.suit===HEARTS)broken=true;
  if(isQueen(card))queenGone=true;
  turn=(player+1)%4;render();
  if(trick.length===4)later(finishTrick,900);else step();
 }
 function finishTrick(){
  const winner=rules.heartsWinner(trick);
  taken[winner]+=rules.heartsPoints(trick.map(t=>t.card));
  trick=[];tricks++;leader=turn=winner;render();
  if(tricks===13)later(finishRound,600);else later(step,350);
 }
 function finishRound(){
  const round=rules.heartsRoundScores(taken);
  scores=scores.map((s,i)=>s+round[i]);
  const moon=taken.findIndex(p=>p===26);
  const lines=names.map((n,i)=>`${n}: +${round[i]} → ${scores[i]}`).join('\n');
  phase='over';render();
  const done=Math.max(...scores)>=100;
  const title=done?t("text_hearts_game_over"):t("text_hearts_end_of_hand");
  const message=(moon>=0?t("text_name_took_every_card_shooting_the_moon",{name:names[moon]}):'')+lines+(done?t("text_winner_name",{name:names[scores.indexOf(Math.min(...scores))]}):'');
  XP.sound(done?'notify':'ding');
  XP.dialog(title,message).then(()=>{
   if(done){over=true;render();return;}
   passIndex++;reset(false);
  });
 }
 function step(){
  if(phase!=='play'||trick.length===4)return;
  if(turn===0){render();return;}
  const seat=turn;
  later(()=>{
   if(phase!=='play'||turn!==seat)return;
   const card=rules.heartsChoice(hands[seat],trick,{broken,first:tricks===0,queenGone});
   if(card)play(seat,card);
  },650);
 }
 menubar(w,{
  [t("text_game")]:()=>[{label:t("text_new_game_21f91607"),shortcut:'F2',action:()=>reset(true)},null,{label:t("text_score_c23c6e9e"),action:()=>XP.dialog(t("text_hearts_score"),names.map((n,i)=>`${n}: ${scores[i]} pont`).join('\n')+t("text_the_game_ends_at_100_points_the_lowest_score_wins"))},null,{label:t("text_exit"),action:()=>w.close()}],
  [t("text_help")]:[{label:t("text_game_rules"),action:()=>XP.dialog('Hearts',t("text_four_players_thirteen_cards_each_at_the_start_of_a_hand_you_pass_three_8bdd53e5"))}]
 });
 const body=document.createElement('div');body.className='solitaire-body hearts-body';w.body.append(body);
 const bar=status(w,t("text_score_54d6249d"),'');
 function seatHtml(p){
  const active=phase==='play'&&turn===p&&trick.length<4;
  return `<div class="hearts-seat seat-${seats[p]} ${active?'active':''}"><b>${names[p]}</b><span>${scores[p]} pont · ${hands[p].length} lap</span><div class="hearts-backs">${Array.from({length:Math.min(hands[p].length,13)},(_,i)=>`<i style="--back-i:${i}"></i>`).join('')}</div></div>`;
 }
 function render(){
  const legal=phase==='play'&&turn===0&&trick.length<4?rules.heartsLegal(hands[0],trick,broken,tricks===0):[];
  const playable=new Set(legal.map(key));
  const table=trick.map(t=>`<div class="hearts-play play-${seats[t.player]}">${cardHtml(t.card)}</div>`).join('');
  const centre=phase==='pass'
   ?`<div class="hearts-centre"><p>${esc(t("text_choose_three_cards_and_pass_them_direction",{direction:directions[passIndex%4].label}))}</p><button class="xp-button primary" data-pass ${chosen.length===3?'':'disabled'}>${esc(t("text_pass_count_3",{count:chosen.length}))}</button></div>`
   :over?`<div class="hearts-centre"><p>${esc(t("text_the_game_is_over_new_game_f2"))}</p></div>`
   :`<div class="hearts-table">${table}</div>`;
  body.innerHTML=`<div class="hearts-top">${seatHtml(2)}</div><div class="hearts-middle">${seatHtml(1)}${centre}${seatHtml(3)}</div><div class="hearts-hand" aria-label="${esc(t("text_your_cards"))}">${hands[0].map((c,i)=>cardHtml(c,`data-card="${key(c)}"`,chosen.some(x=>key(x)===key(c)),`--card-i:${i}`)+'').join('')}</div>`;
  $$('.hearts-hand .playing-card',body).forEach((el,i)=>{
   const c=hands[0][i];
   el.classList.toggle('dimmed',phase==='play'&&!over&&turn===0&&trick.length<4&&!playable.has(key(c)));
  });
  $('span',bar).textContent=names.map((n,i)=>`${n}: ${scores[i]}`).join(' · ');
  $('.status-part',bar)?.remove();
  const hint=phase==='pass'?t("text_pass_three_cards"):over?t("text_game_over"):turn===0?t("text_your_turn"):`${names[turn]} gondolkodik…`;
  bar.insertAdjacentHTML('beforeend',`<span class="status-part">${hint}</span>`);
 }
 body.onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-pass')){if(chosen.length===3)passCards();return;}
  const id=b.dataset.card;if(!id)return;
  const card=hands[0].find(c=>key(c)===id);if(!card)return;
  if(phase==='pass'){
   chosen=chosen.some(c=>key(c)===id)?chosen.filter(c=>key(c)!==id):chosen.length<3?[...chosen,card]:chosen;
   render();return;
  }
  if(phase!=='play'||turn!==0||trick.length===4)return;
  if(!rules.heartsLegal(hands[0],trick,broken,tricks===0).some(c=>key(c)===id)){XP.sound('error');return;}
  play(0,card);
 };
 w.el.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();reset(true);}});
 reset(true);
 return w;
});
})();
