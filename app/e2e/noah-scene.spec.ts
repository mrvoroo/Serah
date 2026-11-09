import { test, expect, type Page } from "@playwright/test";

// مشهد سفينة سيدنا نوح الواقعي: يملأ صندوق الرمز، والضغط ينقله بين المراحل الأربع
// (الألواح ← الطوفان ← السفينة ← على الجودي) بلا أخطاء، والماء يعلو ثم ينحسر والسفينة تطفو ثم تستقر

const SHOTS = process.env.SHOTS_DIR;
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
type Dbg = { shape: string; progress: number; terrain: string; water: number; arkY: number; kind: string };
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => Dbg | null } }).__symbol?.debug() ?? null);

async function open(page: Page, tier = "high") {
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    if (b.action === "prophet") return ok({ prophet: { prophet_id: "noah", name: "نوح", title: "", tag: "", text: "نص قصير", symbol: "", symbol_name: "" }, items: [] });
    return ok([]);
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, KID);
  await page.goto(`/Serah/kid/prophet/?id=noah&tier=${tier}`);
}

test("سفينة نوح: مشهد واقعي يملأ الصندوق ويمر بالمراحل الأربع", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && /THREE|WebGL|shader|GLSL/i.test(m.text()) && !/texImage3D/.test(m.text())) errors.push(m.text()); });
  await open(page);
  const stage = page.getByRole("region", { name: "رمز سيدنا نوح عليه السلام" });
  await expect(stage).toBeVisible();
  await expect.poll(async () => (await dbg(page))?.kind, { timeout: 30_000 }).toBe("noah-scene");
  // اللوحة تملأ صندوق الرمز بالكامل
  const btn = stage.getByRole("button", { name: /اضغط للشكل التالي/ });
  const [cb, bb] = [await stage.locator("canvas").boundingBox(), await btn.boundingBox()];
  expect(Math.abs(cb!.width - bb!.width)).toBeLessThan(2);
  expect(Math.abs(cb!.height - bb!.height)).toBeLessThan(2);
  expect(cb!.height).toBeGreaterThanOrEqual(300);

  const labels = ["الألواح", "الطوفان", "السفينة", "على الجودي"];
  const seen: Dbg[] = [];
  for (let k = 0; k < labels.length; k++) {
    await expect(stage.getByRole("tab", { name: labels[k] })).toHaveAttribute("aria-selected", "true");
    await expect.poll(async () => (await dbg(page))?.progress, { timeout: 20_000 }).toBe(1);
    await page.waitForTimeout(600);
    seen.push((await dbg(page))!);
    if (SHOTS) await stage.locator("canvas").screenshot({ path: `${SHOTS}/noah-scene-${info.project.name}-${k}.png` });
    await btn.click();
    await expect.poll(async () => (await dbg(page))?.shape).toBe(`s${(k + 1) % labels.length}`);
  }
  // الأرض الصخرية والسفينة مستقرة عليها، ثم الطوفان يرفعها، ثم تستقر على القمة بعد انحسار الماء
  expect(seen[0]).toMatchObject({ terrain: "shore" });
  expect(seen[0].arkY).toBeLessThan(0.05);
  expect(seen[1].water).toBeGreaterThan(1);
  expect(seen[1].arkY).toBeGreaterThan(0);
  expect(seen[2]).toMatchObject({ terrain: "peak" });
  expect(seen[3]).toMatchObject({ terrain: "peak" });
  expect(seen[3].water).toBeLessThan(-5);
  expect(seen[3].arkY).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});

test("سفينة نوح بدون حركة (تقليل الحركة): يرسم كل مرحلة فورًا", async ({ page }) => {
  await open(page, "static");
  const stage = page.getByRole("region", { name: "رمز سيدنا نوح عليه السلام" });
  await expect.poll(async () => (await dbg(page))?.kind, { timeout: 30_000 }).toBe("noah-scene");
  await stage.getByRole("tab", { name: "على الجودي" }).click();
  await expect.poll(async () => (await dbg(page))?.shape).toBe("s3");
  expect((await dbg(page))!.progress).toBe(1);
  expect((await dbg(page))!.terrain).toBe("peak");
});
