import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// صفحة النبي: الرمز التفاعلي يتحول بالضغط (موسى: عصا ← حيّة ← عصا ← البحر)، النبذة و«اقرأ المزيد»، ومعرض الصور الصغير

const SHOTS = process.env.SHOTS_DIR;
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function open(page: Page, id: string, items: object[] = []) {
  await page.route(/drive\.google\.com\/thumbnail/, (r) => r.fulfill({ contentType: "image/png", body: PNG }));
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    if (b.action === "prophet") return ok({ prophet: { prophet_id: id, name: id === "musa" ? "موسى" : "نوح", title: "", tag: "", text: "نص قصير", symbol: "", symbol_name: "" }, items });
    return ok([]);
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, KID);
  await page.goto(`/Serah/kid/prophet/?id=${id}&tier=high`);
}

// أسماء السور بخط الرقعة والآيات بخط المصحف، واسم المنصة بالرقعة، والقائمة الجانبية تسكرول وحدها
test("صفحة النبي: أسماء السور بالرقعة والآيات بخط المصحف، ولا يُلوَّن اسم النبي العادي", async ({ page }) => {
  await open(page, "adam");
  await page.getByRole("button", { name: "اقرأ المزيد" }).click();
  const more = page.locator("#bio-more");
  await expect(more.locator("[data-surah]").filter({ hasText: /^البقرة$/ }).first()).toBeVisible();
  await expect(more.locator("[data-surah]").filter({ hasText: /^ص$/ }).first()).toBeVisible();
  const ayah = more.locator("[data-ayah-text]").first();
  await expect(ayah).toContainText("رَبَّنَا ظَلَمْنَا");
  expect(await ayah.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/quran/i);
  expect(await more.locator("[data-surah]").first().evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/ruqaa/i);
  // «سيدنا آدم» في النص ليس سورة
  await expect(page.locator("[data-surah]").filter({ hasText: /آدم/ })).toHaveCount(0);
});

test("اسم المنصة بخط الرقعة، والإنجليزي بخط Cinzel", async ({ page }) => {
  await page.goto("/Serah/");
  const h = page.getByRole("heading", { name: "المُنْتَهَى" });
  await expect(h).toBeVisible();
  expect(await h.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/ruqaa/i);
  expect(await page.getByText("MUNTAHA").evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/cinzel/i);
});

test("القائمة الجانبية للمطوّر تسكرول وحدها والإعدادات وبطاقة الحساب يمكن الوصول لهما على شاشة قصيرة", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "القائمة الجانبية للكمبيوتر فقط");
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript(() => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify({ user_id: "SA", name: "م.احمد", role: "superadmin", class_id: "", avatar: "" })); });
  await page.goto("/Serah/teacher/suggestions/");
  const side = page.getByTestId("side-nav-scroll");
  const [sh, ch] = await side.evaluate((e) => [e.scrollHeight, e.clientHeight]);
  expect(sh).toBeGreaterThan(ch);
  await side.getByRole("link", { name: "الإعدادات" }).scrollIntoViewIfNeeded();
  await expect(side.getByRole("link", { name: "الإعدادات" })).toBeInViewport();
  await expect(page.getByRole("complementary").getByRole("button", { name: "خروج" })).toBeInViewport();
});
