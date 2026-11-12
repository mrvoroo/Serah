import { test, expect, type Page, type Route } from "@playwright/test";

// جدول الصلوات (المرحلة 6): المواقيت والتقويم (يوم/أسبوع/شهر) وتعليم الصلوات، وأذكار ما بعد الصلاة، وتفعيل الإشعارات
test.use({ timezoneId: "Asia/Riyadh", locale: "ar-SA" });

type Call = { action: string; [k: string]: unknown };
const GIRL = { user_id: "S2", name: "مريم", role: "student", class_id: "C1", avatar: "🌙", gender: "f" };

async function mock(page: Page) {
  const calls: Call[] = [];
  await page.clock.setFixedTime(new Date("2026-11-07T10:00:00+03:00")); // السبت، بعد الفجر وقبل الظهر
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const data = b.action === "prayerLog" ? { days: { "2026-11-06": ["fajr", "dhuhr", "asr", "maghrib", "isha"] } }
      : b.action === "markPrayer" ? (b.done ? ["fajr"] : [])
      : b.action === "pushConfig" ? { publicKey: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" }
      : b.action === "pushSubscribe" ? { key: "a".repeat(64) } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, GIRL);
  return calls;
}

test("جدول الصلوات: اليوم جاهز، والطفلة تعلّم الفجر، والظهر لم يحن، والأسبوع والشهر", async ({ page }) => {
  const calls = await mock(page);
  await page.goto("/Serah/kid/");
  await page.getByRole("link", { name: "جدول الصلوات" }).click();
  await expect(page.getByRole("heading", { name: "جدول الصلوات" })).toBeVisible();
  await expect(page.getByText(/الصلاة القادمة: الظهر/)).toBeVisible();
  const today = page.getByRole("list", { name: "صلوات اليوم" });
  await expect(today.getByRole("button")).toHaveCount(5);
  await expect(today.getByRole("button", { name: /الظهر/ })).toBeDisabled();
  await today.getByRole("button", { name: /صلّيتِ الفجر/ }).click();
  await expect(today.getByRole("button", { name: /ألغِ الفجر/ })).toHaveAttribute("aria-pressed", "true");
  expect(calls.find((c) => c.action === "markPrayer")).toMatchObject({ date: "2026-11-07", prayer: "fajr", done: true });

  await page.getByRole("tab", { name: "الأسبوع" }).click();
  const week = page.getByRole("list", { name: "جدول الأيام" });
  await expect(week.getByRole("listitem")).toHaveCount(7);
  await expect(week.getByRole("listitem").first()).toContainText("السبت"); // الأسبوع يبدأ السبت
  await page.getByRole("tab", { name: "الشهر" }).click();
  await expect(week.getByRole("listitem")).toHaveCount(30);
  // أمس (الجمعة) كله مُعلَّم من السجل
  await expect(week.getByRole("button", { name: /^العشاء الجمعة، ٦ /u })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: /نوفمبر/ })).toBeVisible();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await expect(week.getByRole("listitem")).toHaveCount(31);
});

