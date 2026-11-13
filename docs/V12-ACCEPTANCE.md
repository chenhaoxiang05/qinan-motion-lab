# v12 acceptance record

## Background and scene

The old background occupied a small area around the seal. Its opaque WebGL canvas covered the CSS fallback, hover stopped the automatic route clock, and the mobile title exclusion could remove the bright marker. v12 replaces that pass with an independently rendered viewport environment: two large green light fields, five continuous diagonal streams, FUI registration marks and a Rare UI point field. The retained Three.js canvas is transparent and draws only the seal.

The background owns its entrance, pointer, feature-cover, manual-pause, reduced-motion and hidden-tab states. Hover changes emphasis without stopping the base animation. An already paused visit still has a coloured composition and a labelled motion control. Pointer motion stays bounded and does not control the autonomous loops. Matrix updates are deduplicated, and React ownership is released before replacing its host.

The seal preserves its studio lighting, intact artwork, drag and hover tilt. First-frame rendering errors, shader compilation callbacks, later rendering errors and context loss remove the failing canvas and show the existing local SVG artwork. Those paths do not control or hide the independent background.

## Rare UI additions

Matrix Orb and Gooey Nav are adapted from the same pinned upstream commit as the existing five components. Their original sources and checksums are retained under `third-party/rare-ui/`; the existing license and visible attribution remain in effect. No dependency was added.

Matrix Orb is decorative and carries no simulated detection labels. It stops frame scheduling while paused/hidden, caps DPR at 2 and reduces the mobile dot count and drawing rate. Canvas failure leaves a local CSS pattern. Gooey Nav uses controlled native buttons for audio, video, image and chat material types; it retains tab semantics, keyboard navigation, disabled state, stable labels and focus. It has no Next.js dependency. Type changes update the existing upload panel without another module entrance or a route transition; native file activation remains in the original trusted click.

## Validation

159 automated tests passed, with no failures or skips. JavaScript syntax checks, parsing of all 15 source CSS files, whitespace checks and the production build passed. The main entry is 162.75 kB (60.73 kB gzip), the optional Rare UI bundle is 409.90 kB (132.49 kB gzip), and the seal scene is 20.57 kB (9.45 kB gzip). Three.js remains a separate 523.47 kB chunk (133.77 kB gzip), producing Vite's existing advisory size warning.

Scene tests use real Three.js geometry/materials and Anime.js with the GPU renderer/environment bake replaced. They verify transparent clearing, a seal-only onscreen pass, preserved interactions, failure recovery and idempotent cleanup. The obsolete isolated-background shader tests and helper were removed: pixel changes in a standalone shader could not establish visibility behind the actual page.

The independent actual-main integration uses real Anime.js and React. It verifies the complete startup and the failed scene-import paths, independent background states, portal hover, pause/recovery, module entry/return, controlled material selection and file-picker activation. These DOM/runtime checks do not establish browser layout, visual contrast or frame rate. Source review also corrected mobile parallax overscan to 42px and added a narrow-container material-tab layout so the four-character label fits without its icon.

Desktop and mobile static source-parameter composites were inspected with approximate opaque card/seal rectangles. The lower desktop light was raised so its colour remains exposed outside those rectangles. These illustrations check intended colour placement only; they are not browser screenshots or substitutes for the full-page recordings below.

## Browser limits and publication

The browser tool was retried and failed at initialization with `the gaas-browser node_repl sandbox cannot be disabled`. The following visual checks remain open:

- [ ] Full-page 8–10 second recordings at desktop and mobile widths, including a stationary pointer over a portal.
- [ ] Visible motion in unobstructed areas after title/card/seal composition; readable text over the new lights.
- [ ] Layout and overflow at 320×640, 390×844, 1280×720 and 1440×900.
- [ ] GPU/device frame rate, touch/drag, native file selection and browser-specific rendering.

Publication remains authorized despite this environment limitation. Publish the exact committed source and build to GitHub `v12-ambient` and the existing owner-private GPT Site. Preserve all earlier versions and provide the v12 source ZIP and complete Git bundle. The API contract is unchanged; the static Site still has no connected detection backend.
