import { test, expect, type Page, type Route } from "@playwright/test";

// الأفكار الثمانية: الأدعية والأحاديث، الملخص الأسبوعي، التلاوة، الحديقة، لوحة الأعمال، التحديات، الشهادات — بخادم وهمي
type Call = { action: string; [k: string]: unknown };
const ADMIN = { user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const KID = { user_id: "S1", name: "زيد", role: "student", class_id: "C1", avatar: "", gender: "m" };
const GIRL = { user_id: "S2", name: "مريم", role: "student", class_id: "C1", avatar: "", gender: "f" };
const PARENT = { user_id: "P1", name: "أم زيد", role: "parent", class_id: "", avatar: "mother", gender: "f" };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function backend(opts: { duas?: string[]; hadith?: string[] } = {}) {
  const calls: Call[] = [];
  const rel: Record<string, Record<string, string[]>> = { dua: {}, hadith: {} };
  (opts.duas ?? []).forEach((id) => { rel.dua[id] = ["C1"]; });
  (opts.hadith ?? []).forEach((id) => { rel.hadith[id] = ["C1"]; });
  const garden = { items: [{ surah: 114, reviews: 2, last_day: 0, confirmed: false }, { surah: 112, reviews: 8, last_day: 0, confirmed: true }], juz: false };
  const recs = [{ rec_id: "R1", user_id: "S1", name: "زيد", avatar: "", surah: 112, surah_name: "الإخلاص", file_id: "f1", duration_sec: 20, status: "pending", rating: 0, note: "", reviewed_at: "", created_at: "2026-11-24T10:00:00Z" }];
  const challenges: Record<string, unknown>[] = [{ ch_id: "CH1", title: "ختمة الفصل في رمضان", season: "ramadan", unit: "صفحة", goal: 100, starts: today(), ends: today(), active: true, total: 40, kids: 3, mine_total: 4, mine_today: 0 }];
  const deeds: Record<string, unknown>[] = [];
  const handler = async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    let data: unknown = [];
    const kind = String(b.kind ?? "");
    if (b.action === "classes") data = [{ class_id: "C1", name: "الفصل الأول", join_code: "X", teacher_id: "", teacher: "", teachers: [], kids: 2, lectures: 0, published: 0 }, { class_id: "C2", name: "فصل البراعم", join_code: "Y", teacher_id: "", teacher: "", teachers: [], kids: 0, lectures: 0, published: 0 }];
    if (b.action === "releases") data = Object.entries(rel[kind] ?? {}).map(([zikr_id, classes]) => ({ zikr_id, classes, note: "", file_id: "", file_kind: "", file_name: "", released_at: "2026-11-20" }));
    if (b.action === "saveRelease") { rel[kind][String(b.item_id)] = b.classes as string[]; data = { zikr_id: b.item_id, classes: b.classes }; }
    if (b.action === "kidReleases") data = Object.entries(rel[kind] ?? {}).filter(([, c]) => c.includes("C1")).map(([zikr_id], i) => ({ zikr_id, note: i === 0 ? "نحفظه هذا الأسبوع" : "", file_id: "", file_kind: "", file_name: "", released_at: `2026-11-2${i}` }));
    if (b.action === "duaDone") data = { stars: 1 };
    if (b.action === "myAchievements") data = [{ key: "hd:S1:x", kind: "hadith", title: "الكلمة الطيبة صدقة", stars: 2, at: "2026-11-22" }];
    if (b.action === "garden") data = garden;
    if (b.action === "gardenReview") { garden.items[0].reviews++; garden.items[0].last_day = Number(today().replace(/-/g, "")); data = { reviews: garden.items[0].reviews, already: false }; }
    if (b.action === "confirmSurah") { const it = garden.items.find((i) => i.surah === Number(b.surah)); if (it) it.confirmed = b.on !== false; data = { stars: 10, juz: false }; }
    if (b.action === "students") data = [{ user_id: "S1", name: "زيد", avatar: "", gender: "m", points: 3, created_at: "2026-01-01" }];
    if (b.action === "kidAchievements") data = [];
    if (b.action === "kidAchievement") data = { stars: 2 };
    if (b.action === "recitations" || b.action === "myRecitations") data = recs;
    if (b.action === "reviewRecitation") { recs[0].status = "reviewed"; recs[0].rating = Number(b.rating); recs[0].note = String(b.note); data = { stars: 2 }; }
    if (b.action === "challenges") data = challenges;
    if (b.action === "challengeLog") { challenges[0].mine_today = b.count; challenges[0].total = 40 + Number(b.count); data = { total: challenges[0].total, stars: 0 }; }
    if (b.action === "saveChallenge") { challenges.push({ ch_id: "CH2", title: b.title, season: b.season, unit: b.unit, goal: b.goal, starts: b.starts, ends: b.ends, active: true, total: 0, kids: 0, mine_total: 0, mine_today: 0 }); data = { ch_id: "CH2" }; }
    if (b.action === "parentKids") data = [{ user_id: "S1", name: "زيد", avatar: "", gender: "m", class_name: "الفصل الأول" }];
    if (b.action === "parentKid") data = { kid: { user_id: "S1", name: "زيد", avatar: "", gender: "m", class_name: "الفصل الأول" }, points: 42, rank: 2, total: 9, lectures: { published: 5, attended: 4, recent: [] }, quizzes: [], homework: [], prayers: {}, azkar14: 6, achievements: [] };
    if (b.action === "parentDigest") data = { name: "زيد", gender: "m", prayers: 30, prayers_total: 35, azkar: 9, duas: 5, homework: 2, stars: 24, recitations: 1, deeds: 4, achievements: ["سورة الناس"] };
    if (b.action === "addDeed") { deeds.push({ deed_id: "D" + deeds.length, deed: b.deed, note: b.note, day: Number(today().replace(/-/g, "")), stars: 1, at: new Date().toISOString(), by: "أم زيد", by_gender: "f", mine: true }); data = { deed_id: "D", stars: 1 }; }
    if (b.action === "parentDeeds" || b.action === "kidDeeds") data = deeds.length ? deeds : [{ deed_id: "D0", deed: "birr", note: "", day: Number(today().replace(/-/g, "")), stars: 1, at: new Date().toISOString(), by: "أم زيد", by_gender: "f", mine: false }];
    if (b.action === "certificates") data = { kid: { name: "زيد", gender: "m", class_name: "الفصل الأول" }, teacher: "أ. مروة", items: [{ id: "AB12CD34", kind: "surah", title: "سورة الإخلاص", at: "2026-11-22T10:00:00Z" }, { id: "ZX98YT76", kind: "stage", title: "المرحلة الأولى: من آدم إلى صالح عليهم السلام", at: "2026-11-21T10:00:00Z" }] };
    if (b.action === "me") data = { points: 10, attended: [], rank: 1, total: 2 };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  };
  return { calls, handler };
}
async function as(page: Page, be: ReturnType<typeof backend>, user: object) {
  await page.route(/script\.google\.com\/macros/, be.handler);
  // مرة واحدة فقط (حتى يمكن تبديل الحساب داخل الاختبار بدون أن يرجعه السكربت مع كل تنقل)
  await page.addInitScript((u) => { if (!localStorage.getItem("serah_token")) { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); } }, user);
}
const watch = (page: Page) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); return errors; };

