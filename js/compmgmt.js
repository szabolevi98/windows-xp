'use strict';
(() => {
  const {$,$$,esc,icon,state}=XP;
  // A Számítógép-kezelés konzol fája: csomópont, cím, ikon, gyerekek.
  const TREE=['root','Számítógép-kezelés (helyi)','computer',[
    ['tools','Rendszereszközök','folder',[
      ['events','Eseménynapló','folder',[
        ['event-app','Alkalmazás','documents',[]],
        ['event-sec','Biztonság','security',[]],
        ['event-sys','Rendszer','computer',[]]
      ]],
      ['shares','Megosztott mappák','folder',[]],
      ['accounts','Helyi felhasználók és csoportok','user',[
        ['user-list','Felhasználók','user',[]],
        ['group-list','Csoportok','user',[]]
      ]],
      ['perf','Teljesítménynaplók és riasztások','taskmgr',[]],
      ['devices','Eszközkezelő','computer',[]]
    ]],
    ['storage','Tárolás','disk',[
      ['media','Cserélhető adathordozó','cd',[]],
      ['defrag','Lemeztöredezettség-mentesítő','disk',[]],
      ['diskmgmt','Lemezkezelés','disk',[]]
    ]],
    ['apps','Szolgáltatások és alkalmazások','control',[
      ['service-list','Szolgáltatások','control',[]],
      ['wmi','WMI-vezérlő','control',[]],
      ['index','Indexelő szolgáltatás','search',[]]
    ]]
  ]];
  const DESCRIPTIONS={
    tools:'A gép állapotát és a helyi fiókokat kezelő eszközök.',
    events:'A Windows és a programok által naplózott események.',
    storage:'A lemezek és a cserélhető adathordozók kezelése.',
    apps:'A gépen futó szolgáltatások és kiszolgálóalkalmazások.',
    shares:'A gépen megosztott mappák, a nyitott munkamenetek és fájlok.',
    accounts:'A gépen létrehozott felhasználói fiókok és csoportok.',
    perf:'Teljesítményszámlálók naplózása és riasztások beállítása.',
    devices:'A gépbe épített eszközök és az illesztőprogramjaik.',
    media:'A cserélhető adathordozók és a hozzájuk tartozó könyvtárak.',
    defrag:'A köteten lévő fájlok töredezettségének megszüntetése.',
    diskmgmt:'A lemezek particionálása és a kötetek karbantartása.',
    wmi:'A Windows felügyeleti eszközeinek beállításai.',
    index:'A gyorsabb kereséshez indexelt mappák és katalógusok.'
  };
  const SERVICES=[
    ['Automatikus frissítések','Elindítva','Automatikus','Helyi rendszer'],
    ['Beépülő eszközök támogatása (Plug and Play)','Elindítva','Automatikus','Helyi rendszer'],
    ['Eseménynapló','Elindítva','Automatikus','Helyi rendszer'],
    ['Hálózati kapcsolatok','Elindítva','Kézi','Helyi rendszer'],
    ['Nyomtatásisor-kezelő','Elindítva','Automatikus','Helyi rendszer'],
    ['Súgó és támogatás','Elindítva','Automatikus','Helyi rendszer'],
    ['Számítógépböngésző','Elindítva','Automatikus','Helyi rendszer'],
    ['Windows Audio','Elindítva','Automatikus','Helyi rendszer'],
    ['Windows tűzfal / Internetkapcsolat megosztása','Elindítva','Automatikus','Helyi rendszer'],
    ['Telnet','Leállítva','Letiltva','Helyi szolgáltatás']
  ];
  const DEVICES=[
    ['Billentyűzetek','Szabványos 101/102 gombos billentyűzet'],
    ['DVD/CD-ROM-meghajtók','HL-DT-ST DVD-ROM GDR8162B'],
    ['Egerek és egyéb mutatóeszközök','PS/2 kompatibilis egér'],
    ['Hang-, videó- és játékvezérlők','Realtek AC97 Audio'],
    ['Hálózati kártyák','Realtek RTL8139 Family PCI Fast Ethernet NIC'],
    ['Képernyőadapterek','NVIDIA GeForce4 MX 440'],
    ['Lemezmeghajtók','ST340016A'],
    ['Processzorok','Intel Pentium 4 1.80 GHz']
  ];
  const EVENTS={
    'event-app':[
      ['Tájékoztatás','2026. 09. 07.','13:58','Windows Media Player','Nincs','101'],
      ['Tájékoztatás','2026. 09. 07.','13:41','MsiInstaller','Nincs','11707'],
      ['Figyelmeztetés','2026. 09. 06.','21:12','Application Hang','(101)','1002']
    ],
    'event-sec':[
      ['Sikeres naplózás','2026. 09. 07.','13:38','Security','Bejelentkezés/kijelentkezés','528'],
      ['Sikeres naplózás','2026. 09. 07.','13:38','Security','Fiókkezelés','642'],
      ['Sikertelen naplózás','2026. 09. 05.','08:02','Security','Bejelentkezés/kijelentkezés','529']
    ],
    'event-sys':[
      ['Tájékoztatás','2026. 09. 07.','13:37','eventlog','Nincs','6005'],
      ['Tájékoztatás','2026. 09. 07.','13:37','Service Control Manager','Nincs','7035'],
      ['Hiba','2026. 09. 06.','19:55','atapi','Nincs','9']
    ]
  };

  XP.register('compmgmt',()=>{
    if(XP.singleton('compmgmt'))return;
    const w=XP.createWindow({title:'Számítógép-kezelés',icon:'computer',app:'compmgmt',
      width:720,height:470,minWidth:520,minHeight:330});
    let selected='root';
    const expanded=new Set(['root','tools','storage','apps']);

    XP.menubar(w,{
      'Fájl':[{label:'Bezárás',action:()=>w.close()}],
      'Művelet':()=>[{label:'Frissítés',shortcut:'F5',action:render},{label:'Exportálás…',disabled:true}],
      'Nézet':()=>[{label:'Nagy ikonok',disabled:true},{label:'Részletek',checked:true,disabled:true}],
      'Súgó':[{label:'A Számítógép-kezelés névjegye',action:()=>XP.dialog('Számítógép-kezelés','Számítógép-kezelés\n\nA gép eszközeit, naplóit, helyi fiókjait, lemezeit és szolgáltatásait egy helyen kezeli.\n\nMegnyitás: a Sajátgép ikonjának helyi menüjéből, vagy a Futtatás ablakból: compmgmt.msc')}]
    });

    const body=document.createElement('div');body.className='mmc';
    body.innerHTML='<div class="mmc-tree"></div><div class="mmc-pane"></div>';
    w.body.append(body);
    const treeEl=$('.mmc-tree',body),pane=$('.mmc-pane',body);
    const bar=XP.status(w,'');

    const find=(node,id)=>node[0]===id?node:node[3].reduce((found,child)=>found||find(child,id),null);
    const table=(columns,rows)=>`<table class="mmc-table"><thead><tr>${columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
      rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    function branch(node,depth){
      const [id,label,ic,children]=node;
      const open=expanded.has(id);
      return `<div class="mmc-node" style="padding-left:${depth*15}px">
        <button class="mmc-twist" data-twist="${esc(id)}">${children.length?(open?'−':'+'):''}</button>
        <button class="mmc-item ${selected===id?'selected':''}" data-node="${esc(id)}">${icon(ic)}<span>${esc(label)}</span></button>
      </div>${open?children.map(child=>branch(child,depth+1)).join(''):''}`;
    }

    // Amit a jobb oldali panel mutat: a levelek a saját listájukat, a mappák a gyerekeiket.
    function paneFor(id){
      if(EVENTS[id])return {count:EVENTS[id].length,html:table(['Típus','Dátum','Idő','Forrás','Kategória','Esemény'],EVENTS[id])};
      if(id==='service-list')return {count:SERVICES.length,html:table(['Név','Állapot','Indítás típusa','Bejelentkezés'],SERVICES)};
      if(id==='devices')return {count:DEVICES.length,html:table(['Eszközcsoport','Eszköz'],DEVICES.map(([group,device])=>[`${icon('computer')}${esc(group)}`,esc(device)]))};
      if(id==='user-list'){
        const rows=XP.accounts(true).map(account=>[`${XP.avatar(account.avatar)}${esc(account.name)}`,
          account.id==='guest'?'Beépített fiók a gép vendégei számára':'Beépített fiók a gép felügyeletéhez',
          account.id==='guest'?(account.enabled?'Bekapcsolva':'Kikapcsolva'):'Bekapcsolva']);
        return {count:rows.length,html:table(['Név','Leírás','Állapot'],rows)};
      }
      if(id==='group-list'){
        const rows=[['Rendszergazdák','A rendszergazdák teljes hozzáféréssel rendelkeznek a géphez'],
          ['Felhasználók','A felhasználók nem végezhetnek rendszerszintű módosításokat'],
          ['Vendégek','A vendégek alapértelmezés szerint a Felhasználók csoport jogait kapják'],
          ['Biztonságimásolat-felelősök','Fájlok mentése és visszaállítása a jogosultságok megkerülésével']];
        return {count:rows.length,html:table(['Név','Leírás'],rows)};
      }
      if(id==='shares'){
        const rows=[['C$','C:\\','Windows-rendszermegosztás'],['ADMIN$','C:\\WINDOWS','Távoli felügyelet'],['IPC$','','Távoli IPC']];
        return {count:rows.length,html:table(['Megosztás neve','Mappa útvonala','Megjegyzés'],rows)};
      }
      if(id==='diskmgmt'){
        const used=4283924480+state.files.filter(f=>!f.deleted).reduce((sum,f)=>sum+(f.content||'').length+1024,0);
        const capacity=40*1024**3-1_100_000_000;
        const gb=value=>`${(value/1024**3).toFixed(2).replace('.',',')} GB`;
        const rows=[[`${icon('disk')}(C:)`,'Egyszerű','Alap','NTFS','Kifogástalan (rendszer)',gb(capacity),gb(capacity-used),`${Math.round((capacity-used)/capacity*100)} %`],
          [`${icon('cd')}(D:)`,'Egyszerű','Alap','','Nincs adathordozó','0 GB','0 GB','0 %']];
        return {count:rows.length,html:table(['Kötet','Elrendezés','Típus','Fájlrendszer','Állapot','Kapacitás','Szabad hely','% szabad'],rows)};
      }
      const node=find(TREE,id);
      if(node&&node[3].length){
        const rows=node[3].map(child=>[`${icon(child[2])}${esc(child[1])}`,esc(DESCRIPTIONS[child[0]]||'')]);
        return {count:rows.length,html:table(['Név','Leírás'],rows)};
      }
      return {count:0,html:`<p class="mmc-note">${esc(DESCRIPTIONS[id]||'Ehhez az elemhez nincs megjeleníthető adat.')}</p>`};
    }

    function render(){
      treeEl.innerHTML=branch(TREE,0);
      const node=find(TREE,selected),content=paneFor(selected);
      pane.innerHTML=`<header class="mmc-heading">${icon(node?.[2]||'computer')}${esc(node?.[1]||'')}</header>${content.html}`;
      $('span',bar).textContent=content.count?`${content.count} elem`:'Kész';
    }

    body.onclick=event=>{
      const twist=event.target.closest('[data-twist]');
      if(twist){const id=twist.dataset.twist;expanded.has(id)?expanded.delete(id):expanded.add(id);render();return;}
      const item=event.target.closest('[data-node]');
      if(item){selected=item.dataset.node;expanded.add(selected);render();}
    };
    XP.onFiles(w,render);
    render();
    return w;
  });
})();
