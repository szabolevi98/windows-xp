'use strict';
XP.DesktopGrid = (() => {
  const ICON_WIDTH=84, ICON_HEIGHT=80, GAP_X=88, GAP_Y=86, PAD_X=12, PAD_Y=15;
  function create(width,height,count){
    const columns=Math.max(1,Math.floor((width-2*PAD_X-ICON_WIDTH)/GAP_X)+1);
    const rows=Math.max(1,Math.floor((height-2*PAD_Y-ICON_HEIGHT)/GAP_Y)+1);
    return {columns,rows,maxColumns:Math.max(columns,Math.ceil(count/rows)),
      stepX:columns>1?(width-2*PAD_X-ICON_WIDTH)/(columns-1):GAP_X,
      stepY:rows>1?(height-2*PAD_Y-ICON_HEIGHT)/(rows-1):GAP_Y};
  }
  const key=p=>`${p.col},${p.row}`;
  const pixel=(p,g)=>({x:Math.round(PAD_X+p.col*g.stepX),y:Math.round(PAD_Y+p.row*g.stepY)});
  function cell(p,g){
    const col=Number.isFinite(p?.col)?p.col:Number.isFinite(p?.x)?(p.x-PAD_X)/g.stepX:0;
    const row=Number.isFinite(p?.row)?p.row:Number.isFinite(p?.y)?(p.y-PAD_Y)/g.stepY:0;
    return {col:Math.max(0,Math.min(g.maxColumns-1,Math.round(col))),row:Math.max(0,Math.min(g.rows-1,Math.round(row)))};
  }
  function layout(ids,saved,g){
    const positions={},occupied=new Set(),pending=[];
    if(ids.includes('recycle')&&!saved.recycle){
      positions.recycle={col:g.columns-1,row:g.rows-1};occupied.add(key(positions.recycle));
    }
    // Reserve existing placements before finding room for newly created files.
    for(const id of ids){
      if(positions[id])continue;
      if(saved[id]){
        const p=cell(saved[id],g);
        if(!occupied.has(key(p))){positions[id]=p;occupied.add(key(p));continue;}
      }
      pending.push(id);
    }
    for(const id of pending){
      let best=null,distance=Infinity;
      const desired=saved[id]?cell(saved[id],g):null;
      for(let col=0;col<g.maxColumns;col++)for(let row=0;row<g.rows;row++){
        const p={col,row};if(occupied.has(key(p)))continue;
        const d=desired?(col-desired.col)**2+(row-desired.row)**2:col*g.rows+row;
        if(d<distance){best=p;distance=d;}
      }
      positions[id]=best;occupied.add(key(best));
    }
    return positions;
  }
  function drop(positions,id,point,g){
    const next={...positions};if(!positions[id])return next;
    const target=cell(point,g);
    const occupant=Object.keys(positions).find(other=>key(positions[other])===key(target));
    if(occupant&&occupant!==id)next[occupant]={...positions[id]};
    next[id]=target;return next;
  }
  return {create,layout,drop,pixel};
})();