test("الأدمن: تفتح دعاءً وحديثًا لفصل من لوحة الفتح", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/duas-release/");
  const first = page.getByTestId("release-card").first();
  await expect(first).toContainText("قبل الطعام");
  await first.getByRole("button", { name: "فصل البراعم" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "saveRelease")).toMatchObject({ kind: "dua", item_id: "eat-before", classes: ["C2"] });
  await expect(first.getByRole("button", { name: "فصل البراعم" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/Serah/teacher/hadith-release/");
  await page.getByTestId("release-card").first().getByRole("button", { name: "الفصل الأول" }).click();
  await expect.poll(() => be.calls.filter((c) => c.action === "saveRelease").pop()).toMatchObject({ kind: "hadith", classes: ["C1"] });
  expect(errors).toEqual([]);
});

test("الطفل: أدعية فصله فقط، و«قلته» على كلها تعطي نجمة اليوم", async ({ page }) => {
  const be = backend({ duas: ["eat-before", "sleep"] }); const errors = watch(page);
  await as(page, be, KID);
  await page.goto("/Serah/kid/duas/");
  await expect(page.getByTestId("dua-card")).toHaveCount(2);
  await expect(page.getByText("نحفظه هذا الأسبوع")).toBeVisible();
  const cards = page.getByTestId("dua-card");
  await cards.nth(0).getByRole("button", { name: /قلته/ }).click();
  expect(be.calls.some((c) => c.action === "duaDone")).toBe(false);
  await cards.nth(1).getByRole("button", { name: /قلته/ }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "duaDone")?.date).toBe(today());
  await expect(page.getByText(/قلت أدعيتك كلها/)).toBeVisible();
  // الدليل يُفتح
  await cards.nth(0).getByRole("button", { name: "الدليل" }).click();
  await expect(cards.nth(0).getByText(/المرجع/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("الطفلة: الأحاديث المفتوحة بصيغة المؤنث وشارة المحفوظ", async ({ page }) => {
  const be = backend({ hadith: ["kalima", "niyyah"] }); const errors = watch(page);
  await as(page, be, GIRL);
  await page.goto("/Serah/kid/hadith/");
  await expect(page.getByTestId("hadith-card")).toHaveCount(2);
  await expect(page.getByText(/حفظتِ ١ من ٢/)).toBeVisible();
  await expect(page.getByTestId("hadith-card").filter({ hasText: "الكلمة الطيبة صدقة" })).toContainText("حفظتِه");
  await expect(page.getByText(/احفظيه وسمّعيه/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("الحديقة: الطفل يراجع سورة فتكبر شجرتها، والمعلمة تؤكد الحفظ", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, KID);
  await page.goto("/Serah/kid/garden/");
  await expect(page.getByTestId("tree")).toHaveCount(37);
  await expect(page.locator('[data-surah="112"] svg')).toHaveAttribute("data-stage", "4");
  await page.locator('[data-testid="tree"][data-surah="114"]').click();
  await page.getByRole("button", { name: "راجعتها" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "gardenReview")?.surah).toBe(114);
  await expect(page.locator('[data-surah="114"] svg')).toHaveAttribute("data-stage", "2");
  expect(errors).toEqual([]);
});

test("المعلمة: حفظ الطلاب (تأكيد سورة وتسجيل حديث) وتقييم تلاوة", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, { ...ADMIN, role: "teacher" });
  await page.goto("/Serah/teacher/hifz/");
  await page.locator('[data-testid="tree"][data-surah="114"]').click();
  await page.getByRole("button", { name: "تأكيد الحفظ" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "confirmSurah")).toMatchObject({ user_id: "S1", surah: 114, on: true });
  await page.getByRole("tab", { name: "الأحاديث" }).click();
  await page.getByTestId("hadith-toggle").first().click();
  await expect.poll(() => be.calls.find((c) => c.action === "kidAchievement")).toMatchObject({ kind: "hadith", user_id: "S1" });
  await page.goto("/Serah/teacher/recitations/");
  await page.getByRole("button", { name: "قيّمي" }).click();
  await page.getByRole("radio", { name: /ما شاء الله/ }).click();
  await page.getByLabel("الملاحظة").fill("أحسنت التجويد");
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "reviewRecitation")).toMatchObject({ rec_id: "R1", rating: 3, note: "أحسنت التجويد" });
  expect(errors).toEqual([]);
});

test("الطفل: صفحة التلاوة تعرض تسجيلاته وزر التسجيل", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, KID);
  await page.goto("/Serah/kid/recite/");
  await expect(page.getByRole("heading", { name: "سجّل تلاوتك" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ابدأ التسجيل" })).toBeVisible();
  await expect(page.getByTestId("my-rec")).toContainText("تنتظر المعلمة");
  expect(errors).toEqual([]);
});

test("التحديات: المعلمة تبدأ تحديًا من قالب، والطفل يسجّل مساهمته", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, { ...ADMIN, role: "teacher" });
  await page.goto("/Serah/teacher/challenges/");
  await page.getByRole("radio", { name: /عشر ذي الحجة/ }).click();
  await page.getByTestId("template").first().click();
  await page.getByRole("button", { name: "ابدأ التحدي" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "saveChallenge")).toMatchObject({ season: "dhulhijja", title: "تكبيرات العشر", unit: "تكبيرة" });
  await page.evaluate((u) => localStorage.setItem("serah_user", JSON.stringify(u)), KID);
  await page.goto("/Serah/kid/challenges/");
  const ch = page.getByTestId("challenge").first();
  await ch.getByRole("button", { name: "أكثر" }).click();
  await ch.getByRole("button", { name: "أكثر" }).click();
  await ch.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "challengeLog")).toMatchObject({ ch_id: "CH1", count: 2, date: today() });
  expect(errors).toEqual([]);
});

