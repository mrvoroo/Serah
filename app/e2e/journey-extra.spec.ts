import { test, expect, type Page } from "@playwright/test";

// إكمال اختبارات الرحلة: شريط الموبايل، دوران الرمز وحده، الثيمين، كل مستويات الأجهزة، تقليل الحركة، وصورة لكل محطة

const SHOTS = process.env.SHOTS_DIR;
type Dbg = { shape: string; progress: number; symRot: number };

async function open(page: Page, tier = "high") {
  await page.route(/script\.google\.com\/macros/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "test");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }));
  });
  await page.goto(`/Serah/kid/journey/?tier=${tier}`);
  await page.waitForFunction(() => !!(window as unknown as { __serah?: { debug: () => unknown } }).__serah?.debug(), null, { timeout: 60_000 });
  await page.waitForTimeout(2000);
}
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __serah: { debug: () => Dbg } }).__serah.debug());
const centerStation = (page: Page) => page.evaluate(() => {
  const mid = innerHeight / 2;
  return [...document.querySelectorAll<HTMLElement>("[data-station]")].find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; })?.dataset.station;
});
async function scrollTo(page: Page, id: string, at = 0.5) {
  await page.evaluate(([id, at]) => {
    const el = document.getElementById(`station-${id}`)!;
    const y = el.offsetTop + el.offsetHeight * (at as number) - innerHeight / 2;
    const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, [id, at] as const);
}

test("الموبايل: الشريط العلوي يعرض «٣ من ٢٥ — سيدنا نوح» ويفتح القائمة", async ({ page, isMobile }) => {
  test.skip(!isMobile, "للموبايل");
  await open(page);
  const bar = page.getByRole("button", { name: /^المحطات:/ });
  await expect(bar).toHaveText("رحلة مع الأنبياء");
  await scrollTo(page, "noah");
  await expect(bar).toHaveText("٣ من ٢٥ — سيدنا نوح عليه السلام");
  await scrollTo(page, "muhammad");
  await expect(bar).toHaveText("٢٥ من ٢٥ — سيدنا محمد ﷺ");
  // الشريط لا يغطي البطاقة
  const b = (await bar.boundingBox())!, card = (await page.locator("#station-muhammad [data-card]").boundingBox())!;
  expect(b.y + b.height).toBeLessThan(card.y);
  await bar.click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "سيدنا محمد ﷺ", exact: true })).toHaveAttribute("aria-current", "true");
});

test("الكمبيوتر: اسم النبي على النقطة عند المرور عليها", async ({ page, isMobile }) => {
  test.skip(isMobile, "للكمبيوتر");
  await page.addInitScript(() => localStorage.setItem("serah_journey_menu", "dots"));
  await open(page);
  await page.getByRole("button", { name: "سيدنا نوح عليه السلام" }).hover();
  await expect(page.getByText("٣ · سيدنا نوح", { exact: true })).toBeVisible();
});

test("رمز يوسف (رؤيا الشمس والقمر والكواكب) ودوران الرمز مع السكرول", async ({ page, isMobile }) => {
  test.skip(isMobile, "للكمبيوتر");
  await open(page);
  await scrollTo(page, "yusuf", 0.15);
  await expect.poll(async () => (await dbg(page)).shape).toBe("yusuf");
  await expect(page.locator("#station-yusuf")).toContainText("رؤيا الشمس والقمر والكواكب");
  await page.waitForTimeout(1200);
  const a = (await dbg(page)).symRot;
  await scrollTo(page, "yusuf", 0.85);
  await page.waitForTimeout(1200);
  const b = (await dbg(page)).symRot;
  // الرمز يلف مع السكرول داخل القسم، والمجسم يبقى نفس المحطة
  expect(Math.abs(b - a)).toBeGreaterThan(0.4);
  expect((await dbg(page)).shape).toBe("yusuf");
});

// الثيمين × مستويات الأجهزة × تقليل الحركة: المجسم يطابق القسم دائمًا وبلا أخطاء
for (const [tier, scheme, reduced] of [["high", "light", false], ["mid", "dark", false], ["low", "dark", false], ["static", "light", true]] as const) {
  test(`المزامنة: مستوى ${tier}، ثيم ${scheme}${reduced ? "، تقليل الحركة" : ""}`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: reduced ? "reduce" : "no-preference" });
    await open(page, tier);
    for (const id of ["noah", "yusuf", "musa", "yunus", "muhammad", "quran", "adam", "start"]) {
      await scrollTo(page, id);
      await expect.poll(async () => (await centerStation(page)) === id && (await dbg(page)).shape === id, { message: `${tier} ${id}` }).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("صورة لكل محطة للمراجعة بالعين", async ({ page, isMobile }) => {
  test.skip(!SHOTS || isMobile, "يعمل فقط عند طلب الصور");
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.addInitScript(() => localStorage.setItem("serah_journey_menu", "dots"));
  await open(page);
  const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-station]")].map((s) => s.dataset.station!));
  for (const [i, id] of ids.entries()) {
    await scrollTo(page, id);
    await expect.poll(async () => { const d = await dbg(page); return d.shape === id && d.progress >= 1; }, { timeout: 15_000 }).toBe(true);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/station-${String(i).padStart(2, "0")}-${id}.png` });
  }
});

test("الموبايل: زر «ادخل الصفحة» لا يختفي تحت الشريط السفلي في أي محطة", async ({ page, isMobile }) => {
  test.skip(!isMobile, "للموبايل");
  await open(page);
  const nav = await page.getByRole("navigation", { name: "التنقل الرئيسي" }).boundingBox();
  for (const id of ["noah", "musa", "dhulkifl", "sulayman", "muhammad"]) {
    // مثل القائمة: أعلى المحطة عند أعلى الشاشة (الموضع من الصفحة نفسها، لا من الحاوية)
    await page.evaluate((id) => {
      const el = document.getElementById(`station-${id}`)!, y = el.getBoundingClientRect().top + scrollY;
      const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
      if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }, id);
    await page.waitForTimeout(600);
    const btn = await page.locator(`#station-${id}`).getByRole("link", { name: "ادخل الصفحة" }).boundingBox();
    expect(btn!.y + btn!.height, id).toBeLessThanOrEqual(nav!.y + 2);
  }
});
