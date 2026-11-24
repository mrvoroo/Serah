import { test, expect, type Page, type Route } from "@playwright/test";

// أذكار الصباح والمساء (الكبار والأطفال وصفحة الأدمن)، والألعاب، وأولياء الأمور — بخادم وهمي
type Call = { action: string; [k: string]: unknown };
const ADMIN = { user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const KID = { user_id: "S1", name: "زيد", role: "student", class_id: "C1", avatar: "", gender: "m" };
const GIRL = { user_id: "S2", name: "مريم", role: "student", class_id: "C1", avatar: "", gender: "f" };
const PARENT = { user_id: "P1", name: "أم زيد", role: "parent", class_id: "", avatar: "mother", gender: "f" };

function backend(opts: { released?: string[]; prophets?: number } = {}) {
  const calls: Call[] = [];
  const rel: Record<string, string[]> = { ikhlas: opts.released ? ["C1"] : [] };
  (opts.released ?? []).forEach((id) => { rel[id] = ["C1"]; });
  const progress: { game: string; level: number; best: number }[] = [];
  const journey = Array.from({ length: opts.prophets ?? 4 }, (_, i) => ({ prophet_id: ["adam", "idris", "noah", "hud", "salih", "ibrahim", "lut", "ismail"][i], name: ["آدم", "إدريس", "نوح", "هود", "صالح", "إبراهيم", "لوط", "إسماعيل"][i], title: "", tag: "", text: "", symbol: "", symbol_name: "" }));
  const handler = async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    let data: unknown = [];
    let error = "";
    if (b.action === "classes") data = [{ class_id: "C1", name: "الفصل الأول", join_code: "X", teacher_id: "", teacher: "", teachers: [], kids: 2, lectures: 0, published: 0 }, { class_id: "C2", name: "فصل البراعم", join_code: "Y", teacher_id: "", teacher: "", teachers: [], kids: 0, lectures: 0, published: 0 }];
    if (b.action === "azkarReleases") data = Object.entries(rel).map(([zikr_id, classes]) => ({ zikr_id, classes, note: "", file_id: "", file_kind: "", file_name: "", released_at: "2026-11-20" }));
    if (b.action === "saveAzkarRelease") { rel[String(b.zikr_id)] = b.classes as string[]; data = { zikr_id: b.zikr_id, classes: b.classes }; }
    if (b.action === "kidAzkar") data = Object.entries(rel).filter(([, c]) => c.includes("C1")).map(([zikr_id], i) => ({ zikr_id, note: i === 0 ? "نحفظها هذا الأسبوع" : "", file_id: "", file_kind: "", file_name: "", released_at: `2026-11-2${i}` }));
    if (b.action === "azkarDone") data = { stars: 2 };
    if (b.action === "games") data = { prophets: journey.length, need: [3, 5, 7], stars: 2, progress };
    if (b.action === "journey") data = journey;
    if (b.action === "gameStart") { if (Number(b.level) > 1 && !progress.some((p) => p.game === b.game && p.level === Number(b.level) - 1)) error = "أكمل المستوى السابق أولًا"; else data = { ok: true }; }
    if (b.action === "gameDone") { const passed = Number(b.score) >= 60; if (passed && !progress.some((p) => p.game === b.game && p.level === Number(b.level))) { progress.push({ game: String(b.game), level: Number(b.level), best: Number(b.score) }); data = { passed, stars: 2 }; } else data = { passed, stars: 0 }; }
    if (b.action === "parentKids") data = [{ user_id: "S1", name: "زيد", avatar: "", gender: "m", class_name: "الفصل الأول" }];
    if (b.action === "parentKid") data = { kid: { user_id: "S1", name: "زيد", avatar: "", gender: "m", class_name: "الفصل الأول" }, points: 42, rank: 2, total: 9, lectures: { published: 5, attended: 4, recent: [{ title: "قصة نوح", date: "2026-11-20", attended: true }] }, quizzes: [{ title: "اختبار نوح", score: 8, total: 10, stars: 16, at: "2026-11-21" }], homework: [], prayers: {}, azkar14: 6, achievements: [{ key: "su:S1:x", kind: "surah", title: "سورة النبأ", stars: 10, at: "2026-11-22" }] };
    if (b.action === "parentRegister") data = { token: "tp", user: PARENT };
    if (b.action === "students") data = [{ user_id: "S1", name: "زيد", avatar: "", gender: "m", points: 3, created_at: "2026-01-01" }];
    if (b.action === "parentLinks") data = { parents: [], code_expires_at: "" };
    if (b.action === "parentCode") data = { code: "ABCD2345", expires_at: "2026-12-08T00:00:00Z", name: "زيد" };
    if (b.action === "kidAchievements") data = [];
    if (b.action === "kidAchievement") data = { stars: 10 };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(error ? { ok: false, error } : { ok: true, data }) });
  };
  return { calls, handler, rel };
}
async function as(page: Page, be: ReturnType<typeof backend>, user: object | null) {
  await page.route(/script\.google\.com\/macros/, be.handler);
  if (user) await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
}
const watch = (page: Page) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); return errors; };

