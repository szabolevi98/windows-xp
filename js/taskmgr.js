'use strict';
(() => {
  const {$,$$,esc,icon,state,t,locale}=XP;
  // The image name each program would run under on a real machine.
  const EXE={notepad:'notepad.exe',paint:'mspaint.exe',calculator:'calc.exe',cmd:'cmd.exe',ie:'iexplore.exe',
    outlook:'msimn.exe',player:'wmplayer.exe',explorer:'explorer.exe',mines:'winmine.exe',solitaire:'sol.exe',
    freecell:'freecell.exe',spider:'spider.exe',hearts:'mshearts.exe',pinball:'pinball.exe',taskmgr:'taskmgr.exe',
    help:'helpctr.exe',search:'search.exe',image:'shimgvw.exe',accounts:'nusrmgr.exe',control:'control.exe',
    security:'wscui.exe',network:'netcfg.exe',calendar:'timedate.exe',volume:'sndvol32.exe',settings:'rundll32.exe',
    taskbar:'rundll32.exe',compmgmt:'mmc.exe',display:'rundll32.exe',system:'rundll32.exe',sounds:'rundll32.exe','outlook-compose':'msimn.exe'};
  const SYSTEM=[
    ['System Idle Process','SYSTEM',28],['System','SYSTEM',236],['smss.exe','SYSTEM',388],
    ['csrss.exe','SYSTEM',4128],['winlogon.exe','SYSTEM',3512],['services.exe','SYSTEM',4020],
    ['lsass.exe','SYSTEM',1284],['svchost.exe','SYSTEM',4784],['svchost.exe',t('HÁLÓZATI SZOLGÁLTATÁS'),3496],
    ['svchost.exe',t('HELYI SZOLGÁLTATÁS'),4256],['spoolsv.exe','SYSTEM',5140],['explorer.exe',null,14260]
  ];
  // Everything the machine is running: the services it always has, plus a process per open program.
  function processes(apps,user=t('Adminisztrátor')){
    const system=SYSTEM.map(([name,owner,memory])=>({name,user:owner||user,memory,app:null}));
    const running=apps.map((app,index)=>({name:EXE[app]||`${app}.exe`,user,memory:3600+((index*1637)%9200),app}));
    return [...system,...running];
  }
  XP.taskProcesses=processes;

  XP.register('taskmgr',()=>{
    if(XP.singleton('taskmgr'))return;
    const w=XP.createWindow({title:t('Windows Feladatkezelő'),icon:'taskmgr',app:'taskmgr',className:'taskmgr-window',
      width:520,height:500,minWidth:400,minHeight:340});
    const TABS=[['apps',t('Alkalmazások')],['processes',t('Folyamatok')],['performance',t('Teljesítmény')],['network',t('Hálózat')],['users',t('Felhasználók')]];
    let tab='apps',selectedTask=null,selectedProcess=null,cpu=3,history=Array(60).fill(3),net=Array(60).fill(0);
    const others=()=>[...XP.windows.values()].filter(win=>!win.modal);
    const rows=()=>processes(others().map(win=>win.app),state.user||t('Adminisztrátor'));

    XP.menubar(w,{
      [t('Fájl')]:()=>[{label:t('Új feladat (Futtatás…)'),action:()=>XP.open('run')},null,{label:t('Kilépés a Feladatkezelőből'),action:()=>w.close()}],
      [t('Beállítások')]:[{label:t('Mindig látható'),disabled:true},{label:t('Kis méret használatkor'),disabled:true}],
      [t('Nézet')]:()=>TABS.map(([key,label])=>({label,checked:tab===key,action:()=>{tab=key;render();}})),
      [t('Leállítás')]:[{label:t('Készenlét'),action:()=>XP.open('power')},{label:t('Kikapcsolás'),action:()=>XP.open('power')},null,{label:t('Kijelentkezés'),action:()=>XP.open('logoff')}],
      [t('Súgó')]:[{label:t('A Feladatkezelő névjegye'),action:()=>XP.dialog(t('Windows Feladatkezelő'),t('Windows Feladatkezelő\n\nA futó programokat és folyamatokat mutatja, és le is állíthatod őket.\n\nMegnyitás: Ctrl+Shift+Esc vagy Ctrl+Alt+Del.'))}]
    });

    const body=document.createElement('div');body.className='taskmgr-body';
    body.innerHTML='<nav class="tabs"></nav><div class="tab-panel"></div><div class="taskmgr-buttons"></div>';
    w.body.append(body);
    const panel=$('.tab-panel',body),bar=$('.tabs',body),buttons=$('.taskmgr-buttons',body);
    bar.innerHTML=TABS.map(([key,label])=>`<button data-tab="${key}">${esc(label)}</button>`).join('');
    const footer=document.createElement('footer');footer.className='status-bar taskmgr-status';
    footer.innerHTML='<span></span><span class="status-part"></span><span class="status-part"></span>';
    w.body.append(footer);

    const graph=(canvas,values,colour)=>{
      const context=canvas.getContext('2d');
      const width=canvas.width=canvas.clientWidth||220,height=canvas.height=canvas.clientHeight||90;
      context.fillStyle='#000';context.fillRect(0,0,width,height);
      context.strokeStyle='#0a3a0a';context.lineWidth=1;
      for(let x=width%12;x<width;x+=12){context.beginPath();context.moveTo(x+.5,0);context.lineTo(x+.5,height);context.stroke();}
      for(let y=height%12;y<height;y+=12){context.beginPath();context.moveTo(0,y+.5);context.lineTo(width,y+.5);context.stroke();}
      context.strokeStyle=colour;context.lineWidth=1.4;context.beginPath();
      values.forEach((value,index)=>{
        const x=index/(values.length-1)*width,y=height-value/100*height;
        if(index)context.lineTo(x,y);else context.moveTo(x,y);
      });
      context.stroke();
    };

    function render(){
      $$('[data-tab]',bar).forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
      const running=others(),list=rows();
      if(tab==='apps'){
        panel.innerHTML=running.length
          ?`<table class="taskmgr-table"><thead><tr><th>${esc(t('Feladat'))}</th><th>${esc(t('Állapot'))}</th></tr></thead><tbody>${running.map(win=>
             `<tr class="${win.id===selectedTask?'selected':''}" data-task="${win.id}"><td>${icon(win.icon)}${esc(win.title)}</td><td>${win.minimized?t('Fut'):t('Fut')}</td></tr>`).join('')}</tbody></table>`
          :`<p class="taskmgr-empty">${esc(t('Nincs futó alkalmazás.'))}</p>`;
        buttons.innerHTML=`<button class="xp-button" data-do="end">${esc(t('Feladat befejezése'))}</button><button class="xp-button" data-do="switch">${esc(t('Váltás'))}</button><button class="xp-button" data-do="new">${esc(t('Új feladat…'))}</button>`;
      }
      if(tab==='processes'){
        panel.innerHTML=`<table class="taskmgr-table processes"><thead><tr><th>${esc(t('Képfájlnév'))}</th><th>${esc(t('Felhasználónév'))}</th><th>CPU</th><th>${esc(t('Memóriahasználat'))}</th></tr></thead><tbody>${list.map((process,index)=>{
          const share=process.name==='System Idle Process'?100-cpu:process.app?Math.max(0,Math.round(cpu/Math.max(1,running.length))):0;
          return `<tr class="${index===selectedProcess?'selected':''}" data-process="${index}"><td>${esc(process.name)}</td><td>${esc(process.user)}</td><td>${String(share).padStart(2,'0')}</td><td>${process.memory.toLocaleString(locale())} KB</td></tr>`;
        }).join('')}</tbody></table>`;
        buttons.innerHTML=`<button class="xp-button" data-do="kill">${esc(t('Folyamat leállítása'))}</button>`;
      }
      if(tab==='performance'){
        panel.innerHTML=`<div class="taskmgr-meters"><div><h3>${esc(t('CPU-használat'))}</h3><div class="meter-box"><b>${cpu}%</b></div></div><div class="taskmgr-graph"><h3>${esc(t('CPU-használat előzményei'))}</h3><canvas class="cpu-graph"></canvas></div></div><dl class="taskmgr-facts"><dt>${esc(t('Leírók'))}</dt><dd>${8214+list.length*37}</dd><dt>${esc(t('Szálak'))}</dt><dd>${312+list.length*9}</dd><dt>${esc(t('Folyamatok'))}</dt><dd>${list.length}</dd><dt>${esc(t('Fizikai memória összesen'))}</dt><dd>523 760 KB</dd><dt>${esc(t('Fizikai memória szabad'))}</dt><dd>${(268400-list.length*1800).toLocaleString(locale())} KB</dd><dt>${esc(t('Véglegesített memória'))}</dt><dd>${(146200+list.length*2400).toLocaleString(locale())} KB</dd></dl>`;
        graph($('.cpu-graph',panel),history,'#26ff5c');
        buttons.innerHTML='';
      }
      if(tab==='network'){
        panel.innerHTML=`<div class="taskmgr-graph wide"><h3>Helyi kapcsolat</h3><canvas class="net-graph"></canvas></div><table class="taskmgr-table"><thead><tr><th>${esc(t('Adapter'))}</th><th>${esc(t('Hálózat kihasználtsága'))}</th><th>${esc(t('Kapcsolat sebessége'))}</th><th>${esc(t('Állapot'))}</th></tr></thead><tbody><tr><td>Helyi kapcsolat</td><td>${(net.at(-1)/10).toFixed(2)} %</td><td>100 Mbps</td><td>${esc(t('Működik'))}</td></tr></tbody></table>`;
        graph($('.net-graph',panel),net,'#ffd23f');
        buttons.innerHTML='';
      }
      if(tab==='users'){
        // Everyone signed in: the account at the machine, and whoever left programs running.
        const sessions=XP.accounts().filter(account=>account.active||account.running);
        panel.innerHTML=`<table class="taskmgr-table"><thead><tr><th>${esc(t('Felhasználó'))}</th><th>${esc(t('Azonosító'))}</th><th>${esc(t('Állapot'))}</th><th>${esc(t('Futó programok'))}</th></tr></thead><tbody>${sessions.map((account,index)=>
          `<tr class="${account.active?'selected':''}"><td>${XP.avatar(account.avatar)}${esc(account.name)}</td><td>${index}</td><td>${account.active?t('Aktív'):t('Leválasztva')}</td><td>${account.active?others().length:account.running}</td></tr>`).join('')}</tbody></table>`;
        buttons.innerHTML=`<button class="xp-button" data-do="switch-user">${esc(t('Felhasználóváltás'))}</button><button class="xp-button" data-do="logoff">${esc(t('Kijelentkezés'))}</button>`;
      }
      $('span',footer).textContent=`Folyamatok: ${list.length}`;
      $$('.status-part',footer)[0].textContent=`CPU-használat: ${cpu}%`;
      $$('.status-part',footer)[1].textContent=`Véglegesített memória: ${((146200+list.length*2400)/1024).toFixed(0)} M / 1279 M`;
    }

    bar.onclick=event=>{const button=event.target.closest('[data-tab]');if(button){tab=button.dataset.tab;render();}};
    panel.onclick=event=>{
      const task=event.target.closest('[data-task]');
      if(task){selectedTask=task.dataset.task;render();return;}
      const process=event.target.closest('[data-process]');
      if(process){selectedProcess=Number(process.dataset.process);render();}
    };
    panel.ondblclick=event=>{
      const task=event.target.closest('[data-task]');
      if(task)XP.focus(XP.windows.get(task.dataset.task));
    };
    buttons.onclick=event=>{
      const action=event.target.closest('[data-do]')?.dataset.do;
      const target=selectedTask&&XP.windows.get(selectedTask);
      if(action==='end'){if(target)XP.close(target);selectedTask=null;render();}
      if(action==='switch'&&target)XP.focus(target);
      if(action==='new')XP.open('run');
      if(action==='logoff'||action==='switch-user')XP.open('logoff');
      if(action==='kill'){
        const process=rows()[selectedProcess];
        if(!process)return;
        if(!process.app){XP.sound('error');XP.dialog(t('Feladatkezelő'),t('Ez egy rendszerfolyamat, és nem állítható le.'),{icon:'error'});return;}
        XP.confirm(t('Feladatkezelő – figyelmeztetés'),`Biztosan leállítod a(z) ${process.name} folyamatot?\n\nA nem mentett adatok elvesznek.`).then(answer=>{
          if(answer!=='Igen')return;
          const victim=others().find(win=>win.app===process.app);
          if(victim)XP.close(victim);
          selectedProcess=null;render();
        });
      }
    };

    const tick=setInterval(()=>{
      if(w.parked)return;
      const load=Math.min(96,2+others().length*4+Math.round(Math.random()*7));
      cpu=Math.round((cpu*2+load)/3);
      history=[...history.slice(1),cpu];
      net=[...net.slice(1),Math.min(60,Math.round(Math.random()*(others().length?14:3)))];
      render();
    },1200);
    w.cleanup.push(()=>clearInterval(tick));
    XP.onFiles(w,render);
    render();
    return w;
  });

  // Ctrl+Shift+Esc, and Ctrl+Alt+Del, both reach for the Task Manager.
  document.addEventListener('keydown',event=>{
    const combo=(event.ctrlKey&&event.shiftKey&&event.key==='Escape')||(event.ctrlKey&&event.altKey&&event.key==='Delete');
    if(!combo||XP.modal)return;
    event.preventDefault();
    XP.open('taskmgr');
  });
})();
