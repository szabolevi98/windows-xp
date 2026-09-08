'use strict';
(() => {
  const {$,$$,esc,icon,state,t}=XP;
  // A Számítógép-kezelés konzol fája: csomópont, cím, ikon, gyerekek.
  const TREE=['root',t("text_computer_management_local"),'computer',[
    ['tools',t("text_system_tools"),'folder',[
      ['events',t("text_event_viewer"),'folder',[
        ['event-app',t("text_application"),'documents',[]],
        ['event-sec',t("text_security"),'security',[]],
        ['event-sys',t("text_system"),'computer',[]]
      ]],
      ['shares',t("text_shared_folders"),'folder',[]],
      ['accounts',t("text_local_users_and_groups"),'user',[
        ['user-list',t("text_users"),'user',[]],
        ['group-list',t("text_groups"),'user',[]]
      ]],
      ['perf',t("text_performance_logs_and_alerts"),'taskmgr',[]],
      ['devices',t("text_device_manager"),'computer',[]]
    ]],
    ['storage',t("text_storage"),'disk',[
      ['media',t("text_removable_storage"),'cd',[]],
      ['defrag',t("text_disk_defragmenter"),'disk',[]],
      ['diskmgmt',t("text_disk_management"),'disk',[]]
    ]],
    ['apps',t("text_services_and_applications"),'control',[
      ['service-list',t("text_services"),'control',[]],
      ['wmi',t("text_wmi_control"),'control',[]],
      ['index',t("text_indexing_service"),'search',[]]
    ]]
  ]];
  const DESCRIPTIONS={
    tools:t("text_tools_for_the_state_of_the_machine_and_the_local_accounts"),
    events:t("text_the_events_logged_by_windows_and_by_programs"),
    storage:t("text_managing_the_disks_and_the_removable_media"),
    apps:t("text_the_services_and_server_applications_running_on_this_machine"),
    shares:t("text_shared_folders_open_sessions_and_open_files_on_this_machine"),
    accounts:t("text_the_user_accounts_and_groups_created_on_this_machine"),
    perf:t("text_logging_performance_counters_and_setting_up_alerts"),
    devices:t("text_the_devices_in_this_machine_and_their_drivers"),
    media:t("text_removable_media_and_the_libraries_that_hold_them"),
    defrag:t("text_defragmenting_the_files_on_a_volume"),
    diskmgmt:t("text_partitioning_disks_and_maintaining_volumes"),
    wmi:t("text_settings_for_the_windows_management_tools"),
    index:t("text_folders_and_catalogues_indexed_for_faster_searching")
  };
  const SERVICES=[
    [t("text_automatic_updates"),t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_plug_and_play"),t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_event_viewer"),t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_network_connections"),t("text_started"),t("text_manual"),t("text_local_system")],
    [t("text_print_spooler"),t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_help_and_support"),t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_computer_browser"),t("text_started"),t("text_automatic"),t("text_local_system")],
    ['Windows Audio',t("text_started"),t("text_automatic"),t("text_local_system")],
    [t("text_windows_firewall_internet_connection_sharing"),t("text_started"),t("text_automatic"),t("text_local_system")],
    ['Telnet',t("text_stopped"),t("text_disabled_5dd9d449"),t("text_local_service_d2fd265d")]
  ];
  const DEVICES=[
    [t("text_keyboards"),t("text_standard_101_102_key_keyboard")],
    [t("text_dvd_cd_rom_drives"),'HL-DT-ST DVD-ROM GDR8162B'],
    [t("text_mice_and_other_pointing_devices"),t("text_ps_2_compatible_mouse")],
    [t("text_sound_video_and_game_controllers"),'Realtek AC97 Audio'],
    [t("text_network_adapters"),'Realtek RTL8139 Family PCI Fast Ethernet NIC'],
    [t("text_display_adapters"),'NVIDIA GeForce4 MX 440'],
    [t("text_disk_drives"),'ST340016A'],
    [t("text_processors"),'Intel Pentium 4 1.80 GHz']
  ];
  const EVENTS={
    'event-app':[
      [t("text_information"),'2026. 09. 07.','13:58','Windows Media Player',t("text_none"),'101'],
      [t("text_information"),'2026. 09. 07.','13:41','MsiInstaller',t("text_none"),'11707'],
      [t("text_warning"),'2026. 09. 06.','21:12','Application Hang','(101)','1002']
    ],
    'event-sec':[
      [t("text_success_audit"),'2026. 09. 07.','13:38','Security',t("text_logon_logoff"),'528'],
      [t("text_success_audit"),'2026. 09. 07.','13:38','Security',t("text_account_management"),'642'],
      [t("text_failure_audit"),'2026. 09. 05.','08:02','Security',t("text_logon_logoff"),'529']
    ],
    'event-sys':[
      [t("text_information"),'2026. 09. 07.','13:37','eventlog',t("text_none"),'6005'],
      [t("text_information"),'2026. 09. 07.','13:37','Service Control Manager',t("text_none"),'7035'],
      [t("text_error"),'2026. 09. 06.','19:55','atapi',t("text_none"),'9']
    ]
  };

  XP.register('compmgmt',()=>{
    if(XP.singleton('compmgmt'))return;
    const w=XP.createWindow({title:t("text_computer_management"),icon:'computer',app:'compmgmt',
      width:720,height:470,minWidth:520,minHeight:330});
    let selected='root';
    const expanded=new Set(['root','tools','storage','apps']);

    XP.menubar(w,{
      [t("text_file")]:[{label:t("text_close"),action:()=>w.close()}],
      [t("text_action")]:()=>[{label:t("text_refresh"),shortcut:'F5',action:render},{label:t("text_export"),disabled:true}],
      [t("text_view")]:()=>[{label:t("text_large_icons"),disabled:true},{label:t("text_details"),checked:true,disabled:true}],
      [t("text_help")]:[{label:t("text_about_computer_management"),action:()=>XP.dialog(t("text_computer_management"),t("text_computer_management_the_devices_logs_local_accounts_disks_and_services_49ccd674"))}]
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
      if(EVENTS[id])return {count:EVENTS[id].length,html:table([t("text_type"),t("text_date"),t("text_time"),t("text_source"),t("text_category"),t("text_event")],EVENTS[id])};
      if(id==='service-list')return {count:SERVICES.length,html:table([t("text_name"),t("text_status"),t("text_startup_type"),t("text_log_on")],SERVICES)};
      if(id==='devices')return {count:DEVICES.length,html:table([t("text_device_group"),t("text_device")],DEVICES.map(([group,device])=>[`${icon('computer')}${esc(group)}`,esc(device)]))};
      if(id==='user-list'){
        const rows=XP.accounts(true).map(account=>[`${XP.avatar(account.avatar)}${esc(account.name)}`,
          account.id==='guest'?t("text_built_in_account_for_guest_access_to_the_computer"):t("text_built_in_account_for_administering_the_computer"),
          account.id==='guest'?(account.enabled?t("text_enabled"):t("text_disabled")):t("text_enabled")]);
        return {count:rows.length,html:table([t("text_name"),t("text_description"),t("text_status")],rows)};
      }
      if(id==='group-list'){
        const rows=[[t("text_administrators"),t("text_administrators_have_complete_access_to_the_computer")],
          [t("text_users"),t("text_users_cannot_make_system_wide_changes")],
          [t("text_guests"),t("text_guests_have_the_rights_of_the_users_group_by_default")],
          [t("text_backup_operators"),t("text_backing_up_and_restoring_files_past_the_permissions")]];
        return {count:rows.length,html:table([t("text_name"),t("text_description")],rows)};
      }
      if(id==='shares'){
        const rows=[['C$','C:\\',t("text_default_share")],['ADMIN$','C:\\WINDOWS',t("text_remote_admin")],['IPC$','',t("text_remote_ipc")]];
        return {count:rows.length,html:table([t("text_shared_folder"),t("text_folder_path_f51d2a06"),t("text_comment")],rows)};
      }
      if(id==='diskmgmt'){
        const used=4283924480+state.files.filter(f=>!f.deleted).reduce((sum,f)=>sum+(f.content||'').length+1024,0);
        const capacity=40*1024**3-1_100_000_000;
        const gb=value=>`${(value/1024**3).toFixed(2).replace('.',',')} GB`;
        const rows=[[`${icon('disk')}(C:)`,t("text_simple"),t("text_basic"),'NTFS',t("text_healthy_system"),gb(capacity),gb(capacity-used),`${Math.round((capacity-used)/capacity*100)} %`],
          [`${icon('cd')}(D:)`,t("text_simple"),t("text_basic"),'',t("text_no_media"),'0 GB','0 GB','0 %']];
        return {count:rows.length,html:table([t("text_volume_fdb416ce"),t("text_layout"),t("text_type"),t("text_file_system"),t("text_status"),t("text_capacity"),t("text_free_space"),'% szabad'],rows)};
      }
      const node=find(TREE,id);
      if(node&&node[3].length){
        const rows=node[3].map(child=>[`${icon(child[2])}${esc(child[1])}`,esc(DESCRIPTIONS[child[0]]||'')]);
        return {count:rows.length,html:table([t("text_name"),t("text_description")],rows)};
      }
      return {count:0,html:`<p class="mmc-note">${esc(DESCRIPTIONS[id]||t("text_there_is_nothing_to_show_for_this_item"))}</p>`};
    }

    function render(){
      treeEl.innerHTML=branch(TREE,0);
      const node=find(TREE,selected),content=paneFor(selected);
      pane.innerHTML=`<header class="mmc-heading">${icon(node?.[2]||'computer')}${esc(node?.[1]||'')}</header>${content.html}`;
      $('span',bar).textContent=content.count?t("text_count_items",{count:content.count}):t("text_done");
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
