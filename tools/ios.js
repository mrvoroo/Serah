// يحاكي آيفون (محرك WebKit مثل سفاري): فتح الرابط بدون / وبعدها، مرة أولى ومرة بعد تسجيل عامل الخدمة
const { webkit, devices } = require('playwright');
(async () => {
  const br = await webkit.launch();
  const ctx = await br.newContext({ ...devices['iPhone 15 Pro'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  p.on('requestfailed', r => errs.push('failed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  const tryGo = async (u, n) => {
    try { const r = await p.goto(u, { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(2500);
      console.log(n, u, '→', r && r.status(), p.url(), 'h1:', await p.locator('h1').first().innerText().catch(() => 'NONE'));
    } catch (e) { console.log(n, u, 'ERROR', e.message.split('\n')[0]); }
    await p.screenshot({ path: `ios-${n}.png` });
  };
  await tryGo('https://mrvoroo.github.io/Serah', '1-noslash');
  await tryGo('https://mrvoroo.github.io/Serah/', '2-slash');
  console.log('sw controller:', await p.evaluate(() => !!navigator.serviceWorker && !!navigator.serviceWorker.controller).catch(e => e.message));
  await tryGo('https://mrvoroo.github.io/Serah', '3-noslash-with-sw');
  await tryGo('https://mrvoroo.github.io/Serah/teacher/login', '4-teacher-noslash-with-sw');
  await tryGo('https://mrvoroo.github.io/Serah/', '5-slash-with-sw');
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
