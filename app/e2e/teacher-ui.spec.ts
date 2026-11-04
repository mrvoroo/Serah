import { test, expect, type Page } from "@playwright/test";

// شاشات المعلمات: زيد يغيّر مشاعره مثل شاشات الأطفال، والأيقونات ثلاثية الأبعاد تعوم

async function mock(page: Page) {
  await page.route(/script\.google\.com\/macros/, async (route) => {
    const b = JSON.parse(route.request().postData() || "{}");
    const ok = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    if (b.action === "login" && !b.user_id) {
      return b.pin === "482615"
        ? ok({ token: "t-T1", user: { user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" } })
        : route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "الرمز غير صحيح" }) });
    }
    if (b.action === "classInfo") return b.code === "7391" ? ok({ class_id: "C1", name: "الفصل الأول", kids: [{ user_id: "S1", name: "يوسف", avatar: "🌟" }] })
      : route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "كود الفصل غير صحيح" }) });
    if (b.action === "login" && b.user_id) return b.pin === "1111" ? ok({ token: "t-S1", user: { user_id: "S1", name: "يوسف", role: "student", class_id: "C1", avatar: "🌟" } })
      : route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: false, error: "الرمز غير صحيح" }) });
    if (b.action === "classCode") return ok({ code: "SERAH1" });
    if (b.action === "dashboard") return ok({ kids: 3, lectures: 2, published: 1, drafts: 1, attendanceRate: 50, totalPoints: 30, perLecture: [], days: [], top: [], recent: [], newSuggestions: 0 });
    return ok([]);
  });
}
const zaid = (page: Page) => page.getByRole("img", { name: /^زيد/ }).first();

test("دخول المعلمة: زيد يرحب، يفكر مع الرمز، يتفاجأ لو غلط، ويفرح عند الدخول", async ({ page }) => {
  await mock(page);
  await page.goto("/Serah/teacher/login/?tier=high");
  await expect(zaid(page)).toHaveAccessibleName("زيد بيسلّم");
  await page.getByLabel("الاسم").fill("المعلمة");
  await expect(zaid(page)).toHaveAccessibleName("زيد فرحان");
  await page.getByLabel("الرمز السري").fill("000000");
  await expect(zaid(page)).toHaveAccessibleName("زيد بيفكر");
  await page.getByRole("button", { name: /دخول/ }).last().click();
  await expect(page.getByText("الرمز غير صحيح")).toBeVisible();
  await expect(zaid(page)).toHaveAccessibleName("زيد مستغرب");
  await page.getByLabel("الرمز السري").fill("482615");
  await expect(zaid(page)).toHaveAccessibleName("زيد بيفكر");
  await page.getByRole("button", { name: /دخول/ }).last().click();
  await expect(page).toHaveURL(/\/Serah\/teacher\/$/);
  // لوحة المعلمة: زيد في الترحيب، ويفكر لأن فيه مسودة تنتظر المراجعة
  await expect(zaid(page)).toHaveAccessibleName("زيد بيفكر");
});

test("دخول الطفل: نفس المشاعر — كود أو رمز غلط يتفاجأ، والدخول يفرح", async ({ page }) => {
  await mock(page);
  await page.goto("/Serah/?tier=high");
  await expect(zaid(page)).toHaveAccessibleName("زيد بيسلّم");
  await page.getByLabel("اكتب كود الفصل").fill("0000");
  await expect(zaid(page)).toHaveAccessibleName("زيد فرحان");
  await page.getByRole("button", { name: /يلا نبدأ/ }).click();
  await expect(page.getByText("كود الفصل غير صحيح")).toBeVisible();
  await expect(zaid(page)).toHaveAccessibleName("زيد مستغرب");
  await page.getByLabel("اكتب كود الفصل").fill("7391");
  await page.getByRole("button", { name: /يلا نبدأ/ }).click();
  await page.getByRole("button", { name: /يوسف/ }).click();
  await expect(zaid(page)).toHaveAccessibleName("زيد بيفكر");
  await page.getByRole("textbox").click();
  await page.keyboard.type("9999");
  await expect(page.getByText("الرمز غير صحيح")).toBeVisible();
  await expect(zaid(page)).toHaveAccessibleName("زيد مستغرب");
  await page.keyboard.type("1");
  await expect(zaid(page)).toHaveAccessibleName("زيد بيفكر");
  await page.keyboard.type("111");
  await expect(page).toHaveURL(/\/Serah\/kid\/$/);
});

test("أيقونات شاشات المعلمة تعوم مثل شاشات الأطفال", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => {
    localStorage.setItem("serah_token", "t-T1");
    localStorage.setItem("serah_user", JSON.stringify({ user_id: "T1", name: "المعلمة", role: "admin", class_id: "C1", avatar: "" }));
  });
  for (const path of ["/Serah/teacher/students/?tier=high", "/Serah/teacher/settings/?tier=high", "/Serah/teacher/journey/?tier=high"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(800);
    // أيقونة العنوان بجانب h1: نأخذ موضعها عدة مرات خلال دورة الحركة (3.2 ثانية) — لازم تطلع وتنزل
    const range = await page.evaluate(async () => {
      const ys: number[] = [];
      for (let k = 0; k < 9; k++) {
        const h1 = document.querySelector("h1")!;
        const img = h1.parentElement!.querySelector(":scope > img") ?? h1.parentElement!.parentElement!.querySelector(":scope > img");
        if (img) ys.push(img.getBoundingClientRect().y);
        await new Promise((r) => setTimeout(r, 400));
      }
      return ys.length > 5 ? Math.max(...ys) - Math.min(...ys) : -1;
    });
    expect(range, path).toBeGreaterThan(2);
  }
});
