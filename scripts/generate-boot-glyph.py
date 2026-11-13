#!/usr/bin/env python3
"""Generate original geometric QINAN type and an offline Noto 亲安 lockup.

The Latin polygon masters are original artwork, not outlines from a commercial
font or game asset. Wide, condensed and final masters keep the same commands and
point count per letter, allowing Anime.js to interpolate their d attributes.
The unmodified Chinese contours use Noto Sans CJK Bold under the existing OFL:
public/licenses/Noto-CJK.txt. Requires fonttools, but no network access.

Run from any directory. Only src/boot-glyph.svg is written; the caller inlines
that artifact in index.html so startup does not wait for a font or SVG request.
"""

from pathlib import Path
import argparse
import re
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen

HEIGHT = 200
TOP = 40
LETTERS = "QINAN"
MASTERS = {
    "wide": {
        "widths": [240, 96, 230, 232, 230], "gap": 24,
        "q_stroke": 44, "q_corner": 24, "q_body": 184,
        "i_stem": 48, "i_bar": 26,
        "n_stem": 44, "n_shoulder": .68,
        "a_cap": .32, "a_foot": 46, "a_notch": .72,
    },
    "condensed": {
        "widths": [166, 58, 166, 170, 166], "gap": 32,
        "q_stroke": 34, "q_corner": 5, "q_body": 182,
        "i_stem": 36, "i_bar": 18,
        "n_stem": 37, "n_shoulder": .76,
        "a_cap": .40, "a_foot": 33, "a_notch": .75,
    },
    "final": {
        "widths": [212, 82, 208, 216, 208], "gap": 27,
        "q_stroke": 48, "q_corner": 30, "q_body": 185,
        "i_stem": 50, "i_bar": 23,
        "n_stem": 48, "n_shoulder": .61,
        "a_cap": .28, "a_foot": 49, "a_notch": .70,
    },
}


def contours(letter, width, master):
    """Return closed local polygons; Q/A inner contours remain open counters."""
    w, h, m = width, HEIGHT, master
    if letter == "Q":
        s, corner, body = m["q_stroke"], m["q_corner"], m["q_body"]
        inner_corner = max(2, corner * .43)
        return [
            [(corner, 0), (w-corner, 0), (w, corner), (w, body-corner),
             (w-corner, body), (w*1.045, h), (w*.82, h),
             (w*.64, body), (corner, body), (0, body-corner), (0, corner)],
            [(s+inner_corner, s), (w-s-inner_corner, s),
             (w-s, s+inner_corner), (w-s, body-s-inner_corner),
             (w-s-inner_corner, body-s), (s+inner_corner, body-s),
             (s, body-s-inner_corner), (s, s+inner_corner)],
        ]
    if letter == "I":
        s, bar, mid = m["i_stem"], m["i_bar"], w/2
        return [[(0, 0), (w, 0), (w, bar), (mid+s/2, bar),
                 (mid+s/2, h-bar), (w, h-bar), (w, h), (0, h),
                 (0, h-bar), (mid-s/2, h-bar), (mid-s/2, bar), (0, bar)]]
    if letter == "N":
        s, shoulder = m["n_stem"], h*m["n_shoulder"]
        return [[(0, h), (0, 0), (s, 0), (w-s, shoulder), (w-s, 0),
                 (w, 0), (w, h), (w-s, h), (s, h-shoulder), (s, h)]]
    if letter == "A":
        cap, foot, notch = m["a_cap"], m["a_foot"], h*m["a_notch"]
        return [
            [(0, h), (w*cap, 0), (w*(1-cap), 0), (w, h),
             (w-foot, h), (w*.68, notch), (w*.32, notch), (foot, h)],
            [(w*.45, h*.29), (w*.55, h*.29),
             (w*.65, h*.56), (w*.35, h*.56)],
        ]
    raise ValueError(letter)


