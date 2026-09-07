# Windows XP Luna common controls

Original Microsoft graphics extracted from the Windows XP `luna.msstyles` file:
https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles

The `BLUE`, `HOMESTEAD` and `METALLIC` resources supply the blue, olive and silver
themes. Every pixel comes from the original bitmaps; nothing is redrawn or scaled.

Parts the theme ini marks `TrueSize` keep all their states in one sheet, because
CSS can pick a state with an offset. Parts it stretches get one file per state,
because a `border-image` reads a whole file and cannot address a sheet. Every
nine-slice uses the `SizingMargins` its own ini entry records.

Two parts key their transparency out of red rather than the magenta the rest of
the theme uses: the list view header and the size box. The combo, spin and header
files have their own glyph composited into the content box the ini defines, which
is where UxTheme draws it.

Not every file here is in use. The states the page never reaches, and the parts we
tried and set aside -- the Explorer task pane group heads, the rebar band behind a
toolbar, the group box and the field outline -- stay in the folder so they do not
have to be pulled out of the theme again. `sources.json` says which is which.

The resource names, source SHA-256 and output sizes are recorded in
`../sources.json`. Original graphics: Copyright Microsoft Corporation.
