# v9 acceptance record

## Automated validation

112 tests passed, with no failures or skips. JavaScript syntax checks, parsing of all nine source CSS files, whitespace checks and the production build passed. The suite covers the real Anime.js engine as well as controlled DOM and network responses. Vite reports an advisory size warning for the separately loaded 523.50 kB Three.js chunk (133.78 kB gzip).

- Boot: fixed readable Chinese poster, local signal-block intermediate frames, transparent-window reveal, separate `revealing`/`finished` promises, first/return timing, real readiness, slow loading, four-second deadline, skip, reduced motion, focus and inert restoration.
- Home: finite entrance, actual Anime intermediate frames, scene progress, temporary text-mask cleanup, interruption, resize/navigation and no replay when returning from a module.
- Mechanical seal: six double-sided panels and four corner pieces; continuous front UVs, correctly oriented complete back glyphs, 2,001 progress samples without panel collisions, reverse path, repeated-call promise identity, pause/hidden/focus settling and two-state SVG fallback.
- Background: actual authored shader compiled and linked under native EGL/GLES with llvmpipe. This checks shader validity, not browser rendering or device performance.
- API: one submission path, timeout/abort/error handling, response validation, source-bound task recovery without a second POST, preserved files after failure, real history/report states and legacy sample separation.
- Existing behavior: trusted-click file picker, drag/upload validation, React island cleanup, contacts, practice feedback, ticket exit, persistent Next control, modal dismissal and readable return transitions.

An independent temporary integration harness exercised the actual main entry with real Anime and React in JSDOM: boot/home overlap, opening a portal during entrance, closing with restored text, paused practice and destruction. A second controlled delayed-scene harness verified skip → pause → portal open → scene resolution preserves all desired states. These are DOM checks, not browser screenshots.

## Visual evidence and limits

The boot poster and both SVG seal states were rasterized and inspected. The standalone background shader frame was inspected. These are asset-level checks; they do not establish the full page's layout or GPU appearance.

The browser tool failed to initialize with `the gaas-browser node_repl sandbox cannot be disabled`. Real browser validation remains incomplete. Publication is authorized despite this environment limitation.

- [ ] Desktop and mobile composition, title wrapping, panel overlap and readable report layouts.
- [ ] Actual WebGL seal lighting, front/back artwork, perceived mechanical motion and frame rate.
- [ ] Native file selection, touch/drag behavior and real screen-reader behavior.
- [ ] First/return boot reveal and homepage text effects in Chrome and Safari, including clip-path support.
- [ ] End-to-end requests against the user's actual model backend. The current static Site has no connected API.

## Source and publication

Build the production bundle and publish its exact committed source to GitHub `v9-signal` and the existing GPT Site. Preserve the site's owner-private access, old branches/tags and all Rare UI/font licensing. Archive older acceptance records as historical evidence, not current behavior. Marathon references inform original graphics; no game assets are bundled.
