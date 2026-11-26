import { test, expect, type Page } from "@playwright/test";

// حديقة جزء عمّ: نخيل بالمراحل، آخر نخلة في النص، «افتح المصحف» على نفس السورة، الشريط السفلي ما يغطيش آخر الصفحة، واحتفال الواحة
const KID = { user_id: "S1", name: "زيد", role: "student", class_id: "C1", avatar: "", gender: "m" };
const N = Array.from({ length: 37 }, (_, i) => 78 + i);
function garden(juz: boolean) {
  return { items: N.map((n) => ({ surah: n, reviews: juz ? 9 : n === 114 ? 1 : n === 113 ? 4 : 0, last_day: 0, confirmed: juz || n === 112 })), juz };
}
async function as(page: Page, juz = false) {
  await page.route(/script\.google\.com\/macros/, async (r) => {
    const b = JSON.parse(r.request().postData() || "{}");
    const data = b.action === "garden" ? garden(juz) : b.action === "me" ? { points: 1, attended: [], rank: 1, total: 1 } : [];
    await r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.route(/api\.alquran\.cloud/, (r) => r.abort());
  await page.addInitScript((u) => { if (!localStorage.getItem("serah_token")) { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); } }, KID);
}

test("نخيل بالمراحل، وآخر نخلة في النص، و«افتح المصحف» يفتح نفس السورة", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await as(page);
  await page.goto("/Serah/kid/garden/");
  await expect(page.getByTestId("tree")).toHaveCount(37);
  await expect(page.locator('[data-surah="114"] svg')).toHaveAttribute("data-stage", "1");
  await expect(page.locator('[data-surah="113"] svg')).toHaveAttribute("data-stage", "2");
  await expect(page.locator('[data-surah="112"] svg')).toHaveAttribute("data-stage", "4");
  await expect(page.getByText("فسيلة").first()).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 640) {
    const last = await page.locator('[data-surah="78"]').boundingBox(), grid = await page.getByTestId("garden-grid").boundingBox();
    expect(Math.abs((last!.x + last!.width / 2) - (grid!.x + grid!.width / 2))).toBeLessThan(4);
  }
  await page.locator('[data-testid="tree"][data-surah="113"]').click();
  await page.getByRole("link", { name: /افتح المصحف/ }).click();
  await expect(page).toHaveURL(/\/kid\/quran\/\?s=113/);
  await expect(page.getByRole("combobox", { name: "السورة" })).toHaveValue("113");
  expect(errors).toEqual([]);
});

test("الشريط السفلي: ثابت تحت أثناء السكرول، وآخر الصفحة يطلع فوقه", async ({ page }) => {
  await as(page);
  await page.goto("/Serah/kid/garden/");
  await expect(page.getByTestId("tree")).toHaveCount(37);
  const vh = page.viewportSize()!.height;
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  let nav = (await page.locator("[data-bottom-nav]").boundingBox())!;
  expect(Math.abs(nav.y + nav.height - vh)).toBeLessThan(2);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  nav = (await page.locator("[data-bottom-nav]").boundingBox())!;
  const legend = (await page.getByText(/نواة ← فسيلة/).boundingBox())!;
  expect(legend.y + legend.height).toBeLessThanOrEqual(nav.y + 1);
  expect(Math.abs(nav.y + nav.height - vh)).toBeLessThan(2);
  await page.screenshot({ path: `test-results/garden-end-${test.info().project.name}.png` });
});

test("إتمام الجزء: الواحة ثلاثية الأبعاد تفتح لوحدها أول مرة وتقفل", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await as(page, true);
  await page.goto("/Serah/kid/garden/");
  const oasis = page.getByTestId("oasis");
  await expect(oasis).toBeVisible();
  await expect(oasis).toContainText("زرعت واحة جزء عمّ كلها");
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `test-results/oasis-${test.info().project.name}.png` });
  // dispatchEvent: زرار مؤشر التطوير في Next (أسفل الشاشة) بيغطي الزر في وضع التطوير بس
  await page.getByRole("button", { name: /رجوع للحديقة/ }).dispatchEvent("click");
  await expect(oasis).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("tree").first()).toBeVisible();
  await expect(page.getByTestId("oasis")).toHaveCount(0); // مرة واحدة بس
  await page.getByTestId("open-oasis").click();
  await expect(page.getByTestId("oasis")).toBeVisible();
  expect(errors).toEqual([]);
});
