import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

test('Any program can be sent from the Start menu to the desktop as a shortcut',()=>{
 const start=read('js/start.js');
 // Every Start menu entry carries its name and icon, so a shortcut of it can be built.
 assert.match(start,/data-label="\$\{esc\(label\)\}" data-icon="\$\{ic\}"/);
 assert.match(start,/\$\('#start-menu'\)\.oncontextmenu/,'right-clicking an entry opens a menu');
 assert.match(start,/Küldés az asztalra \(parancsikon\)/);
 assert.match(start,/XP\.shortcutTo\(app,label,ic\)/,'the menu makes the shortcut');
 // Programs already sitting on the desktop are not offered a second time.
 assert.match(start,/const already=baseIcons\.some\(i=>i\.app===app\)\|\|state\.files\.some\(/);
 const core=read('js/core.js');
 // A shortcut keeps its own icon and opens whatever program it points at.
 assert.match(core,/file\.type==='shortcut'\?\(file\.icon\|\|shortcutApps\[file\.app\]\|\|\(targetOf\(file\)\?fileIcon\(targetOf\(file\)\):'help'\)\)/,'a shortcut shows the icon of whatever it points at');
 assert.match(core,/else if\(apps\[file\.app\]\)open\(file\.app\)/,'a program shortcut opens its program');
 assert.match(core,/if\(target\)openFile\(target\.id\)/,'a file shortcut opens what it points at');
 assert.match(core,/A parancsikon hivatkozása nem érhető el/,'and says so when the target is gone');
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
  assert.ok(core.includes(`label:'${label}'`),`the task button menu offers ${label}`);
 const start=read('js/start.js');
 assert.match(start,/\$\('#taskbar'\)\.oncontextmenu/);
 for(const label of ['Ablakok lépcsőzetesen','Ablakok mozaikszerűen vízszintesen','Ablakok mozaikszerűen függőlegesen','Az összes ablak kis mérete','A Tálca rögzítése'])
  assert.ok(start.includes(`label:'${label}'`),`the taskbar menu offers ${label}`);
 // Right-clicking Start gives its own menu instead of the taskbar's.
 assert.match(start,/e\.target\.closest\('#start-button'\)/);
 assert.match(start,/label:'Az Intéző megnyitása'/);
 // Cascade and tile arrange the real windows, never the dialogs.
 assert.match(start,/function arrange\(mode\)/);
 assert.match(start,/filter\(w=>!w\.modal&&!w\.fixed\)/);
 assert.match(core,/minWidth:options\.minWidth\|\|300,minHeight:options\.minHeight\|\|180/,'a window remembers how small it may get');
});

test('The taskbar has properties of its own, and they hold',()=>{
 const utils=read('js/utilities.js');
 assert.match(utils,/register\('taskbar'/);
 assert.match(utils,/A Tálca és a Start menü tulajdonságai/);
 for(const label of ['A Tálca rögzítése','A Gyorsindítás eszköztár megjelenítése','Az óra megjelenítése'])
  assert.ok(utils.includes(label),`the sheet offers ${label}`);
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
 assert.match(utils,/title:'Hangerő-szabályozó'/);
 for(const channel of ['Hangerő-szabályozó','Hullám','SW Synth','CD-lejátszó'])
  assert.ok(utils.includes(`'${channel}'`),`the mixer has a ${channel} channel`);
 assert.match(utils,/Összes némítása/,'the master mutes everything');
 assert.match(utils,/Balansz:/);
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
 assert.match(core,/– parancsikon/);

 const start=readFileSync(new URL('js/start.js',root),'utf8');
 for(const label of ['Rendezés ikonok szerint','Név','Típus','Módosítás dátuma','Automatikus elrendezés'])
  assert.ok(start.includes(`label:'${label}'`),`the desktop sorts by ${label}`);
 assert.match(start,/\{label:'Új',items:\[\{label:'Mappa'/,'New cascades too');
 assert.match(start,/\{label:'Küldés',items:\[/);
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
 assert.match(ex,/const VIEWS=\[\['tiles','Mozaik'\],\['icons','Ikonok'\],\['list','Lista'\],\['details','Részletek'\]\]/);
 assert.doesNotMatch(ex,/listView/,'the two-view toggle is gone');
 // The columns Details showed, and what they say about an entry.
 assert.match(ex,/\['name','Név'\],\['size','Méret'\],\['type','Típus'\],\['modified','Módosítva'\]/);
 assert.match(ex,/TYPES=\{folder:'Fájlmappa',text:'Szöveges dokumentum'/);
 assert.match(ex,/const sizeOf=file=>file\.type==='folder'\?null:/,'folders have no size');
 // Clicking a header sorts, clicking it again turns the order around.
 assert.match(ex,/sort=sort\.key===key\?\{key,dir:-sort\.dir\}:\{key,dir:1\}/);
 assert.match(ex,/const folders=\(b\.type==='folder'\)-\(a\.type==='folder'\)/,'folders still come first');
 // Both the menu and the toolbar button offer the same list.
 assert.match(ex,/'Nézet':\(\)=>\[\.\.\.viewItems\(\)/);
 assert.match(ex,/if\(action==='view'\)\{const box=/);
 const css=readFileSync(new URL('styles.css',root),'utf8');
 assert.match(css,/\.details-header button\{/);
 assert.match(css,/\.details-header:before\{content:"";flex:0 0 16px\}/,'the header lines up past the icon column');
 assert.match(css,/\.tiles-view \.file-item\{display:grid/);
});
