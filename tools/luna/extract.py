"""Cut the Luna artwork this project uses out of luna.msstyles.

    python tools/luna/extract.py                 # rewrite assets/ and sources.json
    python tools/luna/extract.py --out /tmp/x    # write somewhere else, touch nothing
    python tools/luna/extract.py scrollbar frame # only those families

Every file is written at the size the theme stores it. Where CSS needs a piece Luna
keeps whole -- a single thumb state, one edge of a frame -- the piece is cut out,
never resampled. The comments name the `SizingMargins` each part is meant to be
stretched along, in the theme's own left, right, top, bottom order; `luna.css_slice`
turns that into the order `border-image-slice` wants.

Not every file here is painted by a stylesheet. The ones that are not were tried and
set aside, and they are kept so they do not have to be pulled out of the theme
again. `assets/sources.json` records which is which.
"""
import argparse
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image

import luna

THEMES = ('blue', 'silver', 'olive')
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


# --------------------------------------------------------------------------- #
# Scrollbars
# --------------------------------------------------------------------------- #

def build_scrollbar(theme, out):
    """Luna paints a thumb in three pieces, and CSS is given the same three.

    The two 5px caps keep their pixels through a border-image, the middle is a
    background sized to the padding box so it stretches exactly as the theme's
    SizingMargins ask, and the gripper rides centred on top at true size.
    """
    d = lambda n: os.path.join(out, theme, n)
    files = []
    arrows = luna.states('SCROLLARROWS_BMP', theme, 16)
    glyphs = luna.states('SCROLLARROWGLYPHS_BMP', theme, 16)
    shaft = {'v': luna.states('SCROLLSHAFTVERTICAL_BMP', theme, 4),
             'h': luna.states('SCROLLSHAFTHORIZONTAL_BMP', theme, 4)}
    thumb = {'v': luna.states('SCROLLTHUMBVERTICAL_BMP', theme, 4),
             'h': luna.states('SCROLLTHUMBHORIZONTAL_BMP', theme, 4)}
    grip = {'v': luna.states('SCROLLTHUMBGRIPPERVERTICAL_BMP', theme, 4),
            'h': luna.states('SCROLLTHUMBGRIPPERHORIZONTAL_BMP', theme, 4)}

    # ScrollBar.ArrowBtn: ContentMargins 0, 0, 3, 3 puts the glyph in an 11px band.
    def button(i):
        cell = arrows[i].copy()
        g = glyphs[i]
        cell.alpha_composite(g, ((17 - g.width) // 2, 3 + (11 - g.height) // 2))
        return cell

    luna.sheet([[button(direction * 4 + s) for s in range(4)] for direction in range(4)],
               d('sprite.png'))
    files.append(('sprite.png', ['SCROLLARROWS_BMP', 'SCROLLARROWGLYPHS_BMP'],
                  'Original Luna arrow buttons with their glyphs composited into the content box the '
                  'theme ini defines. Columns: normal, hot, pressed, disabled. Rows: up, down, left, '
                  'right. Native 17 x 17 per cell.'))

    # The shafts are uniform along their own axis, so one row or column tiles exactly.
    luna.save(shaft['v'][0].crop((0, 0, 17, 1)), d('track-v.png'))
    luna.save(shaft['h'][0].crop((0, 0, 1, 17)), d('track-h.png'))
    files.append(('track-v.png', ['SCROLLSHAFTVERTICAL_BMP'],
                  'One row of the original vertical shaft. The shaft is uniform along its axis, so '
                  'tiling this row reproduces it exactly.'))
    files.append(('track-h.png', ['SCROLLSHAFTHORIZONTAL_BMP'],
                  'One column of the original horizontal shaft. The shaft is uniform along its axis, '
                  'so tiling this column reproduces it exactly.'))

    for orient, word in (('v', 'vertical'), ('h', 'horizontal')):
        vert = orient == 'v'
        whole = []
        for s, state in enumerate(('normal', 'hot', 'pressed')):
            t = thumb[orient][s]
            w, h = (17, t.height) if vert else (t.width, 17)
            bg = shaft[orient][0]
            cell = Image.new('RGBA', (w, h))
            for y in range(h):
                for x in range(w):
                    cell.putpixel((x, y), bg.getpixel((x % bg.width, y % bg.height)))
            cell.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2))
            whole.append(cell)
            luna.save(cell, d('thumb-%s-%s.png' % (orient, state)))
            files.append(('thumb-%s-%s.png' % (orient, state),
                          ['SCROLLTHUMB%s_BMP' % word.upper(), 'SCROLLSHAFT%s_BMP' % word.upper()],
                          'Original %s thumb in the %s state, centred on its own shaft at native size. '
                          'Used as a border-image so the 5px Luna caps keep their pixels.' % (word, state)))

        mids = [c.crop((0, 5, c.width, c.height - 5)) if vert else c.crop((5, 0, c.width - 5, c.height))
                for c in whole]
        luna.sheet([mids] if vert else [[m] for m in mids], d('mid-%s.png' % orient))
        files.append(('mid-%s.png' % orient,
                      ['SCROLLTHUMB%s_BMP' % word.upper(), 'SCROLLSHAFT%s_BMP' % word.upper()],
                      'The stretching middle of the %s thumb, the part the theme ini leaves outside its '
                      '5px sizing margins, on its own shaft. States in order: normal, hot, pressed.' % word))

        cells = []
        for s in range(3):
            g = grip[orient][s]
            cell = Image.new('RGBA', (17, 17), (0, 0, 0, 0))
            cell.paste(g, ((17 - g.width) // 2, (17 - g.height) // 2))
            cells.append(cell)
        luna.sheet([cells] if vert else [[c] for c in cells], d('gripper-%s.png' % orient))
        files.append(('gripper-%s.png' % orient,
                      ['SCROLLTHUMBGRIPPER%s_BMP' % word.upper()],
                      'Original %s-thumb grippers, each centred in a 17 x 17 cell so CSS can pick a '
                      'state with one offset. States in order: normal, hot, pressed.' % word))
    return files


# --------------------------------------------------------------------------- #
# Taskbar and Start button
# --------------------------------------------------------------------------- #

# TaskBandButton and TaskBandButtonNoEdge both run normal, hot, pressed,
# disabled, checked, hot checked down the strip.
BAND = {'normal': 0, 'hot': 1, 'pressed': 2, 'disabled': 3, 'active': 4, 'active-hot': 5}


def build_taskbar(theme, out):
    d = lambda n: os.path.join(out, theme, n)
    files = []
    for i, state in enumerate(('normal', 'hot', 'pressed')):
        luna.save(luna.states('STARTBUTTON_BMP', theme, 3)[i], d('start-%s.png' % state))
        files.append(('start-%s.png' % state, ['STARTBUTTON_BMP'],
                      'Original Luna Start button in the %s state, native 99 x 33, sizing margins '
                      '6, 52, 13, 14. Luna draws only the button: the flag and the word belong to '
                      'Explorer.' % state))

    luna.save(luna.bitmap('TASKBARBACKGROUND_BMP', theme), d('background.png'))
    files.append(('background.png', ['TASKBARBACKGROUND_BMP'],
                  'Original Luna taskbar background tile, native 50 x 28, meant to be tiled sideways.'))
    luna.save(luna.bitmap('TASKBARSIZINGBARBOTTOM_BMP', theme), d('sizing-bar.png'))
    files.append(('sizing-bar.png', ['TASKBARSIZINGBARBOTTOM_BMP'],
                  'Original Luna sizing bar for a taskbar docked at the bottom, native 15 x 4.'))
    luna.save(luna.bitmap('TASKBARTRAY_BMP', theme, key=luna.RED), d('tray.png'))
    files.append(('tray.png', ['TASKBARTRAY_BMP'],
                  'Original Luna notification area, native 110 x 28, sizing margins 34, 10, 12, 12. '
                  'Its colour key is red, not the theme magenta.'))

    band = luna.states('TASKBANDBUTTON_BMP', theme, 6)
    noedge = luna.states('TASKBANDBUTTONNOEDGE_BMP', theme, 6)
    for state, word in (('normal', 'normal'), ('hot', 'hot'), ('pressed', 'pressed'),
                        ('active', 'checked'), ('active-hot', 'hot checked')):
        luna.save(band[BAND[state]], d('task-%s.png' % state))
        files.append(('task-%s.png' % state, ['TASKBANDBUTTON_BMP'],
                      'Original Luna task band button in the %s state, native 26 x 28, sizing margins '
                      '17, 5, 15, 8.' % word))
    for state in ('hot', 'pressed'):
        luna.save(noedge[BAND[state]], d('quick-%s.png' % state))
        files.append(('quick-%s.png' % state, ['TASKBANDBUTTONNOEDGE_BMP'],
                      'Original Luna quick launch button in the %s state, native 13 x 28. Luna draws '
                      'nothing at rest, so only the lit states are kept.' % state))
    return files


# --------------------------------------------------------------------------- #
# Window frame
# --------------------------------------------------------------------------- #

def build_frame(theme, out):
    """Luna keeps the three frame edges in separate bitmaps.

    A CSS nine-slice reads one image, so the left and right strips and the bottom
    bar are laid into a single sheet, each at native size in the position its own
    slice reads from: left 5, right 5, bottom 5, top 0. The middle stays empty
    because the frame never paints there.
    """
    d = lambda n: os.path.join(out, theme, n)
    files = []
    for i, state in enumerate(('active', 'inactive')):
        luna.save(luna.states('FRAMECAPTION_BMP', theme, 2)[i], d('caption-%s.png' % state))
        files.append(('caption-%s.png' % state, ['FRAMECAPTION_BMP'],
                      'Original Luna window caption, %s state, native 66 x 29, sizing margins '
                      '28, 35, 9, 17.' % state))
        luna.save(luna.states('FRAMEMAXIMIZED_BMP', theme, 2)[i], d('maximized-%s.png' % state))
        files.append(('maximized-%s.png' % state, ['FRAMEMAXIMIZED_BMP'],
                      'Original Luna caption for a maximized window, %s state, native 66 x 29, same '
                      'sizing margins as the ordinary caption.' % state))

        left = luna.states('FRAMELEFT_BMP', theme, 2)[i]
        right = luna.states('FRAMERIGHT_BMP', theme, 2)[i]
        bottom = luna.states('FRAMEBOTTOM_BMP', theme, 2)[i]
        w, h = bottom.width, left.height + bottom.height
        sheet = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        sheet.paste(left, (0, 0))
        sheet.paste(right, (w - right.width, 0))
        sheet.paste(bottom, (0, left.height))
        luna.save(sheet, d('frame-%s.png' % state))
        files.append(('frame-%s.png' % state,
                      ['FRAMELEFT_BMP', 'FRAMERIGHT_BMP', 'FRAMEBOTTOM_BMP'],
                      'The three original Luna frame edges for the %s state, laid into one sheet so a '
                      'single border-image can carry them: the 5 x 31 left strip, the 5 x 31 right '
                      'strip and the 49 x 5 bottom bar, each at native size in the position its own '
                      'slice reads from.' % state))
    return files


# --------------------------------------------------------------------------- #
# Start panel
# --------------------------------------------------------------------------- #

START_PANEL = [
    ('user-pane.png', 'STARTUSERPANEL_BMP',
     'Original Luna Start panel user pane, native 120 x 63, sizing margins 59, 60, 62, 0.'),
    ('prog-list.png', 'STARTPANELMFUBACKGROUND_BMP',
     'Original Luna background for the frequently used programs column, native 156 x 4. Its top rows '
     'carry the amber rule and its left column the panel border.'),
    ('places-list.png', 'STARTPANELPLACESBACKGROUND_BMP',
     'Original Luna background for the places column, native 180 x 6, including the divider between '
     'the two columns and the amber rule.'),
    ('logoff.png', 'STARTPANELLOGOFFBACKGROUND_BMP',
     'Original Luna log off strip, native 97 x 39, sizing margins 49, 47, 0, 38.'),
    ('logoff-buttons.png', 'STARTPANELLOGOFFBUTTONS_BMP',
     'Original Luna log off strip icons at true size: undock, log off and turn off in three 24 x 24 cells.'),
    ('logoff-buttons-hot.png', 'STARTPANELLOGOFFBUTTONSHOT_BMP',
     'The lit version of the same three 24 x 24 icons.'),
    ('programs-separator.png', 'STARTPROGRAMSSEPARATOR_BMP',
     'Original Luna separator for the programs column, true size 172 x 2.'),
    ('places-separator.png', 'STARTPLACESSEPARATOR_BMP',
     'Original Luna separator for the places column, true size 134 x 2.'),
    ('more-arrow.png', 'STARTPANELMOREPROGARROW_BMP',
     'Original Luna All Programs arrow, true size 16 x 24.'),
    ('more-arrow-hot.png', 'STARTPANELMOREPROGARROWHOT_BMP',
     'The lit version of the All Programs arrow.'),
    ('user-tile.png', 'USERTILEBACKGROUND_BMP',
     'Original Luna frame for an account picture, native 55 x 55, sizing margins 6, 10, 6, 10.'),
]


def build_start(theme, out):
    files = []
    for name, resource, note in START_PANEL:
        luna.save(luna.bitmap(resource, theme), os.path.join(out, theme, name))
        files.append((name, [resource], note))
    return files


# --------------------------------------------------------------------------- #
# Common controls
# --------------------------------------------------------------------------- #

def build_controls(theme, out):
    """Every common control part, in use or not.

    Parts the ini marks TrueSize keep all their states in one sheet, because CSS
    can pick a state with an offset. Parts it stretches get one file per state,
    because a border-image reads a whole file and cannot address a sheet.
    """
    d = lambda n: os.path.join(out, theme, n)
    S = lambda res, n: luna.states(res, theme, n)
    files = []

    for i, state in enumerate(('normal', 'hot', 'pressed', 'disabled', 'default')):
        luna.save(S('BUTTON_BMP', 5)[i], d('button-%s.png' % state))
        files.append(('button-%s.png' % state, ['BUTTON_BMP'],
                      'Original Luna push button, %s state, native 20 x 23, sizing margins '
                      '8, 8, 9, 9.' % state))

    whole = [
        ('checkbox.png', 'CHECKBOX13_BMP', luna.MAGENTA,
         'Original Luna 13 x 13 check box, all twelve states in one column: unchecked, checked and '
         'mixed, each normal, hot, pressed and disabled. True size.'),
        ('radio.png', 'RADIOBUTTON13_BMP', luna.MAGENTA,
         'Original Luna 13 x 13 radio button, all eight states in one column: unchecked and checked, '
         'each normal, hot, pressed and disabled. True size.'),
        ('tree-glyph.png', 'TREEEXPANDCOLLAPSE_BMP', luna.MAGENTA,
         'Original Luna tree view glyphs, the 9 x 9 plus and minus boxes, at true size.'),
        ('progress-track.png', 'PROGRESSTRACK_BMP', luna.MAGENTA,
         'Original Luna progress bar track, native 9 x 19, sizing margins 4, 4, 3, 3.'),
        ('progress-chunk.png', 'PROGRESSCHUNK_BMP', luna.MAGENTA,
         'Original Luna progress bar chunk, native 10 x 12, meant to be tiled along the bar.'),
        ('slider-track.png', 'SLIDERTRACK_BMP', luna.MAGENTA,
         'Original Luna track bar groove, native 5 x 5, sizing margins 2, 2, 2, 2.'),
        ('tab-pane.png', 'TABPANEEDGE_BMP', luna.MAGENTA,
         'Original Luna tab pane edge, native 48 x 48, sizing margins 2, 4, 2, 4.'),
        ('status.png', 'STATUSBACKGROUND_BMP', luna.MAGENTA,
         'Original Luna status bar background, native 68 x 15, sizing margins 50, 17, 5, 9.'),
        ('status-pane.png', 'STATUSPANE_BMP', luna.RED,
         'Original Luna status bar pane divider, native 3 x 15. Its colour key is red, not the theme magenta.'),
        ('balloon-close.png', 'BALLOONCLOSE_BMP', luna.MAGENTA,
         'Original Luna balloon close button, all three 18 x 18 states in one column, at true size.'),
        ('group-background.png', 'NORMALGROUPBACKGROUND_BMP', luna.MAGENTA,
         'Original Luna Explorer bar group body, native 111 x 10, sizing margins 3, 3, 3, 3.'),
        ('group-head.png', 'NORMALGROUPHEAD_BMP', luna.MAGENTA,
         'Original Luna Explorer bar group head, native 111 x 21, sizing margins 3, 106, 3, 1.'),
        ('special-background.png', 'SPECIALGROUPBACKGROUND_BMP', luna.MAGENTA,
         'Original Luna Explorer bar body for a special group, native 111 x 10.'),
        ('special-head.png', 'SPECIALGROUPHEAD_BMP', luna.MAGENTA,
         'Original Luna Explorer bar head for a special group, native 111 x 21, the one whose caption '
         'the ini sets in white.'),
        ('rebar.png', 'TOOLBARBACKGROUND_BMP', luna.MAGENTA,
         'Original Luna rebar background, the band that holds an Explorer menu bar, toolbar and '
         'address bar together, native 320 x 13, sizing margins 0, 0, 0, 4.'),
        ('groupbox.png', 'GROUPBOX_BMP', luna.MAGENTA,
         'Original Luna group box frame, native 22 x 20, sizing margins 4, 4, 4, 4.'),
        ('field-outline.png', 'FIELDOUTLINEBLUE_BMP', luna.MAGENTA,
         'Original Luna field outline, native 14 x 7.'),
    ]
    for name, resource, key, note in whole:
        luna.save(luna.bitmap(resource, theme, key=key), d(name))
        files.append((name, [resource], note))

    # The size box keys out red, and holds a right and a left aligned state.
    grip = luna.bitmap('RESIZEGRIP2_BMP', theme, key=luna.RED)
    half = grip.width // 2
    luna.save(grip.crop((0, 0, half, grip.height)), d('resize-grip.png'))
    luna.save(grip.crop((half, 0, grip.width, grip.height)), d('resize-grip-left.png'))
    files.append(('resize-grip.png', ['RESIZEGRIP2_BMP'],
                  'Original Luna size box, the right aligned of its two 16 x 17 states, at true size. '
                  'Its colour key is red, not the theme magenta.'))
    files.append(('resize-grip-left.png', ['RESIZEGRIP2_BMP'],
                  'Original Luna size box, the left aligned of its two 16 x 17 states. Its colour key '
                  'is red, not the theme magenta.'))

    # A dropdown or spin button is a background plus its own glyph, centred on it.
    def with_glyph(bg_res, glyph_res, prefix, label):
        bgs, glyphs = S(bg_res, 4), S(glyph_res, 4)
        for i, state in enumerate(('normal', 'hot', 'pressed', 'disabled')):
            cell = bgs[i].copy()
            g = glyphs[i]
            cell.alpha_composite(g, ((cell.width - g.width) // 2, (cell.height - g.height) // 2))
            luna.save(cell, d('%s-%s.png' % (prefix, state)))
            files.append(('%s-%s.png' % (prefix, state), [bg_res, glyph_res],
                          'Original Luna %s, %s state, with its own glyph centred on the background at '
                          'native 15 x 16.' % (label, state)))
    with_glyph('COMBOBUTTON_BMP', 'COMBOBUTTONGLYPH_BMP', 'combo', 'combo box drop down button')
    with_glyph('SPINBUTTONBACKGROUNDUP_BMP', 'SPINUPGLYPH_BMP', 'spin-up', 'spin button, up')
    with_glyph('SPINBUTTONBACKGROUNDDOWN_BMP', 'SPINDOWNGLYPH_BMP', 'spin-down', 'spin button, down')

    for i, state in enumerate(('normal', 'hot', 'pressed', 'disabled', 'focused')):
        luna.save(S('TRACKBARHORIZONTAL_BMP', 5)[i], d('slider-thumb-%s.png' % state))
        files.append(('slider-thumb-%s.png' % state, ['TRACKBARHORIZONTAL_BMP'],
                      'Original Luna horizontal track bar thumb, %s state, true size 11 x 21.' % state))
        luna.save(S('TRACKBARVERTICAL_BMP', 5)[i], d('slider-thumb-v-%s.png' % state))
        files.append(('slider-thumb-v-%s.png' % state, ['TRACKBARVERTICAL_BMP'],
                      'Original Luna vertical track bar thumb, %s state, true size 21 x 11.' % state))

    for i, state in enumerate(('normal', 'hot', 'selected', 'disabled', 'focused')):
        luna.save(S('TABITEM_BMP', 5)[i], d('tab-%s.png' % state))
        files.append(('tab-%s.png' % state, ['TABITEM_BMP'],
                      'Original Luna tab item, %s state, native 18 x 18, sizing margins '
                      '6, 6, 6, 6.' % state))

    header = luna.bitmap('LISTVIEWHEADER_BMP', theme, key=luna.RED)
    step = header.height // 5
    for i, state in enumerate(('normal', 'hot', 'pressed', 'disabled', 'checked')):
        luna.save(header.crop((0, i * step, header.width, (i + 1) * step)), d('header-%s.png' % state))
        files.append(('header-%s.png' % state, ['LISTVIEWHEADER_BMP'],
                      'Original Luna list view column header, %s state, native 18 x 18, sizing margins '
                      '8, 8, 3, 4. Its colour key is red.' % state))

    for i, state in enumerate(('normal', 'hot', 'pressed', 'disabled', 'checked', 'checked-hot')):
        luna.save(S('TOOLBARBUTTONS_BMP', 6)[i], d('toolbar-%s.png' % state))
        files.append(('toolbar-%s.png' % state, ['TOOLBARBUTTONS_BMP'],
                      'Original Luna toolbar button, %s state, native 20 x 23, sizing margins '
                      '4, 4, 4, 4. Luna paints nothing at rest.' % state))
    return files


FAMILIES = {
    'scrollbar': build_scrollbar,
    'taskbar': build_taskbar,
    'frame': build_frame,
    'start': build_start,
    'controls': build_controls,
}


# --------------------------------------------------------------------------- #
# sources.json
# --------------------------------------------------------------------------- #

SPARE = (' Extracted from the theme but not currently painted by any stylesheet; '
         'kept so it does not have to be pulled out again.')
PREFIX = {'blue': 'BLUE', 'silver': 'METALLIC', 'olive': 'HOMESTEAD'}


def painted_files():
    """Everything the project's stylesheets ask for, as assets-relative paths."""
    import glob
    import re
    used = set()
    for path in glob.glob(os.path.join(ROOT, '*.css')):
        text = io.open(path, encoding='utf-8').read()
        used.update(m.group(1) for m in re.finditer(r"url\('assets/([^']+)'\)", text))
    return used


def record(entries):
    """Merge the extracted files into assets/sources.json, by file name."""
    path = os.path.join(ROOT, 'assets/sources.json')
    data = json.load(io.open(path, encoding='utf-8'))
    index = {e['file']: i for i, e in enumerate(data)}
    used = painted_files()
    for rel, theme, resources, note in entries:
        entry = {
            'file': rel,
            'url': luna.URL,
            'bytes': os.path.getsize(os.path.join(ROOT, 'assets', rel)),
            'resourceNames': ['%s_%s' % (PREFIX[theme], r) for r in resources],
            'sourceSha256': luna.SHA256,
            'note': note + ('' if rel in used else SPARE),
        }
        if rel in index:
            data[index[rel]] = entry
        else:
            data.append(entry)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    return len(data)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('families', nargs='*', metavar='FAMILY',
                    help='which families to extract: %s (default: all)' % ', '.join(sorted(FAMILIES)))
    ap.add_argument('--out', help='write here instead of assets/, and leave sources.json alone')
    args = ap.parse_args()
    families = args.families or sorted(FAMILIES)
    unknown = [f for f in families if f not in FAMILIES]
    if unknown:
        ap.error('unknown family %s; choose from %s' % (', '.join(unknown), ', '.join(sorted(FAMILIES))))

    base = args.out or os.path.join(ROOT, 'assets')
    entries = []
    for family in families:
        out = os.path.join(base, family)
        count = 0
        for theme in THEMES:
            for name, resources, note in FAMILIES[family](theme, out):
                entries.append(('%s/%s/%s' % (family, theme, name), theme, resources, note))
                count += 1
        print('%-10s %3d files -> %s' % (family, count, out))

    if args.out:
        print('\nwrote to %s; sources.json left alone' % base)
    else:
        print('\nsources.json: %d entries' % record(entries))


if __name__ == '__main__':
    main()
