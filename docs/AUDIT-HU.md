# Windows XP szimulátor – fejlesztési audit

Dátum: 2026. október 5.

Vizsgált változat: `a6e7fd9`, a helyi munkapéldány alapján.

## Vezetői értékelés

A szimulátor erőssége a felismerhető XP-élmény és az, hogy az asztal mögött valóban használható programok vannak. A következő fejlesztési körben **a meglévő funkciók megbízhatóságára és kényelmére érdemes költeni**, különösen a mentésekre, az ablakkezelésre és a többnyelvű felület következetességére.

Nem látok olyan hiányt, amely indokolná egy teljes operációs rendszer, szerveroldali felhasználókezelés vagy valódi internetes szolgáltatások felépítését. Az admin és vendég jelenlegi megoldása már külön dokumentumokat, beállításokat és futó munkameneteket biztosít. Ehhez a projekthez ez jó arányban ad élményt és funkcionalitást.

**Az első öt javasolt feladat:**

1. A sikertelen mentés mindenhol kapjon igaz visszajelzést.
2. A sérült mentést őrizzük meg, és ellenőrizzük betöltés előtt.
3. Legyen teljes helyi biztonsági mentés és visszaállítás.
4. Képernyőméret-váltás után is maradjanak elérhetők az ablakvezérlők.
5. Javítsuk a fordítási hiányokat és a receptoldal egységváltási hibáját.

Ez az audit javaslatokat tartalmaz; a szimulátor működését nem módosítja.

## Mire épül az audit?

- Átnéztem az alkalmazás belépési pontját, az asztal és ablakok kezelését, a tárolást, a nyelvi réteget, valamint a beépített alkalmazások és a tesztek releváns részeit.
- Lefuttattam a `node --test tests/*.test.mjs` parancsot: **120 tesztből 120 sikeres**, nincs kihagyott teszt.
- A `http://localhost/windows-xp/` címen kipróbáltam a belépést, az Internet Explorert, a webkatalógust és a receptoldalt. Ellenőriztem a nyitott ablak viselkedését 390 × 844-es böngészőnézetre váltva is.
- A sérült mentés két esetét elszigetelt Node/VM-környezetben próbáltam ki, mesterséges tárolóval. A felhasználó tényleges mentését ehhez nem módosítottam.
- A vizsgált böngészős útvonalon nem jelent meg figyelmeztetés vagy hiba a konzolban.

A vizsgálat nem teljes körű böngésző- és eszközteszt, és nem forgalmi adatokra épül. A teljesítményjavítások várható hasznát ezért mérni kell. A meglévő tesztek között vannak működést ellenőrző VM-próbák és forráskódmintákat ellenőrző tesztek is; a 120 sikeres teszt nem jelenti, hogy a teljes felület minden használati helyzetben hibamentes.

**Jelölések:** P1 = adatmegőrzés miatt elsőbbséget élvez; P2 = használatot vagy karbantarthatóságot javít; P3 = választható bővítés. A munkaméret becslés: kicsi ≈ néhány óra–1 nap, közepes ≈ 2–4 nap, nagy ≈ 5 vagy több nap. Ezek egy, a kódot ismerő fejlesztőre vonatkozó tájékoztató becslések, nem vállalások.

## 1. Konkrét hibák és megbízhatósági hiányok

### 1. Sikertelen automatikus mentés után is sikeresnek látszó állapot

**Érdemes megcsinálni: igen. Prioritás: P1. Munka: kicsi–közepes.**

A központi `persist()` már visszaadja, hogy sikerült-e a mentés, és egyszer értesít a tárhelyhibáról. A Jegyzettömb automatikus mentése viszont nem ellenőrzi ezt az eredményt: a felület sikertelen írás után is azt írhatja, hogy a dokumentum automatikusan elmentve. A kézi mentés ellenőrzi a visszatérési értéket, tehát nem minden mentési útvonal hibás.

Javaslat: egységes mentési állapot legyen: „Mentve”, „Mentés folyamatban”, „Nem sikerült menteni”. Sikertelen mentéskor az érintett dokumentumból továbbra is lehessen letöltést indítani; ne csak egy idővel eltűnő értesítés jelezze a problémát. Ellenőrizni kell a Paint és az egyéb állapotmentések visszajelzését is.

