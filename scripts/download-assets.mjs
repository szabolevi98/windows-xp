import { mkdir, writeFile, readFile } from 'node:fs/promises';
const root = new URL('../assets/', import.meta.url);
const manifestFile = new URL('sources.json', root);

// A few assets are not shipped exactly as they arrive; each is checked in already and
// this script leaves it alone rather than undoing the work. To redo one by hand:
//
//   icons/start.png       the download's right cap has no antialiasing, so the rounded
//                         edge was redrawn with sub-pixel coverage along a smoothed
//                         boundary (Gaussian sigma 1.8 over the per-row edge positions).
//   icons/restart.png     the source renders are 1024x1024; both are resampled to 48x48.
//   icons/standby.png
//   icons/recycle-full.png
//   avatars/*.png         the original account tiles are 48x48 BMPs, saved as PNG.
//
// Their entries in sources.json record the URL they came from and the size actually
// shipped, so the manifest stays complete either way.
const derived = new Set(['icons/start.png', 'icons/restart.png', 'icons/standby.png', 'icons/recycle-full.png']);
const derivedPrefixes = ['avatars/'];
const isDerived = file => derived.has(file) || derivedPrefixes.some(prefix => file.startsWith(prefix));
const xp = 'https://raw.githubusercontent.com/ShizukuIchi/winXP/master/src/assets/';
const original = 'https://raw.githubusercontent.com/bartekl1/windows-ui-assets/main/';
const icons = {computer:'676(32x32)',documents:'308(32x32)',pictures:'307(32x32)',music:'550(32x32)',notepad:'327(32x32)',paint:'680(32x32)',calculator:'74(32x32)',control:'300(32x32)',network:'309(32x32)',help:'747(32x32)',search:'299(32x32)',run:'743(32x32)',logoff:'546(32x32)',shutdown:'310(32x32)',folder:'318(32x32)',disk:'334(48x48)',cd:'111(48x48)',player:'846(32x32)',mail:'887(32x32)',cmd:'56(16x16)',volume:'120(16x16)',error:'897(32x32)',info:'505(16x16)'};
const files = Object.entries(icons).map(([name,file])=>[`icons/${name}.png`,xp+`windowsIcons/${file}.png`]);
for(const name of ['ie','back','forward','up','home','refresh','stop','history','user','windows','solitaire','start','msn']) files.push([`icons/${name}.png`,xp+`windowsIcons/${name}.png`]);
files.push(['icons/windows-logo.png','https://win32.run/favicon.png']);
files.push(['icons/favorite.png',xp+'windowsIcons/744(32x32).png']);
files.push(['icons/mines.png',xp+'minesweeper/mine-icon.png']);
const xpicons='https://raw.githubusercontent.com/softwarehistorysociety/XPIcons/main/XP/';
for(const [name,remote] of [['freecell','Freecell'],['hearts','Hearts'],['spider','SpiderSolitaire'],['showdesktop','Desktop'],['security','SecurityCenter'],['programs','ChangeorRemovePrograms'],['printers','PrintersandHardware'],['datetime','DateandTime'],['accessibility','Accessibility']]) files.push([`icons/${name}.png`,`${xpicons}${remote}.png`]);
files.push(['icons/pinball.ico','https://raw.githubusercontent.com/alula/SpaceCadetPinball/0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9/SpaceCadetPinball/Icon_1.ico']);
files.push(['pinball/vendor.js','https://raw.githubusercontent.com/lrusso/3DPinballSpaceCadet/684f0b57d0cc93d5a29329f0b59d9996c54f1553/3DPinballSpaceCadet.js']);
files.push(['pinball/LICENSE','https://raw.githubusercontent.com/alula/SpaceCadetPinball/0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9/LICENSE']);
for(const name of ['smile','dead','win','flag','mine-ceil','checked']) files.push([`mines/${name}.png`,xp+`minesweeper/${name}.png`]);
files.push(['icons/recycle.ico',original+'Icons/Windows XP/ico/shell32.dll/ICON32_1.ico']);
files.push(['wallpapers/bliss-hd.jpg','https://pranx.com/images/background.jpg']);
files.push(['wallpapers/azul-1920.jpg','https://i.imgur.com/tLLKmd8.jpg']);
files.push(['wallpapers/autumn-1920.jpg','https://4kwallpapers.com/images/wallpapers/windows-xp-autumn-1920x1200-17201.jpg']);
files.push(['wallpapers/windows-xp.jpg',original+'Wallpapers/Windows XP/Desktop/Windows XP.jpg']);
for(const [name,file] of Object.entries({startup:'Windows XP Startup',shutdown:'Windows XP Shutdown',error:'Windows XP Error',recycle:'Windows XP Recycle',notify:'Windows XP Notify',ding:'Windows XP Ding'})) files.push([`sounds/${name}.wav`,original+`Sounds/Windows XP/${file}.wav`]);
files.push(['google.gif','https://www.google.com/intl/en_ALL/images/logo.gif']);
files.push(['icons/paint-tools.png','https://raw.githubusercontent.com/1j01/jspaint/master/images/classic/tools.png']);
for(const [name,remote] of [['restart','Restart'],['standby','Standby'],['recycle-full','RecycleBin(full)']]) files.push([`icons/${name}.png`,`${xpicons}${remote}.png`]);
const tiles='https://archive.org/download/windows-xp-user-account-pictures/';
for(const [name,remote] of Object.entries({chess:'chess (user XP)',guitar:'guitar',ball:'ball',butterfly:'butterfly',fish:'fish',frog:'frog',dog:'dog',cat:'cat',duck:'duck',horses:'horses',car:'car',airplane:'airplane',astronaut:'astronaut',beach:'beach','palm-tree':'palm tree','red-flower':'red flower','pink-flower':'pink flower',snowflake:'snowflake',skater:'skater',kick:'kick','dirt-bike':'dirt bike',giraffe:'giraffe',drip:'drip',africa:'africa','lift-off':'lift-off'})) files.push([`avatars/${name}.png`,`${tiles}${remote}.bmp`]);

const previous=new Map(JSON.parse(await readFile(manifestFile,'utf8').catch(()=>'[]')).map(entry=>[entry.file,entry]));
const manifest=[];
await Promise.all(files.map(async ([file,url])=>{
 if(isDerived(file)){
  const kept=previous.get(file);
  if(!kept)throw new Error(`${file} is post-processed and missing from sources.json; restore it from git.`);
  manifest.push({...kept,url});
  return;
 }
 const response=await fetch(encodeURI(url)); if(!response.ok) throw new Error(`${response.status}: ${url}`);
 const bytes=Buffer.from(await response.arrayBuffer()); const dest=new URL(file,root);
 await mkdir(new URL('./',dest),{recursive:true}); await writeFile(dest,bytes);
 manifest.push({file,url,bytes:bytes.length});
}));
await writeFile(manifestFile,JSON.stringify(manifest.sort((a,b)=>a.file.localeCompare(b.file)),null,2)+'\n');
const kept=manifest.filter(entry=>isDerived(entry.file)).length;
console.log(`Downloaded ${manifest.length-kept} local assets; kept ${kept} post-processed ones.`);
