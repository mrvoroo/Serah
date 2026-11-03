// اختبار حي للموقع المنشور: كل الصفحات تفتح، الملفات تتحمل، لا أخطاء، وكود الفصل يعمل مع الخلفية الحقيقية
const { chromium } = require('playwright');
const B = 'https://mrvoroo.github.io/Serah';
const API = 'https://script.google.com/macros/s/AKfycbz5QzGujgyndr_k1QpuFkPBQTjgA-KkxQoP9WOBV66-6pi5X-o4Q4JWLiJauDR2Xt39/exec';
const out = []; const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };
(async () => {
  for (const a of ['ping', 'me', 'dashboard']) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: a }) });
    log('API', a, '→', (await r.text()).slice(0, 160));
  }
  const br = await chromium.launch();
  for (const [vw, tag] of [[{ width: 390, height: 844 }, 'mobile'], [{ width: 1366, height: 820 }, 'desktop']]) {
    const ctx = await br.newContext({ viewport: vw });
    const p = await ctx.newPage();
    const errs = []; const bad = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    p.on('response', r => { if (r.status() >= 400 && r.url().includes('github.io')) bad.push(r.status() + ' ' + r.url()); });
    for (const path of ['/', '/teacher/login/', '/upload.html', '/manifest.webmanifest', '/icon.svg', '/sw.js', '/3d/star.png']) {
      const r = await p.goto(B + path, { waitUntil: 'networkidle' });
      log(tag, path, r.status(), (await p.title()) || '');
    }
    await p.goto(B + '/', { waitUntil: 'networkidle' });
    await p.screenshot({ path: `smoke-${tag}-welcome.png` });
    await p.fill('#code', '7391'); await p.click('button[type=submit]');
    try { await p.getByText('مين أنت؟').waitFor({ timeout: 25000 }); const n = await p.locator('main button.rounded-3xl').count(); log(tag, 'class code OK, kids shown:', n); }
    catch { log(tag, 'class code FAILED:', await p.locator('[role=alert]').innerText().catch(() => '?')); }
    await p.waitForTimeout(800); await p.screenshot({ path: `smoke-${tag}-kids.png` });
    // تبديل الثيم
    await p.goto(B + '/teacher/login/', { waitUntil: 'networkidle' });
    const before = await p.evaluate(() => document.documentElement.className);
    await p.locator('button[aria-label^="التحويل"]').first().click().catch(() => {});
    await p.waitForTimeout(600);
    log(tag, 'theme before/after:', before.includes('dark') ? 'dark' : 'light', '→', (await p.evaluate(() => document.documentElement.className)).includes('dark') ? 'dark' : 'light');
    await p.screenshot({ path: `smoke-${tag}-teacher-login.png` });
    // صفحات محمية تحوّل للدخول
    await p.goto(B + '/kid/', { waitUntil: 'networkidle' }); log(tag, '/kid/ without login →', p.url().replace(B, ''));
    await p.goto(B + '/teacher/', { waitUntil: 'networkidle' }); log(tag, '/teacher/ without login →', p.url().replace(B, ''));
    log(tag, 'errors:', errs.length ? errs.join(' | ') : 'none', '| bad responses:', bad.length ? bad.join(' | ') : 'none');
    await ctx.close();
  }
  await br.close();
  require('fs').writeFileSync('smoke.txt', out.join('\n'));
})();
