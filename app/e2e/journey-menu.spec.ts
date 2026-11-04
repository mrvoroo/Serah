import { test, expect, type Page } from "@playwright/test";

// قائمة المحطات المتفرعة: الضغط على اسم نبي ينزل لقسمه، والقائمة تتابع السكرول

const SHOTS = process.env.SHOTS_DIR;

async function open(page: Page, menu: "full" | "dots" = "full") {
  await page.route(/script\.google\.com\/macros/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "test");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }));
  });
  // اختيار شكل القائمة مرة واحدة فقط، حتى يبقى اختيار الطفل بعد إعادة التحميل
  await page.addInitScript((m) => { if (!localStorage.getItem("serah_journey_menu")) localStorage.setItem("serah_journey_menu", m); }, menu);
  await page.goto("/Serah/kid/journey/?tier=high");
  await page.waitForFunction(() => !!(window as unknown as { __serah?: { debug: () => unknown } }).__serah?.debug(), null, { timeout: 60_000 });
  // قياس سرعة الجهاز (ثانية ونص) قد يعيد إنشاء السكرول الناعم في متصفح الاختبار البطيء فيقطع أي نزول جارٍ
  await page.waitForTimeout(2000);
}

// القسم الذي يحتوي منتصف الشاشة
const centerStation = (page: Page) => page.evaluate(() => {
  const mid = innerHeight / 2;
  return [...document.querySelectorAll<HTMLElement>("[data-station]")].find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; })?.dataset.station;
});

test("الكمبيوتر: الضغط على اسم النبي ينزل لقسمه والقائمة تتابع السكرول", async ({ page, isMobile }) => {
  test.skip(isMobile, "القائمة الجانبية للشاشات الكبيرة");
  await open(page);
  const menu = page.getByRole("navigation", { name: "محطات الرحلة" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "من آدم إلى إبراهيم" })).toHaveAttribute("aria-expanded", "false");

  await menu.getByRole("button", { name: "من أيوب إلى سليمان" }).click();
  await menu.getByRole("button", { name: "موسى", exact: true }).click();
  await expect.poll(() => centerStation(page), { timeout: 8000 }).toBe("musa");
  await expect(menu.getByRole("button", { name: "موسى", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(menu.getByRole("button", { name: "من أيوب إلى سليمان" })).toHaveAttribute("aria-expanded", "true");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-desktop-musa.png` });

  // سكرول عادي لقسم آخر: القائمة تفتح قسمه وتعلّم النبي
  await page.evaluate(() => {
    const el = document.getElementById("station-yunus")!;
    const y = el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
    const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });
  await expect(menu.getByRole("button", { name: "يونس", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(menu.getByRole("button", { name: "من إلياس إلى محمد ﷺ" })).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("button", { name: "من أيوب إلى سليمان" })).toHaveAttribute("aria-expanded", "false");

  // الرجوع للبداية
  await menu.getByRole("button", { name: "البداية" }).click();
  await expect.poll(() => centerStation(page), { timeout: 8000 }).toBe("start");

  // البطاقة لا تختفي تحت القائمة
  await menu.getByRole("button", { name: "من آدم إلى إبراهيم" }).click();
  await menu.getByRole("button", { name: "آدم", exact: true }).click();
  await expect.poll(() => centerStation(page), { timeout: 8000 }).toBe("adam");
  const box = await page.getByTestId("journey-menu").boundingBox();
  const card = await page.locator("#station-adam [data-card]").boundingBox();
  expect(card!.x + card!.width).toBeLessThanOrEqual(box!.x + 1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-desktop-adam.png` });
});

