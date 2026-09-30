#!/bin/bash
# Builds frontend/src/fonts/noto-sans-arabic-{subset,latin}.woff2 from the
# @fontsource-variable/noto-sans-arabic package (SIL Open Font License 1.1).
#
# The full Arabic file is 166 KB: every Arabic block and weights 100–900. The
# site uses weights 400–700 and the basic Arabic and Arabic Supplement blocks,
# so the subset keeps only those (about 40 KB). Shaping still works: glyphs
# reachable through the font's shaping rules are kept. Characters outside the
# subset (presentation forms pasted from PDFs, Extended-A) fall back to the
# system font through the unicode-range set in app/layout.tsx.
#
# Requires fonttools and brotli:  pip install fonttools brotli
# Keep UNICODES in sync with the unicode-range in frontend/app/layout.tsx.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
SRC=node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2
OUT=src/fonts/noto-sans-arabic-subset.woff2
UNICODES="U+0600-06FF,U+0750-077F,U+200C-200F,U+2010-2011,U+204F,U+25CC,U+FD3E-FD3F"
TMP=$(mktemp -d)
fonttools varLib.instancer "$SRC" wght=400:700 -o "$TMP/w.ttf"
pyftsubset "$TMP/w.ttf" --unicodes="$UNICODES" --layout-features='*' --flavor=woff2 --output-file="$OUT"
# The Latin file (digits, codes, «WhatsApp») keeps its characters; only the
# weight range is cut (31 KB before).
LATIN=node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-latin-wght-normal.woff2
fonttools varLib.instancer "$LATIN" wght=400:700 -o "$TMP/l.ttf"
pyftsubset "$TMP/l.ttf" --unicodes='*' --layout-features='*' --flavor=woff2 --output-file=src/fonts/noto-sans-arabic-latin.woff2
rm -rf "$TMP"
ls -l src/fonts
