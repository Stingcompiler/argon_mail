#!/bin/bash
# Builds frontend/src/fonts/noto-sans-arabic-{subset,latin}.woff2 from the
# @fontsource-variable/noto-sans-arabic package (SIL Open Font License 1.1).
#
# The full Arabic file is 166 KB: every Arabic block and weights 100–900. The
# site uses weights 400–800 and the characters of Arabic as written in Sudan:
# the letters, hamza forms and harakat (U+0621–0655), Arabic punctuation and
# digits, superscript alef and alef wasla, and the few extra letters used to
# write foreign names (پ چ ژ ڤ ک گ ی). That is about 28 KB; the earlier cut kept
# the whole Arabic block and the Arabic Supplement (Urdu, Persian, Sindhi,
# Quranic marks) at 56 KB, and it is the file the hero heading waits for.
# Shaping still works: glyphs reachable through the font's shaping rules are
# kept. Characters outside the subset fall back to the system font through the
# unicode-range set in app/layout.tsx. Every Arabic character in the code and
# in the site's content was checked against this set (1 October 2026).
#
# Requires fonttools and brotli:  pip install fonttools brotli
# Keep UNICODES in sync with the unicode-range in frontend/app/layout.tsx.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
SRC=node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2
OUT=src/fonts/noto-sans-arabic-subset.woff2
UNICODES="U+060C,U+061B,U+061F,U+0621-0655,U+0660-066D,U+0670-0671,U+067E,U+0686,U+0698,U+06A4,U+06A9,U+06AF,U+06CC,U+200C-200F,U+2010-2011,U+204F,U+25CC,U+FD3E-FD3F"
TMP=$(mktemp -d)
fonttools varLib.instancer "$SRC" wght=400:800 -o "$TMP/w.ttf"
pyftsubset "$TMP/w.ttf" --unicodes="$UNICODES" --layout-features='*' --flavor=woff2 --output-file="$OUT"
# The Latin file (digits, codes, «WhatsApp») keeps its characters; only the
# weight range is cut (31 KB before, 24 KB after).
LATIN=node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-latin-wght-normal.woff2
fonttools varLib.instancer "$LATIN" wght=400:800 -o "$TMP/l.ttf"
pyftsubset "$TMP/l.ttf" --unicodes='*' --layout-features='*' --flavor=woff2 --output-file=src/fonts/noto-sans-arabic-latin.woff2
rm -rf "$TMP"
ls -l src/fonts
