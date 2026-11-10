import { test, expect, type Page } from "@playwright/test";

// مشاهد سيدنا آدم وإدريس وصالح المبنية من صور المالك: تملأ صندوق الرمز، والضغط ينقل بين المراحل
// بتحوّل ناعم (يمر بنص الطريق ثم يكتمل)، وكل صور المراحل تتحمّل، وبدون أخطاء

const SHOTS = process.env.SHOTS_DIR;
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
type Dbg = { shape: string; progress: number; loaded: number; total: number; kind: string; id: string };
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => Dbg | null } }).__symbol?.debug() ?? null);
const NAMES: Record<string, string> = { adam: "آدم", idris: "إدريس", hud: "هود", salih: "صالح" };
const LABELS: Record<string, string[]> = {
  adam: ["من الأرض", "الأسماء", "الشجرة", "التوبة"],
  idris: ["الصدق", "الصبر", "من الصالحين", "المنزلة العالية"],
  hud: ["إرم ذات العماد", "دعوة سيدنا هود", "الريح", "سبع ليالٍ", "بأمر ربها", "النجاة"],
  salih: ["طلب الآية", "آية من الله", "ناقة الله", "قسمة الماء"],
};

async function open(page: Page, id: string, tier = "high") {
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    if (b.action === "prophet") return ok({ prophet: { prophet_id: id, name: NAMES[id], title: "", tag: "", text: "نص قصير", symbol: "", symbol_name: "" }, items: [] });
    return ok([]);
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, KID);
  await page.goto(`/Serah/kid/prophet/?id=${id}&tier=${tier}`);
}

for (const id of Object.keys(NAMES)) {
  test(`مشهد سيدنا ${NAMES[id]}: من الصور، يملأ الصندوق ويتحول بسلاسة بين المراحل`, async ({ page, browserName }, info) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /THREE|WebGL|shader|GLSL/i.test(m.text()) && !/texImage3D/.test(m.text())) errors.push(m.text()); });
    await open(page, id);
    const stage = page.getByRole("region", { name: new RegExp(`رمز سيدنا ${NAMES[id]}`) });
    await expect(stage).toBeVisible();
    const btn = stage.getByRole("button", { name: /للشكل التالي/ });
    if (browserName === "webkit") {
      // سفاري في الاختبار بلا WebGL: تظهر صورة المرحلة نفسها
      await expect.poll(async () => (await dbg(page))?.kind ?? (await stage.locator("img").count() ? "img" : null), { timeout: 30_000 }).toBeTruthy();
    } else {
      await expect.poll(async () => (await dbg(page))?.kind, { timeout: 30_000 }).toBe("image-scene");
      await expect.poll(async () => (await dbg(page))?.loaded, { timeout: 30_000 }).toBe(LABELS[id].length);
    }
    const [cb, bb] = [await stage.locator("canvas").boundingBox(), await btn.boundingBox()];
    expect(Math.abs(cb!.width - bb!.width)).toBeLessThan(2);
    expect(Math.abs(cb!.height - bb!.height)).toBeLessThan(2);
    expect(cb!.height).toBeGreaterThanOrEqual(330);

    const labels = LABELS[id];
    for (let k = 0; k < labels.length; k++) {
      await expect(stage.getByText(labels[k], { exact: true }).first()).toBeVisible();
      if (browserName !== "webkit") {
        await expect.poll(async () => (await dbg(page))?.shape).toBe(`s${k}`);
        if (k > 0) {
          // التحوّل تدريجي مش قفزة
          const mid = (await dbg(page))!.progress;
          expect(mid).toBeLessThan(1);
        }
        await expect.poll(async () => (await dbg(page))?.progress, { timeout: 10_000 }).toBe(1);
        await page.waitForTimeout(400);
        if (SHOTS) await stage.locator("canvas").screenshot({ path: `${SHOTS}/scene-${id}-${info.project.name}-${k + 1}.png` });
      }
      if (k < labels.length - 1) await btn.click();
    }
    // من الأخيرة يرجع للأولى
    await btn.click();
    await expect(stage.getByText(labels[0], { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}