def path_data(polygons, offset):
    def number(value):
        return f"{value:.3f}".rstrip("0").rstrip(".")
    parts = []
    for polygon in polygons:
        for index, (x, y) in enumerate(polygon):
            parts.append(f'{"M" if index == 0 else "L"}{number(x+offset)} {number(y+TOP)}')
        parts.append("Z")
    return " ".join(parts)


def generate_latin():
    forms = {}
    for name, master in MASTERS.items():
        offset = (1200-sum(master["widths"])-master["gap"]*4)/2
        paths = []
        for letter, width in zip(LETTERS, master["widths"]):
            paths.append(path_data(contours(letter, width, master), offset))
            offset += width+master["gap"]
        forms[name] = paths
    for letter_index in range(5):
        paths = [forms[name][letter_index] for name in MASTERS]
        commands = [re.findall(r"[MLZ]", path) for path in paths]
        counts = [len(re.findall(r"-?\d+(?:\.\d+)?", path)) for path in paths]
        assert all(command == commands[0] for command in commands)
        assert len(set(counts)) == 1
    return forms


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", default="/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")
    args = parser.parse_args()
    latin = generate_latin()
    collection = TTCollection(args.font)
    font = collection.fonts[0]
    glyph_set, cmap = font.getGlyphSet(), font.getBestCmap()
    chinese = []
    for character, name in [("亲", "qin"), ("安", "an")]:
        pen = SVGPathPen(glyph_set)
        glyph_set[cmap[ord(character)]].draw(pen)
        chinese.append((name, pen.getCommands()))

    lines = [
        '<svg class="boot-glyph" viewBox="0 0 1200 540" width="1200" height="540" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
        '  <!-- Original QINAN polygon type; unmodified Noto Sans CJK Bold Chinese contours, OFL /licenses/Noto-CJK.txt. Generated by scripts/generate-boot-glyph.py. -->',
        '  <defs>',
        '    <mask id="boot-type-cut" x="0" y="0" width="1200" height="540" maskUnits="userSpaceOnUse" mask-type="luminance"><rect width="1200" height="540" fill="white"/><rect y="132" width="1200" height="6" fill="black"/></mask>',
    ]
    for name, path in chinese:
        lines.append(f'    <path id="boot-cn-{name}" fill-rule="nonzero" d="{path}"/>')
    lines.extend(['  </defs>', '  <g class="boot-type-word">'])
    for index in range(5):
        attributes = ' '.join(f'data-form-{name}="{latin[name][index]}"' for name in MASTERS)
        lines.append(f'    <path id="boot-type-letter-{index}" data-boot-letter="{index}" d="{latin["wide"][index]}" {attributes} fill-rule="evenodd"/>')
    lines.extend(['  </g>', '  <g class="boot-type-echo" opacity="0" fill="none" stroke="currentColor" stroke-width="1.5">'])
    for index in range(5):
        lines.append(f'    <use href="#boot-type-letter-{index}"/>')
    lines.extend(['  </g>', '  <g class="boot-type-cn">'])
    # Chinese cap height is 215 units, intentionally as strong as the 200-unit
    # Latin word. The lockup remains solid and unchanged through every morph.
    scale = 215/940
    baseline = 295+850*scale
    left_offsets = [367-52*scale, 833-947*scale]
    for (name, _), offset in zip(chinese, left_offsets):
        lines.append(f'    <use href="#boot-cn-{name}" transform="translate({offset:.6f} {baseline:.6f}) scale({scale:.9f} -{scale:.9f})"/>')
    lines.extend(['  </g>', '</svg>'])
    destination = Path(__file__).resolve().parents[1] / 'src' / 'boot-glyph.svg'
    destination.write_text('\n'.join(lines)+'\n', encoding='utf-8')
    collection.close()
    counts = [len(re.findall(r"-?\d+(?:\.\d+)?", path)) for path in latin["wide"]]
    print(f'Generated {destination}: 5 original letters, 3 compatible masters, numeric counts {counts}.')


if __name__ == '__main__':
    main()