test("ولي الأمر: ملخص الأسبوع، وملصق عمل صالح، والطفل يراه في لوحته", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, PARENT);
  await page.goto("/Serah/parent/");
  await expect(page.getByTestId("digest")).toContainText("ملخص أسبوع زيد");
  await expect(page.getByTestId("digest")).toContainText("٣٠ / ٣٥");
  await page.getByRole("link", { name: /لوحة الأعمال الصالحة/ }).click();
  await page.getByTestId("deed-btn").filter({ hasText: "صدقة" }).click();
  await expect.poll(() => be.calls.find((c) => c.action === "addDeed")).toMatchObject({ kid_id: "S1", deed: "sadaqa" });
  await expect(page.getByText("ملصقاتك النهارده")).toBeVisible();
  await page.evaluate((u) => localStorage.setItem("serah_user", JSON.stringify(u)), KID);
  await page.goto("/Serah/kid/deeds/");
  await expect(page.getByTestId("deed-day").last()).toContainText("صدقة");
  await expect(page.getByTestId("deed-day").last()).toContainText("ماما");
  expect(errors).toEqual([]);
});

test("الشهادات: القائمة وفتح الشهادة للطباعة بصيغة الطالب", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, KID);
  await page.goto("/Serah/kid/certificates/");
  await expect(page.getByTestId("cert-item")).toHaveCount(2);
  await page.getByTestId("cert-item").first().click();
  const cert = page.getByTestId("certificate");
  await expect(cert).toContainText("بأن الطالب");
  await expect(cert).toContainText("زيد");
  await expect(cert).toContainText("سورة الإخلاص");
  await expect(cert).toContainText("AB12CD34");
  await expect(page.getByRole("button", { name: /طباعة/ })).toBeVisible();
  const box = await cert.boundingBox(); const vw = page.viewportSize()!.width;
  expect(box!.width).toBeLessThanOrEqual(vw);
  expect(errors).toEqual([]);
});

test("الصفحة الرئيسية للطفل فيها روابط الأفكار الجديدة بلا تمرير أفقي", async ({ page }) => {
  const be = backend(); const errors = watch(page);
  await as(page, be, KID);
  await page.goto("/Serah/kid/");
  for (const name of ["أدعية اليوم والليلة", "أحاديث نحفظها", "حديقة جزء عمّ", "سجّل تلاوتك", "تحديات الفصل", "أعمالي الصالحة", "شهاداتي"]) await expect(page.getByRole("link", { name })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
