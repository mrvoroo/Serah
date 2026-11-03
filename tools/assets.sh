#!/usr/bin/env bash
# يجلب الخطوط ويحوّلها woff2 ثم يرفعها على فرع ci/assets-out (التنزيل المباشر ممنوع في بيئة التطوير)
set -euo pipefail
pip install -q fonttools brotli
mkdir -p out/fonts
curl -fsSL -o /tmp/cairo.ttf "https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bslnt,wght%5D.ttf"
curl -fsSL -o /tmp/baloo.ttf "https://github.com/google/fonts/raw/main/ofl/baloobhaijaan2/BalooBhaijaan2%5Bwght%5D.ttf"
for f in cairo baloo; do
  pyftsubset /tmp/$f.ttf --unicodes="U+0000-00FF,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F,U+2010-2027,U+2030-205E,U+066B-066C,U+0660-0669" --layout-features='*' --flavor=woff2 --output-file=out/fonts/$f.woff2
done
ls -la out/fonts
