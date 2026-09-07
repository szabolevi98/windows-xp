# Windows XP szimulátor

![Windows XP szimulátor – asztal és Internet Explorer](docs/screenshot.jpg)

Függőségek nélküli, magyarul, angolul és németül beszélő Windows XP-élmény HTML, CSS és JavaScript használatával.

**[Live demo – próbáld ki a böngészőben](https://windows-xp.levente.net/)**

## Indítás

Az `index.html` közvetlen megnyitása is működik. A mentések az adott böngészőhöz és címhez tartoznak; következetesen ugyanazon a címen használd. Nincs build, npm-telepítés vagy CDN.

## Nyelvek

A felület magyarul, angolul és németül beszél. Alapból a böngésző nyelve dönt; ha az nem valamelyik ezek közül, angolul indul. A választás a Vezérlőpult → Dátum, idő, nyelv és területi beállítások → **Területi és nyelvi beállítások** ablakában módosítható, és megmarad a következő indításig.

A nyelvvel együtt a dátumok, az órák és a számok formátuma is vált: a hétfő németül `Montag, 7. September 2026`, angolul `Monday, September 7, 2026`. Az első indításkor létrejövő dokumentumok és mappák is a gép nyelvén kapnak nevet.

A szövegek forrása maga a magyar mondat: a kódban `t('Megnyitás')` áll, a `lang/en.js` és a `lang/de.js` pedig magyar → idegen nyelvű szótár. Ha egy mondat fordítása hiányzik, a magyar szöveg marad a képernyőn — nem törik el semmi, és rögtön látszik, mi maradt ki. Új nyelvhez egy új `lang/<kód>.js` és egy sor a `js/lang.js` listájában elég.

## Használat

- XP betöltés, bejelentkezés a névre kattintva, üdvözlés, kijelentkezés, felhasználóváltás, készenlét, kikapcsolás, újraindítás.
- Felhasználóváltásnál a munkamenet fut tovább: a programok nyitva maradnak, a bejelentkezési képernyő a név alatt írja, hány program fut, és visszalépéskor minden ott folytatódik, ahol abbamaradt — a Pinball játékállása is. A kijelentkezés ezzel szemben bezárja az adott munkamenetet, az újraindítás és a kikapcsolás pedig mindegyiket. A háttérbe került munkamenet nem szól bele a másikéba: a Media Player elhallgat, és a Feladatkezelő Felhasználók lapja „Leválasztva” állapotban mutatja.
- Adminisztrátor és Vendég fiók. A Vendég alapból be van kapcsolva, és a Felhasználói fiókokban ki is kapcsolható. A képe a Windows eredeti, bőröndös Vendég-képe, és nem cserélhető. Minden fiók saját asztalt, dokumentumokat, hátteret, kedvenceket és beállításokat kap; a gép neve, a biztonsági központ és maga a Vendég fiók állapota közös. A Vendég csak a saját képét módosíthatja.
- Törlés előtt a Lomtár megkérdez („Biztosan a Lomtárba helyezi ezt: …?”), a Lomtárra ejtésnél is. Az ablakok kis méretre tétele, teljes mérete és visszaállítása, valamint a kijelentkezés az eredeti XP-hangokat szólaltatja meg.
- A Start menü emlékszik: a bal oszlop a leggyakrabban használt öt programot kínálja a rögzített Internet és Email alatt.
- Rácsra igazodó asztali ikonok, ütközéskor helycsere. A Lomtár alapból jobb alul jelenik meg, szabadon áthelyezhető, és megjegyzi a helyét.
- Játékok mappa az asztalon, benne az Aknakereső, a Pasziánsz, a FreeCell, a Pókpasziánsz, a Hearts és a 3D Pinball – Space Cadet parancsikonja.
- Eredeti XP-egérmutatók a Windows Standard (3D fehér) sémából (nyíl, szövegkurzor, átméretezők, célkereszt), és XP-s mozgás: az ablak a tálcagombjához repül kicsinyítéskor, onnan nő vissza, a menük és a Start menü halványan úsznak be. Csökkentett mozgásigény esetén mindez elmarad.
- Mozgatható ablakok: bármelyik szélüknél és sarkuknál átméretezhetők, a bal és a felső élnél húzva együtt mozdulnak. Teljes méret, kis méret, tálca, Start menü, helyi menük.
- Tálca: gyorsindítás az Asztal megjelenítése gombbal, futó ablakok, értesítési terület órával, hangerővel, hálózattal és biztonsági központtal. A « gomb kinyitja a rejtett ikonokat.
- Hangerő: a hangszóróra egy kattintás a kis csúszkát nyitja a tálca fölött, kettő a Hangerő-szabályozót a Fő hangerő, Hullám, SW Synth és CD-lejátszó csatornákkal, balansszal és némítással. Az órán ugyanígy a dupla kattintás nyitja a naptárt.
- Ha elfogy a hely a tálcán, egy program ablakai egyetlen gombba fogódnak össze („4 Windows Intéző”), ahonnan menüből választható ki az ablak, és a csoport együtt is bezárható. Minden ablaknak jár az ablakmenü: a tálcagombján, a címsorán jobb gombbal, a címsor ikonjára kattintva és Alt+Szóközzel.
- A Sajátgép ikonjának teljes helyi menüje: Megnyitás, Az Intéző megnyitása, Keresés, Kezelés, hálózati meghajtó. A Kezelés a Számítógép-kezelést nyitja meg: eseménynapló, megosztott mappák, helyi felhasználók és csoportok, eszközkezelő, lemezkezelés és szolgáltatások — a felhasználólista és a lemez adatai a gép valódi állapotát mutatják.
- Tálca jobb gombbal: ablakok lépcsőzetes és mozaikszerű elrendezése, az összes ablak kis mérete, Feladatkezelő, a Tálca rögzítése és a Tálca tulajdonságai, ahol az óra és a Gyorsindítás elrejthető. A tálcagombokon ablakmenü, a start gombon saját menü.
- Feladatkezelő (Ctrl+Shift+Esc vagy Ctrl+Alt+Del): alkalmazások, folyamatok, élő CPU- és hálózatgrafikon, felhasználók. Feladat befejezése, váltás, új feladat, folyamat leállítása — rendszerfolyamat nem állítható le.
- A Start menü bármelyik programja jobb gombbal kitehető az asztalra parancsikonként, a megszokott kis nyíllal a sarkában. Fájlokon és mappákon ugyanezt a „Küldés ▸ Asztal (parancsikon létrehozása)” és a „Küldés ▸ Dokumentumok” intézi; a parancsikon a célja ikonját viseli, és szól, ha a hivatkozott elem már nincs meg.
- Lenyíló almenük: az asztalon „Rendezés ikonok szerint ▸” és „Új ▸”, a Minden programban pedig mappák (Kellékek ▸ benne Rendszereszközök ▸, Játékok ▸), ahogy XP-ben is.
- Outlook Express: helyi mappák olvasatlan-számlálóval, olvasóablak, levélírás, válasz és továbbítás, törlés és Küldés/fogadás. Az elolvasott, elküldött és törölt levelek megmaradnak.
- Internet Explorer: régi Google, kulcsszavas helyi keresés, 20 beépített oldal, címsor, előzmények, hozzáadható/törölhető kedvencek, beállítható kezdőlap és oldalon belüli keresés. Az ismeretlen címek helyi hibaoldalt kapnak. A `www.jatekbarlang.hu` oldalról mind a hat játék elindítható.
- Helyi web: Netkapu hírportál szavazással, PC-magazin, PC Bazár mentett kosárral, Netklub fórum menthető hozzászólásokkal, postafiók mintalevelekkel és levélpiszkozattal, városi időjárás és kereshető vasúti bemutatómenetrend. A háttérképgaléria az asztali hátteret is beállítja, a receptoldal adagokat számol, a HTML suli pedig honlapelőnézetet készít.
- Jegyzettömb: piszkozat, dokumentummentés, automatikus mentés, keresés, sortörés, szövegfájl letöltése.
- Fájlkezelő: saját mappák, dokumentumok, képek, átnevezés, törlés, visszaállítás, Lomtár, fájlkeresés. Négy nézet a Nézet menüből vagy az eszköztárról: Mozaik, Ikonok, Lista és Részletek — utóbbi Név, Méret, Típus és Módosítva oszlopokkal, a fejlécre kattintva rendezhetően. A Mappák gomb a feladatpanel helyére a mappafát teszi, a Helyi lemez (C:) tulajdonságai pedig a megszokott kördiagramot mutatja a használt és a szabad helyről.
- Böngészhető, csak olvasható C: meghajtó: WINDOWS, Program Files, Documents and Settings, Temp és almappák. A DVD-meghajtó kattintásra lemezt kér.
- Paint: ceruza, ecset, radír, kitöltés, vonal, téglalap, ellipszis, szöveg, pipetta, paletta, visszavonás, PNG-mentés és letöltés.
- Számológép: alapműveletek, százalék, gyök, reciprok, memória, billentyűzet.
- Aknakereső: két nehézség, biztonságos első lépés, zászló, számláló, időmérő, eredmények.
- Klondike Pasziánsz: szabályos lépések, lapcsoportok, gyűjtőhelyek, újraosztás, visszavonás, automatikus gyűjtés.
- FreeCell: az eredeti, számozott leosztások (a 617-es játék itt is a 617-es), négy szabad hely, több lap együttes mozgatása, automatikus gyűjtés, visszavonás és nyerési statisztika.
- Pókpasziánsz: egy, két vagy négy színnel, tíz oszlop, osztás a pakliból, kész sorok levétele és az eredeti 500 pontról induló pontozás.
- Hearts: három gépi ellenfél, lapátadás balra/jobbra/szemközt, treff 2 kezd, pikk dáma 13 pont, „lövés a Holdra”, 100 pontig tartó játszma.
- 3D Pinball – Space Cadet: az eredeti asztal helyben futó WebAssembly-portja. Karok, kilövés, asztallökés billentyűzetről vagy érintőgombokkal, XP-menü, szünet, hangerő a rendszerbeállításból, helyben mentett rekordok.
- Windows Media Player 9: ezüst-kék felület eredeti Microsoft lejátszógombokkal, kereshető médiatár, lejátszási lista, ismétlés, véletlen sorrend, két hangvezérelt vizualizáció, saját hang- és videófájlok megnyitása, hangerő és némítás.
- Megjelenítés tulajdonságai: az eredeti öt fül – Témák, Asztal, Képernyőkímélő, Megjelenés, Beállítások. Háttérkép elhelyezéssel (nyújtott, középre, mozaik), három színséma, és két működő képernyőkímélő, amely a megadott tétlenség után magától elindul.
- Rendszertulajdonságok: saját ablak Általános, Számítógépnév, Hardver, Speciális és Automatikus frissítések fülekkel. A számítógépnév átírható, az automatikus frissítések kapcsolója ugyanaz, amit a Biztonsági központ mutat.
- Felhasználói fiókok: a fiók neve, képe és típusa itt módosítható. A név és a kép a bejelentkezési képernyőn és a Start menüben is megjelenik.
- Hangok és audioeszközök tulajdonságai: hangerő, hangséma és a rendszeresemények hangjai, egyenként meghallgatva.
- Vezérlőpult: az eredeti kategórianézet tíz kategóriával, mellette klasszikus nézet a tizennégy különálló beállítással. Eszköztár, címsor és kék feladatpanel, mint a fájlkezelőben; a választott nézet megmarad. Innen érhető el a háttérkép, a színséma, a felhasználónév, a rendszerhangok, a hangerő, a rendszerinformáció és a naptár.
- Biztonsági központ: lenyíló tűzfal-, frissítés- és vírusvédelem-panelekkel. A tűzfal és az automatikus frissítések ki-be kapcsolhatók, és az állapotuk mentődik. A tálca pajzsikonjáról, a Vezérlőpultból és a `wscui` paranccsal is megnyitható.
- Parancssor és Futtatás. `help` megmutatja a támogatott parancsokat.

Az asztalon dupla kattintás nyitja meg az ikonokat. Érintőképernyőn egy koppintás is elég. F11: a valódi böngésző teljes képernyője; az asztal helyi menüjéből is kérhető.

## Mentés és helyi működés

A `windows-xp-simulator-v1` localStorage-kulcs tartalmazza a dokumentumokat, mappákat, képeket, piszkozatokat, beállításokat, kedvenceket, ikonpozíciókat, a helyi web kosarát, hozzászólásait, szavazatát és levélpiszkozatát, a Media Player beállításait, valamint az Aknakereső-, FreeCell- és Space Cadet-eredményeket. A megnyitott ablakok és a folyamatban lévő játékok nem mentődnek.

Ha a helyi tárhely nem elérhető vagy megtelt, a program figyelmeztet. A böngészőadatok törlése a mentéseket is törli. A fontos dokumentumok és képek a saját gépre is letölthetők. A Media Playerben megnyitott saját hangok és videók csak az aktuális lejátszóablakban érhetők el.

Minden futtatáshoz szükséges fájl az `assets` mappában van. A CSP tiltja a hálózati API-hívásokat, a külső erőforrásokat és a formok külső beküldését; iframe-et kizárólag saját forrásból enged, ezen keresztül fut a Space Cadet. Az Internet Explorer a DOM-ba renderel helyi tartalmat, nem tölt be valódi weboldalakat.

## Fájlok

- `index.html`: alkalmazásváz és betöltési képernyők.
- `styles.css`: klasszikus Luna felület és programok.
- `js/core.js`: ablakkezelés, menük, párbeszédablakok, mentés, fájlműveletek.
- `js/internet.js`: Internet Explorer, kereső és helyi web.
- `js/web-pages.js` és `web-pages.css`: interaktív bemutatóoldalak és mentésük.
- `js/apps.js`: dokumentumok, Paint, Számológép, parancssor.
- `js/explorer.js`: fájlkezelő, csak olvasható rendszermappák, C: és D: meghajtó.
- `js/utilities.js`: beállítások és további eszközök.
- `js/player.js` és `player.css`: Windows Media Player 9, médiatár és vizualizáció.
- `js/games.js`: Aknakereső és Pasziánsz.
- `js/cardgames.js` és `cardgames.css`: FreeCell, Pókpasziánsz és Hearts. A szabályok DOM nélküli függvényekben vannak, ezért teljes leosztások tesztelhetők.
- `js/pinball.js` és `pinball.css`: a Space Cadet ablaka, menüje és vezérlői.
- `assets/pinball/`: a játék helyi WebAssembly-csomagja és beágyazó oldala.
- `js/compmgmt.js` és `compmgmt.css`: Számítógép-kezelés (a Sajátgép „Kezelés” menüpontja).
- `js/desktop-grid.js`: ikonrács, foglalt helyek kezelése és átrendezés.
- `js/start.js`: asztal, Start menü és munkamenet.

## Képek és hangok forrása

Eredeti XP-s képi és hangelemeket töltöttünk le; nincs generált helyettesítő háttérkép vagy ikon. A források fájlonként az `assets/sources.json` fájlban szerepelnek.

- [Windows UI assets – bartekl1](https://github.com/bartekl1/windows-ui-assets): eredeti Windows XP hátterek, hangok, egérmutatók (.cur), Lomtár-ikon.
- [winXP – ShizukuIchi](https://github.com/ShizukuIchi/winXP): XP programikonok, eszköztárikonok és Aknakereső-elemek.
- [Google régi logó](https://www.google.com/intl/en_ALL/images/logo.gif).
- [JS Paint](https://github.com/1j01/jspaint): eredeti megjelenésű klasszikus Paint-eszközikonok.
- [Pranx Bliss háttérkép](https://pranx.com/images/background.jpg): 1920×1200-as helyi háttérkép (`bliss-hd.jpg`).
- [Azul](https://i.imgur.com/tLLKmd8.jpg) és [Autumn](https://4kwallpapers.com/nature/windows-xp-autumn-17201.html): kész, 1920×1200-as változatok helyi másolatai (`azul-1920.jpg`, `autumn-1920.jpg`), helyi átméretezés nélkül. A Bliss is 1920×1200-as. A kék, logós Windows XP háttér egyelőre az eredeti 800×600-as fájl.
- [XPIcons – Software History Society](https://github.com/softwarehistorysociety/XPIcons): a FreeCell, a Pókpasziánsz, a Hearts, az Asztal megjelenítése és a Biztonsági központ eredeti ikonja nagy felbontásban (Unlicense). Ezek 1024 × 1024-es fájlok, a böngésző kicsinyíti őket.
- [3DPinballSpaceCadet – lrusso](https://github.com/lrusso/3DPinballSpaceCadet): a Space Cadet böngészős WebAssembly-csomagja, [alula](https://github.com/alula/SpaceCadetPinball) és [k4zmu2a](https://github.com/k4zmu2a/SpaceCadetPinball) MIT licencű motorjából; innen származik a játék ikonja is. Részletek: `assets/pinball/NOTICE.md`.
- [Microsoft WMP 9 Series alapbőr](https://archive.org/download/windowsmediaplayerskinscollection/9SeriesDefault.wmz): eredeti, változtatás nélkül használt vezérlőgrafikák. Részletek: `assets/wmp9/NOTICE.md`.
- Vizuális referencia: [Pranx Windows XP Simulator](https://pranx.com/windows-xp-simulator/).

A Windows XP, az ikonok és hangok a Microsoft tulajdonát képezik; a Bliss fotó Charles O’Rear / Microsoft alkotása, a Google-logó a Google tulajdona. A Space Cadet és a hozzá tartozó képi és hangelemek a Cinematronics, a Maxis és a Microsoft tulajdonát képezik; a játékmotor MIT licence ezekre nem terjed ki. A forrásprojektek nem ruházzák át a harmadik felek védjegy- és szerzői jogait. Ez egy független nosztalgikus bemutató, a programkód saját megvalósítás.

Minden eszközfájl a repóban van, így a szimulátorhoz semmit nem kell letölteni. Az `assets/sources.json` soronként megadja, melyik fájl honnan származik és mekkora; ahol a letöltött képet utólag alakítottuk (a profilképek BMP-ből, néhány ikon 1024 képpontról kicsinyítve, a Start gomb jobb éle újrarajzolva), azt a bejegyzés `note` mezője írja le.

## Ellenőrzés

`node --test tests/*.test.mjs`

A 68 automatikus teszt lefedi a dokumentumok és beállítások mentését, a fájlműveleteket, az ikonrácsot, az ablakméretezést, az indítást és a hangkezelést, a kártyajátékok szabályait, a Pinball szüneteltetését és fókuszát, az erőforrásokat és a CSP-t. Az új tesztek az összes helyi oldal képeit és belső linkjeit, a kosár és vendégkönyv mentését, a HTML-escape-elést, valamint a Media Player lejátszási sorrendjét is vizsgálják.

A betöltés 5,5 másodpercig tart, utána a bejelentkezőképernyő várakozik: az asztal mindig a névre kattintva nyílik meg, majd 2 másodperc üdvözlés következik. Ez a kattintás egyben az a gesztus is, amit a böngésző a hang lejátszásához vár. Ha a hangot mégis megtagadja, a képernyő a bejelentkezésnél marad, és az újabb kattintás ismét megpróbálja.

Böngészőben ellenőrzött folyamatok: mind a nyolc ablakél/sarok húzása, teljes méret és visszaállítás; a Pinball újraaktiválása másik ablakból, alsó vezérlőkről és súgó bezárása után; Media Player lejátszás és médiatárkeresés; helyi weboldalak, kosár, hozzászólás, levélpiszkozat, valamint ezek újratöltés utáni megőrzése.
