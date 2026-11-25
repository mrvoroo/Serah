import { test, expect } from "@playwright/test";

// لوحة المعلمة: أسماء المحاضرات كاملة (رقم تحت العمود + قائمة)، ونسبة الحضور بعلامة ٪ — وتبويب «أولياء الأمور» في المستخدمين
const DEV = { user_id: "D1", name: "احمد", role: "superadmin", class_id: "C1", avatar: "" };
const dash = { kids: 2, lectures: 3, published: 3, drafts: 0, attendanceRate: 60, totalPoints: 30,
  perLecture: [{ title: "قصة سيدنا نوح عليه السلام", date: "2026-11-01", count: 2 }, { title: "قصة سيدنا هود عليه السلام", date: "2026-11-02", count: 1 }, { title: "قصة سيدنا صالح عليه السلام", date: "2026-11-03", count: 0 }],
  days: [], top: [], recent: [], newSuggestions: 0 };
const users = [
  { user_id: "S1", role: "student", name: "زيد", class_id: "C1", class_name: "فصل البراعم", avatar: "", active: true, last_login_at: "", created_at: "" },
  { user_id: "P1", role: "parent", name: "أم زيد", class_id: "", class_name: "", avatar: "mother", active: true, last_login_at: "", created_at: "" },
  { user_id: "T1", role: "teacher", name: "معلمة", class_id: "C1", class_name: "فصل البراعم", avatar: "", active: true, last_login_at: "", created_at: "" },
];
test.beforeEach(async ({ page }) => {
  await page.route(/script\.google\.com\/macros/, async (r) => {
    const b = JSON.parse(r.request().postData() || "{}");
    const data = b.action === "dashboard" ? dash : b.action === "users" ? users : b.action === "systemHealth" ? {} : [];
    await r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  await page.addInitScript((u) => { localStorage.setItem("serah_token", "t"); localStorage.setItem("serah_user", JSON.stringify(u)); }, { ...DEV, role: "admin" });
});

test("لوحة المعلمة: عناوين المحاضرات كاملة ونسبة الحضور بـ٪", async ({ page }) => {
  await page.goto("/Serah/teacher/");
  const legend = page.getByTestId("lecture-legend");
  await expect(legend).toContainText("قصة سيدنا نوح عليه السلام");
  await expect(legend).toContainText("قصة سيدنا صالح عليه السلام");
  await expect(page.locator("[data-current-value]")).toHaveText("٦٠٪");
});

test("المستخدمون: تبويب أولياء الأمور يعرضهم بشخصية الأم/الأب", async ({ page }) => {
  await page.addInitScript((u) => localStorage.setItem("serah_user", JSON.stringify(u)), DEV);
  await page.goto("/Serah/admin/users/");
  await page.getByRole("button", { name: "أولياء الأمور" }).click();
  await expect(page.getByTestId("user-row")).toHaveCount(1);
  await expect(page.getByTestId("user-row")).toContainText("أم زيد");
  await expect(page.getByTestId("user-row")).toContainText("ولي أمر");
  await expect(page.getByTestId("user-row")).not.toContainText("mother");
});
