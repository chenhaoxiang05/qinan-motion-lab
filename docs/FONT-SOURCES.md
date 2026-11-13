# v10 display font sources

The homepage headline uses a small derivative of **Smiley Sans 得意黑**. English equipment labels and numbers use an **Oxanium** subset. Both are self-hosted WOFF2 files and remain under SIL OFL 1.1; original QINAN code's MIT license does not replace either font license.

These fonts are confined to display text. Chinese body copy, forms, reports and practice answers retain the normal UI font. The startup poster and mechanical 安 artwork retain the existing Noto-derived vector outlines.

## Pinned upstream files

| Source | Fixed version | SHA-256 |
| --- | --- | --- |
| [Smiley Sans release archive](https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip) | `v2.0.1` | `299c0be6c960ae37361762eca76f7d0cd516615435bb96c0d4b98a1e70178a07` |
| `SmileySans-Oblique.ttf` inside that archive | `v2.0.1` | `b447d7e781f08bc95c4c9f23ba71ed2b8ebb639aa7184485c71c4ca5afcd25c4` |
| [Oxanium variable TTF](https://github.com/sevmeyer/oxanium/blob/a8f39e0c71186190027a093e9001459410192d1e/fonts/variable/Oxanium%5Bwght%5D.ttf) | commit `a8f39e0c71186190027a093e9001459410192d1e` | `2ce01d946e1e1ffc8d7eecfffbda8623bedd63eaf811a20488c4b69af45babb0` |

The upstream licenses are included unchanged at `public/licenses/SmileySans-OFL.txt` and `public/licenses/Oxanium-OFL.txt`. The rebuild script verifies their checksums too.

## Subsetting and names

- `qinan-display.woff2`: 2,144 bytes; `先核实再放心，。` and space. The oblique shapes are unchanged. The modified family's internal and CSS name is **Qinan Display**, respecting the upstream reserved font names.
- `qinan-signal.woff2`: 8,524 bytes; printable ASCII, non-breaking space, copyright/registered marks, middle dot and en/em dashes. The original weight axis 200–800 is retained. Its derivative family name is **Qinan Signal**.
- Combined font transfer size: **10,668 bytes**, before transport compression; below the 100 kB budget.

Output checksums:

```text
19e54bbfc4bd98336ca5dbe7c037dbd6639671d4676b29273af52ee39488c086  qinan-display.woff2
acd17078ff938b162605cc72543c6b378d1835bbdb7723767e622fdee606b178  qinan-signal.woff2
```

## Reproduction

Use Python with `fonttools==4.61.1` and `brotli==1.1.0`, then run:

```sh
python scripts/generate-display-fonts.py
```

The optional `--source-dir /absolute/cache/path` reuses verified upstream downloads. This manual asset-generation step is not part of normal `npm ci` or the production build. Fonts never load from external hosts in the browser.

`createFontReadiness()` loads both local families inside the startup window and enables their CSS together. The 1,800ms deadline, early boot finalization, API failure or unsupported font API locks the visit to the normal UI font. A later network completion cannot change the visible headline's metrics.
