"""Print the colour ramp a Luna surface really has, as a CSS gradient.

    python tools/luna/gradients.py

Some of the page is painted with CSS gradients rather than the theme's bitmaps,
because a bitmap cannot follow a rounded corner or a border the way the layout
needs. This reads the colours out of the bitmap anyway, so those gradients carry
the theme's own values instead of guesses.

UxTheme does not simply stretch a bitmap: the bands inside SizingMargins keep
their pixels and only what lies between them is stretched. `ramp` reproduces that
for the height the page actually gives the element, and `stops` then reduces the
result to the fewest CSS stops that stay within a couple of levels of it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import luna

hexed = lambda c: '#%02x%02x%02x' % c[:3]


def ramp(img, x, height, top, bottom):
    """The rows an element of `height` px really shows, down column `x`."""
    src = [img.getpixel((x, y)) for y in range(img.height)]
    middle = src[top:len(src) - bottom] if len(src) > top + bottom else []
    span = height - top - bottom
    out = []
    for y in range(height):
        if y < top:
            out.append(src[y])
        elif y >= height - bottom:
            out.append(src[len(src) - (height - y)])
        elif middle:
            pos = (y - top) / max(span - 1, 1)
            out.append(middle[min(int(round(pos * (len(middle) - 1))), len(middle) - 1)])
        else:
            out.append(src[min(y, len(src) - 1)])
    return out


def positions(n):
    """Where each row sits in the box: a row is a band, so use its centre.

    The first and last rows reach the edges, the way the top and bottom rows of
    a bitmap fill their own band rather than starting half a row in.
    """
    out = [100.0 * (i + 0.5) / n for i in range(n)]
    out[0], out[-1] = 0.0, 100.0
    return out


def _at(chosen, colours, pos, p):
    for a, b in zip(chosen, chosen[1:]):
        if pos[a] <= p <= pos[b]:
            f = 0 if pos[b] == pos[a] else (p - pos[a]) / (pos[b] - pos[a])
            return [colours[a][c] + (colours[b][c] - colours[a][c]) * f for c in range(3)]
    return list(colours[chosen[-1]])


def stops(colours, tolerance=2, budget=16):
    """Greedily place stops until the gradient the browser draws is close enough.

    The error is measured where the browser actually samples -- at each row's own
    position -- not in index space, or a sharp band ends up smeared over the rows
    around it.
    """
    n = len(colours)
    pos = positions(n)
    chosen = [0, n - 1]

    def worst():
        bad, err = None, 0
        for i in range(n):
            got = _at(chosen, colours, pos, pos[i])
            d = max(abs(got[c] - colours[i][c]) for c in range(3))
            if d > err:
                bad, err = i, d
        return bad, err

    while len(chosen) < budget:
        i, err = worst()
        if err <= tolerance or i is None or i in chosen:
            break
        chosen = sorted(chosen + [i])
    return chosen, worst()[1]


def gradient(colours, tolerance=2, budget=16):
    rgb = [c[:3] for c in colours]
    chosen, err = stops(rgb, tolerance, budget)
    pos = positions(len(rgb))
    return ('linear-gradient(%s)' % ','.join(
        '%s %s%%' % (hexed(colours[i]), ('%.1f' % pos[i]).rstrip('0').rstrip('.'))
        for i in chosen), err)


def trimmed(rows):
    """Drop the transparent padding Luna builds into a task band button cell."""
    a = next(i for i, c in enumerate(rows) if c[3] == 255)
    b = len(rows) - 1 - next(i for i, c in enumerate(reversed(rows)) if c[3] == 255)
    return rows[a:b + 1]


mean = lambda cs: tuple(sum(c[i] for c in cs) // len(cs) for i in range(3))


def main():
    for theme in luna.THEMES:
        print('\n===== %s =====' % theme)

        # The taskbar is a 4px sizing bar over a background whose 15 + 11 fixed
        # bands exactly fill the remaining 26px, so its stretch band never shows.
        bar = luna.bitmap('TASKBARSIZINGBARBOTTOM_BMP', theme)
        bg = luna.bitmap('TASKBARBACKGROUND_BMP', theme)
        rows = [bar.getpixel((7, y)) for y in range(4)] + ramp(bg, 25, 26, 15, 11)
        print('#taskbar        %s' % gradient(rows)[0])

        tray = luna.bitmap('TASKBARTRAY_BMP', theme, key=luna.RED)
        rows = ramp(tray, 70, 30, 12, 12)
        edge = next(tray.getpixel((x, 14)) for x in range(tray.width)
                    if tray.getpixel((x, 14))[3] == 255)
        print('.tray           %s' % gradient(rows)[0])
        print('  border-left:  %s' % hexed(edge))

        band = luna.states('TASKBANDBUTTON_BMP', theme, 6)
        for label, i in (('.task-button   ', 0), ('  .active      ', 4)):
            rows = trimmed(ramp(band[i], 19, 24, 15, 8))
            print('%s %s' % (label, gradient(rows[1:-1])[0]))
            print('  border:       %s, alul %s' % (hexed(rows[0]), hexed(rows[-1])))

        cap = luna.states('FRAMECAPTION_BMP', theme, 2)
        for label, i in (('.title-bar     ', 0), ('  .inactive    ', 1)):
            print('%s %s' % (label, gradient(ramp(cap[i], 29, 29, 9, 17))[0]))

        frame = luna.states('FRAMELEFT_BMP', theme, 2)
        for label, i in (('.window        ', 0), ('  .inactive    ', 1)):
            cols = [frame[i].getpixel((x, 15)) for x in range(frame[i].width)]
            print('%s border-color: %s' % (label, hexed(mean(cols[1:]))))

        print('.start-header   %s' % gradient(
            ramp(luna.bitmap('STARTUSERPANEL_BMP', theme), 59, 66, 62, 0))[0])
        print('.start-footer   %s' % gradient(
            ramp(luna.bitmap('STARTPANELLOGOFFBACKGROUND_BMP', theme), 49, 44, 0, 38))[0])

        places = luna.bitmap('STARTPANELPLACESBACKGROUND_BMP', theme)
        print('.start-right    background: %s | #start-menu border: %s | csik: %s'
              % (hexed(places.getpixel((90, 4))),
                 hexed(places.getpixel((places.width - 1, 4))),
                 hexed(places.getpixel((1, 1)))))


if __name__ == '__main__':
    main()
