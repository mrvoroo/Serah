import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// QA: صفحة النبي — الرمز التفاعلي، النبذة، المعرض، التخطيط على الموبايل، الثيم
const SHOTS = process.env.QA_SHOTS || path.join(__dirname, "..", "..", "test-results", "qa");
fs.mkdirSync(SHOTS, { recursive: true });
type Step = { shape: string; label: string; caption: string; ref: string };
const J = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "src", "content", "prophets-content.json"), "utf8")).prophets as { id: string; name: string; sequence: Step[]; summary: string; more: string[] }[];
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const img = (n: number) => ({ item_id: `i${n}`, kind: "image", title: `صورة رقم ${n} بعنوان طويل نوعًا ما`, body: `شرح الصورة ${n}`, file_id: `f${n}`, url: "", visible: true, approved: true });

async function open(page: Page, id: string, items: object[] = [], user: object = KID, theme?: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/drive\.google\.com\/thumbnail/, (r) => r.fulfill({ contentType: "image/png", body: PNG }));
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    const p = J.find((x) => x.id === id)!;
    if (b.action === "prophet") return ok({ prophet: { prophet_id: id, name: p.name.replace(/ عليه السلام$/, ""), title: "", tag: "", text: "نص قصير عن النبي", symbol: "", symbol_name: "" }, items });
    return ok([]);
  });
  await page.addInitScript(([u, t]) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); if (t) localStorage.setItem("serah-theme", t as string); }, [user, theme] as const);
  await page.goto(`/Serah/kid/prophet/?id=${id}&tier=high`);
  return errors;
}
const sym = (page: Page) => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => { shape: string; progress: number } | null } }).__symbol?.debug() ?? null);

