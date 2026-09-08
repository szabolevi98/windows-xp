'use strict';
(() => {
  const {$,$$,esc,icon,state,persist,notify,t}=XP;
  const FOLDERS=[['inbox',t("text_inbox")],['outbox',t("text_outbox")],['sent',t("text_sent_items")],['deleted',t("text_deleted_items")],['drafts',t("text_drafts")]];
  const CONTACTS=[[t("text_anna_kovacs"),'anna@netkapu.hu'],[t("text_peter_nagy"),'peter.nagy@freemail.hu'],[t("text_pc_bazar_customer_service"),'info@pcbazar.hu'],[t("text_netklub_forum"),'forum@netklub.hu']];
  const stamp=date=>`${date.getFullYear()}.%m.%d. %H:%M`.replace('%m',String(date.getMonth()+1).padStart(2,'0')).replace('%d',String(date.getDate()).padStart(2,'0')).replace('%H',String(date.getHours()).padStart(2,'0')).replace('%M',String(date.getMinutes()).padStart(2,'0'));

  // The delivered post is fixed; only what the user did with it is remembered.
  const POST=[
    {id:'welcome',from:'Outlook Express',address:'support@netkapu.hu',subject:t("text_welcome_to_outlook_express"),ago:184,
     body:t("text_thank_you_for_choosing_outlook_express_this_folder_holds_the_messages_77ffd1d9")},
    {id:'netkapu',from:t("text_netkapu_newsletter"),address:'hirlevel@netkapu.hu',subject:t("text_this_week_s_picks_what_to_see_on_the_net"),ago:96,
     body:t("text_dear_subscriber_this_week_we_recommend_the_pc_magazine_round_up_on_hom_a70acfe5")},
    {id:'pcbazar',from:t("text_pc_bazar"),address:'info@pcbazar.hu',subject:t("text_your_order_is_ready_huf_129_900"),ago:51,
     body:t("text_dear_customer_your_home_pc_2400_configuration_is_ready_the_machine_com_d0426efd")},
    {id:'anna',from:t("text_anna_kovacs"),address:'anna@netkapu.hu',subject:t("text_re_plans_for_the_weekend"),ago:19,
     body:t("text_hi_saturday_works_for_me_too_if_there_is_time_left_we_could_look_at_th_1f3a065f")},
    {id:'forum',from:t("text_netklub_forum"),address:'forum@netklub.hu',subject:t("text_your_post_has_an_answer"),ago:6,
     body:t("text_somebody_replied_in_a_thread_you_are_watching_which_sound_card_is_wort_0d9e1f8f")}
  ];
  const NEW_POST={id:'later',from:t("text_peter_nagy"),address:'peter.nagy@freemail.hu',subject:t("text_the_pictures_are_up"),ago:0,
    body:t("text_hi_i_have_uploaded_the_summer_pictures_the_link_is_in_the_forum_messag_2f941a9a")};

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
    const w=XP.createWindow({title:t("text_inbox_outlook_express"),icon:'mail',app:'outlook',className:'outlook-window',width:780,height:560,minWidth:470,minHeight:360});
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
      [t("text_file")]:()=>[{label:t("text_new_message"),action:()=>compose()},{label:t("text_open_folder"),disabled:true},null,{label:t("text_exit"),action:()=>w.close()}],
      [t("text_edit")]:()=>[{label:t("text_delete"),disabled:!selected,action:remove},{label:t("text_mark_as_read"),disabled:!selected,action:()=>{markRead(selected);render();}},{label:t("text_mark_all_as_read"),action:()=>{delivered().forEach(m=>markRead(m.id));render();}}],
      [t("text_view")]:()=>FOLDERS.map(([key,label])=>({label,checked:folder===key,action:()=>{folder=key;selected=null;render();}})),
      [t("text_tools")]:[{label:t("text_send_and_receive"),action:receive},{label:t("text_address_book"),action:()=>XP.dialog(t("text_address_book"),CONTACTS.map(([name,address])=>`${name}\n${address}`).join('\n\n'))},{label:t("text_accounts"),action:()=>XP.dialog(t("text_internet_accounts"),t("text_mail_account_netkapu_hu_server_mail_netkapu_hu_pop3_user")+(state.user||t("text_administrator")).toLowerCase().replace(/\s+/g,'.')+t("text_outgoing_mail_goes_through_smtp_netkapu_hu"))}],
      [t("text_message")]:()=>[{label:t("text_new_message"),action:()=>compose()},{label:t("text_reply_to_the_sender"),disabled:!selected,action:()=>{const m=current();if(m)compose({to:m.address,subject:/^re:/i.test(m.subject)?m.subject:`Re: ${m.subject}`,quote:m});}},{label:t("text_forward_737edd41"),disabled:!selected,action:()=>{const m=current();if(m)compose({subject:`Fw: ${m.subject}`,quote:m});}}],
      [t("text_help")]:[{label:t("text_about_outlook_express"),action:()=>XP.dialog('Outlook Express',t("text_microsoft_outlook_express_6_version_6_00_2900_5512_your_mail_and_your_29719d44"))}]
    });

    const toolbar=document.createElement('div');toolbar.className='toolbar';
    toolbar.innerHTML=`<button data-mail="new">${icon('mail')}<span class="toolbar-label">${esc(t("text_new_mail"))}</span></button><span class="toolbar-separator"></span><button data-mail="reply">${icon('back')}<span class="toolbar-label">${esc(t("text_reply"))}</span></button><button data-mail="forward">${icon('forward')}<span class="toolbar-label">${esc(t("text_forward_737edd41"))}</span></button><span class="toolbar-separator"></span><button data-mail="delete">${icon('recycle')}<span class="toolbar-label">${esc(t("text_delete"))}</span></button><button data-mail="receive">${icon('refresh')}<span class="toolbar-label">${esc(t("text_send_recv"))}</span></button><button data-mail="addresses">${icon('addressbook')}<span class="toolbar-label">${esc(t("text_addresses"))}</span></button>`;
    w.body.append(toolbar);

    const shell=document.createElement('div');shell.className='outlook-shell';
    shell.innerHTML=`<aside class="oe-side"><div class="oe-tree"></div><div class="oe-contacts"><h3>${esc(t("text_contacts"))}</h3><ul></ul></div></aside><div class="oe-main"><div class="oe-list"></div><div class="oe-preview"></div></div>`;
    w.body.append(shell);
    const bar=XP.status(w,t("text_0_messages"),t("text_connected"));

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
        XP.sound('notify');notify('Outlook Express',t("text_one_new_message_has_arrived"));
        return;
      }
      XP.dialog('Outlook Express',t("text_no_new_messages_last_checked_just_now"));
    }
    function compose({to='',subject='',quote=null}={}){
      const c=XP.createWindow({title:t("text_new_message"),icon:'mail',app:'outlook-compose',className:'outlook-window',width:560,height:430,minWidth:380,minHeight:280});
      const quoted=quote?t("text_original_message_from_from_address_subject_subject_body",{from:quote.from,address:quote.address,subject:quote.subject,body:quote.body}):'';
      const form=document.createElement('div');form.className='oe-compose';
      form.innerHTML=`<label><span>${esc(t("text_to"))}</span><input type="text" name="to" value="${esc(to)}" placeholder="${esc(t("text_someone_netkapu_hu"))}"></label><label><span>${esc(t("text_subject_b46fe40f"))}</span><input type="text" name="subject" value="${esc(subject)}"></label><textarea name="body" aria-label="${esc(t("text_message_body"))}">${esc(quoted)}</textarea><div class="button-row"><button class="xp-button primary" data-send>${esc(t("text_send_to"))}</button><button class="xp-button" data-draft>${esc(t("text_save_as_draft"))}</button><button class="xp-button" data-cancel>${esc(t("text_cancel"))}</button></div>`;
      c.body.append(form);
      const read=()=>({to:$('[name=to]',form).value.trim(),subject:$('[name=subject]',form).value.trim(),body:$('[name=body]',form).value});
      const put=(target)=>{
        const draft=read();
        if(target==='sent'&&!draft.to){XP.sound('error');XP.dialog('Outlook Express',t("text_enter_at_least_one_recipient"),{icon:'error'});return;}
        box.own.push({id:`own-${Date.now().toString(36)}`,folder:target,from:state.user||t("text_administrator"),address:draft.to||t("text_no_recipient"),
          subject:draft.subject||t("text_no_subject"),body:draft.body,at:Date.now()});
        save();c.close();
        if(target==='sent')notify('Outlook Express',t("text_the_message_has_been_sent"));
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
      const name=FOLDERS.find(([key])=>key===folder)?.[1]||t("text_inbox");
      w.setTitle(`${name} – Outlook Express`);
      $('.oe-tree',shell).innerHTML=`<h3>${esc(t("text_local_folders"))}</h3><ul>${FOLDERS.map(([key,label])=>{
        const unread=totals[key]?.unread||0;
        return `<li><button class="${key===folder?'active':''}" data-folder="${key}">${icon(key==='deleted'?'recycle':'mail')}<span>${esc(label)}${unread?` (${unread})`:''}</span></button></li>`;
      }).join('')}</ul>`;
      $('.oe-contacts ul',shell).innerHTML=CONTACTS.map(([person,address])=>`<li><button data-contact="${esc(address)}">${esc(person)}</button></li>`).join('');
      $('.oe-list',shell).innerHTML=list.length
        ?`<table><thead><tr><th>${esc(t("text_from"))}</th><th>${esc(t("text_subject"))}</th><th>${esc(t("text_received"))}</th></tr></thead><tbody>${list.map(m=>{
          const unread=!box.read.includes(m.id)&&folder!=='sent'&&folder!=='drafts';
          return `<tr class="${m.id===selected?'selected':''} ${unread?'unread':''}" data-message="${esc(m.id)}"><td>${esc(m.from)}</td><td>${esc(m.subject)}</td><td>${stamp(m.date)}</td></tr>`;
        }).join('')}</tbody></table>`
        :`<p class="oe-empty">${esc(t("text_there_are_no_messages_in_this_folder"))}</p>`;
      const message=current();
      $('.oe-preview',shell).innerHTML=message
        ?`<header><b>${esc(message.subject)}</b><span>${esc(t("text_from_name_address",{name:message.from,address:message.address}))}</span><span>${esc(t("text_date_date",{date:stamp(message.date)}))}</span></header><pre>${esc(message.body)}</pre>`
        :`<p class="oe-empty">${esc(t("text_select_a_message_to_read_it"))}</p>`;
      const inbox=totals[folder]||{total:0,unread:0};
      $('span',bar).textContent=t("text_total_message_s_unread_unread",{total:inbox.total,unread:inbox.unread});
      $('.status-part',bar).textContent=t("text_connected_mail_netkapu_hu");
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
      if(action==='addresses')XP.dialog(t("text_address_book"),CONTACTS.map(([person,address])=>`${person}\n${address}`).join('\n\n'));
    };
    render();
    return w;
  });
})();
