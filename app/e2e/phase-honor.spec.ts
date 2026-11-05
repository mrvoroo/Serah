import { test, expect, type Page } from "@playwright/test";

// سيوف النبي ﷺ، و«أ.» قبل اسم المعلمة، وسحابة التشجيع، وتوبة سيدنا آدم

const ok = (data: unknown) => ({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
const DASH = { kids: 0, lectures: 0, published: 0, drafts: 0, attendanceRate: 0, totalPoints: 0, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 };
async function as(page: Page, user: object) {
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill(ok(JSON.parse(r.request().postData() || "{}").action === "dashboard" ? DASH : [])));
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
}
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
const TEACHER = { user_id: "T2", name: "فاطمة", role: "teacher", class_id: "C1", avatar: "" };

test("سيوف النبي ﷺ: محطة الرحلة تفتح الصفحة، والتنبيه بأن الرسم تقريبي، وذو الفقار أولًا مع درجة الخبر", async ({ page }) => {
  await as(page, KID);
  await page.goto("/Serah/kid/journey/?tier=high");
  const link = page.locator("#station-sira").getByRole("link", { name: /تعرّف على سيوف النبي ﷺ/ });
  await expect(link).toHaveAttribute("href", "/Serah/kid/swords/");
  await page.goto("/Serah/kid/swords/?tier=high");
  await expect(page.getByRole("heading", { name: "سيوف النبي ﷺ", level: 1 })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("رسوم تقريبية");
  const stage = page.getByRole("region", { name: "رسم سيف ذي الفقار" });
  await expect(stage).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => { shape: string } | null } }).__symbol?.debug()?.shape), { timeout: 30_000 }).toBe("s0");
  await stage.getByRole("button", { name: /اضغط للشكل التالي/ }).click();
  await expect(stage).toContainText("قبيعة سيف رسول الله ﷺ من فضة");
  const first = page.locator("#sw-list ~ ul > li").first();
  await expect(first).toContainText("ذو الفقار");
  await first.getByRole("button", { name: /ذو الفقار/ }).click();
  await expect(first).toContainText("درجة الخبر");
  await expect(page.locator("#sw-list ~ ul > li")).toHaveCount(9);
  // الأخبار الضعيفة لا تظهر للطفل
  await expect(page.locator("section[aria-labelledby=sw-facts]").getByText("ضعيف")).toHaveCount(0);
});

test("المعلمة: «أ.» قبل اسمها، وسحابة التشجيع تظهر بحديث ومرجعه وتُغلق", async ({ page, isMobile }) => {
  await as(page, TEACHER);
  await page.goto("/Serah/teacher/");
  await expect(page.getByRole("heading", { name: /مرحبًا بكِ، أ\. فاطمة/ })).toBeVisible();
  await page.waitForFunction(() => typeof (window as unknown as { __cloud?: () => void }).__cloud === "function");
  await page.evaluate(() => (window as unknown as { __cloud: () => void }).__cloud());
  const cloud = page.getByRole("status", { name: "رسالة تشجيع" });
  await expect(cloud).toBeVisible();
  await expect(cloud).toContainText("«");
  await expect(cloud.locator("p.text-xs").last()).not.toBeEmpty();
  if (!isMobile) {
    const box = await cloud.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(400);
  }
  await cloud.getByRole("button", { name: "إغلاق" }).click();
  await expect(cloud).toHaveCount(0);
});

test("سيدنا آدم: الشكل الأخير «التوبة والهبوط إلى الأرض» بالآية", async ({ page }) => {
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    if (b.action === "prophet") return route.fulfill(ok({ prophet: { prophet_id: "adam", name: "آدم", title: "", tag: "", text: "", symbol: "", symbol_name: "" }, items: [] }));
    return route.fulfill(ok([]));
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, KID);
  await page.goto("/Serah/kid/prophet/?id=adam&tier=high");
  const stage = page.getByRole("region", { name: "رمز سيدنا آدم عليه السلام" });
  await stage.getByRole("tab", { name: "التوبة والهبوط إلى الأرض" }).click();
  await expect(stage).toContainText("فَتَلَقَّىٰ آدَمُ");
  await expect(stage).toContainText("المرجع: البقرة");
});
