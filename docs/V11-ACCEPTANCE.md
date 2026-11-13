# v11 acceptance record

## Implementation

- The homepage background uses a broad diagonal scan, 80px signal packets, a six-second grid feed and a larger travelling cobalt marker. The mobile shader and CSS fallback retain autonomous motion. The title exclusion area, reduced motion, manual pause, hidden-tab pause and feature-window pause remain in place.
- Four feature entrances and reports now show a module-specific presentation after the window opens: scanning frame, connection, six practice tickets or stacked records. The presentation lasts 700ms on desktop and 500ms on mobile, can be skipped, and then reveals content in a short sequence. It is not a model/network progress indicator. Upload type switches and subsequent quiz questions do not replay it.
- The usage guide provides four local teaching examples and three stages per example: material, clues, independent verification. It uses the existing Rare UI counter and FAQ; the presentation uses its status component. Examples do not call the API or create records. The final action opens the real upload view with the selected material type.
- The green emphasis under “核实” is restored as a thin split rule aligned with the typeface, with a bounded drawing/highlight entrance. Portal, button, input and record interactions use gentler movement and colour transitions.

## Validation

145 tests passed with no failures or skips. JavaScript syntax checks, parsing of all 13 source CSS files, whitespace checks and the production build passed. The main entry is 157.94 kB (58.97 kB gzip). The separately loaded Three.js chunk remains 523.50 kB (133.78 kB gzip), producing Vite's existing advisory size warning.

New regressions verify the real Anime.js window-to-presentation-to-question sequence, fixed quiz action readiness, cancellation, status-island ownership and a background task failing while the upload view is reopening. The failure stays in application state until the presentation has unmounted its React island. Compact-height CSS reduces the presentation's height and keeps overflow scrollable so its skip action stays reachable.

Native EGL/GLES tests compile and render the actual shader. Desktop and mobile frames at 0.8 and 1.6 seconds confirm visible autonomous movement while the protected title region remains unchanged. A separately rasterized headline sample checks the split underline and line spacing. These images are not full-page browser screenshots.

Independent temporary JSDOM integration uses the actual main entry with real Anime.js and React, and the supported SVG scene fallback. It covers the visible practice presentation before the first question and fixed action dock; synchronous upload picker activation; switching upload types without another presentation; close, reroute, pause, hidden-tab and reduced-motion interruptions; asynchronous history/report reveal and stale response suppression; all four tutorial types and three steps; actual Rare UI FAQ; selected-type upload handoff; and guide replacement/closure. Instrumented DOM replacement detected no still-mounted React roots. No runtime or React errors were observed; Anime.js reports its existing spring-option deprecation warning.

## Remaining browser checks

The browser tool failed again at initialization with `the gaas-browser node_repl sandbox cannot be disabled`. Publication remains authorized; no real browser visual pass is claimed.

- [ ] Full layout and text flow at 320×640, 390×844, 1280×720 and 1440×900.
- [ ] Complete entrance choreography, native dialog appearance and scene lighting.
- [ ] Mobile touch/drag, native file selection and actual screen-reader interaction.
- [ ] Frame rate and device-specific GPU/Safari/Chrome rendering.

The real API contract is unchanged. The static Site still has no connected model backend; no successful model request is claimed.

## Publication

Publish the exact committed source and production build to GitHub `v11-flow` and the existing owner-private GPT Site. Preserve v1–v10 history, API configuration, Rare UI attribution and all font licenses. Keep a v11 ZIP and the full Git bundle for work on another device.