**Miért éri meg?** A felhasználó számára a hamis sikerjelzés rosszabb, mint egy egyértelmű hiba. Kevés új felület mellett jelentősen csökkenti az adatvesztés kockázatát.

Bizonyíték: `js/core.js:28`, `js/core.js:593`, `js/apps.js:8`, `js/apps.js:22`. A tárhelyhiba alapkezelését a meglévő teszt már ellenőrzi; az alkalmazás státuszának helyességét még nem.

### 2. Sérült mentés kezelése és a mentett adatok ellenőrzése

**Érdemes megcsinálni: igen. Prioritás: P1. Munka: közepes.**

Két ellenőrzött eset:

- Érvénytelen JSON esetén a kód alapállapotra vált, majd az induláskori mentés **felülírja a korábbi nyers mentést**. Nincs külön helyreállítási lehetőség.
- A `{"version":1,"files":[null]}` jellegű adat átjut azon az ellenőrzésen, hogy a `files` tömb-e, majd a kezdeti fájlkezelés hibával leáll: `Cannot read properties of null (reading 'parent')`.

Javaslat: ellenőrizzük a fájlbejegyzéseket, a profilokat és a fontos beállítások típusát; legyenek világos, verziózott migrációk. Sérült mentés esetén az eredeti tartalom maradjon hozzáférhető, és a felhasználó dönthessen az újrakezdésről. A megőrzés ne kizárólag ugyanabba az esetleg már megtelt tárolóba való másolástól függjön.

**Miért éri meg?** A mentési formátum a projekt fejlődésével változik. A hibás adat ne tegye használhatatlanná az egész asztalt, és ne vesszen el automatikusan a helyreállítható tartalom.

Bizonyíték: `js/core.js:26`, a `seedProfile()` függvény és az induláskori `persist()`; a két eset elszigetelt próbával igazolva.

### 3. Több böngészőlap ugyanazt a mentést felülírhatja

**Érdemes megcsinálni: igen, egyszerű védelemmel. Prioritás: P1. Munka: kicsi–közepes.**

Minden oldalbetöltés saját memóriabeli állapotot tart, és a teljes állapotot ugyanabba a localStorage-kulcsba írja. Nincs `storage` eseményre épülő egyeztetés. Ha két lap nyitva van, az egyikben elmentett dokumentumot a másik lap későbbi állapotmentése felülírhatja. Ez a kódból következő kockázat; két tényleges böngészőlappal nem reprodukáltam.

Javaslat: első körben jelezzük a másik aktív példányt és a külső változást, és védjük ki az elavult állapotból történő automatikus felülírást. **Teljes valós idejű állapot-összefésülést nem érdemes építeni** ehhez a szimulátorhoz.

**Miért éri meg?** A második lap megnyitása hétköznapi helyzet. Egy egyszerű ütközésvédelem sokkal kisebb munka, mint később elveszett adatokat keresni.

Bizonyíték: `js/core.js:19`, `js/core.js:26`, `js/core.js:28`; nincs több lap közötti állapotegyeztetés a vizsgált kódban.

### 4. Nyitott ablak részben a képernyőn kívül marad átméretezéskor

**Érdemes megcsinálni: igen. Prioritás: P2. Munka: kicsi–közepes.**

Az ellenőrzött helyzetben az Internet Explorer nyitva volt asztali méretben, majd a böngészőnézet 390 pixel szélesre változott. Az ablak szélessége 390 pixel lett, de a bal pozíciója 167 pixel maradt, így a jobb széle 557 pixelre került. A jobb felső ablakvezérlők kikerültek a látható területről.

Javaslat: képernyőméret-váltáskor az ablak tényleges mérete alapján igazítsuk vissza a pozíciót. Keskeny nézetben lehessen automatikusan maximált ablakot használni, és a fontos műveletsorok ne szoruljanak le. A tálca áthelyezését és a mobil elforgatását is vegyük be az ellenőrzésbe.

**Miért éri meg?** Nem csak telefonon hasznos: egy asztali böngésző kisebbre húzása is előidézheti. Az XP megjelenése közben megőrizhető.

Bizonyíték: böngészős méretmérés; `js/core.js:178` körüli `applySettings()` és `js/core.js:637` átméretezési kezelő.

