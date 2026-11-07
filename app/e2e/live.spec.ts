import { test, expect, type Page, type Route } from "@playwright/test";

// المحاضرات المباشرة (المرحلة 9): المعلمة تبدأ بضغطة وتنهي بضغطة (تسجيل + حضور)، والأدمن تضيف المواعيد، والطفل يدخل بضغطة
test.use({ timezoneId: "Asia/Riyadh", locale: "ar-SA" });

type Call = { action: string; [k: string]: unknown };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const KID = { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟", gender: "m" };
const ROOM = { live_id: "V1", domain: "live.example.com", room: "muntahaabc", jwt: "h.b.s", title: "قصة يوسف", started_at: "2026-11-07T07:00:00Z" };

async function mock(page: Page, user: object, opts: { live?: boolean; endedOnBeat?: boolean } = {}) {
  const calls: Call[] = [];
  let live = !!opts.live, ended = false;
  await page.clock.setFixedTime(new Date("2026-11-07T10:00:00+03:00")); // السبت
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const state = { ready: true, domain: "live.example.com", live: live ? { ...ROOM, status: "live", ended_at: "", lecture_id: "", teacher: "أ. المعلمة" } : null,
      slots: [{ slot_id: "W1", title: "قصص الأنبياء", week_min: 3720, minutes: 60 }], recent: [...(ended ? [{ ...ROOM, status: "ended", ended_at: "x", lecture_id: "L10", teacher: "", present: 1, partial: 0 }] : []), { ...ROOM, live_id: "V0", title: "قصة نوح", status: "ended", ended_at: "x", lecture_id: "L9", teacher: "", present: 3, partial: 1 }] };
    const data = b.action === "liveState" ? state
      : b.action === "liveStart" ? (live = true, { ...ROOM, fresh: true, mine: true })
      : b.action === "liveJoin" ? { ...ROOM, mine: false }
      : b.action === "liveEnd" ? (live = false, ended = true, { ended: true, lecture_id: b.audio_file_id ? "L10" : undefined })
      : b.action === "liveAttach" ? { lecture_id: "L10" }
      : b.action === "liveBeat" ? (opts.endedOnBeat ? (live = false, { ended: true }) : { seconds: 0 })
      : b.action === "liveAttendance" ? [{ user_id: "S1", name: "يوسف", avatar: "🌟", seconds: 1500, status: "present", override: false }, { user_id: "S2", name: "مريم", avatar: "🌙", seconds: 0, status: "absent", override: false }]
      : b.action === "startUpload" ? { uploadUrl: "https://upload.test/session" }
      : b.action === "me" ? { points: 0, attended: [], rank: 1, total: 2 } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  // مكتبة Jitsi وهمية: تحفظ الإعدادات وتعلن الدخول فورًا
  await page.route("https://live.example.com/external_api.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
    window.JitsiMeetExternalAPI = function (domain, o) { window.__jitsi = { domain, o }; const l = {}; this.addListener = (e, f) => { l[e] = f; if (e === 'videoConferenceJoined') setTimeout(f, 50); };
      this.dispose = () => { window.__jitsiDisposed = true; }; this.executeCommand = () => {}; o.parentNode.textContent = 'ROOM'; };` }));
  // رفع درايف وهمي: الأجزاء ترجع 308 والأخير يرجع المعرّف
  await page.route("https://upload.test/**", (route) => {
    const r = route.request().headers()["content-range"] || "";
    return /\/\*$/.test(r) ? route.fulfill({ status: 308 }) : route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "rec-file" }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
  return calls;
}
// مايك وهمي (نغمة) حتى يعمل التسجيل في المتصفح الآلي
async function fakeMic(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
  });
}

test("المعلمة: ضغطة تبدأ المحاضرة والتسجيل، وضغطة تنهيها فيترفع التسجيل ويظهر الحضور", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "التسجيل بمايك وهمي على كروم");
  const calls = await mock(page, ADMIN);
  await fakeMic(page);
  await page.goto("/Serah/teacher/");
  await page.getByRole("link", { name: /محاضرة مباشرة/ }).click();
  await expect(page.getByRole("heading", { name: "المحاضرة المباشرة" })).toBeVisible();
  await expect(page.getByText(/المحاضرة الجاية: الثلاثاء/)).toBeVisible();
  await page.getByLabel("عنوان المحاضرة").fill("قصة يوسف");
  await page.getByRole("button", { name: "ابدئي المحاضرة الآن" }).click();
  await expect(page.getByTestId("jitsi-box")).toHaveText("ROOM");
  expect(calls.find((c) => c.action === "liveStart")).toMatchObject({ title: "قصة يوسف" });
  const o = await page.evaluate(() => (window as unknown as { __jitsi: { o: { roomName: string; jwt: string; configOverwrite: { toolbarButtons: string[]; disableDeepLinking: boolean } } } }).__jitsi.o);
  expect(o.roomName).toBe("muntahaabc"); expect(o.jwt).toBe("h.b.s"); expect(o.configOverwrite.disableDeepLinking).toBe(true);
  expect(o.configOverwrite.toolbarButtons).toContain("mute-everyone");
  await expect(page.getByText(/التسجيل شغال/)).toBeVisible();
  await page.getByRole("button", { name: "إنهاء المحاضرة" }).click();
  await page.getByRole("button", { name: "نعم، إنهاء" }).click();
  await expect(page.getByText("تمت المحاضرة بحمد الله")).toBeVisible();
  await expect(page.getByText(/التسجيل وصل للمعلمة الأدمن/)).toBeVisible();
  expect(calls.find((c) => c.action === "liveEnd")).toMatchObject({ live_id: "V1" });
  expect(calls.find((c) => c.action === "liveAttach")).toMatchObject({ live_id: "V1", audio_file_id: "rec-file" });
  await expect(page.getByRole("list", { name: "حضور قصة يوسف" }).getByRole("combobox", { name: "حالة مريم" })).toHaveValue("absent");
});

test("الأدمن تضيف موعدًا أسبوعيًا بتوقيت جهازها، وكشف حضور محاضرة سابقة يتعدل", async ({ page }) => {
  const calls = await mock(page, ADMIN);
  await page.goto("/Serah/teacher/live/");
  await expect(page.getByRole("list", { name: "مواعيد المحاضرات" })).toContainText("قصص الأنبياء");
  await page.getByLabel("العنوان").fill("تجويد");
  await page.getByLabel("اليوم").selectOption({ label: "الثلاثاء" });
  await page.getByLabel("الساعة").fill("17:00");
  await page.getByRole("button", { name: "إضافة موعد" }).click();
  // الموعد يُحفظ بالتوقيت المحلي ومنطقة الجهاز (لا يتحرك مع التوقيت الصيفي)
  await expect.poll(() => calls.find((c) => c.action === "liveSlotSave")).toMatchObject({ title: "تجويد", week_min: 2 * 1440 + 17 * 60, minutes: 60, tz: "Asia/Riyadh" });
  await page.getByRole("button", { name: /قصة نوح/ }).click();
  await page.getByRole("combobox", { name: "حالة مريم" }).selectOption("partial");
  await expect.poll(() => calls.find((c) => c.action === "liveSetAttend")).toMatchObject({ live_id: "V0", user_id: "S2", status: "partial" });
});

test("الطفل: شريط «المحاضرة شغالة» في الرئيسية، وضغطة للدخول بالمايك مقفول، ونبضة حضور، ثم «انتهت المحاضرة»", async ({ page }) => {
  const calls = await mock(page, KID, { live: true, endedOnBeat: false });
  await page.goto("/Serah/kid/");
  await page.getByRole("link", { name: /المحاضرة شغالة الآن/ }).click();
  await expect(page.getByRole("heading", { name: "قصة يوسف" })).toBeVisible();
  await page.getByRole("button", { name: "ادخل المحاضرة" }).click();
  await expect(page.getByTestId("jitsi-box")).toHaveText("ROOM");
  const o = await page.evaluate(() => (window as unknown as { __jitsi: { o: { configOverwrite: { toolbarButtons: string[]; startWithAudioMuted: boolean } } } }).__jitsi.o);
  expect(o.configOverwrite.startWithAudioMuted).toBe(true);
  expect(o.configOverwrite.toolbarButtons).not.toContain("camera");
  await expect.poll(() => calls.filter((c) => c.action === "liveBeat").length).toBeGreaterThanOrEqual(1);
  expect(calls.find((c) => c.action === "liveBeat")).toMatchObject({ live_id: "V1" });
  await page.getByRole("button", { name: "خروج من المحاضرة" }).click();
  await expect(page.getByRole("button", { name: "ادخل المحاضرة" })).toBeVisible();
});

test("الطفل: لما المعلمة تنهي، النبضة ترجع «انتهت» وتظهر رسالة الختام", async ({ page }) => {
  await mock(page, KID, { live: true, endedOnBeat: true });
  await page.goto("/Serah/kid/live/");
  await page.getByRole("button", { name: "ادخل المحاضرة" }).click();
  await expect(page.getByText(/انتهت المحاضرة، جزاك الله خيرًا/)).toBeVisible();
});

test("الطفل بدون محاضرة: يظهر الموعد الجاي ورابط المسجلة", async ({ page }) => {
  await mock(page, KID);
  await page.goto("/Serah/kid/live/");
  await expect(page.getByText(/المحاضرة الجاية: الثلاثاء/)).toBeVisible();
  await expect(page.getByRole("link", { name: /المحاضرات المسجلة/ })).toBeVisible();
});
