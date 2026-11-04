import { test, expect, type Page, type Route } from "@playwright/test";

// شاشات المطوّر و«عرض كـ» على خلفية وهمية (لا تلمس بيانات حقيقية): نعترض طلبات Apps Script ونرد عليها هنا

type Call = { action: string; token?: string; [k: string]: unknown };
const USERS = [
  { user_id: "SA", role: "superadmin", name: "م.احمد", class_id: "", class_name: "", avatar: "", active: true, last_login_at: "2026-11-04T10:00:00Z", created_at: "" },
  { user_id: "T1", role: "admin", name: "المعلمة", class_id: "C1", class_name: "الفصل الأول", avatar: "", active: true, last_login_at: "", created_at: "" },
  { user_id: "T2", role: "teacher", name: "معلمة ثانية", class_id: "C1", class_name: "الفصل الأول", avatar: "", active: true, last_login_at: "", created_at: "" },
  { user_id: "S1", role: "student", name: "يوسف", class_id: "C1", class_name: "الفصل الأول", avatar: "🌟", active: true, last_login_at: "", created_at: "" },
];

async function mockBackend(page: Page) {
  const calls: Call[] = [];
  const users = USERS.map((u) => ({ ...u }));
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const body = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(body);
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    const fail = (error: string) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error }) });
    const tokenUser = (t?: string) => users.find((u) => t?.startsWith(`tok-${u.user_id}`));
    const viewing = body.token?.includes("-imp");
    switch (body.action) {
      case "login": {
        const u = users.find((x) => x.name === body.name && body.pin === (x.role === "superadmin" ? "987654" : "482615"));
        return u ? ok({ token: `tok-${u.user_id}`, user: u }) : fail("الرمز غير صحيح");
      }
      case "users": return tokenUser(body.token)?.role === "superadmin" && !viewing ? ok(users) : fail("ليس لديك صلاحية");
      case "classes": return ok([{ class_id: "C1", name: "الفصل الأول", join_code: "SERAH1", teacher: "المعلمة", kids: 1, lectures: 2, published: 1 }]);
      case "systemHealth": return ok({ version: 9, now: "", lockedAccounts: 1, triggers: ["pollTelegram"], tables: [{ name: "Users", rows: 4 }, { name: "AuditLog", rows: 3 }],
        settings: [{ key: "BOT_TOKEN", set: true }, { key: "SITE_ORIGIN", set: false }], bot: { webhook: "", pending: 0, lastError: "" } });
      case "viewAs": {
        const u = users.find((x) => x.user_id === body.user_id)!;
        return ok({ token: `tok-${u.user_id}-imp`, user: u });
      }
      case "setRole": { const u = users.find((x) => x.user_id === body.user_id)!; u.role = body.role as string; return ok(true); }
      case "setUserActive": { const u = users.find((x) => x.user_id === body.user_id)!; u.active = body.active as boolean; return ok(true); }
      case "setUserPin": return ok(true);
      case "auditLog": return ok([{ at: "2026-11-04T10:00:00Z", user_id: "T1", name: "المعلمة", role: "admin", action: "addStudent", target_id: "", details_json: "{\"name\":\"علي\"}", imp_name: "" }]);
      case "me": return ok({ points: 20, attended: [], rank: 1, total: 1 });
      case "lectures": return ok([]);
      case "leaderboard": return ok({ top: [], me: 1 });
      case "dashboard": return ok({ kids: 1, lectures: 2, published: 1, drafts: 1, attendanceRate: 50, totalPoints: 20, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 });
      case "markAttendance": case "suggest": return viewing ? fail("وضع المعاينة للعرض فقط — لا يمكن الحفظ") : ok(true);
      default: return ok([]);
    }
  });
  return calls;
}

async function loginAs(page: Page, name: string, pin: string) {
  await page.goto("/Serah/teacher/login/");
  await page.getByLabel("الاسم").fill(name);
  await page.getByLabel("الرمز السري").fill(pin);
  await page.getByRole("button", { name: /دخول/ }).click();
}

test("المطوّر يدخل فيتحول للوحة المطوّر ويرى الفصول وصحة النظام", async ({ page }) => {
  await mockBackend(page);
  await loginAs(page, "م.احمد", "987654");
  await expect(page).toHaveURL(/\/Serah\/admin\/$/);
  await expect(page.getByRole("heading", { name: "لوحة المطوّر" })).toBeVisible();
  await expect(page.getByText("الخلفية: النسخة 9")).toBeVisible();
  await expect(page.getByRole("cell", { name: "SERAH1" })).toBeVisible();
  await expect(page.getByText("يعمل", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /طفل: يوسف/ })).toBeVisible();
});

