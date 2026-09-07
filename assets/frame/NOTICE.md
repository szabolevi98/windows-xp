# Windows XP Luna window frame

Original Microsoft graphics extracted from the Windows XP `luna.msstyles` file:
https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles

The `BLUE`, `HOMESTEAD` and `METALLIC` resources supply the blue, olive and silver
themes. Every pixel comes from the original bitmaps; nothing is redrawn or scaled.

**No stylesheet paints with these at the moment.** They were extracted, tried, and
set aside; they stay here so the work does not have to be repeated.

- `caption-*.png` — the title bar, active and inactive, at its native 66 x 29.
- `maximized-*.png` — the caption Luna substitutes when a window is maximized.
- `frame-*.png` — the left, right and bottom edges. Luna keeps these in three
  separate bitmaps; CSS needs one image for a nine-slice, so they are laid into a
  single sheet at native size, each in the position its own slice reads from. The
  middle stays empty because the frame never paints there.

The resource names, source SHA-256 and output sizes are recorded in
`../sources.json`. Original graphics: Copyright Microsoft Corporation.
