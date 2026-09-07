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


def stops(colours, tolerance=2, budget=8):
    """Greedily place stops until interpolating between them is close enough."""
    n = len(colours)
    chosen = [0, n - 1]

    def worst():
        bad, err = None, 0
        for i in range(n):
            for a, b in zip(chosen, chosen[1:]):
                if a <= i <= b:
                    t = 0 if b == a else (i - a) / (b - a)
                    for c in range(3):
                        approx = colours[a][c] + (colours[b][c] - colours[a][c]) * t
                        d = abs(approx - colours[i][c])
                        if d > err:
                            bad, err = i, d
                    break
        return bad, err

    while len(chosen) < budget:
        i, err = worst()
        if err <= tolerance or i is None or i in chosen:
            break
        chosen = sorted(chosen + [i])
    return chosen, worst()[1]


def gradient(colours, tolerance=2, budget=8):
    chosen, err = stops([c[:3] for c in colours], tolerance, budget)
    n = len(colours) - 1
    return ('linear-gradient(%s)' % ','.join(
        '%s %d%%' % (hexed(colours[i]), round(100 * i / n)) for i in chosen), err)


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
        print('.tray           %s' % gradient(rows, budget=7)[0])
        print('  border-left:  %s' % hexed(edge))

        band = luna.states('TASKBANDBUTTON_BMP', theme, 6)
        for label, i in (('.task-button   ', 0), ('  .active      ', 4)):
            rows = trimmed(ramp(band[i], 19, 24, 15, 8))
            print('%s %s' % (label, gradient(rows[1:-1], budget=5)[0]))
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
            ramp(luna.bitmap('STARTPANELLOGOFFBACKGROUND_BMP', theme), 49, 44, 0, 38), budget=7)[0])

        places = luna.bitmap('STARTPANELPLACESBACKGROUND_BMP', theme)
        print('.start-right    background: %s | #start-menu border: %s | csik: %s'
              % (hexed(places.getpixel((90, 4))),
                 hexed(places.getpixel((places.width - 1, 4))),
                 hexed(places.getpixel((1, 1)))))


if __name__ == '__main__':
    main()
