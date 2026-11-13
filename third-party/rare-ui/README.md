# Rare UI components in QINAN

The six active components — Folder, Grid Reveal, Inline AI Status, FAQ, Animated Counter and Gooey Nav — are adapted from [Rare UI](https://rareui.com), Copyright © 2026 Swami Malode. They retain the upstream **MIT + Commons Clause + Attribution** license in [LICENSE](./LICENSE); the application's MIT license does not replace it.

The source is pinned to [`21554cba3ac751c1f9c06869eadb9d44a0af7225`](https://github.com/swamimalode07/rare-ui/tree/21554cba3ac751c1f9c06869eadb9d44a0af7225). Each registry source was checked byte-for-byte against that commit. [SOURCES.json](./SOURCES.json) records original paths, registry URLs and SHA-256 checksums. The unmodified Matrix Orb and Gooey Nav sources are also retained in [upstream/](./upstream/) for review of the v12 adaptations.

Adaptations in `src/rare-ui/`:

- Folder accepts controlled `open` and `hovered` states and uses QINAN's acid-green dark palette. The original folder paths, layered cards and spring animations are retained.
- Client-only Next.js directives were removed because this application builds with Vite.
- All six active components respect QINAN's manual motion pause and the system reduced-motion preference.
- Tailwind utility classes have a `rare:` prefix. Only theme and utility CSS are loaded, without global preflight.
- Grid Reveal derives its dark theme from its island, has a canvas-unavailable fallback callback and cancels stale decoding/drawing work on unmount.
- The adapter provides semantic upload controls, same-event file-picker activation, native media previews and lifecycle cleanup. It displays actual application stages rather than inventing status progress.
- FAQ retains its controlled/uncontrolled expansion, linked answer regions and arrow/Home/End keyboard navigation. QINAN supplies plain-text question and answer data, removes the decorative avatar, and styles its message bubbles as compact review panels. Paused answers start fully visible.
- Animated Counter retains the upstream digit-wheel motion for score updates. When motion is paused it renders the final number immediately. The adapter hides decorative digits from assistive technology and supplies one separate, current score string.
- Gooey Nav retains the upstream separating tiles, curved SVG seams and damped springs. The Next.js routing imports are replaced with controlled native material tabs, preserving `type-*` IDs, `uploadPanel` relationships, arrow/Home/End navigation and a single tab stop. The adapter restores the original host semantics on teardown; selection changes keep the same labels and file panel in place. Compact 3px corners and 5px gaps match QINAN's palette and spacing. No new package dependency is introduced.

The v11 module-entry sequence also mounts Inline AI Status, and the interactive usage guide reuses Animated Counter and FAQ. These instances follow the same pause and unmount lifecycle as the original upload and practice islands. Tutorial content is local, visibly labeled example material and never submitted as a real detection task.

The v13 upload adapter adds short, local Anime.js copy and folder feedback to material changes. Current labels and file state update immediately; outgoing copy is hidden from assistive technology. The file-picker button and native media controls retain their DOM and trusted activation. Feedback settles when motion is paused, the page is hidden, or a newer selection interrupts it. Its private animation clock prevents canceled DOM writes from restoring stale text opacity; the underlying Rare UI components keep their Motion implementation.

Matrix Orb is no longer imported or mounted in v13. Its adapted source, unmodified upstream copy and checksum remain as historical v12 material under the same license and attribution terms.

These source files ship as part of this application, not as a standalone component distribution. The public application footer and root README credit Rare UI.