### 5. Fordítási hiányok és hibás receptmennyiségek

**Érdemes megcsinálni: igen. Prioritás: P2. Munka: kicsi–közepes.**

Az öt nyelv és a kulcsellenőrzések jó alapot adnak, de néhány felirat közvetlenül magyarul szerepel. Az angol receptoldalon például „Egy csipet szeretet.” és „20 dkg liszt” jelent meg. A Feladatkezelőben is van közvetlen „Helyi kapcsolat” felirat.

A receptoldal külön működési hibája: angolul a 24 palacsintára váltás **40 g lisztet, 6 ml tejet és 4 ml szódavizet** ír ki. A kezdő recept helyes megduplázása 400 g liszt, 600 ml tej és 400 ml víz lenne. A számítás a magyar dkg/dl értékeket használja, miközben az angol fordítás g/ml egységet ír melléjük. A magyar egységek mellett ugyanez a számítás megfelelő.

Javaslat: a mennyiségeket egységes alapegységben tároljuk, a megjelenítést külön formázzuk. A ténylegesen kirenderelt feliratokat is ellenőrizzük, ne csak a fordítási kulcsok meglétét.

**Miért éri meg?** A többnyelvűség már vállalt képesség. Ezek javítása kis munka a teljes fordítás elkészítéséhez képest, és közvetlenül javítja a minőségérzetet.

Bizonyíték: böngészőben reprodukált adagszámváltás; `js/web-pages.js:50`, `lang/hu.js:1413`, `lang/en.js:1413`, `js/taskmgr.js:99`.

### 6. Több névtelen dokumentumhoz csak egy közös piszkozat tartozik

**Érdemes megcsinálni: igen, kis megoldással. Prioritás: P2. Munka: közepes.**

Több Jegyzettömb-ablak nyitható, de a névtelen dokumentumok mind ugyanazt a `state.draft` mezőt írják. Ugyanez a közös piszkozatmegoldás a Paintnél is megtalálható. A több ablak aktuális tartalma ezért nem mind állítható vissza a böngésző újranyitásakor.

Javaslat: minden névtelen dokumentum kapjon saját piszkozat-azonosítót, és újranyitáskor legyen egyszerű visszaállítási lista. Ehhez nem kell a teljes nyitott asztalt elmenteni.

**Miért éri meg?** A többablakos működés az élmény része. A mentés viselkedése is legyen összhangban ezzel; a megoldás nem igényel felhőt vagy fiókrendszert.

Bizonyíték: `js/apps.js:10`, `js/apps.js:22`, valamint a Paint `saveDraft()` függvénye. A megállapítás a kód alapján készült.

### 7. Feladatkezelő: gyakori teljes újrarajzolás

**Érdemes megcsinálni: igen, célzottan. Prioritás: P2. Munka: kicsi–közepes.**

A Feladatkezelő 1,2 másodpercenként meghívja a teljes `render()` függvényt, amely az aktív panel és a műveletgombok HTML-jét újra létrehozza. Ez felesleges DOM-munka, és a lecserélt elemek elveszíthetik a billentyűzetfókuszt. A háttérbe tett felhasználói munkamenetet már kezeli; ezt érdemes megtartani.

Javaslat: csak a változó értékek és grafikonok frissüljenek. Rejtett böngészőlapnál csökkentsük a vizuális frissítést; a játékok logikai idejét ettől külön kell kezelni.

**Miért éri meg?** Egy központi, jól körülhatárolt helyen javítható a működés. Általános teljesítmény-átírást mérés nélkül nem indokol.

Bizonyíték: `js/taskmgr.js:76`, `js/taskmgr.js:151`.

## 2. Fejlesztések, amelyek hozzáadott értéke indokolja a munkát

