'use strict';
(() => {
  const {$,$$,esc,icon,state,t}=XP;
  // A Számítógép-kezelés konzol fája: csomópont, cím, ikon, gyerekek.
  const TREE=['root',t('Számítógép-kezelés (helyi)'),'computer',[
    ['tools',t('Rendszereszközök'),'folder',[
      ['events',t('Eseménynapló'),'folder',[
        ['event-app',t('Alkalmazás'),'documents',[]],
        ['event-sec',t('Biztonság'),'security',[]],
        ['event-sys',t('Rendszer'),'computer',[]]
      ]],
      ['shares',t('Megosztott mappák'),'folder',[]],
      ['accounts',t('Helyi felhasználók és csoportok'),'user',[
        ['user-list',t('Felhasználók'),'user',[]],
        ['group-list',t('Csoportok'),'user',[]]
      ]],
      ['perf',t('Teljesítménynaplók és riasztások'),'taskmgr',[]],
      ['devices',t('Eszközkezelő'),'computer',[]]
    ]],
    ['storage',t('Tárolás'),'disk',[
      ['media',t('Cserélhető adathordozó'),'cd',[]],
      ['defrag',t('Lemeztöredezettség-mentesítő'),'disk',[]],
      ['diskmgmt',t('Lemezkezelés'),'disk',[]]
    ]],
    ['apps',t('Szolgáltatások és alkalmazások'),'control',[
      ['service-list',t('Szolgáltatások'),'control',[]],
      ['wmi',t('WMI-vezérlő'),'control',[]],
      ['index',t('Indexelő szolgáltatás'),'search',[]]
    ]]
  ]];
  const DESCRIPTIONS={
    tools:t('A gép állapotát és a helyi fiókokat kezelő eszközök.'),
    events:t('A Windows és a programok által naplózott események.'),
    storage:t('A lemezek és a cserélhető adathordozók kezelése.'),
    apps:t('A gépen futó szolgáltatások és kiszolgálóalkalmazások.'),
    shares:t('A gépen megosztott mappák, a nyitott munkamenetek és fájlok.'),
    accounts:t('A gépen létrehozott felhasználói fiókok és csoportok.'),
    perf:t('Teljesítményszámlálók naplózása és riasztások beállítása.'),
    devices:t('A gépbe épített eszközök és az illesztőprogramjaik.'),
    media:t('A cserélhető adathordozók és a hozzájuk tartozó könyvtárak.'),
    defrag:t('A köteten lévő fájlok töredezettségének megszüntetése.'),
    diskmgmt:t('A lemezek particionálása és a kötetek karbantartása.'),
    wmi:t('A Windows felügyeleti eszközeinek beállításai.'),
    index:t('A gyorsabb kereséshez indexelt mappák és katalógusok.')
  };
  const SERVICES=[
    [t('Automatikus frissítések'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Beépülő eszközök támogatása (Plug and Play)'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Eseménynapló'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Hálózati kapcsolatok'),t('Elindítva'),t('Kézi'),t('Helyi rendszer')],
    [t('Nyomtatásisor-kezelő'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Súgó és támogatás'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Számítógépböngésző'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    ['Windows Audio',t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    [t('Windows tűzfal / Internetkapcsolat megosztása'),t('Elindítva'),t('Automatikus'),t('Helyi rendszer')],
    ['Telnet',t('Leállítva'),t('Letiltva'),t('Helyi szolgáltatás')]
  ];
  const DEVICES=[
    [t('Billentyűzetek'),t('Szabványos 101/102 gombos billentyűzet')],
    [t('DVD/CD-ROM-meghajtók'),'HL-DT-ST DVD-ROM GDR8162B'],
    [t('Egerek és egyéb mutatóeszközök'),t('PS/2 kompatibilis egér')],
    [t('Hang-, videó- és játékvezérlők'),'Realtek AC97 Audio'],
    [t('Hálózati kártyák'),'Realtek RTL8139 Family PCI Fast Ethernet NIC'],
    [t('Képernyőadapterek'),'NVIDIA GeForce4 MX 440'],
    [t('Lemezmeghajtók'),'ST340016A'],
    [t('Processzorok'),'Intel Pentium 4 1.80 GHz']
  ];
  const EVENTS={
    'event-app':[
      [t('Tájékoztatás'),'2026. 09. 07.','13:58','Windows Media Player',t('Nincs'),'101'],
      [t('Tájékoztatás'),'2026. 09. 07.','13:41','MsiInstaller',t('Nincs'),'11707'],
      [t('Figyelmeztetés'),'2026. 09. 06.','21:12','Application Hang','(101)','1002']
    ],
    'event-sec':[
      [t('Sikeres naplózás'),'2026. 09. 07.','13:38','Security',t('Bejelentkezés/kijelentkezés'),'528'],
      [t('Sikeres naplózás'),'2026. 09. 07.','13:38','Security',t('Fiókkezelés'),'642'],
      [t('Sikertelen naplózás'),'2026. 09. 05.','08:02','Security',t('Bejelentkezés/kijelentkezés'),'529']
    ],
    'event-sys':[
      [t('Tájékoztatás'),'2026. 09. 07.','13:37','eventlog',t('Nincs'),'6005'],
      [t('Tájékoztatás'),'2026. 09. 07.','13:37','Service Control Manager',t('Nincs'),'7035'],
      [t('Hiba'),'2026. 09. 06.','19:55','atapi',t('Nincs'),'9']
    ]
  };

  XP.register('compmgmt',()=>{
    if(XP.singleton('compmgmt'))return;
    const w=XP.createWindow({title:t('Számítógép-kezelés'),icon:'computer',app:'compmgmt',
      width:720,height:470,minWidth:520,minHeight:330});
    let selected='root';
    const expanded=new Set(['root','tools','storage','apps']);

    XP.menubar(w,{
      [t('Fájl')]:[{label:t('Bezárás'),action:()=>w.close()}],
      [t('Művelet')]:()=>[{label:t('Frissítés'),shortcut:'F5',action:render},{label:t('Exportálás…'),disabled:true}],
      [t('Nézet')]:()=>[{label:t('Nagy ikonok'),disabled:true},{label:t('Részletek'),checked:true,disabled:true}],
      [t('Súgó')]:[{label:t('A Számítógép-kezelés névjegye'),action:()=>XP.dialog(t('Számítógép-kezelés'),t('Számítógép-kezelés\n\nA gép eszközeit, naplóit, helyi fiókjait, lemezeit és szolgáltatásait egy helyen kezeli.\n\nMegnyitás: a Sajátgép ikonjának helyi menüjéből, vagy a Futtatás ablakból: compmgmt.msc'))}]
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
      if(EVENTS[id])return {count:EVENTS[id].length,html:table([t('Típus'),t('Dátum'),t('Idő'),t('Forrás'),t('Kategória'),t('Esemény')],EVENTS[id])};
      if(id==='service-list')return {count:SERVICES.length,html:table([t('Név'),t('Állapot'),t('Indítás típusa'),t('Bejelentkezés')],SERVICES)};
      if(id==='devices')return {count:DEVICES.length,html:table([t('Eszközcsoport'),t('Eszköz')],DEVICES.map(([group,device])=>[`${icon('computer')}${esc(group)}`,esc(device)]))};
      if(id==='user-list'){
        const rows=XP.accounts(true).map(account=>[`${XP.avatar(account.avatar)}${esc(account.name)}`,
          account.id==='guest'?t('Beépített fiók a gép vendégei számára'):t('Beépített fiók a gép felügyeletéhez'),
          account.id==='guest'?(account.enabled?t('Bekapcsolva'):t('Kikapcsolva')):t('Bekapcsolva')]);
        return {count:rows.length,html:table([t('Név'),t('Leírás'),t('Állapot')],rows)};
      }
      if(id==='group-list'){
        const rows=[[t('Rendszergazdák'),t('A rendszergazdák teljes hozzáféréssel rendelkeznek a géphez')],
          [t('Felhasználók'),t('A felhasználók nem végezhetnek rendszerszintű módosításokat')],
          [t('Vendégek'),t('A vendégek alapértelmezés szerint a Felhasználók csoport jogait kapják')],
          [t('Biztonságimásolat-felelősök'),t('Fájlok mentése és visszaállítása a jogosultságok megkerülésével')]];
        return {count:rows.length,html:table([t('Név'),t('Leírás')],rows)};
      }
      if(id==='shares'){
        const rows=[['C$','C:\\',t('Windows-rendszermegosztás')],['ADMIN$','C:\\WINDOWS',t('Távoli felügyelet')],['IPC$','',t('Távoli IPC')]];
        return {count:rows.length,html:table([t('Megosztás neve'),t('Mappa útvonala'),t('Megjegyzés')],rows)};
      }
      if(id==='diskmgmt'){
        const used=4283924480+state.files.filter(f=>!f.deleted).reduce((sum,f)=>sum+(f.content||'').length+1024,0);
        const capacity=40*1024**3-1_100_000_000;
        const gb=value=>`${(value/1024**3).toFixed(2).replace('.',',')} GB`;
        const rows=[[`${icon('disk')}(C:)`,t('Egyszerű'),t('Alap'),'NTFS',t('Kifogástalan (rendszer)'),gb(capacity),gb(capacity-used),`${Math.round((capacity-used)/capacity*100)} %`],
          [`${icon('cd')}(D:)`,t('Egyszerű'),t('Alap'),'',t('Nincs adathordozó'),'0 GB','0 GB','0 %']];
        return {count:rows.length,html:table([t('Kötet'),t('Elrendezés'),t('Típus'),t('Fájlrendszer'),t('Állapot'),t('Kapacitás'),t('Szabad hely'),'% szabad'],rows)};
      }
      const node=find(TREE,id);
      if(node&&node[3].length){
        const rows=node[3].map(child=>[`${icon(child[2])}${esc(child[1])}`,esc(DESCRIPTIONS[child[0]]||'')]);
        return {count:rows.length,html:table([t('Név'),t('Leírás')],rows)};
      }
      return {count:0,html:`<p class="mmc-note">${esc(DESCRIPTIONS[id]||t('Ehhez az elemhez nincs megjeleníthető adat.'))}</p>`};
    }

    function render(){
      treeEl.innerHTML=branch(TREE,0);
      const node=find(TREE,selected),content=paneFor(selected);
      pane.innerHTML=`<header class="mmc-heading">${icon(node?.[2]||'computer')}${esc(node?.[1]||'')}</header>${content.html}`;
      $('span',bar).textContent=content.count?t('{count} elem',{count:content.count}):t('Kész');
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
