# Windows XP szimulátor

![Windows XP szimulátor – asztal és Internet Explorer](docs/screenshot.jpg)

Függőségek nélküli, magyar nyelvű Windows XP-élmény HTML, CSS és JavaScript használatával.

## Indítás

XAMPP Apache mellett: **http://localhost/windows-xp/**

Az `index.html` közvetlen megnyitása is működik. A mentések az adott böngészőhöz és címhez tartoznak; következetesen ugyanazon a címen használd. Nincs build, npm-telepítés vagy CDN.

## Használat

- XP betöltés, üdvözlés, kijelentkezés, készenlét, kikapcsolás, újraindítás.
- Rácsra igazodó asztali ikonok, ütközéskor helycsere. A Lomtár alapból jobb alul jelenik meg, szabadon áthelyezhető, és megjegyzi a helyét.
- Játékok mappa az asztalon, benne az Aknakereső és a Pasziánsz parancsikonja.
- Mozgatható ablakok, átméretezés, teljes méret, kis méret, tálca, Start menü, helyi menük.
- Internet Explorer: régi Google, kulcsszavas helyi keresés, 13 beépített oldal, címsor, előzmények, kedvencek. Az ismeretlen címek helyi hibaoldalt kapnak.
- Jegyzettömb: piszkozat, dokumentummentés, automatikus mentés, keresés, sortörés, szövegfájl letöltése.
- Fájlkezelő: saját mappák, dokumentumok, képek, átnevezés, törlés, visszaállítás, Lomtár, fájlkeresés.
- Böngészhető, csak olvasható C: meghajtó: WINDOWS, Program Files, Documents and Settings, Temp és almappák. A DVD-meghajtó kattintásra lemezt kér.
- Paint: ceruza, ecset, radír, kitöltés, vonal, téglalap, ellipszis, szöveg, pipetta, paletta, visszavonás, PNG-mentés és letöltés.
- Számológép: alapműveletek, százalék, gyök, reciprok, memória, billentyűzet.
- Aknakereső: két nehézség, biztonságos első lépés, zászló, számláló, időmérő, eredmények.
- Klondike Pasziánsz: szabályos lépések, lapcsoportok, gyűjtőhelyek, újraosztás, visszavonás, automatikus gyűjtés.
- Windows Media Player: eredeti rendszerhangok, saját helyi hangfájlok, lejátszás, szünet, keresés a hangban, hangerő.
- Vezérlőpult: négy eredeti háttérkép, három színséma, felhasználónév, rendszerhangok, hangerő, rendszerinformáció, naptár.
- Parancssor és Futtatás. `help` megmutatja a támogatott parancsokat.

Az asztalon dupla kattintás nyitja meg az ikonokat. Érintőképernyőn egy koppintás is elég. F11: a valódi böngésző teljes képernyője; az asztal helyi menüjéből is kérhető.

## Mentés és helyi működés

A `windows-xp-simulator-v1` localStorage-kulcs tartalmazza a dokumentumokat, mappákat, képeket, piszkozatokat, beállításokat, kedvenceket, ikonpozíciókat és Aknakereső-rekordokat. A megnyitott ablakok és a folyamatban lévő játékok nem mentődnek.

Ha a helyi tárhely nem elérhető vagy megtelt, a program figyelmeztet. A böngészőadatok törlése a mentéseket is törli. A fontos dokumentumok és képek a saját gépre is letölthetők. A Media Playerben megnyitott saját hangok csak az aktuális munkamenetben érhetők el.

Minden futtatáshoz szükséges fájl az `assets` mappában van. A CSP tiltja a hálózati API-hívásokat, a külső erőforrásokat, az iframe-eket és a formok külső beküldését. Az Internet Explorer a DOM-ba renderel helyi tartalmat, nem tölt be valódi weboldalakat.

## Fájlok

