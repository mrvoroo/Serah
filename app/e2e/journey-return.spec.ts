import { test, expect, type Page } from "@playwright/test";

// قائمة المحطات المتفرعة: الضغط على اسم نبي ينزل لقسمه، والقائمة تتابع السكرول

const SHOTS = process.env.SHOTS_DIR;

async function open(page: Page, menu: "full" | "dots" = "full") {
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const data = b.action === "prophet" ? { prophet: { prophet_id: b.id, name: b.id, title: "", tag: "", text: "", symbol: "", symbol_name: "" }, items: [] } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "test");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }));
  });
  // اختيار شكل القائمة مرة واحدة فقط، حتى يبقى اختيار الطفل بعد إعادة التحميل
  await page.addInitScript((m) => { if (!localStorage.getItem("serah_journey_menu")) localStorage.setItem("serah_journey_menu", m); }, menu);
  await page.goto("/Serah/kid/journey/?tier=high");
  await page.waitForFunction(() => !!(window as unknown as { __serah?: { debug: () => unknown } }).__serah?.debug(), null, { timeout: 60_000 });
}
const centerStation = (page: Page) => page.evaluate(() => {
  const mid = window.innerHeight / 2;
  return Array.from(document.querySelectorAll<HTMLElement>("[data-station]")).find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; })?.dataset.station;
});

// الرجوع من صفحة النبي يرجع لقسمه في الرحلة (لا لأولها) — بزر «رجوع للرحلة» وبزر الرجوع في المتصفح
test("الرجوع من صفحة النبي لقسمه في الرحلة", async ({ page }) => {
  await open(page);
  await page.goto("/Serah/kid/journey/?at=dawud&tier=high");
  await expect.poll(() => centerStation(page), { timeout: 15_000 }).toBe("dawud");
  await expect(page).toHaveURL(/\/kid\/journey\/\?tier=high$/);
  // زر «ادخل الصفحة» ثم الرجوع بالمتصفح
  const enter = page.locator("#station-dawud").getByRole("link", { name: /ادخل الصفحة/ });
  await enter.scrollIntoViewIfNeeded();
  await enter.click();
  await expect(page).toHaveURL(/\/kid\/prophet\/\?id=dawud/);
  await page.goBack();
  await expect.poll(() => centerStation(page), { timeout: 15_000 }).toBe("dawud");
  // زر «رجوع للرحلة» في صفحة النبي
  await page.goto("/Serah/kid/prophet/?id=yunus&tier=high");
  await page.getByRole("link", { name: /رجوع للرحلة/ }).click();
  await expect.poll(() => centerStation(page), { timeout: 15_000 }).toBe("yunus");
});