for (const id of ["musa", "yusuf", "salih", "muhammad", "sulayman"]) {
  test(`الرمز التفاعلي (${id}): كل شكل بعنوانه وجملته ومرجعه كما في المحتوى`, async ({ page }, info) => {
    const errors = await open(page, id);
    const p = J.find((x) => x.id === id)!;
    const stage = page.getByRole("region", { name: /^رمز سيدنا/ });
    await expect(stage).toBeVisible();
    await expect.poll(async () => (await sym(page))?.shape, { timeout: 30_000 }).toBe("s0");
    await expect(stage.getByRole("tab")).toHaveCount(p.sequence.length);
    for (let k = 0; k < p.sequence.length; k++) {
      const s = p.sequence[k];
      await expect(stage.locator("p.font-heading")).toHaveText(s.label);
      await expect(stage.locator("p[aria-live]")).toHaveText(s.caption);
      if (s.ref) await expect(stage.locator("p.text-xs")).toContainText(s.ref);
      await expect(stage.getByRole("tab", { name: s.label, exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(stage.getByText(`${(k + 1).toLocaleString("ar-EG")} / ${p.sequence.length.toLocaleString("ar-EG")}`)).toBeVisible();
      await expect(stage.getByText("اضغط على الشكل")).toHaveCount(k === 0 ? 1 : 0);
      if (id === "musa" || id === "yusuf") {
        await expect.poll(async () => (await sym(page))?.progress ?? 0, { timeout: 15_000 }).toBeGreaterThan(0.97);
        await stage.screenshot({ path: `${SHOTS}/symbol-${id}-${info.project.name}-${k}.png` });
      }
      await stage.getByRole("button", { name: /اضغط للشكل التالي/ }).click();
      await expect.poll(async () => (await sym(page))?.shape).toBe(`s${(k + 1) % p.sequence.length}`);
    }
    // النقاط تقفز لآخر شكل
    const last = p.sequence.length - 1;
    await stage.getByRole("tab", { name: p.sequence[last].label, exact: true }).click();
    await expect.poll(async () => (await sym(page))?.shape).toBe(`s${last}`);
    await expect(stage.locator("p[aria-live]")).toHaveText(p.sequence[last].caption);
    expect(errors).toEqual([]);
  });
}

test("الرمز بلوحة المفاتيح: Tab ثم Enter ثم Space", async ({ page, isMobile }) => {
  test.skip(isMobile, "لوحة المفاتيح للكمبيوتر");
  await open(page, "musa");
  await expect.poll(async () => (await sym(page))?.shape, { timeout: 30_000 }).toBe("s0");
  const btn = page.getByRole("button", { name: /اضغط للشكل التالي/ });
  let found = false;
  for (let k = 0; k < 25 && !found; k++) {
    await page.keyboard.press("Tab");
    found = await btn.evaluate((e) => e === document.activeElement);
  }
  expect(found, "الوصول للرمز بالـ Tab").toBe(true);
  const ring = await btn.evaluate((e) => getComputedStyle(e).boxShadow);
  expect(ring, "حلقة التركيز ظاهرة").not.toBe("none");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await sym(page))?.shape).toBe("s1");
  await page.keyboard.press(" ");
  await expect.poll(async () => (await sym(page))?.shape).toBe("s2");
  // الأسهم داخل tablist (نمط ARIA tabs المتوقع)
  await page.keyboard.press("Tab");
  const tabFocused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
  expect(tabFocused).toBe("tab");
});

test("الموبايل/الكمبيوتر: لا سكرول أفقي، والشريط السفلي لا يغطي آخر المحتوى، والنبذة", async ({ page }, info) => {
  const items = [img(1), img(2), img(3), img(4), img(5), img(6), { item_id: "t1", kind: "text", title: "فقرة", body: "نص الفقرة الأخير", file_id: "", url: "", visible: true, approved: true }];
  const errors = await open(page, "noah", items);
  await expect(page.getByRole("region", { name: /^رمز سيدنا/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /تعرّف على سيدنا نوح/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // النبذة
  const bio = page.getByRole("region", { name: /تعرّف على سيدنا نوح/ });
  await bio.getByRole("button", { name: "اقرأ المزيد" }).click();
  await expect(bio.getByRole("listitem")).toHaveCount(J.find((x) => x.id === "noah")!.more.length);
  await expect(bio.getByRole("button", { name: "إخفاء" })).toHaveAttribute("aria-expanded", "true");
  await page.screenshot({ path: `${SHOTS}/prophet-noah-${info.project.name}-full.png`, fullPage: true });
  await bio.getByRole("button", { name: "إخفاء" }).click();
  await expect(bio.getByRole("listitem")).toHaveCount(0);
  // المعرض: سكرول أفقي داخل القائمة فقط
  const list = page.getByRole("region", { name: /صور/ }).locator("ul");
  const [sw, cw] = await list.evaluate((e) => [e.scrollWidth, e.clientWidth]);
  expect(sw).toBeGreaterThan(cw);
  // آخر عنصر لا يختفي تحت الشريط السفلي الثابت
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  const lastBox = await page.locator("[data-testid=prophet-item]").last().boundingBox();
  const navBox = await page.getByRole("navigation", { name: "التنقل الرئيسي" }).boundingBox();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(navBox!.y);
  await page.screenshot({ path: `${SHOTS}/prophet-noah-${info.project.name}-bottom.png` });
  expect(errors).toEqual([]);
});

test("المعرض: فتح، التالي، السابق، الإغلاق بالزر وبـ Esc، والتعليق", async ({ page, isMobile }, info) => {
  await open(page, "noah", [img(1), img(2), img(3)]);
  const g = page.getByRole("region", { name: /صور/ });
  await expect(g.getByRole("heading")).toHaveText(/صور \(٣\)/);
  await g.getByRole("button", { name: /افتح الصورة: صورة رقم 2/ }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByRole("heading")).toHaveText(/صورة رقم 2/);
  await expect(dlg.getByText("شرح الصورة 2")).toBeVisible();
  await expect(dlg.getByText("٢ / ٣")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/gallery-lightbox-${info.project.name}.png` });
  // الصورة والأزرار داخل الشاشة
  const box = await dlg.boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  await dlg.getByRole("button", { name: "الصورة التالية" }).click();
  await expect(dlg.getByRole("heading")).toHaveText(/صورة رقم 3/);
  await dlg.getByRole("button", { name: "الصورة التالية" }).click();
  await expect(dlg.getByRole("heading")).toHaveText(/صورة رقم 1/);
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
  await g.getByRole("button", { name: /افتح الصورة: صورة رقم 1/ }).click();
  const close = dlg.getByRole("button", { name: /إغلاق|Close/ });
  await expect(close).toBeVisible();
  await close.click();
  await expect(dlg).toBeHidden();
  if (!isMobile) {
    // الأسهم بلوحة المفاتيح داخل العارض (متوقع لكن ليس شرطًا)
    await g.getByRole("button", { name: /افتح الصورة: صورة رقم 1/ }).click();
    await page.keyboard.press("ArrowLeft");
    const t = await dlg.getByRole("heading").textContent();
    test.info().annotations.push({ type: "arrow-key", description: `بعد السهم: ${t}` });
  }
});

for (const theme of ["light", "dark"]) {
  test(`الثيم ${theme}: صفحة موسى مقروءة`, async ({ page }, info) => {
    await open(page, "musa", [img(1), img(2)], KID, theme);
    await expect.poll(async () => (await sym(page))?.shape, { timeout: 30_000 }).toBe("s0");
    await expect.poll(async () => (await sym(page))?.progress ?? 0, { timeout: 15_000 }).toBeGreaterThan(0.97);
    await page.screenshot({ path: `${SHOTS}/prophet-musa-${theme}-${info.project.name}.png`, fullPage: true });
    const cls = await page.evaluate(() => document.documentElement.className);
    expect(cls.includes("dark")).toBe(theme === "dark");
  });
}

test("معرّف نبي غير موجود / خطأ الخلفية", async ({ page }, info) => {
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    if (b.action === "prophet") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "النبي غير موجود" }) });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, KID);
  await page.goto("/Serah/kid/prophet/?id=zzz");
  await expect(page.getByText("النبي غير موجود")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/prophet-error-${info.project.name}.png` });
  await page.goto("/Serah/kid/prophet/");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/prophet-noid-${info.project.name}.png` });
  const skel = await page.locator("[data-slot=skeleton], .animate-pulse").count();
  test.info().annotations.push({ type: "no-id", description: `skeletons=${skel}` });
});
