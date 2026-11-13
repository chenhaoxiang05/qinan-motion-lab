# Rare UI components in QINAN

Folder, Grid Reveal, Inline AI Status, FAQ and Animated Counter are adapted from [Rare UI](https://rareui.com), Copyright © 2026 Swami Malode. They retain the upstream **MIT + Commons Clause + Attribution** license in [LICENSE](./LICENSE); the application's MIT license does not replace it.

The source is pinned to [`21554cba3ac751c1f9c06869eadb9d44a0af7225`](https://github.com/swamimalode07/rare-ui/tree/21554cba3ac751c1f9c06869eadb9d44a0af7225). Each registry source was checked byte-for-byte against that commit. [SOURCES.json](./SOURCES.json) records original paths, registry URLs and SHA-256 checksums.

Adaptations in `src/rare-ui/`:

- Folder accepts controlled `open` and `hovered` states and uses QINAN's acid-green dark palette. The original folder paths, layered cards and spring animations are retained.
- Client-only Next.js directives were removed because this application builds with Vite.
- All five components respect QINAN's manual motion pause and the system reduced-motion preference.
- Tailwind utility classes have a `rare:` prefix. Only theme and utility CSS are loaded, without global preflight.
- Grid Reveal derives its dark theme from its island, has a canvas-unavailable fallback callback and cancels stale decoding/drawing work on unmount.
- The adapter provides semantic upload controls, same-event file-picker activation, native media previews and lifecycle cleanup. It displays actual application stages rather than inventing status progress.
- FAQ retains its controlled/uncontrolled expansion, linked answer regions and arrow/Home/End keyboard navigation. QINAN supplies plain-text question and answer data, removes the decorative avatar, and styles its message bubbles as compact review panels. Paused answers start fully visible.
- Animated Counter retains the upstream digit-wheel motion for score updates. When motion is paused it renders the final number immediately. The adapter hides decorative digits from assistive technology and supplies one separate, current score string.

The v11 module-entry sequence also mounts Inline AI Status, and the interactive usage guide reuses Animated Counter and FAQ. These instances follow the same pause and unmount lifecycle as the original upload and practice islands. Tutorial content is local, visibly labeled example material and never submitted as a real detection task.

These source files ship as part of this application, not as a standalone component distribution. The public application footer and root README credit Rare UI.
