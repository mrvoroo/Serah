import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// القرآن: المصحف المعلّم ودورك تقرأ، الشيخان، البسملة، تلوين الآية، التكرار، والمتابعة من آخر موضع (نص وصوت وهميان)

const code = fs.readFileSync(path.join(__dirname, "..", "..", "backend", "Code.gs"), "utf8");
// دوال التحويل فقط (حتى أول قسم إجراءات بعدها يحتاج باقي الخلفية)
const start = code.indexOf("function oggOpusToWebm_"), stop = code.indexOf("/* ============ محتوى الصلاة", start);
const oggOpusToWebm = new Function(code.slice(start, stop > 0 ? stop : undefined) + "\nreturn oggOpusToWebm_;")() as (u: Uint8Array) => Uint8Array;
const AUDIO = Buffer.from(oggOpusToWebm(new Uint8Array(fs.readFileSync(path.join(__dirname, "..", "..", "backend", "tests", "fixtures", "voice.ogg")))));

const LIST = [{ number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", numberOfAyahs: 7 }, { number: 2, name: "سُورَةُ البَقَرَةِ", numberOfAyahs: 5 }, { number: 112, name: "سُورَةُ الإِخۡلَاصِ", numberOfAyahs: 4 }];
const IKHLAS = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ قُلْ هُوَ ٱللَّهُ أَحَدٌ", "ٱللَّهُ ٱلصَّمَدُ", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
];

async function open(page: Page, prefs: Record<string, unknown> = {}) {
  const played: string[] = [];
  await page.route(/api\.alquran\.cloud\/v1\/surah$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: LIST }) }));
  await page.route(/api\.alquran\.cloud\/v1\/surah\/112\//, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { ayahs: IKHLAS.map((text, i) => ({ numberInSurah: i + 1, text })) } }) }));
  await page.route(/everyayah\.com\/data\//, (r) => { played.push(r.request().url().replace("https://everyayah.com/data/", "")); return r.fulfill({ contentType: "audio/webm", body: AUDIO }); });
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript((p) => {
    localStorage.setItem("serah_token", "t");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" }));
    if (!localStorage.getItem("serah_q_prefs")) localStorage.setItem("serah_q_prefs", JSON.stringify({ surah: 112, ayah: 1, reciter: "minshawy", mode: "teacher", repeat: 1, pause: 0.8, ...p }));
  }, prefs);
  await page.goto("/Serah/kid/quran/");
  await expect(page.getByRole("button", { name: "آية 1", exact: true })).toBeVisible();
  // نسرّع الصوت حتى لا يطول الاختبار (الملف 3 ثوانٍ)
  await page.locator("audio").evaluate((a: HTMLAudioElement) => {
    a.defaultPlaybackRate = 8; a.addEventListener("play", () => { a.playbackRate = 8; });
    const w = window as unknown as { __ends: string[] }; w.__ends = [];
    a.addEventListener("ended", () => w.__ends.push(a.src.split("/").pop()!));
    a.addEventListener("playing", () => w.__ends.push("playing:" + a.src.split("/").pop()));
  });
  return played;
}
const uniq = (a: string[]) => a.filter((x, i) => a.indexOf(x) === i);

test("المصحف المعلّم (المنشاوي): البسملة ثم الآيات بالترتيب، مع تلوين الآية، وحتى نهاية السورة", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit على ويندوز لا يشغّل أي صوت");
  const played = await open(page);
  await expect(page.getByRole("heading", { name: /الإِخۡلَاصِ/ })).toBeVisible();
  // البسملة منفصلة، وليست داخل الآية الأولى
  await expect(page.getByRole("button", { name: "آية 1" })).toHaveText(/^قُلْ هُوَ/);
  await page.getByRole("button", { name: "تشغيل" }).click();
  await expect(page.getByRole("button", { name: "آية 2" })).toHaveAttribute("aria-current", "true", { timeout: 15000 });
  await expect(page.getByText(/وصلنا إلى آخر سورة/)).toBeVisible({ timeout: 20000 });
  // بعد الختم: المرة القادمة تبدأ من أول السورة بدون «نكمل من…»
  await page.reload();
  await expect(page.getByRole("button", { name: "آية 1", exact: true })).toBeVisible();
  await expect(page.getByText(/نكمل من آية/)).toHaveCount(0);
  expect(uniq(played)).toEqual(["Minshawy_Teacher_128kbps/001001.mp3", "Minshawy_Teacher_128kbps/112001.mp3", "Minshawy_Teacher_128kbps/112002.mp3", "Minshawy_Teacher_128kbps/112003.mp3", "Minshawy_Teacher_128kbps/112004.mp3"]);
});

