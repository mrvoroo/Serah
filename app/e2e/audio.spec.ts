import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// تشغيل الصوت: مع مفتاح Drive API يستخدم المشغّل رابط googleapis (يدعم التشغيل الجزئي فيعمل على آيفون)،
// والرسالة الصوتية المحوّلة من Ogg إلى WebM تشتغل فعلًا في المشغّل بمدتها الصحيحة

const VOICE_OGG = fs.readFileSync(path.join(__dirname, "..", "..", "backend", "tests", "fixtures", "voice.ogg"));
// نفس دالة التحويل التي تعمل في Apps Script
const code = fs.readFileSync(path.join(__dirname, "..", "..", "backend", "Code.gs"), "utf8");
const muxer = code.slice(code.indexOf("function oggOpusToWebm_"));
const oggOpusToWebm = new Function(muxer + "\nreturn oggOpusToWebm_;")() as (u: Uint8Array) => Uint8Array;
const VOICE_WEBM = Buffer.from(oggOpusToWebm(new Uint8Array(VOICE_OGG)));

const TEACHER = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const LECTURE = { lecture_id: "L1", class_id: "C1", title: "قصة نوح", date: "2026-11-04", audio_file_id: "drv-webm", duration_sec: 3, status: "draft", images: [], imageItems: [], prophet_id: "noah" };

async function mock(page: Page, driveKey: string) {
  const hits: string[] = [];
  await page.route(/script\.google\.com\/macros/, (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const data = b.action === "config" ? { driveKey } : b.action === "lectures" ? [LECTURE] : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  // Drive API: يرجع ملف WebM ويدعم Range مثل جوجل
  await page.route(/googleapis\.com\/drive\/v3\/files\//, (route) => {
    hits.push(route.request().url());
    const range = route.request().headers()["range"];
    const m = range && /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = Number(m[1]), end = m[2] ? Number(m[2]) : VOICE_WEBM.length - 1;
      return route.fulfill({ status: 206, headers: { "Content-Type": "audio/webm", "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${VOICE_WEBM.length}` }, body: VOICE_WEBM.subarray(start, end + 1) });
    }
    return route.fulfill({ status: 200, headers: { "Content-Type": "audio/webm", "Accept-Ranges": "bytes" }, body: VOICE_WEBM });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); localStorage.removeItem("serah_media_key"); }, TEACHER);
  return hits;
}

test("مع مفتاح Drive API: المشغّل يستخدم googleapis، والتسجيل المحوّل يشتغل بمدته الصحيحة", async ({ page }) => {
  const hits = await mock(page, "AIza-test");
  await page.goto("/Serah/teacher/lectures/");
  const audio = page.locator("audio").first();
  await expect(audio).toHaveAttribute("src", "https://www.googleapis.com/drive/v3/files/drv-webm?alt=media&key=AIza-test");
  const duration = await audio.evaluate((a: HTMLAudioElement) => new Promise<number>((res, rej) => {
    if (a.readyState >= 1) return res(a.duration);
    a.addEventListener("loadedmetadata", () => res(a.duration), { once: true });
    a.addEventListener("error", () => rej(new Error("audio error " + a.error?.code)), { once: true });
    a.load();
  }));
  expect(duration).toBeGreaterThan(2.9);
  expect(duration).toBeLessThan(3.1);
  expect(hits.length).toBeGreaterThan(0);
});

test("بدون مفتاح: يرجع للرابط المباشر (يعمل على الكمبيوتر وأندرويد)", async ({ page }) => {
  await mock(page, "");
  await page.goto("/Serah/teacher/lectures/");
  await expect(page.locator("audio").first()).toHaveAttribute("src", /drive\.usercontent\.google\.com\/download\?id=drv-webm/);
});
