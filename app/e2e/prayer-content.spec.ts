import { test, expect, type Page, type Route } from "@playwright/test";

// محتوى الصلاة: الأدمن تضيف فيديو يوتيوب وذكرًا إضافيًا، والطفل يراهما في صفحة الصلاة
test.use({ timezoneId: "Asia/Riyadh", locale: "ar-SA" });

type Call = { action: string; [k: string]: unknown };
type Z = { zikr_id: string; text: string; count: number; ref: string; virtue: string; grade: string; approved: boolean; created_by: string; after: string[]; visible: boolean };
const ADMIN = { user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const TEACHER = { user_id: "T1", name: "فاطمة", role: "teacher", class_id: "C1", avatar: "" };
const DEV = { user_id: "D1", name: "احمد", role: "superadmin", class_id: "", avatar: "" };
const KID = { user_id: "S1", name: "زيد", role: "student", class_id: "C1", avatar: "🌙", gender: "m" };

// خادم وهمي بحالة مشتركة بين الصفحات (مثل الشيت)
function backend() {
  const db = { videos: {} as Record<string, string>, azkar: [] as Z[] };
  const calls: Call[] = [];
  let n = 0;
  const handler = async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    let data: unknown = [];
    if (b.action === "salahExtras") data = { videos: db.videos, azkar: b.all ? db.azkar : db.azkar.filter((z) => z.visible && z.approved) };
    if (b.action === "saveSalahVideo") {
      const m = /([\w-]{11})$/.exec(String(b.url || ""));
      if (m) db.videos[String(b.key)] = m[1]; else delete db.videos[String(b.key)];
      data = m?.[1] ?? "";
    }
    if (b.action === "saveExtraZikr") {
      const z = { zikr_id: String(b.zikr_id || `z${++n}`), text: String(b.text), count: Number(b.count), ref: String(b.ref), virtue: String(b.virtue || ""), grade: String(b.grade || ""), after: (b.after as string[]) ?? [], visible: b.visible !== false, approved: false, created_by: "A1" };
      const i = db.azkar.findIndex((x) => x.zikr_id === z.zikr_id);
      if (i >= 0) db.azkar[i] = z; else db.azkar.push(z);
      data = z.zikr_id;
    }
    if (b.action === "setExtraZikrVisible") { const z = db.azkar.find((x) => x.zikr_id === b.zikr_id); if (z) z.visible = b.visible === true; data = true; }
    if (b.action === "approveExtraZikr") { const z = db.azkar.find((x) => x.zikr_id === b.zikr_id); if (z) z.approved = b.approved !== false; data = true; }
    if (b.action === "deleteExtraZikr") { db.azkar = db.azkar.filter((z) => z.zikr_id !== b.zikr_id); data = true; }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  };
  return { db, calls, handler };
}
async function as(page: Page, be: ReturnType<typeof backend>, user: object) {
  await page.clock.setFixedTime(new Date("2026-11-07T10:00:00+03:00")); // بعد الفجر وقبل الظهر
  await page.route(/script\.google\.com\/macros/, be.handler);
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
}

