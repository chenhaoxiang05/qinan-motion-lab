# Rare UI components in QINAN

Folder, Grid Reveal and Inline AI Status are adapted from [Rare UI](https://rareui.com), Copyright © 2026 Swami Malode. They retain the upstream **MIT + Commons Clause + Attribution** license in [LICENSE](./LICENSE); the application's MIT license does not replace it.

The source is pinned to [`21554cba3ac751c1f9c06869eadb9d44a0af7225`](https://github.com/swamimalode07/rare-ui/tree/21554cba3ac751c1f9c06869eadb9d44a0af7225). Each registry source was checked byte-for-byte against that commit. [SOURCES.json](./SOURCES.json) records original paths, registry URLs and SHA-256 checksums.

Adaptations in `src/rare-ui/`:

- Folder accepts controlled `open` and `hovered` states and uses QINAN's acid-green dark palette. The original folder paths, layered cards and spring animations are retained.
- Client-only Next.js directives were removed because this application builds with Vite.
- All three components respect QINAN's manual motion pause and the system reduced-motion preference.
- Tailwind utility classes have a `rare:` prefix. Only theme and utility CSS are loaded, without global preflight.
- Grid Reveal derives its dark theme from its island, has a canvas-unavailable fallback callback and cancels stale decoding/drawing work on unmount.
- The adapter provides semantic upload controls, same-event file-picker activation, native media previews and lifecycle cleanup. It displays actual application stages rather than inventing status progress.

These source files ship as part of this application, not as a standalone component distribution. The public application footer and root README credit Rare UI.