| Fejlesztés | Érdemes? | Miért, és mekkora legyen a megoldás? | Prioritás / munka |
|---|---|---|---|
| Teljes helyi mentés exportja és importja | **Igen** | Dokumentumok, képek, két profil, beállítások és a külön tárolt nyelvválasztás együtt költöztethetők vagy visszaállíthatók. Verziózott mentési fájl, ellenőrzött import és felülírás előtti tájékoztatás kell. Egyedi fájlletöltés már van; a teljes mentés hiányzik. | P1 / közepes |
| Mentési terhelés csökkentése | **Igen** | A Jegyzettömb minden leütésnél a teljes állapotot szinkron JSON-ként írja ki, benne a képadatokkal és profilokkal. Rövid késleltetés és összevont írás indokolt; kézi mentés, profilváltás és kilépés előtt a függő mentést ki kell írni. A tényleges gyorsulást mérjük nagyobb mentéssel. | P2 / közepes |
| Billentyűzetes menük és fókuszkezelés | **Igen** | Vannak jó gyorsbillentyűk, ablakmozgatás és dialógusfókusz. A menük nyílbillentyűs bejárását, almenüből visszalépést és bezárás utáni fókusz-visszaadást érdemes egységessé tenni. A modalitást a tabulátoros bejárásban is ellenőrizni kell. | P2 / közepes |
| Alapvető érintéses használhatóság | **Igen** | Egy koppintásos ikonnyitás és mobil CSS már van. A menük, ablakvezérlők és húzás legyenek kényelmesebbek; az Aknakereső 20 × 20 pixeles mezőihez opcionális nagyítás hasznos. Nem kell az egész XP-t mobilalkalmazássá áttervezni. | P2 / közepes–nagy |
| Néhány valódi böngészős regresszióteszt | **Igen** | A meglévő 120 teszt mellé 6–10 kritikus útvonal kell: belépés, mentés és újratöltés, profilváltás, ablak átméretezése, menük, képmentés, Pinball-fókusz. Ezek a forráskód- és VM-tesztek által nem látott hibákat fogják meg. | P2 / közepes |
| Célzott képi összehasonlítás | **Igen, szűk körben** | Az asztal, Start menü, egy Explorer-ablak és egy beállítóablak néhány rögzített méretben segít megőrizni az XP megjelenését. Minden program minden állapotának képi tesztelése túl drága lenne. | P2 / közepes |
| TXT és PNG behozatala a szimulátorba | **Igen, későbbi körben** | A Jegyzettömb és Paint jobban használható saját kis fájlokkal. A Media Player már tud helyi médiát megnyitni. Szöveg és kép importja elég; tetszőleges fájlrendszer-hozzáférést nem kell építeni. | P3 / közepes |
| Opcionális gyorsabb indulás | **Igen, kis kiegészítésként** | Az 5,5 másodperces boot és a 2 másodperces üdvözlés hangulatos. A boot már átugorható kattintással vagy billentyűvel. Visszatérőknek menthető gyorsindítási választás hasznos lehet, az eredeti indulás megtartásával. | P3 / kicsi |
| Rövid, felfedezést segítő útmutató | **Igen, opcionálisan** | A Súgó és az első belépési tipp már létezik. Néhány választható ötlet – rajzolás és mentés, retro web, játékok, témaváltás – segíthet megtalálni a projekt értékét. Kötelező végigkattintós túra nem kell. | P3 / kicsi |
| Részleges kódrendezés | **Igen, funkciójavításokhoz kapcsolva** | A `utilities.js` kb. 90 kB, a `core.js` kb. 51 kB. A mentést, tulajdonságablakokat és néhány adatmodellt érdemes külön felelősségre bontani. Maradjon egyszerű a futtatás és a jelenlegi tesztelés. | P2 / közepes, több körben |
| Betöltött nyelvek és képek optimalizálása | **Igen, mérés után** | Induláskor az öt szótár együtt 621 281 bájt, az alkalmazás-JS 409 678 bájt, a CSS 141 157 bájt tömörítés nélkül. Egyes ikonok több száz kB-osak, bár kicsiben látszanak. A nyelvbetöltést és a megfelelő méretű képszármazékokat vizsgáljuk meg. Az offline futtatás és a nyelvváltás maradjon működőképes. | P3 / közepes |

A Pinball kb. 9,3 MB-os csomagját külön iframe tölti be, az alkalmazás megnyitásakor. **A Pinball késleltetett betöltését nem kell újra megvalósítani**; ez már része a jelenlegi felépítésnek. A fenti fájlméretek nem mért hálózati letöltési idők, és nem tartalmazzák a szerveroldali tömörítés hatását.

## 3. Amit jelenleg nem érdemes megépíteni