test("أذكار ما بعد الصلاة كروت تفاعلية: الضغط في أي مكان يعدّ، والإطار يمتلئ، وينتقل للتالي تلقائيًا", async ({ page }) => {
  await mock(page);
  await page.goto("/Serah/kid/prayer/");
  const menu = page.getByRole("list", { name: "أذكار ما بعد الصلاة" });
  await expect(menu.getByRole("listitem").nth(11)).toBeAttached();
  const card = page.getByTestId("zikr-card");
  await expect(card).toContainText("أَسْتَغْفِرُ اللَّهَ");
  await expect(card).toContainText("٣ مرات");
  // الضغط على نص الكارت نفسه (مش الزر)
  await card.locator("p").first().click();
  await expect(card.getByRole("button", { name: "عدّ: ٢ متبقية" })).toBeVisible();
  await card.locator("p").first().click();
  await card.locator("p").first().click();
  // بعد آخر ضغطة: ينتقل وحده للكارت التالي
  await expect(page.getByTestId("zikr-card")).toContainText("اللَّهُمَّ أَنْتَ السَّلَامُ", { timeout: 5000 });
  await expect(menu.getByRole("button").first()).toHaveAccessibleName(/تم/);
  // القائمة تنقل لأي كارت
  await menu.getByRole("button", { name: /سُبْحَانَ اللَّهِ/ }).first().click();
  await expect(page.getByTestId("zikr-card")).toContainText("٣٣ مرة");
  // المعوذات: مرة بعد الظهر، وثلاثًا بعد المغرب؛ والتهليل عشرًا بعد الفجر والمغرب فقط
  const after = page.getByRole("radiogroup", { name: "أذكار بعد صلاة" });
  const open = async (re: RegExp) => { await menu.getByRole("button", { name: re }).first().click(); return page.getByTestId("zikr-card"); };
  await after.getByRole("radio", { name: "الظهر" }).click();
  await expect((await open(/قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ/)).getByRole("button", { name: /^قلته/ })).toBeVisible();
  const dhuhrCount = await menu.getByRole("listitem").count();
  await after.getByRole("radio", { name: "المغرب" }).click();
  for (const re of [/قُلْ هُوَ اللَّهُ/, /قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ/, /قُلْ أَعُوذُ بِرَبِّ النَّاسِ/]) await expect(await open(re)).toContainText("٣ مرات");
  await expect(menu.getByRole("listitem")).toHaveCount(dhuhrCount + 1); // التهليل عشرًا بعد المغرب فقط
  // تغيير الصلاة يبدأ العدّ من جديد
  await expect(menu.getByRole("button").first()).not.toHaveAccessibleName(/تم/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.getByRole("tab", { name: "عدد الركعات" }).click();
  await expect(page.getByText("الفجر").last()).toBeVisible();
  await page.getByRole("tab", { name: "كيفية الصلاة" }).click();
  await expect(page.getByRole("list", { name: "خطوات الصلاة" }).getByRole("listitem")).toHaveCount(14);
  await expect(page.getByText(/فيديو «كيفية الوضوء» قريبًا/)).toBeVisible();
});

test("كارت آية الكرسي مميّز بالحديث الصحيح وشرح مبسّط، وفتح الشرح لا يُحسب قراءة", async ({ page }) => {
  await mock(page);
  await page.goto("/Serah/kid/prayer/");
  await page.getByRole("list", { name: "أذكار ما بعد الصلاة" }).getByRole("button", { name: /اللَّهُ لَا إِلَٰهَ/ }).first().click();
  const card = page.getByTestId("kursi-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("أعظم آية في القرآن");
  await expect(card).toContainText("لم يمنعه من دخول الجنة إلا أن يموت");
  await expect(card).toContainText("صححه الألباني");
  await expect(card.locator("[data-ayah-text]").first()).toBeAttached();
  const meanings = card.getByRole("list", { name: "معاني الآية" });
  await expect(meanings).toBeHidden();
  await card.getByText("معنى الآية ببساطة").click();
  await expect(meanings.getByRole("listitem")).toHaveCount(10);
  await expect(card.getByRole("button", { name: /^قلته/ })).toBeEnabled(); // الشرح ما اتحسبش
  await card.locator("[data-ayah-text]").first().click();
  await expect(card.getByRole("button", { name: /^تم/ })).toBeDisabled();
  await expect(card.getByRole("status")).toHaveText(/أحسنتِ! حافظي على آية الكرسي/); // الطفلة: صيغة مؤنثة
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("جدول الصلوات: علامات الصح محفوظة على الجهاز تظهر فورًا، والأزرار مقفولة لحد ما الحالة تتحمّل", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-07T16:30:00+03:00")); // بعد العصر
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => { release = r; });
  await page.route(/script\.google\.com\/macros/, async (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    if (b.action === "prayerLog") await gate; // الخادم بطيء
    const data = b.action === "prayerLog" ? { days: { "2026-11-07": ["fajr", "dhuhr"] } } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, GIRL);
  await page.goto("/Serah/kid/prayer/");
  const today = page.getByRole("list", { name: "صلوات اليوم" });
  await expect(page.getByRole("status").filter({ hasText: "جارٍ تحميل صلواتك" })).toBeVisible();
  await expect(today.getByRole("button", { name: /الفجر/ })).toBeDisabled();
  release();
  await expect(today.getByRole("button", { name: /ألغِ الفجر/ })).toHaveAttribute("aria-pressed", "true");
  await expect(today.getByRole("button", { name: /ألغِ الظهر/ })).toBeEnabled();
  await expect(page.getByText("جارٍ تحميل صلواتك")).toHaveCount(0);
  // الفتح التالي: من نسخة الجهاز فورًا حتى قبل رد الخادم
  let release2: () => void = () => {};
  const gate2 = new Promise<void>((r) => { release2 = r; });
  await page.unroute(/script\.google\.com\/macros/);
  await page.route(/script\.google\.com\/macros/, async (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    if (b.action === "prayerLog") await gate2;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: b.action === "prayerLog" ? { days: { "2026-11-07": ["fajr", "dhuhr"] } } : [] }) });
  });
  await page.reload();
  await expect(today.getByRole("button", { name: /ألغِ الظهر/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("جارٍ تحميل صلواتك")).toHaveCount(0);
  release2();
});

test("تفعيل الإشعارات يرسل جدول ١٤ يومًا (صلوات وأذكار وضحى وجمعة) للخادم", async ({ page, browserName }, info) => {
  test.skip(info.project.name !== "desktop" || browserName !== "chromium", "محاكاة PushManager على كروم المكتب");
  const calls = await mock(page);
  await page.addInitScript(() => {
    const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/test", unsubscribe: async () => true };
    let on = false;
    const reg = { pushManager: { getSubscription: async () => (on ? sub : null), subscribe: async () => { on = true; return sub; } } };
    Object.defineProperty(navigator, "serviceWorker", { value: { ready: Promise.resolve(reg), getRegistration: async () => reg, register: async () => reg } });
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    Object.defineProperty(Notification, "permission", { get: () => (on ? "granted" : "default") });
    Notification.requestPermission = async () => "granted";
  });
  await page.goto("/Serah/kid/prayer/");
  await page.getByRole("button", { name: "فعّلي الإشعارات" }).click();
  await expect(page.getByRole("button", { name: "إيقاف" })).toBeVisible();
  const sub = calls.find((c) => c.action === "pushSubscribe") as unknown as { plan: [number, string, number][]; endpoint: string };
  expect(sub.endpoint).toContain("fcm.googleapis.com");
  // عامل الخدمة (scope /Serah/) يقرأ الإعدادات بعناوين ثابتة، مش نسبةً للصفحة المفتوحة
  const keys = await page.evaluate(async () => (await (await caches.open("serah-notify")).keys()).map((r) => new URL(r.url).pathname).sort());
  expect(keys).toEqual(["/Serah/__notify/cfg", "/Serah/__notify/plan", "/Serah/__notify/texts"]);
  const kinds = new Set(sub.plan.map((e) => e[1]));
  for (const k of ["pre:fajr", "p:fajr", "p:dhuhr", "pre:isha", "p:isha", "dhikr", "duha", "fri"]) expect(kinds.has(k)).toBe(true);
  for (const e of sub.plan.filter((x) => x[1] === "pre:isha")) expect(sub.plan.some((x) => x[1] === "p:isha" && x[0] - e[0] === 600)).toBe(true);
  // «صليت العشاء؟» بعد الأذان بنصف ساعة
  for (const e of sub.plan.filter((x) => x[1] === "ask:isha")) expect(sub.plan.some((x) => x[1] === "p:isha" && e[0] - x[0] === 1800)).toBe(true);
  expect(kinds.has("ask:dhuhr")).toBe(true);
  expect(sub.plan.filter((e) => e[1] === "dhikr").length).toBeGreaterThanOrEqual(39); // ٣ يوميًا × ١٣+ يوم
  // الأذكار العشوائية بين ٩ص و٨م بتوقيت الجهاز
  for (const e of sub.plan.filter((x) => x[1] === "dhikr")) { const h = new Date(e[0] * 1000).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Riyadh" }); expect(Number(h)).toBeGreaterThanOrEqual(9); expect(Number(h)).toBeLessThan(20); }
  // إيقاف نوع يعيد الإرسال بدونه
  await page.getByRole("switch", { name: "اذكر الله" }).click();
  await expect.poll(() => calls.filter((c) => c.action === "pushSubscribe").length).toBe(2);
  const last = calls.filter((c) => c.action === "pushSubscribe").pop() as unknown as { plan: [number, string, number][] };
  expect(last.plan.some((e) => e[1] === "dhikr")).toBe(false);
});

test("على آيفون في سفاري: شرح إضافة المنصة للشاشة الرئيسية قبل الإشعارات", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "آيفون فقط");
  await mock(page);
  await page.goto("/Serah/kid/prayer/");
  await expect(page.getByText(/إضافة إلى الشاشة الرئيسية/)).toBeVisible();
});

test("المعلمة: جدول الصلوات في قائمتها، تعلّم صلاتها بصيغة مؤنثة، ومن غير إشعارات المهام", async ({ page }) => {
  const calls = await mock(page);
  await page.addInitScript(() => { localStorage.setItem("serah_user", JSON.stringify({ user_id: "T1", name: "فاطمة أحمد", role: "teacher", class_id: "C1", avatar: "" })); });
  await page.goto("/Serah/teacher/prayer/");
  await expect(page.getByRole("heading", { name: "جدول الصلوات" })).toBeVisible();
  await expect(page.locator("a[href=\"/Serah/teacher/prayer/\"]").first()).toBeAttached(); // في القائمة (على الموبايل داخل زر القائمة)
  const today = page.getByRole("list", { name: "صلوات اليوم" });
  await today.getByRole("button", { name: /صلّيتِ الفجر/ }).click();
  expect(calls.find((c) => c.action === "markPrayer")).toMatchObject({ prayer: "fajr", done: true });
  await expect(page.getByText("الاختبارات والواجبات")).toHaveCount(0);
});
