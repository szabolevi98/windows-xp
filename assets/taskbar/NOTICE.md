# Windows XP Luna taskbar

Original Microsoft graphics extracted from the Windows XP `luna.msstyles` file:
https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles

The `BLUE`, `HOMESTEAD` and `METALLIC` resources supply the blue, olive and silver
themes. Every pixel comes from the original bitmaps; nothing is redrawn or scaled.

**No stylesheet paints with these at the moment.** They were extracted, tried, and
set aside; they stay here so the work does not have to be repeated.

- `start-*.png` — the Start button, one file per state. Luna draws only the button:
  the flag and the word "start" belong to Explorer.
- `background.png`, `sizing-bar.png` — the bar itself, meant to be tiled.
- `tray.png` — the notification area. Its transparency key is red, not the magenta
  the rest of the theme uses.
- `task-*.png` — task band buttons: normal, hot, pressed, checked and hot checked.
- `quick-*.png` — quick launch buttons. Luna paints nothing at rest, so only the
  hot and pressed states exist here.

Each file is meant for a CSS `border-image` using the `SizingMargins` its theme ini
entry records, which is the same nine-slice stretch UxTheme performs.

The resource names, source SHA-256 and output sizes are recorded in
`../sources.json`. Original graphics: Copyright Microsoft Corporation.
