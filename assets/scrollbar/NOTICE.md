# Windows XP Luna scrollbars

Original Microsoft graphics extracted from the Windows XP `luna.msstyles` file:
https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles

The `BLUE`, `HOMESTEAD` and `METALLIC` resources supply the blue, olive and silver
themes. Every pixel comes from the original bitmaps; nothing is redrawn or scaled.

Luna paints a scrollbar thumb as three separate pieces, and the files here keep that
split so CSS can reproduce it:

- `thumb-*.png` — the whole thumb, used as a `border-image` so the two 5px caps the
  theme ini names in `SizingMargins` keep their pixels.
- `mid-*.png` — only the middle, the part Luna stretches, laid out one state per
  column (vertical) or row (horizontal).
- `gripper-*.png` — the gripper, which Luna draws at true size and never stretches.

`sprite.png` holds the arrow buttons with their glyphs composited into the content
box `ContentMargins` defines: columns are normal, hot, pressed and disabled, rows are
up, down, left and right. `track-*.png` is a single row or column of the shaft, which
is uniform along its own axis, so tiling it reproduces the original exactly.

The resource names, source SHA-256 and output sizes are recorded in
`../sources.json`. Original graphics: Copyright Microsoft Corporation.
