import { test, expect, type Page, type Route } from "@playwright/test";

// المرحلة 3: الرحلة من جدول Prophets، صفحة النبي (مع فيديو يوتيوب)، وإدارة الرحلة والمحتوى للأدمن — على خلفية وهمية

type Call = { action: string; [k: string]: unknown };
type Row = { prophet_id: string; name: string; title: string; tag: string; text: string; symbol: string; symbol_name: string; visible: boolean };
type Item = { item_id: string; prophet_id: string; kind: string; title: string; body: string; file_id: string; url: string; visible: boolean; approved: boolean };

const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };

async function mock(page: Page, init: { prophets?: Row[]; items?: Item[] } = {}) {
  const calls: Call[] = [];
  const db = { prophets: (init.prophets ?? []).map((p) => ({ ...p })), items: (init.items ?? []).map((i) => ({ ...i })) };
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    const out = (p: Row) => ({ prophet_id: p.prophet_id, name: p.name, title: p.title, tag: p.tag, text: p.text, symbol: p.symbol, symbol_name: p.symbol_name });
    switch (b.action) {
      case "journey": return ok(db.prophets.filter((p) => p.visible).map(out));
      case "journeyAdmin": return ok(db.prophets.map((p) => ({ ...out(p), visible: p.visible, items: db.items.filter((i) => i.prophet_id === p.prophet_id).length, pending: db.items.filter((i) => i.prophet_id === p.prophet_id && !i.approved).length })));
      case "seedProphets": db.prophets = (b.list as Row[]).map((p) => ({ ...p, visible: true })); return ok(db.prophets.length);
      case "saveProphet": { const p = db.prophets.find((x) => x.prophet_id === b.prophet_id)!; Object.assign(p, { name: b.name, text: b.text, visible: b.visible ?? p.visible }); return ok(p.prophet_id); }
      case "reorderProphets": db.prophets = (b.ids as string[]).map((id) => db.prophets.find((p) => p.prophet_id === id)!); return ok(true);
      case "prophet": {
        const p = db.prophets.find((x) => x.prophet_id === b.id)!;
        const items = db.items.filter((i) => i.prophet_id === b.id && (b.preview || (i.visible && i.approved)));
        return ok({ prophet: out(p), items });
      }
      case "saveContent": { const it = { item_id: "c" + (db.items.length + 1), prophet_id: b.prophet_id as string, kind: b.kind as string, title: (b.title as string) || "", body: (b.body as string) || "", file_id: "", url: b.kind === "youtube" ? "dQw4w9WgXcQ" : "", visible: true, approved: !!b.approved }; db.items.push(it); return ok(it.item_id); }
      case "setContentFlags": { const it = db.items.find((i) => i.item_id === b.item_id)!; if (b.approved !== undefined) it.approved = b.approved as boolean; if (b.visible !== undefined) it.visible = b.visible as boolean; return ok(true); }
      case "lectures": return ok([{ lecture_id: "L1", class_id: "C1", title: "قصة سيدنا نوح", date: "2026-11-01", audio_file_id: "f", duration_sec: 60, status: "published", images: [] }]);
      case "me": return ok({ points: 0, attended: [], rank: 1, total: 1 });
      case "dashboard": return ok({ kids: 0, lectures: 0, published: 0, drafts: 0, attendanceRate: 0, totalPoints: 0, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 });
      default: return ok([]);
    }
  });
  return { calls, db };
}
async function as(page: Page, user: typeof KID | typeof ADMIN) {
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t-" + u.user_id); localStorage.setItem("serah_user", JSON.stringify(u)); localStorage.setItem("serah_journey_menu", "full"); }, user);
}
const P = (prophet_id: string, name: string, extra: Partial<Row> = {}): Row => ({ prophet_id, name, title: `سيدنا ${name} عليه السلام`, tag: "", text: `نص ${name}`, symbol: "", symbol_name: "", visible: true, ...extra });

test("الرحلة تقرأ الأقسام من الخلفية: الترتيب والإخفاء، وزر «ادخل الصفحة»", async ({ page }) => {
  await mock(page, { prophets: [P("noah", "نوح", { symbol: "ark", symbol_name: "السفينة" }), P("adam", "آدم"), P("idris", "إدريس", { visible: false }), P("yusuf", "يوسف", { symbol: "yusuf_dream" })] });
  await as(page, KID);
  await page.goto("/Serah/kid/journey/?tier=high");
  await expect.poll(() => page.locator("[data-station]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.station))).toEqual(["start", "noah", "adam", "yusuf", "sira", "quran"]);
  await expect(page.locator("#station-noah")).toContainText("المحطة ١ · السفينة");
  const enter = page.locator("#station-noah").getByRole("link", { name: "ادخل الصفحة" });
  await expect(enter).toHaveAttribute("href", "/Serah/kid/prophet/?id=noah");
  await expect(page.locator("#station-sira").getByRole("link", { name: "ادخل الصفحة" })).toHaveCount(0);
  // المجسم يتبع القسم بعد إعادة البناء من بيانات الخلفية
  await page.evaluate(() => { const el = document.getElementById("station-yusuf")!; const l = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis; const y = el.offsetTop + el.offsetHeight / 2 - innerHeight / 2; if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __serah: { debug: () => { shape: string } | null } }).__serah.debug()?.shape), { timeout: 30_000 }).toBe("yusuf");
});