test("الأدمن تضيف فيديو وذكرًا، يبقى مخفيًا حتى يعتمده المطوّر، ثم يراه الطفل بعد كل الصلوات", async ({ page }) => {
  const be = backend();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/prayer-content/");
  await expect(page.getByRole("heading", { name: "محتوى الصلاة" })).toBeVisible();
  await expect(page.locator('a[href="/Serah/teacher/prayer-content/"]').first()).toBeAttached();

  // فيديو الوضوء: رابط خاطئ ثم صحيح
  await expect(page.getByTestId("video-slot")).toHaveCount(17);
  await page.getByRole("button", { name: "إضافة فيديو كيفية الوضوء" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("رابط الفيديو").fill("https://example.com/x");
  await expect(dlg.getByText(/الرابط غير صحيح/)).toBeVisible();
  await expect(dlg.getByRole("button", { name: "حفظ" })).toBeDisabled();
  await dlg.getByLabel("رابط الفيديو").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await expect(dlg.locator("iframe")).toHaveAttribute("src", /dQw4w9WgXcQ/);
  await dlg.getByRole("button", { name: "حفظ" }).click();
  await expect(dlg).toBeHidden();
  expect(be.db.videos).toEqual({ "vid:wudu": "dQw4w9WgXcQ" });
  await expect(page.getByRole("button", { name: "تغيير فيديو كيفية الوضوء" })).toBeVisible();

  // ذكر إضافي بعد الفجر فقط: المصدر مطلوب
  await page.getByRole("tab", { name: "أذكار إضافية" }).click();
  await page.getByRole("button", { name: "إضافة ذكر" }).click();
  const z = page.getByRole("dialog");
  await z.getByLabel("نص الذكر (بالتشكيل)").fill("اللهم أعني");
  await expect(z.getByText(/النص بلا تشكيل/)).toBeVisible();
  await z.getByLabel("نص الذكر (بالتشكيل)").fill("اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ");
  await expect(z.getByText(/النص بلا تشكيل/)).toHaveCount(0);
  const save = z.getByRole("button", { name: "حفظ" });
  await expect(save).toBeDisabled();
  await z.getByLabel("المصدر", { exact: true }).fill("أبو داود");
  await expect(z.getByRole("status")).toHaveText("اكتبي المصدر كاملًا: اسم الكتاب ورقم الحديث");
  await z.getByLabel("المصدر", { exact: true }).fill("أبو داود ١٥٢٢");
  await z.getByLabel("العدد").fill("٣"); // أرقام عربية من الكيبورد
  await expect(z.getByLabel("العدد")).toHaveValue("3");
  await expect(z.getByRole("button", { name: "الفجر" })).toHaveCount(0); // لا يُربط بصلاة معيّنة
  await expect(z.getByRole("status")).toHaveText("اختاري درجة الحديث");
  await z.getByRole("radio", { name: "صحيح" }).click();
  await expect(save).toBeDisabled();
  await z.getByRole("checkbox").check();
  await save.click();
  await expect(z).toBeHidden();
  expect(be.db.azkar[0]).toMatchObject({ count: 3, ref: "أبو داود ١٥٢٢", grade: "صحيح", visible: true, approved: false });
  expect(be.calls.find((c) => c.action === "saveExtraZikr")).toMatchObject({ confirmed: true, count: 3 });
  const row = page.getByTestId("extra-zikr");
  await expect(row).toContainText("ينتظر الاعتماد");
  await expect(row).toContainText("يظهر بعد الاعتماد");
  await expect(row.getByRole("button", { name: /^اعتماد/ })).toHaveCount(0); // لا تعتمد ما أضافته
  await expect(page.getByRole("status").filter({ hasText: "ينتظر" })).toHaveText("ذكر واحد ينتظر الاعتماد");

  // الطفل لا يراه قبل الاعتماد
  const kid = await page.context().newPage(); // نفس السياق (الإعدادات والجهاز)، وكل صفحة بحسابها
  kid.on("pageerror", (e) => errors.push("kid: " + e.message));
  await as(kid, be, KID);
  await kid.goto("/Serah/kid/prayer/");
  await expect(kid.getByRole("list", { name: "أذكار ما بعد الصلاة" })).toBeVisible({ timeout: 45_000 }); // تبويب ثانٍ أبطأ في خادم التطوير
  await expect(kid.getByText("اختارته المعلمة")).toHaveCount(0);

  // المطوّر يعتمده
  const dev = await page.context().newPage();
  await as(dev, be, DEV);
  await dev.goto("/Serah/teacher/prayer-content/");
  await dev.getByRole("tab", { name: "أذكار إضافية" }).click();
  await expect(dev.getByTestId("extra-zikr")).toContainText("ينتظر الاعتماد");
  await dev.waitForLoadState("networkidle");
  await dev.getByRole("button", { name: "اعتماد الذكر ١" }).click();
  await expect(dev.getByTestId("extra-zikr")).toContainText("معتمد");
  expect(be.db.azkar[0].approved).toBe(true);
  await dev.close();
  await kid.reload();
  const az = kid.getByRole("list", { name: "أذكار ما بعد الصلاة" });
  await kid.getByRole("radio", { name: "الفجر" }).click();
  await expect(az.getByText("اختارته المعلمة")).toHaveCount(0); // ليس داخل أذكار السنة
  await expect(kid.getByRole("heading", { name: "أذكار اختارتها لك المعلمة" })).toBeVisible();
  await expect(kid.getByRole("list", { name: "أذكار اختارتها المعلمة" }).getByRole("listitem")).toHaveCount(1);
  const extra = kid.locator('section[aria-labelledby="chosen-title"]').getByTestId("zikr-card");
  await expect(extra).toContainText("اختارته المعلمة");
  await expect(extra).toContainText("أبو داود ١٥٢٢ — صحيح");
  await expect(extra).toContainText("٣ مرات");
  for (let i = 0; i < 3; i++) await extra.locator("p").first().click(); // الضغط على الكارت نفسه
  await expect(extra.getByRole("button", { name: /^تم/ })).toBeDisabled();
  await kid.getByRole("radio", { name: "الظهر" }).click();
  await expect(kid.getByText("اختارته المعلمة")).toHaveCount(1); // بعد كل الصلوات
  await kid.getByRole("tab", { name: "كيفية الصلاة" }).click();
  await expect(kid.locator('iframe[title="كيفية الوضوء"]')).toHaveAttribute("src", /dQw4w9WgXcQ/);
  await expect(kid.getByText("فيديو «كيفية الصلاة كاملة» قريبًا")).toBeVisible();
  expect(await kid.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // الإخفاء يشيله عند الطفل
  await page.reload();
  await page.getByRole("tab", { name: "معاينة كطفل" }).click();
  await expect(page.getByText("اختارته المعلمة")).toBeVisible();
  await page.getByRole("tab", { name: "أذكار إضافية" }).click();
  await page.getByRole("switch", { name: "ظاهر للأطفال: الذكر ١" }).click();
  await expect(page.getByTestId("extra-zikr")).toContainText("مخفي");
  await kid.reload();
  await kid.getByRole("radio", { name: "الفجر" }).click();
  await expect(kid.getByText("اختارته المعلمة")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
  await kid.close();
});

test("المعلمة العادية: لا ترى «محتوى الصلاة» ولا تفتحه", async ({ page }) => {
  const be = backend();
  await as(page, be, TEACHER);
  await page.goto("/Serah/teacher/prayer-content/");
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
  await expect(page.locator('a[href="/Serah/teacher/prayer-content/"]')).toHaveCount(0);
  expect(be.calls.some((c) => c.action === "salahExtras" && c.all)).toBe(false);
});
