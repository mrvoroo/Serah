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
const progress = (page: Page) => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => { progress: number } | null } }).__symbol?.debug()?.progress ?? 0);
const shape = (page: Page) => page.evaluate(() => (window as unknown as { __symbol?: { debug: () => { shape: string } | null } }).__symbol?.debug()?.shape ?? null);

test("موسى: الضغط على الرمز يحوّله عصا ← حيّة تسعى ← عصا ← انفلاق البحر ثم يرجع للأول", async ({ page }, info) => {
  await open(page, "musa");
  const stage = page.getByRole("region", { name: "رمز سيدنا موسى عليه السلام" });
  await expect(stage).toBeVisible();
  await expect.poll(() => shape(page), { timeout: 30_000 }).toBe("s0");
  const labels = ["العصا", "حيّة تسعى", "عادت عصا", "انفلق البحر"];
  for (let k = 0; k < labels.length; k++) {
    await expect(stage.getByRole("button", { name: new RegExp(`^${labels[k]} —`) })).toBeVisible();
    await expect(stage.getByRole("tab", { name: labels[k] })).toHaveAttribute("aria-selected", "true");
    if (k === 0) await expect(stage.getByText("اضغط على الشكل")).toBeVisible();
    if (SHOTS) { await expect.poll(() => progress(page), { timeout: 15_000 }).toBe(1); await page.waitForTimeout(400); await stage.screenshot({ path: `${SHOTS}/musa-${info.project.name}-${k}.png` }); }
    await stage.getByRole("button", { name: /اضغط للشكل التالي/ }).click();
    await expect.poll(() => shape(page)).toBe(`s${(k + 1) % labels.length}`);
  }
  await expect(stage.getByText("اضغط على الشكل")).toHaveCount(0);
  await expect(stage.getByRole("tab", { name: "العصا" })).toHaveAttribute("aria-selected", "true");
  // النقاط تحت الشكل تقفز لأي شكل مباشرة
  await stage.getByRole("tab", { name: "انفلق البحر" }).click();
  await expect.poll(() => shape(page)).toBe("s3");
  await expect(stage.getByText("الشعراء: ٦٣، طه: ٧٧")).toBeVisible();
});

test("النبذة تظهر فقرة قصيرة، و«اقرأ المزيد» يفتح التفاصيل والمراجع", async ({ page }) => {
  await open(page, "noah");
  const bio = page.getByRole("region", { name: /تعرّف على سيدنا نوح عليه السلام/ });
  await expect(bio).toBeVisible();
  await expect(bio.getByText(/المراجع:/)).toHaveCount(0);
  await bio.getByRole("button", { name: "اقرأ المزيد" }).click();
  await expect(bio.getByRole("listitem").first()).toBeVisible();
  await expect(bio.getByText(/المراجع:/)).toBeVisible();
  await bio.getByRole("button", { name: "إخفاء" }).click();
  await expect(bio.getByRole("listitem")).toHaveCount(0);
});

