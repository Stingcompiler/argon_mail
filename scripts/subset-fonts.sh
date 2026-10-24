#!/bin/bash
# Builds the site's fonts (docs/design/DESIGN.md, decision D-0007 option A):
# IBM Plex Sans Arabic and IBM Plex Sans, weights 400/500/600/700, static files
# from @fontsource (SIL Open Font License 1.1), cut to the characters the site
# writes, into frontend/src/fonts/plex-{arabic,latin}-<weight>.woff2.
#
# Arabic: the letters, hamza forms and harakat (U+0621–0655), Arabic
# punctuation and digits, superscript alef and alef wasla, and the few extra
# letters used for foreign names (پ چ ژ ڤ ک گ ی), as checked against the site's
# code and content on 1 October 2026. Latin: ASCII, Latin-1 and common
# punctuation (codes, emails, «WhatsApp», digits). Shaping still works: glyphs
# reachable through the font's shaping rules are kept. Anything outside falls
# back to system-ui through the unicode-range set in frontend/app/layout.tsx.
#
# Requires fonttools and brotli:  pip install fonttools brotli
# Keep the ranges in sync with frontend/app/layout.tsx.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
ARABIC="U+060C,U+061B,U+061F,U+0621-0655,U+0660-066D,U+0670-0671,U+067E,U+0686,U+0698,U+06A4,U+06A9,U+06AF,U+06CC,U+200C-200F,U+2010-2011,U+204F,U+25CC,U+FD3E-FD3F"
LATIN="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2032-2033,U+20AC,U+2122"
mkdir -p src/fonts
rm -f src/fonts/noto-sans-arabic-*.woff2
for w in 400 500 600 700; do
  pyftsubset "node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-$w-normal.woff2" \
    --unicodes="$ARABIC" --layout-features='*' --flavor=woff2 --output-file="src/fonts/plex-arabic-$w.woff2"
  pyftsubset "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-$w-normal.woff2" \
    --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file="src/fonts/plex-latin-$w.woff2"
done
ls -l src/fonts