| Felmerülő fejlesztés | Érdemes? | Miért nem? / Mikor változna a döntés? | Munka |
|---|---|---|---|
| Teljes felhasználókezelés, regisztráció, jelszó, jogosultsági rendszer | **Nem** | Az admin és vendég külön profilja és munkamenete már elég a szimulátorhoz. A valódi fiókrendszer üzemeltetést és sok új hibalehetőséget hozna, kevés plusz nosztalgiaélménnyel. A jelenlegi fiókok szerepjátékot és helyi elkülönítést adnak, nem valódi biztonsági határt. | Nagy |
| Felhőmentés és eszközök közötti szinkron | **Most nem** | Előbb a helyi mentés legyen megbízható és exportálható. A felhő konfliktuskezelést, fiókot és szolgáltatásfenntartást kíván. Akkor lenne indokolt, ha bizonyíthatóan rendszeresen több eszközön használnák. | Nagy |
| Valódi internet betöltése a szimulált IE-ben | **Nem** | A helyi retro web egyedi és következetes élmény. A mai oldalak kompatibilitása, beágyazhatósága és hálózati működése külön termékprobléma lenne. A jelenlegi CSP tudatosan kizárja a külső kapcsolatokat. | Nagy |
| Valódi email küldése és fogadása | **Nem** | Az Outlook Express és a helyi webmail demonstrációként működik. Valódi levelezéshez kiszolgáló, hitelesítés és kézbesítési üzemeltetés kellene, aránytalan munkával. | Nagy |
| Nyilvános fórum, közös chat, online ranglista | **Most nem** | A helyi vendégkönyv és pontszámok már adják az élményt. Közös adatoknál szerver, visszaélés-kezelés és moderáció is megjelenne. Egy külön közösségi cél és tényleges igény indokolhatná később. | Nagy |
| Valódi XP-programok és teljes rendszeremuláció | **Nem** | Ez a böngészős szimulátor alapvető átépítése lenne. A saját programok most gyorsan és kiszámíthatóan adják vissza az XP használatát. | Nagyon nagy |
| Teljes NTFS, registry, hálózati megosztás és jogosultsági modell | **Nem** | A jelenlegi fájlfa, Lomtár, parancsikonok és csak olvasható C: elég a legtöbb bemutatási helyzethez. A teljes technikai modell kevés látványos előnyt adna. Célzott oktatási használat változtathat ezen. | Nagyon nagy |
| Valódi vírusirtó, Windows Update vagy hardverkezelés | **Nem** | Ezeknek az ablakoknak a hitelesség és a szemléltetés a feladata. Egy böngészős felületből a valódi gép ilyen kezelése nem illeszkedik a projekthez. Egy beállításról viszont legyen világos, hogy van-e helyi hatása. | Nagy |
| Teljes újraírás valamely modern keretrendszerben | **Nem** | A jelenlegi felépítés build nélkül fut, és van hozzá érdemi tesztalap. A felhasználó számára egy teljes átírás önmagában nem javítja az XP-élményt. Célzott modulbontással kisebb kockázattal kezelhetők a problémák. | Nagy |
| A teljes asztal és minden folyamatban lévő játék automatikus visszaállítása | **Most nem** | Jó kényelmi funkció lehet, de a játékállapotok, iframe, fókusz, ablakméretek és több munkamenet mentése sok összetettséget hoz. Előbb a dokumentumpiszkozatokat védjük; később legfeljebb az egyszerű programablakok visszanyitását érdemes mérlegelni. | Nagy |
| Sok új program és még több nyelv | **Most nem** | A kínálat már széles. A meglévő nyelvek és alkalmazások minőségi hibáinak javítása többet ér, mint néhány új menüpont. Új program akkor legyen, ha emlékezetes XP-funkciót ad, kis fenntartási teherrel. | Változó |
| Modern dizájn az XP-felület helyett | **Nem** | A retro megjelenés a projekt fő értéke. Olvashatóság, opcionális nagyítás és érintéses kényelem javítható anélkül, hogy modern alkalmazássá alakítanánk az asztalt. | Nagy |
| Telepíthető PWA és külön offline gyorsítótár | **Most nem** | A projekt már helyben, külső függőségek nélkül fut. A webes demo hálózat nélküli újranyitásához ez hasznos lehetne, de gyorsítótár-frissítést és verziókezelést is igényel. Valós offline használati igény esetén térjünk vissza rá. | Közepes |
| Összetett analitika, adminfelület és bevételi rendszer | **Most nem** | Nincs olyan használati adat vagy üzleti cél a feladatban, amely indokolná. A kódvizsgálat és néhány valós felhasználói próba előbb megmutatná, hol akadnak el az emberek. | Közepes–nagy |