test("الصور معرض صغير لا يأخذ الشاشة، والضغط يفتح الصورة كبيرة مع التالي", async ({ page }, info) => {
  const img = (n: number) => ({ item_id: `i${n}`, kind: "image", title: `صورة ${n}`, body: n === 1 ? "شرح الصورة" : "", file_id: `f${n}`, url: "", visible: true, approved: true });
  await open(page, "noah", [img(1), { item_id: "t1", kind: "text", title: "فقرة", body: "نص", file_id: "", url: "", visible: true, approved: true }, img(2), img(3)]);
  const gallery = page.getByRole("region", { name: /صور/ });
  await expect(gallery.getByRole("button", { name: /افتح الصورة/ })).toHaveCount(3);
  const box = await gallery.getByRole("button", { name: "افتح الصورة: صورة 1" }).boundingBox();
  expect(box!.width).toBeLessThan(160);
  // الصور مجمّعة في مكان أول صورة، قبل الفقرة
  const order = await page.locator("section").evaluateAll((els) => els.map((e) => e.getAttribute("aria-labelledby") || e.getAttribute("data-kind") || ""));
  expect(order.indexOf("gallery-title")).toBeLessThan(order.indexOf("text"));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/noah-${info.project.name}-page.png`, fullPage: true });
  await gallery.getByRole("button", { name: "افتح الصورة: صورة 1" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByRole("heading", { name: "صورة 1" })).toBeVisible();
  await expect(dlg.getByText("شرح الصورة")).toBeVisible();
  await dlg.getByRole("button", { name: "الصورة التالية" }).click();
  await expect(dlg.getByRole("heading", { name: "صورة 2" })).toBeVisible();
  await dlg.getByRole("button", { name: "الصورة السابقة" }).click();
  await dlg.getByRole("button", { name: "الصورة السابقة" }).click();
  await expect(dlg.getByRole("heading", { name: "صورة 3" })).toBeVisible();
});

test("المعلمة تفتح رحلة الأنبياء وصفحة النبي كما يراها الطفل، مع زر «لوحتي»، ولا تدخل باقي صفحات الطفل", async ({ page, isMobile }) => {
  const TEACHER = { user_id: "T2", name: "معلمة", role: "teacher", class_id: "C1", avatar: "" };
  await page.route(/script\.google\.com\/macros/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, TEACHER);
  await page.goto("/Serah/teacher/students/");
  // في الموبايل القائمة داخل زر القائمة
  if (isMobile) await page.getByRole("button", { name: /القائمة/ }).first().click();
  const link = page.getByRole("link", { name: "رحلة الأنبياء" }).first();
  await expect(link).toHaveAttribute("href", "/Serah/kid/journey/");
  await expect(page.getByRole("link", { name: "إدارة الرحلة" })).toHaveCount(0);
  await page.goto("/Serah/kid/journey/?tier=high");
  await expect(page).toHaveURL(/\/Serah\/kid\/journey\//);
  await expect(page.locator("#station-musa")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "التنقل الرئيسي" });
  await expect(nav.getByRole("link", { name: "لوحتي" })).toHaveAttribute("href", "/Serah/teacher/");
  await expect(nav.getByRole("link", { name: "النجوم" })).toHaveCount(0);
  await expect(page.locator("#station-musa").getByRole("link", { name: "ادخل الصفحة" })).toHaveAttribute("href", "/Serah/kid/prophet/?id=musa");
  await page.goto("/Serah/kid/prophet/?id=musa");
  await expect(page).toHaveURL(/\/Serah\/kid\/prophet\//);
  await page.goto("/Serah/kid/stars/");
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
});

test("كل الأنبياء الخمسة والعشرين: الرمز يمر على كل أشكاله بدون أي خطأ، والنبذة موجودة", async ({ page, isMobile }) => {
  test.skip(isMobile, "يكفي على الكمبيوتر");
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const ids = (JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "content", "prophets-content.json"), "utf8")).prophets as { id: string }[]).map((p) => p.id);
  expect(ids).toHaveLength(25);
  await open(page, ids[0]);
  for (const id of ids) {
    await page.goto(`/Serah/kid/prophet/?id=${id}&tier=high`);
    const stage = page.getByRole("region", { name: /^رمز سيدنا/ });
    await expect(stage).toBeVisible();
    await expect(page.getByRole("heading", { name: /تعرّف على سيدنا/ })).toBeVisible();
    await expect.poll(() => shape(page), { timeout: 30_000 }).toBe("s0");
    const n = await stage.getByRole("tab").count();
    expect(n, id).toBeGreaterThanOrEqual(2);
    for (let k = 1; k <= n; k++) {
      await stage.getByRole("button", { name: /اضغط للشكل التالي/ }).click();
      await expect.poll(() => shape(page), { message: id }).toBe(`s${k % n}`);
    }
  }
  expect(errors).toEqual([]);
});

test("صفحة النبي تفتح من أولها حتى لو كانت الصفحة السابقة مفتوحة على آخرها", async ({ page }) => {
  await open(page, "noah");
  await expect(page.getByRole("heading", { name: /تعرّف على سيدنا/ })).toBeVisible();
  await page.evaluate(() => { const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis; const y = document.body.scrollHeight; if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await page.getByRole("link", { name: /رجوع للرحلة/ }).click();
  await expect(page).toHaveURL(/kid\/journey/);
  // تنقل داخل التطبيق (بدون إعادة تحميل) — هنا كانت الصفحة تفتح على آخرها
  await page.locator("#station-musa").getByRole("link", { name: "ادخل الصفحة" }).click();
  await expect(page).toHaveURL(/kid\/prophet\/\?id=musa/);
  await expect(page.getByRole("heading", { name: /تعرّف على سيدنا/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(5);
});
