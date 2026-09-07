"""Read bitmaps and part definitions straight out of a Windows XP luna.msstyles.

An .msstyles file is a resource-only PE library. The bitmaps sit in its RT_BITMAP
table as bare BITMAPINFOHEADERs, and the part definitions -- which margins to
stretch a bitmap along, how many states it holds, what colour its text is -- sit in
RT_TEXTFILE entries that are ordinary INI files in UTF-16.

Nothing here resamples or repaints a bitmap. Extraction only cuts the original
pixels apart and turns the theme's colour key into transparency.
"""
import os
import re
import struct

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.environ.get('LUNA_MSSTYLES') or os.path.join(HERE, 'luna.msstyles')
URL = 'https://raw.githubusercontent.com/robberphex/docker-wine-coolq/master/luna.msstyles'
SHA256 = 'c1d68af043a8431650dee22d4064b4e523309f00fb1c1cfa174ebd86e2125019'

# Luna ships one palette per theme; the page calls them blue, silver and olive.
THEMES = {'blue': 'BLUE', 'silver': 'METALLIC', 'olive': 'HOMESTEAD'}
INIS = {'blue': 'NORMALBLUE_INI', 'silver': 'NORMALMETALLIC_INI', 'olive': 'NORMALHOMESTEAD_INI'}

MAGENTA = (255, 0, 255)
RED = (255, 0, 0)          # a few parts key out of red instead

if not os.path.exists(STYLE):
    raise SystemExit(
        'luna.msstyles not found at %s\n'
        'Download it next to this script, or point LUNA_MSSTYLES at it:\n'
        '  %s\n'
        'Expected SHA-256: %s' % (STYLE, URL, SHA256))

DATA = open(STYLE, 'rb').read()


def _sections():
    d = DATA
    pe = struct.unpack_from('<I', d, 0x3c)[0]
    if d[pe:pe + 4] != b'PE\0\0':
        raise ValueError('not a PE file')
    nsec = struct.unpack_from('<H', d, pe + 6)[0]
    optsz = struct.unpack_from('<H', d, pe + 20)[0]
    magic = struct.unpack_from('<H', d, pe + 24)[0]
    ddoff = pe + 24 + (96 if magic == 0x10b else 112)
    rsrc_rva = struct.unpack_from('<I', d, ddoff + 16)[0]   # data directory 2
    out = []
    base = pe + 24 + optsz
    for i in range(nsec):
        b = base + 40 * i
        vs, va, rs, pr = struct.unpack_from('<IIII', d, b + 8)
        out.append((va, max(vs, rs), pr))
    return out, rsrc_rva


_SECTIONS, _RSRC_RVA = _sections()


def _rva_to_offset(rva):
    for va, size, raw in _SECTIONS:
        if va <= rva < va + size:
            return raw + (rva - va)
    raise KeyError(rva)


_BASE = _rva_to_offset(_RSRC_RVA)


def _walk():
    """The resource tree, flattened to {(type, name): (offset, size)}."""
    found = {}

    def name_at(off):
        n = struct.unpack_from('<H', DATA, _BASE + off)[0]
        return DATA[_BASE + off + 2:_BASE + off + 2 + n * 2].decode('utf-16le')

    def rec(off, path):
        named, ids = struct.unpack_from('<HH', DATA, _BASE + off + 12)
        for i in range(named + ids):
            entry = _BASE + off + 16 + 8 * i
            nid, sub = struct.unpack_from('<II', DATA, entry)
            label = name_at(nid & 0x7fffffff) if nid & 0x80000000 else str(nid)
            if sub & 0x80000000:
                rec(sub & 0x7fffffff, path + [label])
            else:
                rva, size = struct.unpack_from('<II', DATA, _BASE + sub)
                # first language wins; Luna only ships one
                found.setdefault((path[0], path[1]), (_rva_to_offset(rva), size))

    rec(0, [])
    return found


_RESOURCES = _walk()


def raw(kind, name):
    off, size = _RESOURCES[(kind, name)]
    return DATA[off:off + size]


