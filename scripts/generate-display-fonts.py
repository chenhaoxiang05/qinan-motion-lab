#!/usr/bin/env python3
"""Rebuild local display subsets from checksum-pinned upstream fonts.

Requires fonttools==4.61.1 and brotli==1.1.0. The optional --source-dir caches
upstream downloads outside the repository; no source font is fetched at runtime.
"""
from argparse import ArgumentParser
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

from fontTools import subset
from fontTools.ttLib import TTFont

SOURCES = {
    'smiley.zip': (
        'https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip',
        '299c0be6c960ae37361762eca76f7d0cd516615435bb96c0d4b98a1e70178a07'),
    'SmileySans-OFL.txt': (
        'https://raw.githubusercontent.com/atelier-anchor/smiley-sans/v2.0.1/LICENSE',
        '9401f4050f1b66c26b6ccdc8b0e14a3c1cc37aac122eda84386f25854a9bec72'),
    'Oxanium.ttf': (
        'https://raw.githubusercontent.com/sevmeyer/oxanium/a8f39e0c71186190027a093e9001459410192d1e/fonts/variable/Oxanium%5Bwght%5D.ttf',
        '2ce01d946e1e1ffc8d7eecfffbda8623bedd63eaf811a20488c4b69af45babb0'),
    'Oxanium-OFL.txt': (
        'https://raw.githubusercontent.com/sevmeyer/oxanium/a8f39e0c71186190027a093e9001459410192d1e/OFL.txt',
        'fe17c0f2581d71b4e1ea7e636e7f4877c29223e11bb1dd1a871e8c3f2a86336b'),
}
DISPLAY_TEXT = '先核实再放心，。 '
SIGNAL_TEXT = ''.join(chr(code) for code in range(32, 127)) + '\u00a0©®·–—'


def source(name, cache):
    url, expected = SOURCES[name]
    cached = cache / name if cache else None
    data = cached.read_bytes() if cached and cached.exists() else urlopen(url, timeout=60).read()
    if sha256(data).hexdigest() != expected:
        raise ValueError(f'Checksum mismatch: {name}')
    if cached:
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(data)
    return data


def build(data, family, text, target):
    font = TTFont(BytesIO(data), recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    worker = subset.Subsetter(options=options)
    worker.populate(text=text)
    worker.subset(font)
    # The modified font family uses an original name; Smiley's reserved family
    # names remain only in the required copyright/license attribution.
    postscript = family.replace(' ', '')
    names = {1:family,2:'Regular',3:f'v10;QINAN;{postscript}',4:family,6:postscript,
             16:family,17:'Regular',25:postscript}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.flavor = 'woff2'
    font.save(target)
    print(f'{target.name}: {target.stat().st_size} bytes; sha256 {sha256(target.read_bytes()).hexdigest()}')


def main():
    parser = ArgumentParser()
    parser.add_argument('--source-dir', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    with ZipFile(BytesIO(source('smiley.zip', args.source_dir))) as archive:
        smiley = archive.read('SmileySans-Oblique.ttf')
    if sha256(smiley).hexdigest() != 'b447d7e781f08bc95c4c9f23ba71ed2b8ebb639aa7184485c71c4ca5afcd25c4':
        raise ValueError('Checksum mismatch: SmileySans-Oblique.ttf')
    build(smiley, 'Qinan Display', DISPLAY_TEXT, root / 'public/fonts/qinan-display.woff2')
    build(source('Oxanium.ttf', args.source_dir), 'Qinan Signal', SIGNAL_TEXT, root / 'public/fonts/qinan-signal.woff2')
    for name in ['SmileySans-OFL.txt', 'Oxanium-OFL.txt']:
        (root / 'public/licenses' / name).write_bytes(source(name, args.source_dir))


if __name__ == '__main__':
    main()