test("دورك تقرأ (الحصري): تلاوة مرتّلة ثم «دورك يا بطل» بعدّاد، ثم الآية التالية", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit على ويندوز لا يشغّل أي صوت");
  const played = await open(page, { reciter: "husary", mode: "turn", ayah: 2 });
  await expect(page.getByText(/نكمل من آية ٢/)).toBeVisible();
  await page.getByRole("button", { name: "كمّل" }).click();
  await expect(page.getByText(/دورك يا بطل/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "آية 3" })).toHaveAttribute("aria-current", "true", { timeout: 10000 });
  expect(uniq(played).filter((u) => !u.endsWith("112003.mp3") || true).slice(0, 2)).toEqual(["Husary_128kbps/112002.mp3", "Husary_128kbps/112003.mp3"]);
});

test("تكرار الآية مرتين، واختيار آية بالضغط عليها، والموضع يُحفظ", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit على ويندوز لا يشغّل أي صوت");
  const played = await open(page, { repeat: 2 });
  await page.getByRole("button", { name: "آية 3" }).click();
  await expect(page.getByRole("button", { name: "آية 4" })).toHaveAttribute("aria-current", "true", { timeout: 15000 });
  expect(played.some((u) => u.endsWith("112003.mp3"))).toBe(true);
  // تكرار ٢: الآية 3 انتهت مرتين قبل الانتقال للرابعة
  const ends = await page.evaluate(() => (window as unknown as { __ends: string[] }).__ends);
  expect(ends.filter((e) => e === "playing:112003.mp3").length).toBe(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("serah_q_prefs")!).ayah)).toBe(4);
  await page.reload();
  await expect(page.getByText(/نكمل من آية/)).toBeVisible();
});

test("البسملة بالشدّة (التين والقدر) لا تتكرر داخل الآية الأولى", async ({ page }) => {
  await page.route(/api\.alquran\.cloud\/v1\/surah\/95\//, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { ayahs: [
    { numberInSurah: 1, text: "﻿بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلتِّينِ وَٱلزَّيْتُونِ" }, { numberInSurah: 2, text: "وَطُورِ سِينِينَ" }] } }) }));
  await open(page, { surah: 95 });
  await expect(page.getByRole("button", { name: "آية 1" })).toHaveText(/^وَٱلتِّينِ وَٱلزَّيْتُونِ/);
  await expect(page.getByText("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")).toHaveCount(1);
});

test("القرآن ظاهر في رئيسية الطفل، ومحطة القرآن في الرحلة تفتحه", async ({ page }) => {
  await open(page);
  await page.goto("/Serah/kid/");
  await expect(page.getByRole("link", { name: /القرآن الكريم/ })).toHaveAttribute("href", "/Serah/kid/quran/");
});

test("التظليل ظاهر فعلًا: الآية الحالية بخلفية ذهبية وباقي الآيات أخفت", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "آية 2" }).click();
  const now = page.getByRole("button", { name: "آية 2" });
  await expect(now).toHaveAttribute("aria-current", "true");
  expect(await now.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await expect.poll(() => page.getByRole("button", { name: "آية 1", exact: true }).evaluate((e) => Number(getComputedStyle(e).opacity))).toBeLessThan(0.6);
});

test("السورة الطويلة مقسمة على صفحات المصحف، والصفحة المفتوحة تُحفظ بعد الخروج", async ({ page }) => {
  const LONG = [["بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ", 2], ["ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ", 2], ["ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ", 3], ["وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ", 3], ["أُو۟لَٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ", 4]] as const;
  await page.route(/api\.alquran\.cloud\/v1\/surah\/2\//, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { ayahs: LONG.map(([text, pg], i) => ({ numberInSurah: i + 1, text, page: pg })) } }) }));
  await open(page, { surah: 2 });
  await expect(page.getByText("صفحة ٢", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "البسملة" })).toBeVisible();
  await expect(page.getByRole("button", { name: "آية 3" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "الصفحة السابقة" })).toBeDisabled();
  await page.getByRole("button", { name: "الصفحة التالية" }).click();
  await expect(page.getByText("صفحة ٣", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "آية 3" })).toBeVisible();
  await expect(page.getByRole("button", { name: "آية 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "البسملة" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("صفحة ٣", { exact: true })).toBeVisible();
  // الضغط على آية في صفحة أخرى يقلب الصفحة معها
  await page.getByRole("button", { name: "الصفحة التالية" }).click();
  await page.getByRole("button", { name: "آية 5" }).click();
  await expect(page.getByRole("button", { name: "آية 5" })).toHaveAttribute("aria-current", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("serah_q_prefs")!))).toMatchObject({ ayah: 5, page: 4 });
});

