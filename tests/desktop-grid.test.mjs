import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({XP:{}});
vm.runInContext(readFileSync(new URL('../js/desktop-grid.js',import.meta.url),'utf8'),context);
const grid=context.XP.DesktopGrid;
const plain=value=>JSON.parse(JSON.stringify(value));
const ids=['computer','internet','documents','network','notepad','paint','player','recycle','folder-games'];
const viewport=grid.create(1280,900,ids.length);
const initial=()=>grid.layout(ids,{},viewport);
const unique=positions=>assert.equal(new Set(Object.values(positions).map(p=>`${p.col},${p.row}`)).size,Object.keys(positions).length);

test('Default order fills the left column and reserves the bottom-right cell for the Recycle Bin',()=>{
  const positions=initial();
  for(const [row,id]of ids.filter(id=>id!=='recycle').entries())assert.deepEqual(plain(positions[id]),{col:0,row});
  const trash=grid.pixel(positions.recycle,viewport);
  assert.equal(trash.x+84,1280-12);assert.equal(trash.y+80,900-15);unique(positions);
});

test('Dropping near an empty cell snaps to it, and the placement survives serialization',()=>{
  const point=grid.pixel({col:3,row:2},viewport);
  const moved=grid.drop(initial(),'computer',{x:point.x+17,y:point.y-12},viewport);
  assert.deepEqual(plain(moved.computer),{col:3,row:2});unique(moved);
  assert.deepEqual(plain(grid.layout(ids,plain(moved),viewport)),plain(moved));
});

test('Dropping onto an occupied cell swaps the two icons without moving other icons',()=>{
  const before=initial();const after=grid.drop(before,'computer',grid.pixel(before.internet,viewport),viewport);
  assert.deepEqual(plain(after.computer),plain(before.internet));assert.deepEqual(plain(after.internet),plain(before.computer));
  for(const id of ids.filter(id=>!['computer','internet'].includes(id)))assert.deepEqual(plain(after[id]),plain(before[id]));unique(after);
});

test('The Recycle Bin can move, swap places with other icons and retain its saved position',()=>{
  const before=initial();
  const swapped=grid.drop(before,'computer',grid.pixel(before.recycle,viewport),viewport);
  assert.deepEqual(plain(swapped.recycle),plain(before.computer));
  assert.deepEqual(plain(swapped.computer),plain(before.recycle));unique(swapped);
  const moved=grid.drop(before,'recycle',grid.pixel({col:3,row:2},viewport),viewport);
  assert.deepEqual(plain(moved.recycle),{col:3,row:2});unique(moved);
  assert.deepEqual(plain(grid.layout(ids,plain(moved),viewport)),plain(moved));
  const swappedBack=grid.drop(swapped,'recycle',grid.pixel(swapped.computer,viewport),viewport);
  assert.deepEqual(plain(swappedBack),plain(before));
});

test('Legacy overlapping pixels, out-of-bounds placements and resizing always resolve to unique cells',()=>{
  const saved=Object.fromEntries(ids.map(id=>[id,{x:100000,y:-20}]));
  let positions=grid.layout(ids,saved,viewport);unique(positions);
  for(const [width,height]of [[375,500],[1920,1050],[200,250],[1280,900]]){
    const bounds=grid.create(width,height,ids.length);positions=grid.layout(ids,positions,bounds);unique(positions);
    for(const p of Object.values(positions)){assert.ok(p.col>=0&&p.col<bounds.maxColumns);assert.ok(p.row>=0&&p.row<bounds.rows);}
  }
});

test('New files use free cells and an overflowing desktop still has no overlapping icons',()=>{
  const more=[...ids,...Array.from({length:150},(_,i)=>`file-${i}`)];
  const bounds=grid.create(375,500,more.length),positions=grid.layout(more,initial(),bounds);
  assert.equal(Object.keys(positions).length,more.length);unique(positions);
});
