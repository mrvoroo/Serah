import { test, expect, type Page } from "@playwright/test";

// كارت الذكر: الإطار الذهبي بنفس مقاس الكارت بالظبط (حتى بعد حركة الدخول والضغط والتنقل)، وشريط التقدّم في القائمة داخل الشريحة
const ADMIN = { user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
async function geom(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>("[data-deck-card]")!, svg = card.querySelector<SVGSVGElement>("svg[data-frame]")!;
    const c = card.getBoundingClientRect(), s = svg.getBoundingClientRect();
    return { cw: card.offsetWidth, ch: card.offsetHeight, sw: Number(svg.getAttribute("width")), sh: Number(svg.getAttribute("height")), dx: Math.abs(c.left - s.left), dy: Math.abs(c.top - s.top), rw: Math.abs(c.width - s.width), rh: Math.abs(c.height - s.height) };
  });
}
test("إطار كارت الذكر على مقاس الكارت، وشريط الشريحة جواها", async ({ page }) => {
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, ADMIN);
  await page.goto("/Serah/teacher/azkar/");
  const card = page.locator("[data-deck-card]");
  await expect(card).toBeVisible();
  await page.waitForTimeout(900); // تنتهي حركة الدخول
  const check = async () => { const g = await geom(page); expect(g.sw).toBe(g.cw); expect(g.sh).toBe(g.ch); expect(g.dx).toBeLessThan(1); expect(g.dy).toBeLessThan(1); expect(g.rw).toBeLessThan(1.5); expect(g.rh).toBeLessThan(1.5); };
  await check();
  // ضغطة على ذكر يتكرر، ثم التالي: الإطار يفضل مظبوط
  await page.getByRole("button", { name: "الذكر التالي" }).click();
  await page.waitForTimeout(900);
  await check();
  await card.click({ position: { x: 40, y: 40 } });
  await page.waitForTimeout(600);
  await check();
  // شريط التقدّم في الشريحة الحالية جوه حدودها وما بيلمسش النص
  const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-chip-bar]")].map((b) => {
    const chip = b.closest("button")!.getBoundingClientRect(), r = b.getBoundingClientRect(), label = b.closest("button")!.querySelector("span.line-clamp-1")!.getBoundingClientRect();
    return { inside: r.left >= chip.left && r.right <= chip.right && r.bottom <= chip.bottom - 2, gap: r.top - label.bottom };
  }));
  expect(bars.length).toBeGreaterThan(0);
  for (const b of bars) { expect(b.inside).toBe(true); expect(b.gap).toBeGreaterThanOrEqual(2); }
  await page.screenshot({ path: `test-results/deck-${test.info().project.name}.png` });
});
