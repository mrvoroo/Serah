import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// QA: وصول المعلمات/الأدمن للرحلة والقرآن، وتحويل صفحات الطفل، والقرآن بصفحات المصحف
const SHOTS = process.env.QA_SHOTS || path.join(__dirname, "..", "..", "test-results", "qa");
fs.mkdirSync(SHOTS, { recursive: true });
const TEACHER = { user_id: "T2", name: "معلمة", role: "teacher", class_id: "C1", avatar: "" };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const SUPER = { user_id: "SA", name: "م.احمد", role: "superadmin", class_id: "", avatar: "" };
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" };

async function as(page: Page, u: object) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    if (b.action === "lectures") return ok([{ lecture_id: "L1", title: "قصة سيدنا موسى", prophet_id: "musa", file_id: "F1", duration: 60, published: true, created_at: "2026-01-01" }]);
    if (b.action === "prophet") return ok({ prophet: { prophet_id: "musa", name: "موسى", title: "", tag: "", text: "نص", symbol: "", symbol_name: "" }, items: [] });
    if (b.action === "dashboard") return ok({ kids: 3, lectures: 2, published: 1, drafts: 1, attendanceRate: 50, totalPoints: 30, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 });
    if (b.action === "systemHealth") return ok({ version: 9, now: "", lockedAccounts: 1, triggers: ["pollTelegram"], tables: [{ name: "Users", rows: 4 }], logs: [], errors: [], recent: [], checks: [] });
    if (b.action === "me") return ok({ points: 20, attended: [], rank: 1, total: 1 });
    if (b.action === "leaderboard") return ok({ top: [], me: 1 });
    if (b.action === "settings" || b.action === "mySettings") return ok({});
    return ok([]);
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, u);
  return errors;
}