test("صفحة النبي للطفل: نص وفيديو يوتيوب ومحاضرات عنه، والمحتوى غير المعتمد لا يظهر", async ({ page }) => {
  await mock(page, {
    prophets: [P("noah", "نوح", { symbol_name: "السفينة" })],
    items: [
      { item_id: "c1", prophet_id: "noah", kind: "text", title: "القصة", body: "بنى السفينة بأمر الله", file_id: "", url: "", visible: true, approved: true },
      { item_id: "c2", prophet_id: "noah", kind: "youtube", title: "فيديو القصة", body: "", file_id: "", url: "dQw4w9WgXcQ", visible: true, approved: true },
      { item_id: "c3", prophet_id: "noah", kind: "text", title: "مسودة", body: "لم تراجع", file_id: "", url: "", visible: true, approved: false },
    ],
  });
  await as(page, KID);
  await page.goto("/Serah/kid/prophet/?id=noah");
  await expect(page.getByRole("heading", { name: "سيدنا نوح عليه السلام" })).toBeVisible();
  await expect(page.getByText("بنى السفينة بأمر الله")).toBeVisible();
  const frame = page.locator("iframe[title='فيديو القصة']");
  await expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  await expect(page.getByText("لم تراجع")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /قصة سيدنا نوح/ })).toHaveAttribute("href", "/Serah/kid/lecture/?id=L1");
  await expect(page.getByRole("link", { name: "رجوع للرحلة" })).toBeVisible();
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/prophet-kid-${test.info().project.name}.png`, fullPage: true });
});

test("الأدمن: استيراد الأقسام، ترتيب، إخفاء، والطفل لا يدخل الإدارة", async ({ page }) => {
  const { calls } = await mock(page);
  await as(page, ADMIN);
  await page.goto("/Serah/teacher/journey/");
  await page.getByRole("button", { name: "استيراد أقسام الرحلة" }).click();
  await expect.poll(() => (calls.find((c) => c.action === "seedProphets")?.list as unknown[] | undefined)?.length).toBe(25);
  await expect(page.getByTestId("prophet-row")).toHaveCount(25);
  await expect(page.getByTestId("prophet-row").nth(10)).toContainText("الشمس والقمر والكواكب");
  await page.getByRole("button", { name: "تحريك آدم لأسفل" }).click();
  await expect.poll(() => (calls.find((c) => c.action === "reorderProphets")?.ids as string[] | undefined)?.slice(0, 2)).toEqual(["idris", "adam"]);
  await expect(page.getByTestId("prophet-row").first()).toContainText("إدريس");
  await page.getByLabel("إظهار نوح").click();
  await expect.poll(() => calls.find((c) => c.action === "saveProphet")).toMatchObject({ prophet_id: "noah", visible: false });
  await expect(page.getByTestId("prophet-row").filter({ hasText: "نوح" })).toContainText("مخفي");
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/journey-admin-${test.info().project.name}.png` });
});

test("الأدمن: إضافة فيديو يوتيوب بمعاينة حية، والاعتماد، ومعاينة كطفل", async ({ page }) => {
  const { calls } = await mock(page, { prophets: [P("noah", "نوح")] });
  await as(page, ADMIN);
  await page.goto("/Serah/teacher/journey/prophet/?id=noah");
  await page.getByRole("button", { name: /فيديو يوتيوب/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("العنوان").fill("قصة السفينة");
  const save = dialog.getByRole("button", { name: "حفظ" });
  await dialog.getByLabel("رابط الفيديو على يوتيوب").fill("https://vimeo.com/123");
  await expect(dialog.getByText("الرابط غير صحيح")).toBeVisible();
  await expect(save).toBeDisabled();
  await dialog.getByLabel("رابط الفيديو على يوتيوب").fill("https://youtu.be/dQw4w9WgXcQ?si=abc");
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /embed\/dQw4w9WgXcQ/);
  await save.click();
  await expect.poll(() => calls.find((c) => c.action === "saveContent")).toMatchObject({ kind: "youtube", prophet_id: "noah", title: "قصة السفينة", approved: false });
  const row = page.getByTestId("content-row");
  await expect(row).toContainText("بانتظار الاعتماد");
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/prophet-admin-${test.info().project.name}.png`, fullPage: true });
  // غير المعتمد لا يظهر في معاينة الطفل
  await page.getByRole("tab", { name: "معاينة كطفل" }).click();
  await expect(page.getByText("قريبًا محتوى جديد")).toBeVisible();
  await page.getByRole("tab", { name: "المحتوى" }).click();
  await row.getByRole("button", { name: "اعتماد" }).click();
  await expect(row).toContainText("معتمد");
  await page.getByRole("tab", { name: "معاينة كطفل" }).click();
  await expect(page.locator("iframe[title='قصة السفينة']")).toBeVisible();
});

test("الطفل لا يصل لإدارة الرحلة، والمعلمة غير الأدمن لا ترى رابطها", async ({ page }) => {
  await mock(page);
  await as(page, KID);
  await page.goto("/Serah/teacher/journey/");
  await expect(page).toHaveURL(/\/Serah\/kid\/$/);
});
