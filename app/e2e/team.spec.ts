import { test, expect, type Page, type Route } from "@playwright/test";

// المعلمات: الإضافة والتعديل والتفعيل والحذف (للأدمن وللمطوّر)، ورفع الملفات يرسل أصل الصفحة، وتغيير النبي يغيّر العنوان المقترح

type Call = { action: string; [k: string]: unknown };
const ADMIN = { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const SUPER = { user_id: "SA", name: "م.احمد", role: "superadmin", class_id: "", avatar: "" };

async function mock(page: Page, user: typeof ADMIN) {
  const calls: Call[] = [];
  const staff = [
    { user_id: "T1", role: "admin", name: "المعلمة", class_id: "C1", class_name: "الفصل الأول", active: true, last_login_at: "", telegram: true },
    { user_id: "T2", role: "teacher", name: "معلمة ثانية", class_id: "C1", class_name: "الفصل الأول", active: true, last_login_at: "", telegram: false },
    { user_id: "T3", role: "admin", name: "أدمن أخرى", class_id: "C1", class_name: "الفصل الأول", active: true, last_login_at: "", telegram: false },
  ];
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    switch (b.action) {
      case "staff": return ok(staff);
      case "classes": return ok([{ class_id: "C1", name: "الفصل الأول" }, { class_id: "C2", name: "الفصل الثاني" }]);
      case "addTeacher": staff.push({ user_id: "T9", role: (b.role as string) || "teacher", name: b.name as string, class_id: "C1", class_name: "الفصل الأول", active: true, last_login_at: "", telegram: false }); return ok({ user_id: "T9" });
      case "updateTeacher": { const u = staff.find((x) => x.user_id === b.user_id)!; if (b.name) u.name = b.name as string; if (b.active !== undefined) u.active = b.active as boolean; return ok(true); }
      case "deleteTeacher": staff.splice(staff.findIndex((x) => x.user_id === b.user_id), 1); return ok(true);
      case "startUpload": return ok({ uploadUrl: "https://upload.test/s" });
      case "createLecture": return ok({ lecture_id: "L7" });
      default: return ok([]);
    }
  });
  await page.route("https://upload.test/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "f1" }) }));
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t-" + u.user_id); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
  return calls;
}

test("الأدمن: تضيف معلمة وتعدّلها وتوقفها وتحذفها، ولا تدير أدمن أخرى", async ({ page }) => {
  const calls = await mock(page, ADMIN);
  await page.goto("/Serah/teacher/team/");
  await expect(page.getByTestId("staff-row")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "تعديل أدمن أخرى" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "تعديل المعلمة" })).toHaveCount(0);
  await page.getByRole("button", { name: "إضافة معلمة" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("الاسم كما تكتبه عند الدخول").fill("د. سارة");
  await d.getByLabel("الرمز السري").fill("12345");
  await expect(d.getByRole("button", { name: "حفظ" })).toBeDisabled();
  await d.getByLabel("الرمز السري").fill("135790");
  await expect(d.getByLabel("الدور")).toHaveCount(0);
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "addTeacher")).toMatchObject({ name: "د. سارة", pin: "135790" });
  await expect(page.getByTestId("staff-row")).toHaveCount(4);
  await page.getByRole("button", { name: "تعديل معلمة ثانية" }).click();
  await d.getByLabel(/الاسم/).fill("أ. منى");
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "updateTeacher" && c.name)).toMatchObject({ user_id: "T2", name: "أ. منى", pin: "" });
  await page.getByLabel("تفعيل أ. منى").click();
  await expect.poll(() => calls.find((c) => c.action === "updateTeacher" && c.active === false)).toMatchObject({ user_id: "T2" });
  await page.getByRole("button", { name: "حذف أ. منى" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "حذف" }).click();
  await expect.poll(() => calls.find((c) => c.action === "deleteTeacher")).toMatchObject({ user_id: "T2" });
  await expect(page.getByTestId("staff-row")).toHaveCount(3);
});

test("المطوّر: يضيف معلمة أدمن في فصل محدد ويدير الأدمن", async ({ page }) => {
  const calls = await mock(page, SUPER);
  await page.goto("/Serah/teacher/team/");
  await expect(page.getByRole("button", { name: "تعديل أدمن أخرى" })).toBeVisible();
  await page.getByRole("button", { name: "إضافة معلمة" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("الاسم كما تكتبه عند الدخول").fill("أ. هدى");
  await d.getByLabel("الرمز السري").fill("111222");
  await d.getByLabel("الدور").selectOption("admin");
  await d.getByLabel("الفصل").selectOption("C2");
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "addTeacher")).toMatchObject({ name: "أ. هدى", role: "admin", class_id: "C2" });
});

test("الرفع: تغيير النبي يغيّر العنوان المقترح، والعنوان المكتوب يدويًا لا يتغير، والرفع يرسل أصل الصفحة", async ({ page }) => {
  const calls = await mock(page, ADMIN);
  await page.goto("/Serah/teacher/upload/");
  const title = page.getByLabel("اسم المحاضرة"), pick = page.getByLabel("المحاضرة عن أي نبي؟");
  await pick.selectOption("muhammad");
  await expect(title).toHaveValue("من سيرة سيدنا محمد ﷺ");
  await pick.selectOption("adam");
  await expect(title).toHaveValue("قصة سيدنا آدم");
  await pick.selectOption("");
  await expect(title).toHaveValue("");
  await title.fill("درس عن الصبر");
  await pick.selectOption("ayyub");
  await expect(title).toHaveValue("درس عن الصبر");
  await page.locator("input[type=file]").setInputFiles({ name: "a.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3") });
  await page.getByRole("button", { name: /رفع/ }).last().click();
  await expect.poll(() => calls.find((c) => c.action === "startUpload")).toMatchObject({ kind: "audio", origin: "http://localhost:3123" });
});

test("صور محتوى النبي ترسل أصل الصفحة عند الرفع (سبب خطأ Failed to fetch)", async ({ page }) => {
  const calls = await mock(page, ADMIN);
  await page.route(/script\.google\.com\/macros/, async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    const data = b.action === "prophet" ? { prophet: { prophet_id: "adam", name: "آدم", title: "سيدنا آدم عليه السلام", tag: "", text: "", symbol: "", symbol_name: "" }, items: [] }
      : b.action === "startUpload" ? { uploadUrl: "https://upload.test/s" } : "c1";
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.goto("/Serah/teacher/journey/prophet/?id=adam");
  await page.getByRole("button", { name: /صورة/ }).first().click();
  const d = page.getByRole("dialog");
  await d.getByLabel("العنوان").fill("صورة تعبيرية");
  await d.getByLabel(/^الصورة/).setInputFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: Buffer.from("ffd8ff", "hex") });
  await d.getByRole("button", { name: "حفظ" }).click();
  await expect.poll(() => calls.find((c) => c.action === "startUpload")).toMatchObject({ kind: "image", mime: "image/jpeg", origin: "http://localhost:3123" });
  await expect.poll(() => calls.find((c) => c.action === "saveContent")).toMatchObject({ kind: "image", file_id: "f1", prophet_id: "adam" });
});
