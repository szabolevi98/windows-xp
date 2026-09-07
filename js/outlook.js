'use strict';
(() => {
  const {$,$$,esc,icon,state,persist,notify}=XP;
  const FOLDERS=[['inbox','Beérkezett üzenetek'],['outbox','Postázandó üzenetek'],['sent','Elküldött elemek'],['deleted','Törölt elemek'],['drafts','Piszkozatok']];
  const CONTACTS=[['Kovács Anna','anna@netkapu.hu'],['Nagy Péter','peter.nagy@freemail.hu'],['PC Bazár ügyfélszolgálat','info@pcbazar.hu'],['Netklub fórum','forum@netklub.hu']];
  const stamp=date=>`${date.getFullYear()}.%m.%d. %H:%M`.replace('%m',String(date.getMonth()+1).padStart(2,'0')).replace('%d',String(date.getDate()).padStart(2,'0')).replace('%H',String(date.getHours()).padStart(2,'0')).replace('%M',String(date.getMinutes()).padStart(2,'0'));

  // The delivered post is fixed; only what the user did with it is remembered.
  const POST=[
    {id:'welcome',from:'Outlook Express',address:'support@netkapu.hu',subject:'Üdvözöljük az Outlook Expressben!',ago:184,
     body:'Köszönjük, hogy az Outlook Expresst választotta.\n\nEbben a mappában találja a beérkező üzeneteit. Új levelet az eszköztár „Új levél” gombjával írhat, a válaszhoz jelölje ki az üzenetet, és kattintson a „Válasz” gombra.\n\nA fiókja a netkapu.hu levelezőkiszolgálóján van; a Küldés/fogadás gomb minden indításkor és félóránként ellenőrzi a postaládát.'},
    {id:'netkapu',from:'Netkapu hírlevél',address:'hirlevel@netkapu.hu',subject:'Heti ajánló: mit érdemes megnézni a hálón?',ago:96,
     body:'Kedves Előfizetőnk!\n\nEzen a héten ajánljuk figyelmébe a PC Magazin otthoni gépekről szóló összeállítását, valamint a Netklub fórum új, hardveres rovatát.\n\nA hírlevélről a lap alján iratkozhat le.\n\nÜdvözlettel:\na Netkapu szerkesztősége'},
    {id:'pcbazar',from:'PC Bazár',address:'info@pcbazar.hu',subject:'Megrendelése összeállítva – 129 900 Ft',ago:51,
     body:'Tisztelt Vásárlónk!\n\nAz Otthoni PC 2400+ konfigurációt összeállítottuk. A gép 2,4 GHz-es processzorral, 512 MB memóriával és 80 GB-os merevlemezzel kerül átadásra.\n\nÁtvétel: személyesen az üzletben, munkanapokon 9 és 18 óra között.\n\nKöszönjük, hogy minket választott!'},
    {id:'anna',from:'Kovács Anna',address:'anna@netkapu.hu',subject:'Re: hétvégi programok',ago:19,
     body:'Szia!\n\nA szombat nekem is jó. Ha marad időnk, megnézhetnénk azt a fórumos gépépítős leírást is, amit küldtél.\n\nAddig is jó hétvégét!\nAnna'},
    {id:'forum',from:'Netklub fórum',address:'forum@netklub.hu',subject:'Válasz érkezett a hozzászólásodra',ago:6,
     body:'Valaki válaszolt abban a témában, amelyet figyelsz:\n\n„Melyik hangkártyát érdemes venni?”\n\nA teljes beszélgetést a fórumon olvashatod el.'}
  ];
  const NEW_POST={id:'later',from:'Nagy Péter',address:'peter.nagy@freemail.hu',subject:'Megjöttek a képek',ago:0,
    body:'Szia!\n\nFeltöltöttem a nyári képeket, a linket a fórumos üzenetben találod. Ha lassú a letöltés, éjjel próbáld meg.\n\nÜdv:\nPéter'};

  const store=()=>{
    if(!state.outlook||typeof state.outlook!=='object')state.outlook={read:[],moved:{},own:[],fetched:false};
    const box=state.outlook;
    if(!Array.isArray(box.read))box.read=[];
    if(!box.moved||typeof box.moved!=='object')box.moved={};
    if(!Array.isArray(box.own))box.own=[];
    return box;
  };
  // Which folder a message sits in, and how many unread each folder holds.
  const folderOf=(message,moved)=>moved[message.id]||message.folder||'inbox';
  function counts(messages,read,moved){
    const totals={};
    for(const [key] of FOLDERS)totals[key]={total:0,unread:0};
    for(const message of messages){
      const folder=folderOf(message,moved);
      if(!totals[folder])totals[folder]={total:0,unread:0};
      totals[folder].total++;
      if(!read.includes(message.id)&&folder!=='sent'&&folder!=='drafts')totals[folder].unread++;
    }
    return totals;
  }
  XP.mailboxCounts=counts;

  XP.register('outlook',()=>{
    if(XP.singleton('outlook'))return;
    const w=XP.createWindow({title:'Beérkezett üzenetek – Outlook Express',icon:'mail',app:'outlook',className:'outlook-window',width:780,height:560,minWidth:470,minHeight:360});
    const box=store();
    let folder='inbox',selected=null;
    const delivered=()=>{
      const now=Date.now();
      const post=box.fetched?[...POST,NEW_POST]:POST;
      return [...post.map(m=>({...m,folder:'inbox',date:new Date(now-m.ago*3600000)})),
              ...box.own.map(m=>({...m,date:new Date(m.at)}))];
    };
    const messages=()=>delivered().filter(m=>folderOf(m,box.moved)===folder)
      .sort((a,b)=>b.date-a.date);
    const current=()=>delivered().find(m=>m.id===selected);
    const save=()=>{persist();document.dispatchEvent(new CustomEvent('xp-mail-changed'));};

    XP.menubar(w,{
      'Fájl':()=>[{label:'Új üzenet',action:()=>compose()},{label:'Mappa megnyitása',disabled:true},null,{label:'Kilépés',action:()=>w.close()}],
      'Szerkesztés':()=>[{label:'Törlés',disabled:!selected,action:remove},{label:'Megjelölés olvasottként',disabled:!selected,action:()=>{markRead(selected);render();}},{label:'Az összes megjelölése olvasottként',action:()=>{delivered().forEach(m=>markRead(m.id));render();}}],
      'Nézet':()=>FOLDERS.map(([key,label])=>({label,checked:folder===key,action:()=>{folder=key;selected=null;render();}})),
      'Eszközök':[{label:'Küldés és fogadás',action:receive},{label:'Címjegyzék',action:()=>XP.dialog('Címjegyzék',CONTACTS.map(([name,address])=>`${name}\n${address}`).join('\n\n'))},{label:'Fiókok',action:()=>XP.dialog('Internetfiókok','Levelezés\n\nFiók: netkapu.hu\nKiszolgáló: mail.netkapu.hu (POP3)\nFelhasználó: '+(state.user||'Adminisztrátor').toLowerCase().replace(/\s+/g,'.')+'\n\nA kimenő levelekhez az smtp.netkapu.hu kiszolgáló tartozik.')}],
      'Üzenet':()=>[{label:'Új üzenet',action:()=>compose()},{label:'Válasz a feladónak',disabled:!selected,action:()=>{const m=current();if(m)compose({to:m.address,subject:/^re:/i.test(m.subject)?m.subject:`Re: ${m.subject}`,quote:m});}},{label:'Továbbítás',disabled:!selected,action:()=>{const m=current();if(m)compose({subject:`Fw: ${m.subject}`,quote:m});}}],
      'Súgó':[{label:'Az Outlook Express névjegye',action:()=>XP.dialog('Outlook Express','Microsoft Outlook Express 6\n\nVerzió: 6.00.2900.5512\n\nA levelei és a névjegyei ezen a számítógépen maradnak.')}]
    });

    const toolbar=document.createElement('div');toolbar.className='toolbar';
    toolbar.innerHTML=`<button data-mail="new">${icon('mail')}<span class="toolbar-label">Új levél</span></button><span class="toolbar-separator"></span><button data-mail="reply">${icon('back')}<span class="toolbar-label">Válasz</span></button><button data-mail="forward">${icon('forward')}<span class="toolbar-label">Továbbítás</span></button><span class="toolbar-separator"></span><button data-mail="delete">${icon('recycle')}<span class="toolbar-label">Törlés</span></button><button data-mail="receive">${icon('refresh')}<span class="toolbar-label">Küldés/fogadás</span></button><button data-mail="addresses">${icon('addressbook')}<span class="toolbar-label">Címek</span></button>`;
    w.body.append(toolbar);

    const shell=document.createElement('div');shell.className='outlook-shell';
    shell.innerHTML='<aside class="oe-side"><div class="oe-tree"></div><div class="oe-contacts"><h3>Névjegyek</h3><ul></ul></div></aside><div class="oe-main"><div class="oe-list"></div><div class="oe-preview"></div></div>';
    w.body.append(shell);
    const bar=XP.status(w,'0 üzenet','Kapcsolódva');

    function markRead(id){if(!box.read.includes(id)){box.read.push(id);save();}}
    function remove(){
      if(!selected)return;
      box.moved[selected]=folder==='deleted'?'gone':'deleted';
      if(box.moved[selected]==='gone')box.own=box.own.filter(m=>m.id!==selected);
      selected=null;save();render();
    }
    function receive(){
      if(!box.fetched){
        box.fetched=true;save();render();
        XP.sound('notify');notify('Outlook Express','Egy új üzenet érkezett.');
        return;
      }
      XP.dialog('Outlook Express','Nem érkezett új üzenet.\n\nUtolsó ellenőrzés: most.');
    }
    function compose({to='',subject='',quote=null}={}){
      const c=XP.createWindow({title:'Új üzenet',icon:'mail',app:'outlook-compose',className:'outlook-window',width:560,height:430,minWidth:380,minHeight:280});
      const quoted=quote?`\n\n\n----- Eredeti üzenet -----\nFeladó: ${quote.from} <${quote.address}>\nTárgy: ${quote.subject}\n\n${quote.body}`:'';
      const form=document.createElement('div');form.className='oe-compose';
      form.innerHTML=`<label><span>Címzett:</span><input type="text" name="to" value="${esc(to)}" placeholder="valaki@netkapu.hu"></label><label><span>Tárgy:</span><input type="text" name="subject" value="${esc(subject)}"></label><textarea name="body" aria-label="Üzenet szövege">${esc(quoted)}</textarea><div class="button-row"><button class="xp-button primary" data-send>Küldés</button><button class="xp-button" data-draft>Mentés piszkozatként</button><button class="xp-button" data-cancel>Mégse</button></div>`;
      c.body.append(form);
      const read=()=>({to:$('[name=to]',form).value.trim(),subject:$('[name=subject]',form).value.trim(),body:$('[name=body]',form).value});
      const put=(target)=>{
        const draft=read();
        if(target==='sent'&&!draft.to){XP.sound('error');XP.dialog('Outlook Express','Adjon meg legalább egy címzettet.',{icon:'error'});return;}
        box.own.push({id:`own-${Date.now().toString(36)}`,folder:target,from:state.user||'Adminisztrátor',address:draft.to||'(nincs címzett)',
          subject:draft.subject||'(nincs tárgy)',body:draft.body,at:Date.now()});
        save();c.close();
        if(target==='sent')notify('Outlook Express','Az üzenetet elküldtük.');
        folder=target;selected=null;render();
      };
      form.onclick=e=>{
        if(e.target.hasAttribute?.('data-send'))put('sent');
        if(e.target.hasAttribute?.('data-draft'))put('drafts');
        if(e.target.hasAttribute?.('data-cancel'))c.close();
      };
      setTimeout(()=>$(to?'[name=subject]':'[name=to]',form).focus(),0);
      return c;
    }

    function render(){
      const all=delivered(),totals=counts(all,box.read,box.moved),list=messages();
      const name=FOLDERS.find(([key])=>key===folder)?.[1]||'Beérkezett üzenetek';
      w.setTitle(`${name} – Outlook Express`);
      $('.oe-tree',shell).innerHTML=`<h3>Helyi mappák</h3><ul>${FOLDERS.map(([key,label])=>{
        const unread=totals[key]?.unread||0;
        return `<li><button class="${key===folder?'active':''}" data-folder="${key}">${icon(key==='deleted'?'recycle':'mail')}<span>${esc(label)}${unread?` (${unread})`:''}</span></button></li>`;
      }).join('')}</ul>`;
      $('.oe-contacts ul',shell).innerHTML=CONTACTS.map(([person,address])=>`<li><button data-contact="${esc(address)}">${esc(person)}</button></li>`).join('');
      $('.oe-list',shell).innerHTML=list.length
        ?`<table><thead><tr><th>Feladó</th><th>Tárgy</th><th>Érkezett</th></tr></thead><tbody>${list.map(m=>{
          const unread=!box.read.includes(m.id)&&folder!=='sent'&&folder!=='drafts';
          return `<tr class="${m.id===selected?'selected':''} ${unread?'unread':''}" data-message="${esc(m.id)}"><td>${esc(m.from)}</td><td>${esc(m.subject)}</td><td>${stamp(m.date)}</td></tr>`;
        }).join('')}</tbody></table>`
        :'<p class="oe-empty">Ebben a mappában nincs üzenet.</p>';
      const message=current();
      $('.oe-preview',shell).innerHTML=message
        ?`<header><b>${esc(message.subject)}</b><span>Feladó: ${esc(message.from)} &lt;${esc(message.address)}&gt;</span><span>Dátum: ${stamp(message.date)}</span></header><pre>${esc(message.body)}</pre>`
        :'<p class="oe-empty">Jelöljön ki egy üzenetet az elolvasásához.</p>';
      const inbox=totals[folder]||{total:0,unread:0};
      $('span',bar).textContent=`${inbox.total} üzenet, ${inbox.unread} olvasatlan`;
      $('.status-part',bar).textContent='Kapcsolódva: mail.netkapu.hu';
    }

    shell.onclick=e=>{
      const folderButton=e.target.closest('[data-folder]');
      if(folderButton){folder=folderButton.dataset.folder;selected=null;render();return;}
      const row=e.target.closest('[data-message]');
      if(row){selected=row.dataset.message;markRead(selected);render();return;}
      const contact=e.target.closest('[data-contact]');
      if(contact)compose({to:contact.dataset.contact});
    };
    toolbar.onclick=e=>{
      const action=e.target.closest('[data-mail]')?.dataset.mail;
      const message=current();
      if(action==='new')compose();
      if(action==='reply'&&message)compose({to:message.address,subject:/^re:/i.test(message.subject)?message.subject:`Re: ${message.subject}`,quote:message});
      if(action==='forward'&&message)compose({subject:`Fw: ${message.subject}`,quote:message});
      if(action==='delete')remove();
      if(action==='receive')receive();
      if(action==='addresses')XP.dialog('Címjegyzék',CONTACTS.map(([person,address])=>`${person}\n${address}`).join('\n\n'));
    };
    render();
    return w;
  });
})();