test("المعلمة: أذكار الصباح والمساء كاملة ومختصرة، مع الفضل والدليل والعدّ", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/azkar/");
  await expect(page.getByRole("heading", { name: /أذكار (الصباح|المساء)/ })).toBeVisible();
  const total = Number((await page.getByText(/ذكرًا ·/).textContent())?.match(/[٠-٩]+/)?.[0].replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  await page.getByRole("radio", { name: "مختصرة" }).click();
  const short = Number((await page.getByText(/ذكرًا ·/).textContent())?.match(/[٠-٩]+/)?.[0].replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  expect(short).toBeLessThan(total);
  // الفضل والدليل لا يُحسب ضغطة
  const card = page.getByTestId("zikr-card");
  await card.getByText("الفضل والدليل").click();
  await expect(card.getByText("المرجع")).toBeVisible();
  await expect(card.getByRole("button", { name: /قلته|عدّ/ })).toBeEnabled();
  await page.getByRole("radio", { name: "المساء" }).click();
  await expect(page.getByRole("heading", { name: "أذكار المساء" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("الأدمن: تفتح ذكرًا لفصل بالضغط على شريحته", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/azkar-release/");
  await expect(page.getByTestId("release-card").first()).toBeVisible();
  const first = page.getByTestId("release-card").first();
  await first.getByRole("button", { name: "فصل البراعم" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "saveAzkarRelease")?.classes).toEqual(["C2"]);
  await expect(first.getByRole("button", { name: "فصل البراعم" })).toHaveAttribute("aria-pressed", "true");
  await first.getByRole("button", { name: "كل الفصول" }).click();
  await expect.poll(() => (be.calls.filter((c) => c.action === "saveAzkarRelease").pop()?.classes as string[])?.sort()).toEqual(["C1", "C2"]);
  expect(errors).toEqual([]);
});

test("الطفل: لا أذكار قبل أن تفتحها المعلمة، ثم ذكر الأسبوع والنجوم عند الإتمام", async ({ page }) => {
  const be0 = backend(); const errors = watch(page);
  await as(page, be0, KID);
  await page.goto("/Serah/kid/azkar/");
  await expect(page.getByText(/أذكارك جاية قريب/)).toBeVisible();
  await page.unroute(/script\.google\.com\/macros/);
  const be = backend({ released: ["ikhlas"] });
  await page.route(/script\.google\.com\/macros/, be.handler);
  await page.reload();
  await expect(page.getByTestId("week-zikr")).toContainText("سورة الإخلاص");
  await expect(page.getByText("نحفظها هذا الأسبوع")).toBeVisible();
  // الإخلاص ٣ مرات (أو مرة حسب المحتوى): نضغط حتى تكتمل
  const btn = page.getByTestId("zikr-card").getByRole("button", { name: /قلته|عدّ/ });
  for (let i = 0; i < 5; i++) { if (!(await btn.count())) break; await btn.click(); }
  await expect.poll(() => be.calls.some((c) => c.action === "azkarDone")).toBe(true);
  await expect(page.getByText(/كسبت ٢ نجمة/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("الألعاب: كلها مفتوحة، المستوى الثاني مقفول حتى يكتمل الأول، وألعاب الأنبياء حسب الرحلة", async ({ page }) => {
  const be = backend({ prophets: 4 }); const errors = watch(page);
  await as(page, be, GIRL);
  await page.goto("/Serah/kid/games/");
  await expect(page.getByTestId("game-card")).toHaveCount(5);
  const asma = page.getByTestId("game-card").filter({ hasText: "وصّل الاسم بمعناه" });
  await expect(asma.getByLabel("المستوى ٢ مقفول")).toBeVisible();
  // ٤ أنبياء فقط: المستوى الثاني (يحتاج ٥) مقفول في ألعاب الأنبياء
  const match = page.getByTestId("game-card").filter({ hasText: "طابِق النبي برمزه" });
  await expect(match.getByRole("link", { name: /المستوى ١/ })).toBeVisible();
  await page.clock.install();
  await asma.getByRole("link", { name: /المستوى ١/ }).click();
  await expect(page.getByTestId("match-left")).toHaveCount(4);
  // نحل اللعبة: لكل اسم نختار معناه الصحيح (المعرّف في data-pair)
  for (let i = 0; i < 4; i++) {
    const left = page.getByTestId("match-left").nth(i);
    await left.click();
    // نجرب الإجابات حتى الصحيحة (الخطأ يُحسب)
    const rights = page.getByTestId("match-right");
    const n = await rights.count();
    for (let k = 0; k < n; k++) {
      if (await left.isDisabled()) break;
      const r = rights.nth(k);
      if (await r.isEnabled()) { await r.click(); }
    }
  }
  await page.clock.fastForward(10000);
  await expect(page.getByTestId("game-result")).toBeVisible();
  expect(be.calls.find((c) => c.action === "gameDone")).toMatchObject({ game: "asma", level: 1 });
  expect(errors).toEqual([]);
});

test("ولي الأمر: شاشة الدخول فيها الأب والأم وزيد، وحساب جديد بالكود يفتح متابعة الطفل", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, null);
  await page.goto("/Serah/parent/login/");
  await expect(page.getByTestId("family").getByRole("img")).toHaveCount(3);
  await page.getByRole("tab", { name: "حساب جديد بكود" }).click();
  await page.getByLabel(/كود ولي الأمر/).fill("abcd-2345");
  await page.getByRole("radio", { name: "أنا الأم" }).click();
  await page.getByLabel(/اسم الدخول/).fill("أم زيد");
  await page.getByLabel(/الرمز السري/).fill("481537");
  await page.getByRole("button", { name: /إنشاء الحساب/ }).click();
  await expect(page).toHaveURL(/\/parent\/$/);
  expect(be.calls.find((c) => c.action === "parentRegister")).toMatchObject({ code: "ABCD-2345", name: "أم زيد", pin: "481537", gender: "f" });
  await expect(page.getByText("سورة النبأ")).toBeVisible();
  await expect(page.getByText("٤ / ٥")).toBeVisible();
  // ولي الأمر لا يدخل لوحة المعلمات
  await page.goto("/Serah/teacher/");
  await expect(page).toHaveURL(/\/parent\/$/);
  expect(errors).toEqual([]);
});

test("المعلمة: كود ولي الأمر وتسجيل إنجاز من صفحة الطلاب", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/students/");
  await page.getByRole("button", { name: "ولي أمر زيد" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "إصدار كود" }).click();
  await expect(page.getByTestId("parent-code")).toHaveText("ABCD-2345");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "إنجازات زيد" }).click();
  await page.getByRole("dialog").getByLabel("اسم السورة أو الجزء").fill("سورة النبأ");
  await page.getByRole("dialog").getByRole("button", { name: "تسجيل" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "kidAchievement")).toMatchObject({ user_id: "S1", kind: "surah", title: "سورة النبأ" });
  expect(errors).toEqual([]);
});
