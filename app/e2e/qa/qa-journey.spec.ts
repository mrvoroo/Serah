import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// QA: كل نبي في الرحلة برمزه الصحيح وبالترتيب، والقائمة/النقاط بنفس الترتيب
const SHOTS = process.env.QA_SHOTS || path.join(__dirname, "..", "..", "test-results", "qa");
fs.mkdirSync(SHOTS, { recursive: true });
const J = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "src", "content", "prophets-content.json"), "utf8")).prophets as { id: string; name: string; symbol: { main: string; label: string } }[];
const arNum = (n: number) => n.toLocaleString("ar-EG");

// صفوف جدول قديم (كما استوردتها الأدمن من النسخة السابقة): رموز نوح/إبراهيم/يوسف/موسى/يونس/محمد فقط
const OLD: Record<string, [string, string]> = { noah: ["ark", "السفينة"], ibrahim: ["kaaba", "الكعبة"], yusuf: ["yusuf_dream", "رؤيا الشمس والقمر والكواكب"], musa: ["staff", "العصا"], yunus: ["whale", "الحوت"], muhammad: ["mushaf", "المصحف"] };

async function open(page: Page, rows: "none" | "old", user = { user_id: "k1", name: "زيد", role: "student", class_id: "c1", avatar: "" }) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const data = b.action === "journey" && rows === "old"
      ? J.map((p) => ({ prophet_id: p.id, name: p.id === "muhammad" ? "محمد ﷺ" : p.name.replace(/ عليه السلام$/, ""), title: "", tag: "", text: "نص", symbol: OLD[p.id]?.[0] ?? "", symbol_name: OLD[p.id]?.[1] ?? "" }))
      : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); localStorage.setItem("serah_journey_menu", "full"); }, user);
  await page.goto("/Serah/kid/journey/?tier=high");
  await page.waitForFunction(() => !!(window as unknown as { __serah?: { debug: () => unknown } }).__serah?.debug(), null, { timeout: 60_000 });
  await page.waitForTimeout(2000);
  return errors;
}
const scrollTo = (page: Page, id: string) => page.evaluate((id) => {
  const el = document.getElementById(`station-${id}`)!;
  const y = el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
  const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
  if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
}, id);
const dbg = (page: Page) => page.evaluate(() => (window as unknown as { __serah: { debug: () => { shape: string; progress: number } } }).__serah.debug());

for (const rows of ["none", "old"] as const) {
  test(`الرحلة: ٢٥ محطة بالترتيب، كل بطاقة باسم النبي ورمزه من المحتوى المراجَع (جدول: ${rows})`, async ({ page }, info) => {
    test.setTimeout(400_000);
    const errors = await open(page, rows);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-station]")].map((s) => s.dataset.station!));
    expect(ids).toEqual(["start", ...J.map((p) => p.id), "sira", "quran"]);
    const SHOT = new Set(["adam", "hud", "salih", "yusuf", "musa", "sulayman", "yunus", "muhammad"]);
    const mismatches: string[] = [];
    for (const [i, p] of J.entries()) {
      const card = page.locator(`#station-${p.id} [data-card]`);
      const tag = (await card.locator("span").first().textContent())?.trim();
      const want = `المحطة ${arNum(i + 1)} · ${p.symbol.label}`;
      if (tag !== want) mismatches.push(`${p.id}: tag="${tag}" expected="${want}"`);
      const h = await card.locator("h2").textContent();
      if (!h?.includes(p.name.replace(/ عليه السلام$/, "").replace(/ ﷺ$/, ""))) mismatches.push(`${p.id}: title=${h}`);
      await expect(card.getByRole("link", { name: "ادخل الصفحة" })).toHaveAttribute("href", `/Serah/kid/prophet/?id=${p.id}`);
      if (rows === "none" || SHOT.has(p.id)) {
        await scrollTo(page, p.id);
        await expect.poll(async () => (await dbg(page)).shape, { message: p.id, timeout: 20_000 }).toBe(p.id);
        if (SHOT.has(p.id) && rows === "none") {
          await expect.poll(async () => (await dbg(page)).progress, { timeout: 15_000 }).toBeGreaterThan(0.97);
          await page.waitForTimeout(300);
          await page.screenshot({ path: `${SHOTS}/journey-${info.project.name}-${String(i + 1).padStart(2, "0")}-${p.id}.png` });
        }
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("الرحلة: ترتيب القائمة/النقاط/زر المحطات مطابق للمحتوى", async ({ page, isMobile }, info) => {
  await open(page, "none");
  const names = J.map((p) => (p.id === "muhammad" ? "محمد ﷺ" : p.name.replace(/ عليه السلام$/, "")));
  if (!isMobile) {
    const menu = page.getByRole("navigation", { name: "محطات الرحلة" });
    const groups = await menu.locator("button[aria-expanded]").allTextContents();
    const order: string[] = [];
    for (const g of groups) {
      const b = menu.locator("button[aria-expanded]").filter({ hasText: g.trim() }).first();
      if ((await b.getAttribute("aria-expanded")) !== "true") await b.click();
      await page.waitForTimeout(400);
      const got = await menu.getByRole("button").allTextContents();
      for (const t of got.map((t) => t.replace(/[٠-٩]+/g, "").trim())) if (names.includes(t) && !order.includes(t)) order.push(t);
    }
    expect(order).toEqual(names);
    await page.screenshot({ path: `${SHOTS}/journey-menu-${info.project.name}.png` });
    await page.getByRole("button", { name: "إخفاء قائمة المحطات" }).click();
    const dots = await page.getByTestId("journey-menu").getByRole("navigation", { name: "محطات الرحلة" }).getByRole("button").evaluateAll((b) => b.map((x) => x.getAttribute("aria-label")));
    expect(dots.slice(1, 26)).toEqual(J.map((p) => (p.id === "muhammad" ? "سيدنا محمد ﷺ" : `سيدنا ${p.name}`)));
    await page.screenshot({ path: `${SHOTS}/journey-dots-${info.project.name}.png` });
  } else {
    await page.getByRole("button", { name: /^المحطات/ }).click();
    const sheet = page.getByRole("dialog");
    const groups = await sheet.locator("button[aria-expanded]").allTextContents();
    const order: string[] = [];
    for (const g of groups) {
      const b = sheet.locator("button[aria-expanded]").filter({ hasText: g.trim() }).first();
      if ((await b.getAttribute("aria-expanded")) !== "true") await b.click();
      await page.waitForTimeout(400);
      const got = await sheet.getByRole("button").allTextContents();
      for (const t of got.map((t) => t.replace(/[٠-٩]+/g, "").trim())) if (names.includes(t) && !order.includes(t)) order.push(t);
    }
    await page.screenshot({ path: `${SHOTS}/journey-sheet-${info.project.name}.png` });
    expect(order).toEqual(names);
    await sheet.getByRole("button", { name: "يونس", exact: true }).click();
    await expect.poll(async () => (await dbg(page)).shape, { timeout: 15_000 }).toBe("yunus");
    await expect(page.getByRole("button", { name: /^المحطات/ })).toHaveAccessibleName(/٢١ من ٢٥ — سيدنا يونس/);
    // لا سكرول أفقي
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
});
