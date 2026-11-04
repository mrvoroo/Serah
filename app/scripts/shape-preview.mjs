// معاينة أشكال النقاط المضيئة كصور PNG (بدون متصفح): أمامي + زاوية ثلاثة أرباع جنبًا إلى جنب.
// الاستخدام: node scripts/shape-preview.mjs <outDir> [اسم1 اسم2 ...]   (بدون أسماء = كل الأشكال)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { kit } from "../src/lib/particles/kit.js";
import { EXTRA_SHAPES } from "../src/lib/particles/shapes-extra.js";

const [outDir = "shape-preview", ...names] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function sample(name, n = 9000) {
  const r = rand(77);
  const parts = EXTRA_SHAPES[name](kit(r));
  const total = parts.reduce((a, p) => a + p[0], 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = r() * total, j = 0;
    while (x > parts[j][0] && j < parts.length - 1) x -= parts[j++][0];
    out.push([...parts[j][1](), parts[j][2] || 0]);
  }
  return out;
}

const W = 360, H = 360, S = 62; // بكسل لكل وحدة
const COLORS = [[255, 214, 120], [80, 200, 255], [120, 230, 210], [255, 240, 200]];
function render(pts) {
  const img = new Float32Array(W * 2 * H * 3);
  const views = [0, 0.6];
  views.forEach((yaw, v) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const [x, y, z, f] of pts) {
      const X = x * c + z * s;
      const px = Math.round(v * W + W / 2 + X * S), py = Math.round(H * 0.55 - y * S);
      if (px < v * W || px >= (v + 1) * W || py < 0 || py >= H) continue;
      const col = COLORS[f] || COLORS[0], o = (py * W * 2 + px) * 3;
      for (let k = 0; k < 3; k++) img[o + k] += col[k] * 0.35;
    }
  });
  // خطوط إطار المساحة المرجعية (-2.6..2.6)
  const buf = Buffer.alloc((W * 2 * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    buf[y * (W * 2 * 3 + 1)] = 0;
    for (let x = 0; x < W * 2; x++) for (let k = 0; k < 3; k++) {
      let val = Math.min(255, img[(y * W * 2 + x) * 3 + k]) + 14;
      if (x === W) val = 90;
      buf[y * (W * 2 * 3 + 1) + 1 + x * 3 + k] = Math.min(255, val);
    }
  }
  return png(W * 2, H, buf);
}

function crc32(b) { let c, crc = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const list = names.length ? names : Object.keys(EXTRA_SHAPES);
for (const n of list) {
  if (!EXTRA_SHAPES[n]) { console.error("missing shape:", n); process.exitCode = 1; continue; }
  const pts = sample(n);
  const bad = pts.filter((p) => p.slice(0, 3).some((v) => !Number.isFinite(v))).length;
  const out = pts.filter((p) => Math.abs(p[0]) > 3 || p[1] < -2.9 || p[1] > 2.5).length;
  fs.writeFileSync(path.join(outDir, `${n}.png`), render(pts));
  console.log(n.padEnd(26), bad ? `NaN:${bad}` : "ok", out > pts.length * 0.03 ? `outside:${out}` : "");
}
