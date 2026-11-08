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
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(week.getByRole("listitem")).toHaveCount(31);
});

test("أذكار ما بعد الصلاة كاملة بالعدّاد، وآية الكرسي بخط المصحف، وعدد الركعات وكيفية الصلاة", async ({ page }) => {
  await mock(page);
  await page.goto("/Serah/kid/prayer/");
  const az = page.getByRole("list", { name: "أذكار ما بعد الصلاة" });
  await expect(az.getByRole("listitem").first()).toContainText("أَسْتَغْفِرُ اللَّهَ");
  expect(await az.getByRole("listitem").count()).toBeGreaterThanOrEqual(12);
  await expect(az.locator("[data-ayah-text]").first()).toBeAttached();
  const first = az.getByRole("listitem").first().getByRole("button");
  for (let i = 0; i < 3; i++) await first.click();
  await expect(first).toHaveText(/تم/);
  await page.getByRole("tab", { name: "عدد الركعات" }).click();
  await expect(page.getByText("الفجر").last()).toBeVisible();
  await page.getByRole("tab", { name: "كيفية الصلاة" }).click();
  await expect(page.getByRole("list", { name: "خطوات الصلاة" }).getByRole("listitem")).toHaveCount(14);
  await expect(page.getByText(/فيديو «كيفية الوضوء» قريبًا/)).toBeVisible();
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
  const kinds = new Set(sub.plan.map((e) => e[1]));
  for (const k of ["pre:fajr", "p:fajr", "p:dhuhr", "pre:isha", "p:isha", "dhikr", "duha", "fri"]) expect(kinds.has(k)).toBe(true);
  for (const e of sub.plan.filter((x) => x[1] === "pre:isha")) expect(sub.plan.some((x) => x[1] === "p:isha" && x[0] - e[0] === 600)).toBe(true);
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