## 4. Amit érdemes megtartani

- **Admin és vendég, külön helyi profilokkal.** Már elég gazdag a szimulátorhoz; a működés minősége többet ér új fióktípusoknál.
- **Helyi retro internet.** A kereshető katalógus, kosár, fórum és bemutatóoldalak a projekt saját értékei. A mintadatokat használó oldalaknál maradjon az egyértelmű jelölés.
- **Egyszerű telepítés és helyi erőforrások.** Ne legyen egy alapvető javítás mellékhatása kötelező szerver vagy bonyolult buildfolyamat.
- **Eredeti megjelenés és hangok, dokumentált forrásokkal.** Az optimalizálás őrizze meg a karakterüket; a forrásnyilvántartást új erőforrásnál is frissíteni kell.
- **Csökkentett animáció támogatása és meglévő gyorsbillentyűk.** Ezeket tovább kell vinni az új elemekbe is.
- **A már meglévő takarítás és munkamenet-kezelés.** A Media Player és a Pinball több fontos háttérműködési helyzetet már kezel; ezekre építsünk.
- **A 120 tesztből álló alap.** Bővítsük valódi használati útvonalakkal, a jelenlegi ellenőrzések megtartásával.

## 5. Javasolt megvalósítási sorrend és elfogadási feltételek

### Első kör: a felhasználó munkájának megőrzése

Sikertelen mentés visszajelzése, sérült mentés kezelése, több lap ütközésvédelme, teljes export/import.

A kör akkor kész, ha megtelt vagy tiltott tárhely mellett nincs hamis „mentve” jelzés; sérült mentés nem íródik felül és nem akadályozza meg a helyreállítás elérését; egy másik lap nem írja felül észrevétlenül az újabb adatokat; export és import után mindkét profil dokumentumai, rajzai, beállításai és a nyelvválasztás visszaállnak.

### Második kör: a meglévő élmény következetessége

Ablakok visszaigazítása, fordítások és receptmennyiségek javítása, menü- és fókuszkezelés, mentési írások összevonása, célzott böngészőtesztek.

A kör akkor kész, ha keskenyebb nézetre váltva elérhető a bezárás és maximálás; a recept mennyiségei minden támogatott nyelven ugyanazt jelentik; a fontos menük egér nélkül is bejárhatók; a mentési késleltetés mellett a gyors profilváltás vagy újratöltés sem veszít friss szöveget.

### Harmadik kör: kis, önként használható bővítések

Külön piszkozatok visszaállítása, TXT/PNG-import, gyorsindítás, rövid felfedezési segítség, majd mért betöltési optimalizálás.

Ezek közül elsőként a piszkozat-visszaállítást választanám, ha a felhasználói próbák szerint sokan több dokumentummal dolgoznak. Ha főleg néhány perces nosztalgiázásra használják a szimulátort, a gyorsindítás és a felfedezési segítség adhat nagyobb hasznot.

**A következő kiadás célja:** a jelenlegi, már tartalmas XP-élmény legyen kiszámíthatóbban használható. A nagy infrastruktúrájú új funkciók csak konkrét felhasználói igény alapján kerüljenek sorra.

## 6. Megvalósítás állapota – 2026. október 5.

Az audit fenti megállapításai a vizsgált eredeti állapotra vonatkoznak. Az első javítási csomag az alábbiakat valósítja meg:

