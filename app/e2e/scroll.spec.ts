import { test, expect } from "@playwright/test";

// أول دخول للرحلة من الصفحة الرئيسية للطفل (تنقل داخل الموقع بدون تحميل كامل): عجلة الماوس لازم تنزل الصفحة،
// ولازم السكرول الناعم يعرف طول الصفحة الجديد بدل ما يرجّع الطفل لأول قسم

test("عجلة الماوس تعمل في الرحلة بعد الدخول لها من الرئيسية", async ({ page, isMobile }) => {
  test.skip(isMobile, "العجلة للكمبيوتر فقط");
  await page.route(/script\.google\.com\/macros/, (route) => {
    const { action } = JSON.parse(route.request().postData() || "{}");
    const data = action === "me" ? { points: 0, attended: [], rank: 1, total: 1 } : action === "leaderboard" ? { top: [], me: 1 } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "test");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }));
  });
  await page.goto("/Serah/kid/?tier=high");
  await page.waitForFunction(() => !!(window as unknown as { __lenis?: unknown }).__lenis);
  await page.getByRole("link", { name: /رحلة الأنبياء/ }).first().click();
  await expect(page).toHaveURL(/\/kid\/journey\//);
  await expect(page.locator("[data-station]").first()).toBeVisible();

  // أصل المشكلة: لو الصفحة طالت بدون تغيير مقاس الشاشة، السكرول الناعم لازم يعرف الطول الجديد فورًا
  expect(await page.evaluate(() => {
    const l = (window as unknown as { __lenis: { limit: number } }).__lenis;
    const before = l.limit, extra = document.createElement("div");
    extra.style.height = "5000px";
    document.body.appendChild(extra);
    const grew = l.limit - before;
    extra.remove();
    return grew;
  })).toBeGreaterThan(4900);
  // السكرول الناعم يعرف الطول الحقيقي للصفحة
  await expect.poll(() => page.evaluate(() => {
    const l = (window as unknown as { __lenis: { limit: number } }).__lenis;
    return Math.abs(l.limit - (document.documentElement.scrollHeight - innerHeight));
  })).toBeLessThan(2);

  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);

  // سكرول من شريط المتصفح ثم عجلة: يكمل من مكانه ولا يرجع لأول قسم
  await page.waitForFunction(() => !(window as unknown as { __lenis: { isScrolling: unknown } }).__lenis.isScrolling);
  // سحب الشريط يطلق أحداث سكرول كثيرة
  for (let y = 1000; y <= 3000; y += 250) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(30); }
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(3000);
});
