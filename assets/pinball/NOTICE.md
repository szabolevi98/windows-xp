# Space Cadet browser port

`vendor.js` is the unmodified, self-contained JavaScript/WebAssembly build from
[Luciano Russo's 3DPinballSpaceCadet](https://github.com/lrusso/3DPinballSpaceCadet),
commit `684f0b57d0cc93d5a29329f0b59d9996c54f1553`.
It includes the engine, table graphics and sounds; no CDN or remote game server is used.

The engine is based on [alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball)
and [k4zmu2a/SpaceCadetPinball](https://github.com/k4zmu2a/SpaceCadetPinball).
The engine's MIT license is included in `LICENSE`.
The original icon comes from alula's `SpaceCadetPinball/Icon_1.ico`,
commit `0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9`.

The original game and its graphics/audio belong to Cinematronics, Maxis and Microsoft;
the engine's license does not transfer rights to those assets.

`index.html`, `host.css` and `host.js` are the simulator's integration layer:
XP window controls, keyboard/touch input, volume, pause and local settings persistence.
The engine's English table text is retained. The port disables background music;
original sound effects remain available.