- `index.html`: alkalmazásváz és betöltési képernyők.
- `styles.css`: klasszikus Luna felület és programok.
- `js/core.js`: ablakkezelés, menük, párbeszédablakok, mentés, fájlműveletek.
- `js/internet.js`: helyi web és Internet Explorer.
- `js/apps.js`: dokumentumok, Paint, Számológép, parancssor.
- `js/explorer.js`: fájlkezelő, csak olvasható rendszermappák, C: és D: meghajtó.
- `js/utilities.js`: beállítások, Media Player és további eszközök.
- `js/games.js`: Aknakereső és Pasziánsz.
- `js/desktop-grid.js`: ikonrács, foglalt helyek kezelése és átrendezés.
- `js/start.js`: asztal, Start menü és munkamenet.

## Képek és hangok forrása

Eredeti XP-s képi és hangelemeket töltöttünk le; nincs generált helyettesítő háttérkép vagy ikon. A források fájlonként az `assets/sources.json` fájlban szerepelnek.

- [Windows UI assets – bartekl1](https://github.com/bartekl1/windows-ui-assets): eredeti Windows XP hátterek, hangok, Lomtár-ikon.
- [winXP – ShizukuIchi](https://github.com/ShizukuIchi/winXP): XP programikonok, eszköztárikonok és Aknakereső-elemek.
- [Google régi logó](https://www.google.com/intl/en_ALL/images/logo.gif).
- [JS Paint](https://github.com/1j01/jspaint): eredeti megjelenésű klasszikus Paint-eszközikonok.
- [Pranx Bliss háttérkép](https://pranx.com/images/background.jpg): 1920×1200-as helyi háttérkép (`bliss-hd.jpg`).
- [Azul](https://i.imgur.com/tLLKmd8.jpg) és [Autumn](https://4kwallpapers.com/nature/windows-xp-autumn-17201.html): kész, 1920×1200-as változatok helyi másolatai (`azul-1920.jpg`, `autumn-1920.jpg`), helyi átméretezés nélkül. A Bliss is 1920×1200-as. A kék, logós Windows XP háttér egyelőre az eredeti 800×600-as fájl.
- Vizuális referencia: [Pranx Windows XP Simulator](https://pranx.com/windows-xp-simulator/).

A Windows XP, az ikonok és hangok a Microsoft tulajdonát képezik; a Bliss fotó Charles O’Rear / Microsoft alkotása, a Google-logó a Google tulajdona. A forrásprojektek nem ruházzák át a harmadik felek védjegy- és szerzői jogait. Ez egy független nosztalgikus bemutató, a programkód saját megvalósítás.

A `scripts/download-assets.mjs` csak a fejlesztéshez használt egyszeri letöltő; a szimulátor nem futtatja, és használatához nincs szükség internetre.

## Ellenőrzés

`node --test tests/*.test.mjs`

Nyolc regressziós ellenőrzés: ékezetes fájlok mentése és visszatöltése, mappák rekurzív törlése/visszaállítása, helyi keresés, HTML- és fájlnévkezelés, megtelt tárhely, helyi erőforrások és CSP.

Az indítási ellenőrzések vizsgálják az 5,5 másodperces betöltést, a 2 másodperces üdvözlést és a bejelentkezésenként egyszer megszólaló hangot. A hang előre betöltődik. Ha a böngésző oldalfrissítés után tiltja az automatikus lejátszást, az üdvözlőképernyőn megjelenő Bejelentkezés gomb indítja el a hangot és az asztalt együtt. Egy későbbi asztali kattintás nem játssza le újra a hangot.

Nyolc további ellenőrzés fedi le az ikonok alaphelyét, a rácsra igazítást, az ütközéskori helycserét, a Lomtár mozgatását és helyének mentését, az átméretezést, a sok ikont, a korábbi mentések frissítését és a játékparancsikonok indítását. A hangkezelés tesztjei kitérnek az automatikus lejátszás tiltására, a némításra, a ki-be jelentkezésre, az újraindításra és a sikertelen médiafájlra is. Összesen 25 automatikus teszt fut.

A böngészőben külön ellenőrzött folyamatok: betöltés, üdvözlés, Start menü, keresés és helyi hibaoldal, dokumentummentés újratöltéssel, Lomtár-visszaállítás, számolás, Paint-rajzolás és mentés, Aknakereső első lépése és zászlózás.