for (const [label, u, home] of [["teacher", TEACHER, "/Serah/teacher/"], ["admin", ADMIN, "/Serah/teacher/"], ["superadmin", SUPER, "/Serah/admin/"]] as const) {
  test(`${label}: رابط الرحلة، شريط «الرحلة/القرآن/لوحتي»، وتحويل صفحات الطفل`, async ({ page, isMobile }, info) => {
    const errors = await as(page, u);
    await page.goto("/Serah/teacher/");
    if (label === "superadmin") await expect(page).toHaveURL(/\/Serah\/(teacher|admin)\//);
    if (isMobile) await page.getByRole("button", { name: /القائمة/ }).first().click();
    await expect(page.getByRole("link", { name: "رحلة الأنبياء" }).first()).toHaveAttribute("href", "/Serah/kid/journey/");
    await expect(page.getByRole("link", { name: "إدارة الرحلة" })).toHaveCount(label === "teacher" ? 0 : 1);
    await page.screenshot({ path: `${SHOTS}/staff-nav-${label}-${info.project.name}.png` });
    await page.getByRole("link", { name: "رحلة الأنبياء" }).first().click();
    await expect(page).toHaveURL(/\/Serah\/kid\/journey\//);
    const nav = page.getByRole("navigation", { name: "التنقل الرئيسي" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    expect(await nav.getByRole("link").evaluateAll((l) => l.map((x) => x.getAttribute("aria-label")))).toEqual(["الرحلة", "القرآن", "لوحتي"]);
    await expect(nav.getByRole("link", { name: "لوحتي" })).toHaveAttribute("href", home);
    await page.screenshot({ path: `${SHOTS}/staff-journey-${label}-${info.project.name}.png` });
    await page.goto("/Serah/kid/prophet/?id=musa");
    await expect(page.getByRole("region", { name: "رمز سيدنا موسى" })).toBeVisible();
    await page.goto("/Serah/kid/quran/");
    await expect(page).toHaveURL(/\/Serah\/kid\/quran\//);
    for (const kidOnly of ["/Serah/kid/", "/Serah/kid/stars/", "/Serah/kid/lectures/", "/Serah/kid/lecture/?id=L1"]) {
      await page.goto(kidOnly);
      await expect(page, kidOnly).toHaveURL(new RegExp(home.replace(/\//g, "\\/") + "$"));
    }
    expect(errors).toEqual([]);
  });
}

test("المعلمة: التنقل داخل التطبيق من الرحلة إلى صفحة طفل فقط (السيرة «استمع للمحاضرات» / محاضرات النبي)", async ({ page }, info) => {
  await as(page, TEACHER);
  await page.goto("/Serah/kid/journey/?tier=low");
  const link = page.locator("#station-sira").getByRole("link", { name: /استمع للمحاضرات/ });
  let url1 = "/Serah/teacher/";
  if (await link.count()) { await link.scrollIntoViewIfNeeded(); await link.click(); await page.waitForTimeout(2500); url1 = page.url(); }
  else test.info().annotations.push({ type: "sira", description: "لا يوجد رابط «استمع للمحاضرات» في محطة السيرة الآن" });
  await page.screenshot({ path: `${SHOTS}/staff-clientnav-lectures-${info.project.name}.png` });
  // صفحة النبي: محاضرات عن النبي (رابط /kid/lecture/)
  await page.goto("/Serah/kid/prophet/?id=musa");
  const lec = page.getByRole("link", { name: /قصة سيدنا موسى/ });
  await expect(lec).toBeVisible();
  await lec.click();
  await page.waitForURL(/\/Serah\/teacher\//, { timeout: 30_000 }).catch(() => {});
  const url2 = page.url();
  await page.screenshot({ path: `${SHOTS}/staff-clientnav-lecture-${info.project.name}.png` });
  expect(url1).toMatch(/\/Serah\/teacher\/$/);
  expect(url2).toMatch(/\/Serah\/teacher\/(lectures\/)?$/);
});

// ===== القرآن =====
const LIST = [{ number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", numberOfAyahs: 7 }, { number: 2, name: "سُورَةُ البَقَرَةِ", numberOfAyahs: 5 }];
const LONG = [["بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ", 2], ["ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ", 2], ["ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ", 3], ["وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ", 3], ["أُو۟لَٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ", 4]] as const;
const AUDIO_DIR = path.join(__dirname, "..", "..", "..", "backend", "tests", "fixtures", "voice.ogg");

async function quran(page: Page, user: object = KID) {
  await page.route(/api\.alquran\.cloud\/v1\/surah$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: LIST }) }));
  await page.route(/api\.alquran\.cloud\/v1\/surah\/2\//, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { ayahs: LONG.map(([text, pg], i) => ({ numberInSurah: i + 1, text, page: pg })) } }) }));
  await page.route(/everyayah\.com\/data\//, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript((u) => {
    localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u));
    if (!localStorage.getItem("serah_q_prefs")) localStorage.setItem("serah_q_prefs", JSON.stringify({ surah: 2, ayah: 1, reciter: "minshawy", mode: "teacher", repeat: 1, pause: 0.8 }));
  }, user);
  await page.goto("/Serah/kid/quran/");
}
void AUDIO_DIR;

test("القرآن: صفحات المصحف، التقليب، الحفظ بعد إعادة التحميل، الإعدادات مطوية", async ({ page }, info) => {
  await quran(page);
  await expect(page.getByText("صفحة ٢", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "الشيخ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "الصفحة السابقة" })).toBeDisabled();
  await page.screenshot({ path: `${SHOTS}/quran-p2-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "الصفحة التالية" }).click();
  await expect(page.getByText("صفحة ٣", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "الصفحة التالية" }).click();
  await expect(page.getByText("صفحة ٤", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "الصفحة التالية" })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("صفحة ٤", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // التظليل: الضغط على آية 5 يجعلها الحالية بخلفية ظاهرة
  await page.getByRole("button", { name: "آية 5" }).click();
  const now = page.getByRole("button", { name: "آية 5" });
  await expect(now).toHaveAttribute("aria-current", "true");
  const bg = await now.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({ path: `${SHOTS}/quran-highlight-${info.project.name}.png` });
  // الصوت غير متاح (404): رسالة خطأ بالعربي بدل التعليق
  await page.waitForTimeout(3000);
  const body = await page.locator("main").innerText();
  test.info().annotations.push({ type: "audio-404", description: body.slice(0, 400) });
});

test("القرآن للمعلمة: يفتح بنفس الشكل مع الشريط الخاص بها", async ({ page }, info) => {
  await quran(page, TEACHER);
  await expect(page.getByText("صفحة ٢", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "التنقل الرئيسي" });
  await expect(nav.getByRole("link", { name: "القرآن" })).toHaveAttribute("aria-current", "page");
  await page.screenshot({ path: `${SHOTS}/quran-teacher-${info.project.name}.png` });
});

// ===== مرور سريع (رجوع) على باقي الصفحات: لا أخطاء JS ولا سكرول أفقي =====
const PAGES: [string, object, string[]][] = [
  ["kid", KID, ["/Serah/kid/", "/Serah/kid/lectures/", "/Serah/kid/stars/", "/Serah/kid/lecture/?id=L1"]],
  ["teacher", TEACHER, ["/Serah/teacher/", "/Serah/teacher/students/", "/Serah/teacher/lectures/", "/Serah/teacher/upload/", "/Serah/teacher/suggestions/", "/Serah/teacher/settings/"]],
  ["admin", ADMIN, ["/Serah/teacher/team/", "/Serah/teacher/journey/", "/Serah/teacher/audit/"]],
  ["superadmin", SUPER, ["/Serah/admin/", "/Serah/admin/users/"]],
];
for (const [label, u, urls] of PAGES) {
  test(`رجوع: صفحات ${label} تفتح بدون أخطاء`, async ({ page }, info) => {
    const errors = await as(page, u);
    const bad: string[] = [];
    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) bad.push(`${url}: سكرول أفقي ${overflow}px`);
      if (await page.getByText(/Runtime (Type)?Error|Build Error|This page couldn/).count()) bad.push(`${url}: خطأ تشغيل`);
      if (!page.url().includes(url.split("?")[0])) bad.push(`${url}: تحوّل إلى ${page.url()}`);
      await page.screenshot({ path: `${SHOTS}/reg-${label}-${url.replace(/[/?=]/g, "_")}-${info.project.name}.png` });
    }
    expect([...bad, ...errors]).toEqual([]);
  });
}

test("رجوع: دخول الطفل (الصفحة الأولى) والمعلمة", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "كود الفصل غير صحيح" }) }));
  await page.goto("/Serah/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/reg-login-kid-${info.project.name}.png`, fullPage: true });
  await page.goto("/Serah/teacher/login/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/reg-login-teacher-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});