| Tétel | Állapot | Elkészült változtatás |
|---|---|---|
| Mentési hibák visszajelzése | **Elkészült az érintett szerkesztőkben** | Jegyzettömb, Paint és a helyi webmail a mentés eredményét jelzik. Tárhelyhiba esetén tartós figyelmeztetés is megjelenik a tálcán. |
| Sérült mentés megőrzése | **Elkészült** | Önálló tárolómodul ellenőrzi a betöltött állapotot. Hibás vagy ismeretlen verziónál az eredeti adatot megőrzi, az automatikus felülírást leállítja, és elérhető a helyreállítás. |
| Több böngészőlap ütközésvédelme | **Elkészült** | Tárolóeseményre és írás előtt is ellenőrzi a változást. Elavult lap nem írhatja felül az újabb mentést; a felületen letöltésre és újratöltésre kér. |
| Teljes export és import | **Elkészült** | Biztonsági mentés a Vezérlőpultból és a Start menüből. Mindkét profil, a fájlok, piszkozatok, beállítások és a nyelv egy verziózott JSON-ba kerülnek. Import előtt ellenőrzés és összegzés, felülírás előtt megerősítés van. |
| Külön dokumentumpiszkozatok | **Elkészült** | A Jegyzettömb és Paint dokumentumonként tárol piszkozatot. Közös visszaállítási lista nyitja meg őket; a régi közös piszkozatok migrálódnak. |
| Mentési írások összevonása | **Elkészült** | Gépelés és rajzolás után 300 ms késleltetés; kézi mentés, szerkesztőbezárás, profilváltás, lapelrejtés és kilépés előtt a függő írás kiürül. Változatlan JSON nem okoz új tárhelyírást. Nagy állapoton mért sebességadat még nincs. |
| Ablakok visszaigazítása | **Elkészült** | Kisebb nézetben az ablak teljes szélessége és magassága alapján kerül vissza a munkaterületre. A 390 × 844-es böngészőpróbában a bezárógombok elérhetők maradtak. |
| Recept és fordítási hibák | **Elkészült a feltárt helyeken** | Egységes g/ml alapegységek, azonos kezdő és módosított receptmegjelenítés. A feltárt recept-, időjárás-, Feladatkezelő-, Számológép- és HTML-iskola-feliratok fordítása javítva. |
| Menü és modalitás | **Elkészült az alapkezelés** | Start és alkalmazásmenük nyílbillentyűkkel, Home/End és Escape kezeléssel járhatók. Az almenüből visszalépés és a menübezárás visszaadja a fókuszt; a modális ablak tabulátoros fókusza bent marad. |
| Feladatkezelő frissítése | **Elkészült** | Változatlan alkalmazáslistánál csak a számok és grafikonok frissülnek, a gombok megmaradnak. Elrejtett lapon és minimalizált ablakban a vizuális frissítés szünetel. |

### Ellenőrzés

**134/134 automatizált teszt sikeres.** Az eredeti 120 ellenőrzés mellé tárhelyhibát, sérült állapot megőrzését, két lap ütközését, mindkét profil mentésének export/importját, hibás import elutasítását, import utáni régi írás tiltását, nyelvvisszaállítást, összevont mentést, gyors profilváltást, piszkozatmigrációt és mind az öt nyelv receptmennyiségeit ellenőrző esetek kerültek.

Külön, kézi böngészős próba készült a két névtelen Jegyzettömb-piszkozat mentésére és újratöltés utáni megnyitására, a tényleges mentési fájl letöltésére és import-előnézetére, a visszaállítás megszakítására, a Start és alkalmazásmenük billentyűzetes használatára, a modális fókuszra, a 390 × 844-es nézetre, a két lap figyelmeztetésére és a Feladatkezelő fókuszmegőrzésére. A teljes visszaállítás írási tranzakciója automatizált tárolótesztben lett ellenőrizve; a böngésző meglévő adatait a felületi próbában nem cseréltük le.

### Későbbi, továbbra is érdemes feladatok

A TXT/PNG-import, a menthető gyorsindítás, az opcionális felfedezési segítség, az érintéses célméretek és Aknakereső-nagyítás, a betöltési méretek mért optimalizálása, valamint az ismételhető automatizált böngésző- és képi regressziótesztek külön következő körre maradnak. A mostani böngészős ellenőrzések nem egy új automatizált tesztfuttató részei.

A teljes felhasználókezelés, felhőmentés, valódi internet és email, keretrendszeres újraírás és egyéb nagy infrastruktúrájú ötletek döntése változatlan: a jelenlegi szimulátorhoz nem indokoltak.
