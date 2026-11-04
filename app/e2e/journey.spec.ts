import { test, expect, type Page } from "@playwright/test";

// المجسم ثلاثي الأبعاد يجب أن يطابق المحطة الظاهرة في منتصف الشاشة دائمًا، مهما تحرك الطفل لأعلى ولأسفل

const URL = "/Serah/kid/journey/?tier=high";

async function open(page: Page) {
  // خلفية وهمية: الرحلة تطلب أقسامها من الخلفية ([] = البيانات الاحتياطية)، والتوكن الوهمي يُرفض من الخلفية الحقيقية
  await page.route(/script\.google\.com\/macros/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "test");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }));
  });
  await page.goto(URL);
  await page.waitForFunction(() => {
    const s = (window as unknown as { __serah?: { debug: () => unknown } }).__serah;
    return !!s && !!s.debug();
  }, null, { timeout: 60_000 });
}

// المحطة المتوقعة محسوبة هنا بشكل مستقل: القسم الذي يحتوي منتصف الشاشة
const expectedId = (page: Page) => page.evaluate(() => {
  const mid = innerHeight / 2;
  const el = [...document.querySelectorAll<HTMLElement>("[data-station]")].find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  return el?.dataset.station ?? null;
});
const shownId = (page: Page) => page.evaluate(() => (window as unknown as { __serah: { debug: () => { shape: string } } }).__serah.debug().shape);
const stationIds = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-station]")].map((s) => s.dataset.station!));

async function expectInSync(page: Page, label: string) {
  // ننتظر توقف السكرول الناعم ثم نتأكد أن المجسم مطابق للقسم
  await expect.poll(async () => { const e = await expectedId(page); return e !== null && e === (await shownId(page)); }, { timeout: 4000, message: label }).toBe(true);
}

async function scrollToStation(page: Page, id: string, at = 0.5) {
  await page.evaluate(([id, at]) => {
    const el = document.getElementById(`station-${id}`)!;
    const y = el.offsetTop + el.offsetHeight * (at as number) - innerHeight / 2;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, [id, at] as const);
}

test("كل محطة لها مجسم واسم، بالترتيب ذهابًا وإيابًا", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const ids = await stationIds(page);
  expect(ids.length).toBe(28);
  for (const id of ids) { await scrollToStation(page, id); await expectInSync(page, `down → ${id}`); expect(await shownId(page)).toBe(id); }
  for (const id of [...ids].reverse()) { await scrollToStation(page, id); await expectInSync(page, `up → ${id}`); expect(await shownId(page)).toBe(id); }
  expect(errors).toEqual([]);
});

test("نوح ← طلوع بسيط ← نزول: لا يعلق على الهلال (مع تغيّر مقاس الشاشة)", async ({ page }) => {
  await open(page);
  for (let round = 0; round < 6; round++) {
    await scrollToStation(page, "noah", 0.5);
    await expectInSync(page, "noah");
    expect(await shownId(page)).toBe("noah");
    // طلوع بسيط بعجلة الماوس، مع حدث resize كما يحدث عند ظهور شريط العنوان في الموبايل
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, -200);
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(500);
    await expectInSync(page, `after small scroll up (round ${round})`);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(500);
    await expectInSync(page, `back down (round ${round})`);
    // طلوع كامل للهلال ثم رجوع لنوح
    await scrollToStation(page, "start", 0.3);
    await expectInSync(page, "start");
    expect(await shownId(page)).toBe("start");
  }
});

test("لعب الطفل: سكرول عشوائي سريع لأعلى ولأسفل ثم التوقف عند أي نقطة", async ({ page }) => {
  await open(page);
  await page.mouse.move(300, 300);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let burst = 0; burst < 25; burst++) {
    const steps = 1 + Math.floor(rnd() * 6);
    for (let k = 0; k < steps; k++) await page.mouse.wheel(0, (rnd() - 0.45) * 900);
    if (rnd() < 0.3) await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(150 + rnd() * 500);
    await expectInSync(page, `burst ${burst}`);
  }
  // مكان بين قسمين بالضبط (الحد الفاصل)
  const ids = await stationIds(page);
  for (const id of ids.slice(1, 6)) {
    await scrollToStation(page, id, 0.001);
    await expectInSync(page, `boundary ${id}`);
    await scrollToStation(page, id, -0.001);
    await expectInSync(page, `before boundary ${id}`);
  }
});
