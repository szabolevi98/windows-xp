# Betöltési mérés – 2026. október 5.

Vizsgált kiadás: `96c54cc`, éles oldal: https://windows-xp.levente.net/.

**Eredmény:** a mért asztali kapcsolaton nem látszik kiszolgálási probléma. A kód tömörítése és a statikus gyorsítótárazás már működik. Két túlméretezett tálcaikon viszont konkrét, kis beavatkozással javítható adatpazarlás. Az első körben csak mértünk; nincs alkalmazás- vagy szervermódosítás.

## Módszer és korlátok

- Az éles oldalt a Codex böngészőjében nyitottuk meg, és a bejelentkezési képernyőig megfigyelt erőforrások listáját rögzítettük: 59 egyedi URL. Az ikonok tényleges megjelenítési méretét a DOM-ból ellenőriztük.
- Ezek teljes HTTP-válaszait `curl.exe --compressed` használatával, legfeljebb hat párhuzamos kérésben mértük meg. Ez a tömörített választestek összege, fejléc- és protokollköltség nélkül. Nem a böngésző adott munkamenetének cache-hit után ténylegesen átvitt bájtszáma; első betöltési nagyságrendet mutat.
- A főoldalra öt külön HTTP-kérés készült. A mérés egyetlen gépről és kapcsolatról származik, működő Cloudflare gyorsítótárral. Nem lassú hálózati vagy globális felhasználói mérés.
- Nem mértünk böngészős FCP/LCP-t vagy szkriptvégrehajtási időt. A HTTP-időkből nem állítunk teljes oldalbetöltési időt; a párhuzamos mérőfolyamat futási ideje sem ilyen adat.

## Eredmények

| Megfigyelés | Mért érték |
|---|---|
| Főoldal HTTP-válaszának ideje, öt kérés | 0,098–0,176 s; medián 0,147 s |
| Főoldal tömörített választeste | 2 140 bájt |
| 59 megfigyelt erőforrás teljes választeste | 1 706 786 bájt, kb. 1,71 MB |
| Ezek tömörítetlen helyi fájlmérete | 2 556 889 bájt |
| 24 JavaScript és 12 CSS | 386 064 bájt átvitelben; mind a 36 gzip tömörítésű |
| Az öt nyelvi szótár, a JS-összegen belül | 216 227 bájt átvitelben |
| 21 kép | 895 752 bájt átvitelben |
| Induló hang | 424 644 bájt |
| Cloudflare válaszok | 57 HIT, 2 DYNAMIC; minden vizsgált erőforrás 200 OK |

Az 59-es listában a kurzorfájl a képesség besorolása szerint stylesheet, a fenti CSS-szám viszont csak a valódi `.css` fájlokat tartalmazza. A főoldal HTML-je külön tétel, nincs az 59 erőforrás összegében.

A JS/CSS és a vizsgált PNG/JPG fájlok `Cache-Control: max-age=14400` fejléccel érkeztek, így négy órára gyorsítótárazhatók. A főoldal `no-cache` fejléce helyes: újranyitáskor ellenőrizhető az aktuális kiadás. A WAV-nak nincs explicit Cache-Control fejléce, de van ETag és Last-Modified; nem állítjuk, hogy minden látogatáskor teljesen újra letöltődik.

## Ami valóban javítható

| Tétel | Méret és jelenlegi használat | Érdemes? |
|---|---|---|
| `assets/icons/showdesktop.png` | 282 627 bájt, 1024 × 1024; a tálcán 16 × 16 | **Igen, célzottan.** Kis megjelenítési mérethez túl nagy forrás. |
| `assets/icons/security.png` | 241 871 bájt, 1024 × 1024; a tálcán 16 × 16 | **Igen, célzottan.** Ugyanaz a probléma. |
| Mind az öt nyelv azonnali betöltése | 216 227 bájt tömörítve | **Most nem elsődleges.** A nyelvváltás azonnali, a fordítási réteg a magyar címkéket és az angol visszaesést is használja. A mért kapcsolaton nem mutatkozott ebből eredő probléma; késleltetett betöltés több állapotkezelést igényelne. |
| Bliss háttér | 306 906 bájt | **Most nem.** A nagy háttér a látvány lényeges része, ez a méret önmagában nem indokol minőségcsökkentést. |
| WAV átalakítása vagy késleltetése | 424 644 bájt | **Most nem.** Az eredeti hang és a belépéskori megbízható lejátszás értéket ad. Explicit gyorsítótárazása külön, kisebb lehetőség, de önálló szerverbeavatkozást a mostani eredmény nem indokol. |
| Általános modulbontás, új betöltőrendszer | A teljes JS/CSS együtt kb. 386 kB tömörítve | **Nem indokolt.** Nincs kimutatott késés, amely ekkora átépítést igazolna. |

A két ikon együtt 524 498 bájt, a megfigyelt erőforrások 30,7%-a. Kisebb, az összes felhasználási hely méretigényéhez illő változatokkal ennek nagy része megtakarítható; a pontos megtakarítás csak az elkészítés és a képi ellenőrzés után mondható meg.

## Szándékos XP-várakozás

A `js/start.js` alapbeállításban 5500 ms induló képernyőt és a fiókválasztás után 2000 ms üdvözlést ír elő. Ez a szimuláció része, nem letöltési hiba. A már elkészült gyorsindítás ezeket kihagyja. A Pinball iframe és játékmotor csak a program megnyitásakor töltődik be, nincs az induló listában.

Az audit alapján tervezett további érintéses fejlesztést és új böngészős/képi tesztrendszert a felhasználó döntése alapján elhagyjuk.
