# v6 acceptance record

## Implemented and checked automatically

58 tests passed, including the real React/Motion adapter. Source syntax and production build passed. CSS sources parsed and compiled Rare UI positioning utilities were checked.

- Synchronous folder phase-two state + file-input activation; cancel and focus-return recovery; same-file replacement.
- Drag depth handling, no file picker on drop, file count/type/size/duration validation, stale preview protection and object URL cleanup.
- Upload/status React islands unmount before DOM replacement, with a native fallback if their chunk fails.
- First/returning-tab startup timing, readiness gate, skip/Escape, reduced/manual pause, blocked storage, four-second timeout, initial deep-link routing and late component hydration.
- One quiz tile exits per answer through Anime.js layout update; feedback remains visible and next is bounded even if the callback is interrupted.
- Existing dialog close/reopen/rapid navigation/pause and text visibility regressions remain covered.
- Voxel geometry separation, glyph coverage, Three.js shader integration and SVG fallback remain covered.
- Production build and source syntax checks.

## Browser checks still required

The available browser tool fails at startup with `the gaas-browser node_repl sandbox cannot be disabled`. No real browser screenshots or visual pass are claimed. Publication is explicitly authorized despite this limitation.

- [ ] Desktop 1440 / 1280 and mobile 390 / 320: hero, shield, entry cards and upload folder have no overlap or clipping.
- [ ] Hover/focus first folder stage; mouse/touch click opens the native picker once while phase two runs; cancellation returns correctly.
- [ ] Native drag from the OS, invalid drop, replace/remove, image grid preview and audio/video controls.
- [ ] All six answers remove a queue tile cleanly, including the last tile, pause and early close.
- [ ] First visit/refresh/skip/deep link, background focus isolation and slow/failed lazy chunks.
- [ ] WebGL shield, separated voxel transformation, pointer field, dark/light GPU rendering and frame rate on a mobile device.
- [ ] No white page flash on local material-type switches; no disappearing text during native dialog return.

## Publication contract

GitHub branch and the existing owner-private GPT Site receive the same source commit and its tracked `dist/`. Previous tags are preserved. Original QINAN code remains MIT; adapted Rare UI components retain their upstream license and visible attribution.
