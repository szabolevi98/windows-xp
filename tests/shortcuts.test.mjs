import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {key} from './i18n-test-helper.mjs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

test('Any program can be sent from the Start menu to the desktop as a shortcut',()=>{
 const start=read('js/start.js');
 // Every Start menu entry carries its name and icon, so a shortcut of it can be built.
 assert.match(start,/data-label="\$\{esc\(label\)\}" data-icon="\$\{ic\}"/);
 assert.match(start,/\$\('#start-menu'\)\.oncontextmenu/,'right-clicking an entry opens a menu');
 assert.ok(start.includes(key('Küldés az asztalra (parancsikon)')));
 assert.match(start,/XP\.shortcutTo\(app,label,ic\)/,'the menu makes the shortcut');
 // Programs already sitting on the desktop are not offered a second time.
 assert.match(start,/const already=baseIcons\.some\(i=>i\.app===app\)\|\|state\.files\.some\(/);
 const core=read('js/core.js');
 // A shortcut keeps its own icon and opens whatever program it points at.
 assert.match(core,/file\.type==='shortcut'\?\(file\.icon\|\|shortcutApps\[file\.app\]\|\|\(targetOf\(file\)\?fileIcon\(targetOf\(file\)\):'help'\)\)/,'a shortcut shows the icon of whatever it points at');
 assert.match(core,/else if\(apps\[file\.app\]\)open\(file\.app\)/,'a program shortcut opens its program');
 assert.match(core,/if\(target\)openFile\(target\.id\)/,'a file shortcut opens what it points at');
 assert.ok(core.includes(key('A parancsikon hivatkozása nem érhető el. Elképzelhető, hogy az elemet törölték.')),'and says so when the target is gone');
 assert.match(core,/function shortcutTo\(app,name,iconName,parent='desktop'\)/);
 assert.match(core,/download,openFile,shortcutTo,shortcutToFile,onFiles/,'other programs can make shortcuts too');
 // The little arrow badge marks a shortcut on the desktop and in Explorer.
 assert.match(start,/item\.shortcut\?' shortcut':''/);
 assert.match(read('js/explorer.js'),/f\.type==='shortcut'\?'shortcut':''/);
 assert.match(read('styles.css'),/\.desktop-icon\.shortcut:before,\.file-item\.shortcut:before/);
});

test('The taskbar answers a right click, on the buttons and on the bar itself',()=>{
 const core=read('js/core.js');
 // The window menu XP showed on a task button, with the states it greyed out.
 assert.match(core,/b\.oncontextmenu=event=>/);
 for(const label of ['Visszaállítás','Áthelyezés','Méret','Kis méret','Teljes méret','Bezárás'])
  assert.ok(core.includes(`label:t("${key(label)}")`),`the task button menu offers ${label}`);
 const start=read('js/start.js');
 assert.match(start,/\$\('#taskbar'\)\.oncontextmenu/);
 for(const label of ['Ablakok lépcsőzetesen','Ablakok mozaikszerűen vízszintesen','Ablakok mozaikszerűen függőlegesen','Az összes ablak kis mérete','A Tálca rögzítése'])
  assert.ok(start.includes(`label:t("${key(label)}")`),`the taskbar menu offers ${label}`);
 // Right-clicking Start gives its own menu instead of the taskbar's.
 assert.match(start,/e\.target\.closest\('#start-button'\)/);
 assert.ok(start.includes(`label:t("${key('Az Intéző megnyitása')}")`));
 // Cascade and tile arrange the real windows, never the dialogs.
 assert.match(start,/function arrange\(mode\)/);
 assert.match(start,/filter\(w=>!w\.modal&&!w\.fixed\)/);
 assert.match(core,/minWidth:options\.minWidth\|\|300,minHeight:options\.minHeight\|\|180/,'a window remembers how small it may get');
});

test('The taskbar has properties of its own, and they hold',()=>{
 const utils=read('js/utilities.js');
 assert.match(utils,/register\('taskbar'/);
 assert.ok(utils.includes(key('A Tálca és a Start menü tulajdonságai')));
 for(const label of ['A Tálca rögzítése','A Gyorsindítás eszköztár megjelenítése','Az óra megjelenítése'])
  assert.ok(utils.includes(key(label)),`the sheet offers ${label}`);
 assert.match(utils,/state\.taskbar=\{\.\.\.state\.taskbar,\.\.\.draft\};persist\(\);XP\.applySettings\(\)/);
 const core=read('js/core.js');
 assert.match(core,/taskbar:\{locked:true,clock:true,quickLaunch:true\}/,'the settings start out the way XP had them');
 // Hiding the clock or the Quick Launch bar has to actually hide them.
 assert.match(core,/classList\.toggle\('no-clock',taskbar\.clock===false\)/);
 assert.match(core,/classList\.toggle\('no-quick-launch',taskbar\.quickLaunch===false\)/);
 const css=read('styles.css');
 assert.match(css,/body\.no-clock #clock\{display:none\}/);
 assert.match(css,/body\.no-quick-launch \.quick-launch\{display:none\}/);
});

test('The tray speaker opens the little slider, and two clicks the mixer',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/id="volume-flyout"/,'the panel lives above the tray, not in a window');
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 assert.match(start,/\$\('#volume-button'\)\.onclick=e=>\{e\.stopPropagation\(\);showVolume\(\);\}/);
 assert.match(start,/\$\('#volume-button'\)\.ondblclick=\(\)=>\{XP\.hideMenus\(\);XP\.open\('volume'\);\}/);
 // Anchored by its right edge, so a stylesheet that has not landed yet cannot misplace it.
 assert.match(start,/volumeFlyout\.style\.right=/);
 assert.doesNotMatch(start,/volumeFlyout\.style\.left=/);
 // The clock followed the same rule: one click did nothing, two opened the panel.
 assert.match(start,/\$\('#clock'\)\.ondblclick=\(\)=>XP\.open\('calendar'\)/);
 assert.doesNotMatch(start,/\$\('#clock'\)\.onclick=/);
 const core=readFileSync(new URL('js/core.js',root),'utf8');
 assert.match(core,/hideMenus\(\)\{[^}]*#volume-flyout'\)\.hidden=true/,'it closes with the other menus');

 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 // Hangerő-szabályozó: the master and the channels a sound card of the day offered.
 assert.ok(utils.includes(`title:t("${key('Hangerő-szabályozó')}")`));
 for(const channel of ['Hangerő-szabályozó','Hullám','SW Synth','CD-lejátszó'])
  assert.ok(utils.includes(key(channel)),`the mixer has a ${channel} channel`);
 assert.ok(utils.includes(key('Összes némítása')),'the master mutes everything');
 assert.ok(utils.includes(key('Balansz:')));
 assert.doesNotMatch(utils,/volume-panel/,'the old one-slider window is gone');
 // Sliders wear the classic sunken groove instead of the browser's own.
 assert.match(readFileSync(new URL('styles.css',root),'utf8'),/input\[type=range\]::-webkit-slider-thumb/);
});

test('Menus cascade, and Send To reaches the desktop from a file as well',()=>{
 const core=readFileSync(new URL('js/core.js',root),'utf8');
 // An item with `items` opens a child menu beside itself.
 assert.match(core,/function openSubmenu\(button,items\)/);
 assert.match(core,/item\.items\?'<b class="submenu-arrow">▶<\/b>':''/);
 assert.match(core,/const left=anchor\.right\+el\.offsetWidth\+2>innerWidth\?/,'it flips when the screen runs out');
 assert.match(core,/function closeFrom\(depth\)/,'and a deeper level closes with its parent');
 assert.match(core,/hideMenus\(\)\{ closeSubmenus\(\)/);
 // A shortcut can point at a file, showing that file's icon and opening it.
 assert.match(core,/function shortcutToFile\(id,parent='desktop'\)/);
 assert.ok(core.includes(key('{name} – parancsikon')));

 const start=readFileSync(new URL('js/start.js',root),'utf8');
 for(const label of ['Rendezés ikonok szerint','Név','Típus','Módosítás dátuma','Automatikus elrendezés'])
  assert.ok(start.includes(`label:t("${key(label)}")`),`the desktop sorts by ${label}`);
 assert.ok(start.includes(`{label:t("${key('Új')}"),items:[{label:t("${key('Mappa')}")`),'New cascades too');
 assert.ok(start.includes(`{label:t("${key('Küldés')}"),items:[`));
 assert.match(start,/XP\.shortcutToFile\(item\.file\)/);
 assert.match(readFileSync(new URL('js/explorer.js',root),'utf8'),/XP\.shortcutToFile\(chosen\.id\)/,'Explorer sends to the desktop as well');

 // All Programs holds folders, the way XP grouped it.
 assert.match(start,/const programsMenu=\[/);
 assert.match(start,/\['Kellékek','programs',\[/);
 assert.match(start,/\['Játékok','programs',\[/);
 assert.match(start,/\['Rendszereszközök','folder',\[/,'and a folder inside a folder');
 assert.match(start,/function programsMarkup\(entries\)/);
 assert.match(readFileSync(new URL('styles.css',root),'utf8'),/\.menu-folder:hover>\.folder-menu/);
});

test('Explorer shows the views XP had, Details with sortable columns',()=>{
 const ex=readFileSync(new URL('js/explorer.js',root),'utf8');
 for(const label of ['Mozaik','Ikonok','Lista','Részletek'])assert.ok(ex.includes(`t("${key(label)}")`));
 assert.doesNotMatch(ex,/listView/,'the two-view toggle is gone');
 // The columns Details showed, and what they say about an entry.
 for(const label of ['Név','Méret','Típus','Módosítva','Fájlmappa','Szöveges dokumentum'])assert.ok(ex.includes(`t("${key(label)}")`));
 assert.match(ex,/const sizeOf=file=>file\.type==='folder'\?null:/,'folders have no size');
 // Clicking a header sorts, clicking it again turns the order around.
 assert.match(ex,/sort=sort\.key===key\?\{key,dir:-sort\.dir\}:\{key,dir:1\}/);
 assert.match(ex,/const folders=\(b\.type==='folder'\)-\(a\.type==='folder'\)/,'folders still come first');
 // Both the menu and the toolbar button offer the same list.
 assert.ok(ex.includes(`[t("${key('Nézet')}")]:()=>[...viewItems()`));
 assert.match(ex,/if\(action==='view'\)\{const box=/);
 const css=readFileSync(new URL('styles.css',root),'utf8');
 assert.match(css,/\.details-header button\{/);
 assert.match(css,/\.details-header:before\{content:"";flex:0 0 16px\}/,'the header lines up past the icon column');
 assert.match(css,/\.tiles-view \.file-item\{display:grid/);
});

test('The Start menu fills its own list of programs',()=>{
 const core=readFileSync(new URL('js/core.js',root),'utf8');
 // Opening a program counts, but only the ones that belong on that list.
 assert.match(core,/if\(PROGRAMS\[app\]\)\{state\.programUse=\{\.\.\.state\.programUse,\[app\]:\(state\.programUse\?\.\[app\]\|\|0\)\+1\}/);

 const start=readFileSync(new URL('js/start.js',root),'utf8');
 assert.match(start,/function frequentPrograms\(\)/);
 assert.match(start,/app!=='ie'&&app!=='outlook'/,'the pinned pair keeps out of the list below');
 assert.match(start,/\.slice\(0,5\)/,'five entries, so the menu stays the height XP had');
 assert.match(start,/const DEFAULT_FREQUENT=\['player','notepad','paint','calculator','mines'\]/,'a fresh desktop still has a list');
 // Explorer belongs under Accessories, not among the frequently used programs.
 assert.doesNotMatch(start,/explorer:\['Windows Intéző','folder'\]/);
 assert.match(start,/\['Windows Intéző','folder','explorer'\]/,'but All Programs still lists it');
 // Recent Documents took a row the menu could not spare.
 assert.doesNotMatch(start,/Legutóbbi dokumentumok/);
 assert.doesNotMatch(core,/recentDocs/);
 assert.match(start,/startItem\('Nyomtatók és faxok','printers','printers'/);
 assert.match(readFileSync(new URL('js/utilities.js',root),'utf8'),/register\('printers'/,'so the folder has somewhere to open');
});

test('A drive has the properties sheet XP drew, pie and all',()=>{
 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 assert.match(utils,/register\('drive',\(which='disk'\)=>/);
 assert.ok(utils.includes(key('Helyi lemez (C:)')));
 assert.ok(utils.includes(`tabs:[['general',t("${key('Általános')}")`));
 // The used slice grows with what the account actually keeps on the machine.
 assert.match(utils,/const own=state\.files\.filter\(f=>!f\.deleted\)\.reduce/);
 assert.match(utils,/conic-gradient\(#1b3fa0 0 \$\{percent\}%,#c832c8 \$\{percent\}% 100%\)/);
 assert.ok(utils.includes(key('Használt terület:')));
 assert.ok(utils.includes(key('Szabad terület:')));
 assert.ok(utils.includes(key('Fájlrendszer:')));
 assert.ok(utils.includes(key('Lemezkarbantartó')));
 // An empty drive says so instead of showing a pie of nothing.
 assert.ok(utils.includes(key('Nincs lemez a meghajtóban. Helyezzen be egy lemezt, majd próbálja újra.')));
 assert.match(readFileSync(new URL('js/explorer.js',root),'utf8'),/if\(id==='disk'\|\|id==='dvd'\)\{XP\.open\('drive',id\);return;\}/);
 assert.match(readFileSync(new URL('styles.css',root),'utf8'),/\.disk-pie\{width:96px;height:96px;border-radius:50%/);
});

test('The Folders button swaps the task pane for the tree',()=>{
 const ex=readFileSync(new URL('js/explorer.js',root),'utf8');
 assert.ok(ex.includes(`<button data-action="tree">\${icon('folder')}<span class="toolbar-label">\${esc(t("${key('Mappák')}"))}</span></button>`));
 assert.doesNotMatch(ex,/toolbar-label">Új mappa/,'the toolbar matches XP, which had no New Folder button');
 assert.match(ex,/if\(action==='tree'\)\{showTree=!showTree;render\(\);\}/);
 // The desktop is the root, with My Computer, the drives and the user's own folders under it.
 assert.match(ex,/function treeChildren\(id\)/);
 assert.ok(ex.includes(`{id:'disk',name:t("${key('Helyi lemez (C:)')}"),icon:'disk'}`));
 assert.ok(ex.includes(`name:t("${key('{user} dokumentumai')}",{user:state.user})`),'the user folder is named, not repeated');
 assert.ok(ex.includes(`{id:'recycle',name:t("${key('Lomtár')}")`));
 // The little box opens a branch; walking into a folder opens its own.
 assert.match(ex,/if\(b\.dataset\.twist\)\{const id=b\.dataset\.twist;expanded\.has\(id\)\?expanded\.delete\(id\):expanded\.add\(id\);render\(true\);return;\}/);
 assert.match(ex,/for\(let id=next;id;\)\{const parent=entry\(id\)\?\.parent;if\(!parent\)break;expanded\.add\(parent\);id=parent;\}/);
 const css=readFileSync(new URL('styles.css',root),'utf8');
 assert.match(css,/\.tree-item\.selected\{background:#316ac5/);
 assert.match(css,/\.toolbar button\.pressed\{/,'the button stays pressed while the tree is open');
});

test('My Computer carries its whole menu, Manage included',()=>{
 const start=readFileSync(new URL('js/start.js',root),'utf8');
 for(const label of ['Az Intéző megnyitása','Keresés…','Kezelés','Csatlakoztatás hálózati meghajtóhoz…','Hálózati meghajtó leválasztása…'])
  assert.ok(start.includes(`label:t("${key(label)}")`),`the icon offers ${label}`);
 assert.match(start,/item\.id==='computer'\?\[/,'and only that icon does');
 assert.match(start,/XP\.open\('compmgmt'\)/);

 const mmc=readFileSync(new URL('js/compmgmt.js',root),'utf8');
 assert.match(mmc,/XP\.register\('compmgmt'/);
 assert.ok(mmc.includes(`title:t("${key('Számítógép-kezelés')}")`));
 // The three branches the console had, with their own panes behind them.
 for(const label of ['Rendszereszközök','Eseménynapló','Megosztott mappák','Helyi felhasználók és csoportok',
  'Eszközkezelő','Tárolás','Lemezkezelés','Szolgáltatások és alkalmazások','WMI-vezérlő'])
  assert.ok(mmc.includes(key(label)),`the tree holds ${label}`);
 // The user list and the disk pane report what the machine actually has.
 assert.match(mmc,/XP\.accounts\(true\)\.map\(account=>/);
 assert.ok(mmc.includes(`account.enabled?t("${key('Bekapcsolva')}"):t("${key('Kikapcsolva')}")`));
 assert.match(mmc,/state\.files\.filter\(f=>!f\.deleted\)\.reduce/);
 // It answers to its own name in the Run box and the command prompt.
 assert.match(readFileSync(new URL('js/utilities.js',root),'utf8'),/'compmgmt\.msc':'compmgmt'/);
 assert.match(readFileSync(new URL('js/apps.js',root),'utf8'),/compmgmt:'compmgmt'/);
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/js\/compmgmt\.js/);
 assert.match(html,/compmgmt\.css/);
});

test('User Accounts has a way back, and no account picture stands in for an icon',()=>{
 const utils=readFileSync(new URL('js/utilities.js',root),'utf8');
 // The green Back arrow, Home and Help, above every page.
 assert.match(utils,/class="accounts-nav"/);
 assert.match(utils,/data-nav="back" \$\{trail\.length\?'':'disabled'\}/,'Back is dead on the first page');
 assert.match(utils,/data-nav="home"/);
 assert.match(utils,/data-nav="help"/);
 assert.match(utils,/const go=next=>\{if\(next!==view\)\{trail\.push\(view\);view=next;\}render\(\);\}/);
 assert.match(utils,/const back=\(\)=>\{view=trail\.pop\(\)\|\|'home';render\(\);\}/);
 // Cancel steps back where you came from; a change taken lands on the first page again.
 assert.ok(utils.includes(`data-go="back">\${esc(t("${key('Mégse')}"))}</button>`));
 assert.doesNotMatch(utils,/data-go="home">Mégse/);
 assert.doesNotMatch(utils,/save\(\);view='home';render\(\)/,'nothing jumps home without clearing the trail');

 // icons/user.png was the chess photo; these three carry their own picture now.
 for(const name of ['user','addressbook','switchuser'])
  assert.ok(existsSync(new URL(`assets/icons/${name}.png`,root)),`${name}.png is bundled`);
 assert.match(readFileSync(new URL('assets/sources.json',root),'utf8'),/XP\/UserAccounts\.png/);
 assert.match(readFileSync(new URL('js/outlook.js',root),'utf8'),/data-mail="addresses">\$\{icon\('addressbook'\)\}/);
 assert.ok(readFileSync(new URL('js/start.js',root),'utf8').includes(`icon('switchuser')} \${t("${key('Felhasználóváltás')}")}`));
});