test("الموبايل: زر المحطات يفتح القائمة والاختيار ينزل للنبي", async ({ page, isMobile }) => {
  test.skip(!isMobile, "زر المحطات للشاشات الصغيرة");
  await open(page);
  await page.getByRole("button", { name: /^المحطات/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "من آدم إلى إبراهيم" }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-mobile.png` });
  await sheet.getByRole("button", { name: "نوح", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => centerStation(page), { timeout: 8000 }).toBe("noah");
});

test("سهم القائمة: يحوّلها لنقاط ويرجعها، ويُحفظ الاختيار", async ({ page, isMobile }) => {
  test.skip(isMobile, "للشاشات الكبيرة");
  await open(page);
  const panel = page.getByTestId("journey-menu");
  const wide = (await panel.boundingBox())!.width;
  await page.getByRole("button", { name: "إخفاء قائمة المحطات" }).click();
  await expect(panel.getByRole("navigation", { name: "محطات الرحلة" }).getByRole("button")).toHaveCount(28);
  expect((await panel.boundingBox())!.width).toBeLessThan(wide / 3);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-dots.png` });
  // نقطة تنزل لمحطتها
  await panel.getByRole("button", { name: "سيدنا يوسف عليه السلام" }).click();
  await expect.poll(() => centerStation(page), { timeout: 8000 }).toBe("yusuf");
  await page.reload();
  await expect(page.getByRole("button", { name: "إظهار قائمة المحطات" })).toBeVisible();
  await page.getByRole("button", { name: "إظهار قائمة المحطات" }).click();
  await expect(panel.getByRole("button", { name: "يوسف", exact: true })).toBeVisible();
});

// مكان المجسم على الشاشة (بالبكسل) من هدفه في المشهد: نفس معادلة الكاميرا في journey.tsx
const shapeBox = (page: Page) => page.evaluate(() => {
  const d = (window as unknown as { __serah: { debug: () => { shape: string; goal: { x: number; scale: number } } } }).__serah.debug();
  const W = innerWidth, H = innerHeight, hh = Math.tan(Math.PI / 8) * 10, hw = hh * (W / H);
  const side = d.shape === "start", w = (side ? 6.6 : 4.4) * d.goal.scale, cx = d.goal.x + (side ? 0.37 : 0) * d.goal.scale;
  const toPx = (x: number) => ((x + hw) / (2 * hw)) * W;
  return { shape: d.shape, left: toPx(cx - w / 2), right: toPx(cx + w / 2) };
});

for (const [menu, width] of [["full", 1440], ["dots", 1440], ["full", 1100]] as const) {
  test(`المجسم مع كل محطة: مطابق للقسم، يبدّل يمين/شمال، ولا يقع تحت البطاقة أو القائمة (${menu === "full" ? "قائمة مفتوحة" : "نقاط"}، ${width}px)`, async ({ page, isMobile }) => {
    test.skip(isMobile, "التبديل يمين/شمال للشاشات الكبيرة");
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 800 });
    await open(page, menu);
    // الأقسام بعرض الشاشة لا تعمل سكرول أفقي
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-station]")].map((s) => s.dataset.station!));
    const panel = (await page.getByTestId("journey-menu").boundingBox())!;
    let lastSide = "";
    for (const id of ids) {
      await page.evaluate((id) => {
        const el = document.getElementById(`station-${id}`)!;
        const y = el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
        const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
        if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      }, id);
      await expect.poll(async () => (await shapeBox(page)).shape, { message: id }).toBe(id);
      const s = await shapeBox(page);
      const card = (await page.locator(`#station-${id} [data-card]`).boundingBox())!;
      // المجسم في الجهة الفاضية: لا يلمس البطاقة ولا القائمة
      const onLeft = s.right <= card.x + 4;
      expect(onLeft || s.left >= card.x + card.width - 4, `${id}: المجسم فوق البطاقة`).toBe(true);
      expect(s.right, `${id}: المجسم تحت القائمة`).toBeLessThanOrEqual(panel.x + 4);
      // كل محطة عكس اللي قبلها
      const side = onLeft ? "left" : "right";
      expect(side, `${id}: نفس جهة المحطة السابقة`).not.toBe(lastSide);
      lastSide = side;
      if (SHOTS && (id === "noah" || id === "hud")) await page.screenshot({ path: `${SHOTS}/alt-${menu}-${width}-${id}.png` });
    }
  });
}
