# Windows XP Luna Start panel

Original Microsoft graphics extracted from the Windows XP `luna.msstyles` file:
https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles

The `BLUE`, `HOMESTEAD` and `METALLIC` resources supply the blue, olive and silver
themes. Every pixel comes from the original bitmaps; nothing is redrawn or scaled.

**No stylesheet paints with these at the moment.** They were extracted, tried, and
set aside; they stay here so the work does not have to be repeated.

Luna carries the panel in four backgrounds -- `user-pane.png`, `prog-list.png`,
`places-list.png` and `logoff.png` -- and each one already contains the panel's own
border. The amber rule under the user pane belongs to the two column backgrounds,
not to the pane above it.

`logoff-buttons*.png` holds three 24 x 24 cells: undock, log off and turn off. The
separators, the All Programs arrow and `user-tile.png` are true-size parts, so Luna
centres them rather than stretching them.

The resource names, source SHA-256 and output sizes are recorded in
`../sources.json`. Original graphics: Copyright Microsoft Corporation.
