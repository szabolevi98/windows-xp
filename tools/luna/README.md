# Luna extractor

Ez a két szkript bontja ki az `assets/scrollbar/`, `assets/taskbar/`, `assets/frame/`,
`assets/start/` és `assets/controls/` mappák tartalmát az eredeti Windows XP
`luna.msstyles` fájlból. A kibontott képek a repóban vannak, tehát a szimulátor
futtatásához erre semmi szükség — akkor kell, ha új alkatrészt akarsz kivenni a
témából, vagy ellenőrizni, honnan jött egy meglévő.

## A témafájl

A `luna.msstyles` **nincs a repóban**: a Microsoft tulajdona. Töltsd le ide, a
szkriptek mellé:

```bash
curl -L -o tools/luna/luna.msstyles https://raw.githubusercontent.com/robberphex/docker-wine-coolq/master/luna.msstyles
```

Aztán ellenőrizd, hogy azt kaptad, amiből a mostani képek készültek:

```bash
sha256sum tools/luna/luna.msstyles
```

Az elvárt érték:

```
c1d68af043a8431650dee22d4064b4e523309f00fb1c1cfa174ebd86e2125019
```

Ha máshol tartod a fájlt, a `LUNA_MSSTYLES` környezeti változóval add meg az útját.

## Futtatás

Python 3 és Pillow kell hozzá.

```bash
python tools/luna/extract.py
```

Ez újraírja mind az öt mappát és frissíti az `assets/sources.json` bejegyzéseit.
A kimenet determinisztikus: azonos témafájlból bitre azonos PNG-k jönnek ki, tehát
ha nem nyúltál a szkripthez, a `git status` üres marad.

Egy-egy család külön is futtatható, és ki lehet írni máshová, hogy a repó ne
változzon:

```bash
python tools/luna/extract.py scrollbar frame
python tools/luna/extract.py --out /tmp/luna-check
```

## Mi van a két fájlban

- **`luna.py`** — maga az olvasó. Az `.msstyles` valójában egy csak erőforrásokat
  tartalmazó PE-könyvtár: a képek a `RT_BITMAP` táblában ülnek csupasz
  `BITMAPINFOHEADER`-ként, a témaleíró pedig `RT_TEXTFILE`-ként, UTF-16-os INI
  formában. A `bitmap()` dekódolja az 1, 4, 8, 24 és 32 bites változatokat, a
  32 biteset a saját alfacsatornájával, a többit a téma színkulcsával. A
  `part()`, `margins()` és `css_slice()` a témaleíróból adja vissza egy alkatrész
  nyújtási margóit — a `css_slice()` már abban a sorrendben, ahogy a
  `border-image-slice` kéri.
- **`extract.py`** — családonként egy függvény, amelyik kivágja a darabokat és
  megírja a hozzájuk tartozó `sources.json` bejegyzést.

Egyetlen pixelt sem rajzolunk újra és nem méretezünk át. A kibontás csak vág, és a
téma színkulcsát alakítja átlátszósággá. Ahol a CSS olyan darabot kér, amit a Luna
egyben tárol — egy csúszkaállapot, egy keret egyik éle —, azt kivágjuk, de nem
nyújtjuk: a nyújtást a böngésző végzi, a témaleíró saját `SizingMargins` értékei
szerint.

Nem minden kibontott fájlt használ stíluslap. Amit kipróbáltunk és félretettünk, az
is itt marad, hogy ne kelljen újra kibontani; hogy melyik melyik, azt az
`assets/sources.json` `note` mezője mondja meg.

Az eredeti grafikák a Microsoft tulajdonát képezik.