def bitmap(name, theme=None, key=MAGENTA):
    """One RT_BITMAP resource as RGBA.

    A 32bpp resource carries a real alpha channel and is taken as is. Everything
    else is opaque, and the theme's colour key becomes transparency. A 32bpp
    resource whose alpha is empty is treated as keyed too, which is how a few of
    Luna's own bitmaps are stored.
    """
    if theme:
        name = '%s_%s' % (THEMES[theme], name)
    blob = raw('2', name)
    header, w, h, _planes, bpp = struct.unpack_from('<IiiHH', blob, 0)
    used = struct.unpack_from('<I', blob, 32)[0]
    bottom_up = h > 0
    h = abs(h)
    colours = used or (1 << bpp if bpp <= 8 else 0)
    palette = blob[header:header + 4 * colours]
    pixels = blob[header + 4 * colours:]
    stride = ((w * bpp + 31) // 32) * 4

    img = Image.new('RGBA', (w, h))
    put = img.load()
    for y in range(h):
        row = pixels[y * stride:(y + 1) * stride]
        ty = h - 1 - y if bottom_up else y
        for x in range(w):
            if bpp == 32:
                b, g, r, a = row[4 * x:4 * x + 4]
            elif bpp == 24:
                b, g, r = row[3 * x:3 * x + 3]
                a = 255
            else:
                if bpp == 8:
                    idx = row[x]
                elif bpp == 4:
                    idx = (row[x // 2] >> (0 if x & 1 else 4)) & 0xf
                elif bpp == 1:
                    idx = (row[x // 8] >> (7 - (x & 7))) & 1
                else:
                    raise ValueError('unsupported depth %d in %s' % (bpp, name))
                b, g, r = palette[4 * idx:4 * idx + 3]
                a = 255
            put[x, ty] = (r, g, b, a)

    if bpp == 32 and not img.getchannel('A').getbbox():
        img.putalpha(255)
        bpp = 24
    if bpp != 32 and key:
        for y in range(h):
            for x in range(w):
                if put[x, y][:3] == key:
                    put[x, y] = (0, 0, 0, 0)
    return img


def states(name, theme, count, vertical=True, key=MAGENTA):
    """Split a state strip into its equal parts, in the order the ini lists them."""
    img = bitmap(name, theme, key=key)
    w, h = img.size
    if vertical:
        step = h // count
        return [img.crop((0, i * step, w, (i + 1) * step)) for i in range(count)]
    step = w // count
    return [img.crop((i * step, 0, (i + 1) * step, h)) for i in range(count)]


_INI_CACHE = {}


def ini(theme):
    """The theme's own INI, as {section: {key: value}} with lower-case keys."""
    if theme not in _INI_CACHE:
        off, size = _RESOURCES[('TEXTFILE', INIS[theme])]
        text = DATA[off:off + size].decode('utf-16le', 'replace')
        out, current = {}, None
        for line in text.splitlines():
            line = line.split(';')[0].strip()
            if not line:
                continue
            if line.startswith('['):
                current = line.strip('[]')
                out[current] = {}
            elif '=' in line and current is not None:
                k, v = line.split('=', 1)
                out[current][k.strip().lower()] = v.strip()
        _INI_CACHE[theme] = out
    return _INI_CACHE[theme]


def part(theme, section):
    """One ini section, matched case-insensitively the way UxTheme does."""
    table = ini(theme)
    if section in table:
        return table[section]
    lowered = section.lower()
    for key, value in table.items():
        if key.lower() == lowered:
            return value
    return {}


def margins(theme, section, which='sizingmargins'):
    """SizingMargins or ContentMargins as (left, right, top, bottom)."""
    value = part(theme, section).get(which)
    return tuple(int(n) for n in re.split(r'[,\s]+', value.strip())) if value else None


def css_slice(theme, section, which='sizingmargins'):
    """The same margins in the top/right/bottom/left order border-image wants."""
    m = margins(theme, section, which)
    return None if m is None else (m[2], m[1], m[3], m[0])


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    return img.size


def sheet(rows, path):
    """A grid of equally sized tiles written as one PNG."""
    cell_w = max(im.width for row in rows for im in row)
    cell_h = max(im.height for row in rows for im in row)
    cols = max(len(row) for row in rows)
    out = Image.new('RGBA', (cols * cell_w, len(rows) * cell_h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, im in enumerate(row):
            out.paste(im, (x * cell_w, y * cell_h))
    return save(out, path)
