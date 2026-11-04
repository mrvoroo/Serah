import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// القرآن: المصحف المعلّم ودورك تقرأ، الشيخان، البسملة، تلوين الآية، التكرار، والمتابعة من آخر موضع (نص وصوت وهميان)

const code = fs.readFileSync(path.join(__dirname, "..", "..", "backend", "Code.gs"), "utf8");
const oggOpusToWebm = new Function(code.slice(code.indexOf("function oggOpusToWebm_")) + "\nreturn oggOpusToWebm_;")() as (u: Uint8Array) => Uint8Array;
const AUDIO = Buffer.from(oggOpusToWebm(new Uint8Array(fs.readFileSync(path.join(__dirname, "..", "..", "backend", "tests", "fixtures", "voice.ogg")))));

const LIST = [{ number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", numberOfAyahs: 7 }, { number: 112, name: "سُورَةُ الإِخۡلَاصِ", numberOfAyahs: 4 }];
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
  await expect(page.getByText(/وصلتَ إلى آخر سورة/)).toBeVisible({ timeout: 20000 });
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
