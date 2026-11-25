import { test, expect } from "@playwright/test";

// الأيقونات ثلاثية الأبعاد: لو صورة فشلت تتعاد مرة، ولو فشلت تاني يظهر إيموجي بديل بدل مربع «؟» المكسور
test("أيقونة فشل تحميلها تظهر إيموجي بديل، والباقي صور سليمة", async ({ page }) => {
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.route(/\/3d\/medal1\.png/, (r) => r.abort());
  await page.addInitScript(() => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify({ user_id: "S1", name: "عبدالله", role: "student", class_id: "C1", avatar: "", gender: "m" })); });
  await page.goto("/Serah/kid/");
  await expect(page.locator('[data-icon-fallback="medal1"]').first()).toHaveText("🥇"); // «ترتيبي» وبلاطة «شهاداتي» الاتنين نفس الأيقونة
  // كل الصور الظاهرة اتحمّلت فعلًا (مفيش صورة مكسورة)
  await page.waitForLoadState("networkidle");
  const broken = await page.locator('img[src*="/3d/"]').evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));
  expect(broken).toEqual([]);
});
