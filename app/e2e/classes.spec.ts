import { test, expect, type Page, type Route } from "@playwright/test";

// الفصول: الأدمن تنشئ فصلًا وتعيّن معلمته، وتدخل على طلابه وتضيف طفلًا له؛ والمعلمة لا ترى صفحة الفصول ولا اختيار الفصل
type Call = { action: string; [k: string]: unknown };
const ADMIN = { user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" };
const TEACHER = { user_id: "T2", name: "سارة", role: "teacher", class_id: "C1", avatar: "" };

function backend() {
  const classes = [{ class_id: "C1", name: "الفصل الأول", join_code: "SERAH1", teacher_id: "A1", teacher: "المعلمة", teachers: [{ user_id: "A1", name: "المعلمة", role: "admin" }], kids: 1, lectures: 2, published: 2 }];
  const staff = [{ user_id: "A1", name: "المعلمة", role: "admin", class_id: "C1", class_name: "الفصل الأول", active: true }, { user_id: "T2", name: "سارة", role: "teacher", class_id: "C1", class_name: "الفصل الأول", active: true }];
  const kids: Record<string, { user_id: string; name: string; avatar: string; gender: string; points: number; created_at: string }[]> = { C1: [{ user_id: "S1", name: "زيد", avatar: "", gender: "m", points: 3, created_at: "2026-01-01" }] };
  const calls: Call[] = [];
  const handler = async (route: Route) => {
    const b = JSON.parse(route.request().postData() || "{}") as Call;
    calls.push(b);
    let data: unknown = [];
    if (b.action === "classes") data = classes;
    if (b.action === "staff") data = staff;
    if (b.action === "createClass") { const id = "C2"; classes.push({ class_id: id, name: String(b.name), join_code: "AB12CD", teacher_id: "", teacher: "", teachers: [], kids: 0, lectures: 0, published: 0 }); kids[id] = []; data = { class_id: id, join_code: "AB12CD" }; }
    if (b.action === "updateClass") {
      const c = classes.find((x) => x.class_id === b.class_id)!;
      const t = staff.find((x) => x.user_id === b.teacher_id);
      if (t) { c.teacher_id = t.user_id; c.teacher = t.name; c.teachers = [{ user_id: t.user_id, name: t.name, role: t.role }]; t.class_id = c.class_id; t.class_name = c.name; }
      data = true;
    }
    if (b.action === "students") data = kids[String(b.class_id || "C1")] ?? [];
    if (b.action === "addStudent") { const id = String(b.class_id || "C1"); kids[id].push({ user_id: "N" + kids[id].length, name: String(b.name), avatar: "", gender: String(b.gender), points: 0, created_at: new Date().toISOString() }); const c = classes.find((x) => x.class_id === id); if (c) c.kids++; data = { user_id: "N" }; }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  };
  return { calls, handler, classes };
}
async function as(page: Page, be: ReturnType<typeof backend>, user: object) {
  await page.route(/script\.google\.com\/macros/, be.handler);
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, user);
}

test("الأدمن: فصل جديد بمعلمته، ثم إضافة طفل له من صفحة طلابه", async ({ page }) => {
  const be = backend();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await as(page, be, ADMIN);
  await page.goto("/Serah/teacher/classes/");
  await expect(page.getByRole("heading", { name: "الفصول" })).toBeVisible();
  await expect(page.getByTestId("class-card")).toHaveCount(1);
  await page.getByRole("button", { name: "فصل جديد" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("اسم الفصل").fill("فصل البراعم");
  await dlg.getByLabel("معلمة الفصل").selectOption("T2");
  await expect(dlg.getByText(/ستنتقل سارة/)).toBeVisible();
  await dlg.getByRole("button", { name: "حفظ" }).click();
  await expect(dlg).toBeHidden();
  expect(be.calls.find((c) => c.action === "createClass")).toMatchObject({ name: "فصل البراعم", teacher_id: "T2" });
  // (الخادم الحقيقي يعيّنها مع الإنشاء؛ الوهمي يحتاج updateClass)
  await page.getByRole("button", { name: "تعديل فصل البراعم" }).click();
  await page.getByRole("dialog").getByLabel("معلمة الفصل").selectOption("T2");
  await page.getByRole("dialog").getByRole("button", { name: "حفظ" }).click();
  await expect(page.getByTestId("class-card").filter({ hasText: "فصل البراعم" })).toContainText("المعلمة: سارة");
  await page.getByTestId("class-card").filter({ hasText: "فصل البراعم" }).getByRole("link", { name: "الطلاب" }).click();
  await expect(page).toHaveURL(/class=C2/);
  await expect(page.getByText(/طفل في «فصل البراعم»/)).toBeVisible();
  await expect(page.getByLabel("اختيار الفصل")).toHaveValue("C2");
  await page.getByRole("button", { name: "إضافة طفل" }).click();
  await page.getByRole("dialog").getByLabel("الاسم").fill("عمر");
  await page.getByRole("dialog").getByLabel("الرمز السري (٤ أرقام)").fill("1234");
  await page.getByRole("dialog").getByRole("button", { name: "حفظ" }).click();
  await expect(page.getByText("عمر")).toBeVisible();
  await expect(page.getByText("جديد")).toBeVisible();
  expect(be.calls.find((c) => c.action === "addStudent")).toMatchObject({ name: "عمر", class_id: "C2" });
  // الرجوع للفصل الأول من القائمة
  await page.getByLabel("اختيار الفصل").selectOption("C1");
  await expect(page.getByText("زيد")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("المعلمة: لا ترى «الفصول» ولا اختيار الفصل، وتضيف لفصلها فقط", async ({ page }) => {
  const be = backend();
  await as(page, be, TEACHER);
  await page.goto("/Serah/teacher/students/");
  await expect(page.getByText("زيد")).toBeVisible();
  await expect(page.getByLabel("اختيار الفصل")).toHaveCount(0);
  await expect(page.locator('a[href="/Serah/teacher/classes/"]')).toHaveCount(0);
  expect(be.calls.some((c) => c.action === "classes")).toBe(false);
  await page.goto("/Serah/teacher/classes/");
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
});