test("المستخدمون: بحث وتصفية وتغيير دور وتعطيل ورمز جديد", async ({ page }) => {
  const calls = await mockBackend(page);
  await loginAs(page, "م.احمد", "987654");
  await page.goto("/Serah/admin/users/");
  await expect(page.getByTestId("user-row")).toHaveCount(4);
  await page.getByRole("button", { name: "الأطفال" }).click();
  await expect(page.getByTestId("user-row")).toHaveCount(1);
  await page.getByRole("button", { name: "الكل" }).click();
  await page.getByLabel("بحث").fill("ثانية");
  await expect(page.getByTestId("user-row")).toHaveCount(1);
  await page.getByRole("button", { name: "تغيير دور معلمة ثانية" }).click();
  await expect.poll(() => calls.find((c) => c.action === "setRole")).toMatchObject({ user_id: "T2", role: "admin" });
  await expect(page.getByRole("button", { name: "تغيير دور معلمة ثانية" })).toHaveText(/اجعلها معلمة/);
  await page.getByLabel("تفعيل معلمة ثانية").click();
  await expect.poll(() => calls.find((c) => c.action === "setUserActive")).toMatchObject({ user_id: "T2", active: false });
  // الرمز الجديد للمعلمة 6 أرقام على الأقل
  await page.getByRole("button", { name: "رمز جديد لـ معلمة ثانية" }).click();
  const save = page.getByRole("button", { name: "حفظ الرمز" });
  await page.getByLabel("الرمز الجديد").fill("12345");
  await expect(save).toBeDisabled();
  await page.getByLabel("الرمز الجديد").fill("123456");
  await save.click();
  await expect.poll(() => calls.find((c) => c.action === "setUserPin")).toMatchObject({ user_id: "T2", pin: "123456" });
  // حساب المطوّر نفسه بدون أزرار تعديل
  await page.getByLabel("بحث").fill("م.احمد");
  await expect(page.getByRole("button", { name: /عرض كـ/ })).toHaveCount(0);
});

test("عرض كـ طفل: شريط المعاينة، والرجوع يعيد حساب المطوّر", async ({ page }) => {
  await mockBackend(page);
  await loginAs(page, "م.احمد", "987654");
  await page.goto("/Serah/admin/users/");
  await page.getByRole("button", { name: "عرض كـ يوسف" }).click();
  await expect(page).toHaveURL(/\/Serah\/kid\/$/);
  await expect(page.getByRole("status").filter({ hasText: "أنت تشاهد كـ: يوسف (طفل)" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("serah_token"))).toBe("tok-S1-imp");
  // الشريط لا يغطي رأس الصفحة
  const bar = await page.getByRole("status").filter({ hasText: "أنت تشاهد" }).boundingBox();
  const header = await page.locator("header").first().boundingBox();
  expect(header!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1);
  await page.getByRole("button", { name: "رجوع لحسابي" }).click();
  await expect(page).toHaveURL(/\/Serah\/admin\/users\/$/);
  expect(await page.evaluate(() => localStorage.getItem("serah_token"))).toBe("tok-SA");
  await expect(page.getByText("أنت تشاهد كـ")).toHaveCount(0);
});

test("عرض كـ معلمة: يفتح لوحة المعلمة، وزر الخروج يرجع للمطوّر بدل الخروج", async ({ page }) => {
  await mockBackend(page);
  await loginAs(page, "م.احمد", "987654");
  await page.goto("/Serah/admin/");
  await page.getByRole("button", { name: /معلمة أدمن: المعلمة/ }).click();
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
  await expect(page.getByText("أنت تشاهد كـ: المعلمة (معلمة أدمن)")).toBeVisible();
  // زر الخروج في وضع المعاينة يرجع لحساب المطوّر (في الموبايل داخل القائمة الجانبية)
  const menu = page.getByRole("button", { name: "فتح القائمة" });
  if (await menu.isVisible()) { await menu.click(); await page.getByRole("dialog").getByRole("button", { name: /خروج/ }).click(); }
  else await page.getByRole("complementary").getByRole("button", { name: "خروج" }).click();
  await expect(page).toHaveURL(/\/Serah\/admin\/users\/$/);
  expect(await page.evaluate(() => localStorage.getItem("serah_token"))).toBe("tok-SA");
});

test("المعلمة الأدمن: لا تدخل لوحة المطوّر، وترى سجل العمليات", async ({ page }) => {
  await mockBackend(page);
  await loginAs(page, "المعلمة", "482615");
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
  await page.goto("/Serah/admin/");
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
  await expect(page.getByRole("link", { name: "لوحة المطوّر" })).toHaveCount(0);
  await page.goto("/Serah/teacher/audit/");
  await expect(page.getByTestId("audit-row")).toHaveCount(1);
  await expect(page.getByText("إضافة طفل")).toBeVisible();
});

test("الطفل لا يصل لشاشات المطوّر", async ({ page }) => {
  await mockBackend(page);
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "tok-S1");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" }));
  });
  await page.goto("/Serah/admin/users/");
  await expect(page).toHaveURL(/\/Serah\/kid\/$/);
});