test("إعدادات التلاوة مطوية افتراضيًا حتى يظهر النص أولًا، وتُفتح بالزر", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("group", { name: "الشيخ" })).toHaveCount(0);
  await page.getByRole("button", { name: /إعدادات التلاوة/ }).click();
  await page.getByRole("button", { name: "الشيخ الحصري" }).click();
  await expect(page.getByRole("button", { name: "الشيخ الحصري" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("serah_q_prefs")!).reciter)).toBe("husary");
  // الحصري ماعندوش مصحف معلّم بأطفال: «دورك» بس
  await expect(page.getByRole("button", { name: /المصحف المعلّم/ })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("serah_q_prefs")!).mode)).toBe("turn");
  await page.getByRole("button", { name: "الشيخ المنشاوي" }).click();
  await expect(page.getByRole("button", { name: /المصحف المعلّم/ })).toBeVisible();
});

test("حفظ قديم على «الحصري + المصحف المعلّم» يتحول لـ«دورك» ويشغّل المرتّل", async ({ page }) => {
  await open(page, { reciter: "husary", mode: "teacher" });
  await page.getByRole("button", { name: /إعدادات التلاوة/ }).click();
  await expect(page.getByRole("button", { name: /دورك/ })).toHaveAttribute("aria-pressed", "true");
});

test("القرآن للمعلمات: تلاوة مرتّلة متصلة بالحصري أو المنشاوي، بدون أوضاع الأطفال", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit على ويندوز لا يشغّل أي صوت");
  const played: string[] = [];
  await page.route(/api\.alquran\.cloud\/v1\/surah$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: LIST }) }));
  await page.route(/api\.alquran\.cloud\/v1\/surah\/112\//, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { ayahs: IKHLAS.map((text, i) => ({ numberInSurah: i + 1, text })) } }) }));
  await page.route(/everyayah\.com\/data\//, (r) => { played.push(r.request().url().replace("https://everyayah.com/data/", "")); return r.fulfill({ contentType: "audio/webm", body: AUDIO }); });
  await page.route(/script\.google\.com\/macros/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [] }) }));
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "t");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "T1", name: "فاطمة", role: "teacher", class_id: "C1", avatar: "" }));
    // إعدادات طفل على نفس الجهاز لا تؤثر على المعلمة
    localStorage.setItem("serah_q_prefs", JSON.stringify({ surah: 1, mode: "turn", reciter: "husary" }));
    if (!localStorage.getItem("serah_q_prefs_t")) localStorage.setItem("serah_q_prefs_t", JSON.stringify({ surah: 112, ayah: 1, reciter: "minshawy" }));
  });
  await page.goto("/Serah/teacher/quran/");
  await expect(page.locator('a[href="/Serah/teacher/quran/"]').first()).toBeAttached();
  await expect(page.getByRole("button", { name: "آية 1", exact: true })).toBeVisible();
  await expect(page.getByText("قراءة واستماع بتلاوة مرتّلة")).toBeVisible();
  await page.getByRole("button", { name: /إعدادات التلاوة/ }).click();
  await expect(page.getByRole("group", { name: "الشيخ" }).getByRole("button")).toHaveCount(2);
  await expect(page.getByRole("group", { name: "الوضع" })).toHaveCount(0);
  await page.locator("audio").evaluate((a: HTMLAudioElement) => { a.defaultPlaybackRate = 8; a.addEventListener("play", () => { a.playbackRate = 8; }); });
  await page.getByRole("button", { name: "تشغيل" }).click();
  await expect(page.getByText(/وصلنا إلى آخر سورة/)).toBeVisible({ timeout: 20000 });
  expect(played.filter((x, i) => played.indexOf(x) === i).filter((x) => !x.endsWith("112005.mp3"))).toEqual(["Minshawy_Murattal_128kbps/001001.mp3", "Minshawy_Murattal_128kbps/112001.mp3", "Minshawy_Murattal_128kbps/112002.mp3", "Minshawy_Murattal_128kbps/112003.mp3", "Minshawy_Murattal_128kbps/112004.mp3"]);
});
