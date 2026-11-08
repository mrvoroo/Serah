// عامل خدمة آمن مع سفاري: لا يتدخل في فتح الصفحات نهائيًا (سفاري يرفض الصفحة لو مرّت بتحويل عبر عامل الخدمة)
// ويخزن فقط الملفات الثابتة (الخطوط، الأيقونات، ملفات الواجهة) لتسريع الفتح. لا يخزن الـ API ولا الصوت.
const V = "serah-v11";
// إعدادات الإشعارات (مفتاح الجهاز ورابط الخلفية ونصوص التذكير) يكتبها التطبيق هنا، ولا تُحذف مع تحديث النسخة
const NOTIFY = "serah-notify";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== NOTIFY).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.mode === "navigate") return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (!/\/_next\/static\/|\/3d\/|\.(woff2|svg|png)$/.test(u.pathname)) return;
  e.respondWith(caches.open(V).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && !res.redirected) c.put(req, res.clone());
    return res;
  }))));
});

/* ===== الإشعارات =====
 * الخادم يرسل إشعارًا بلا محتوى، وعامل الخدمة يسحب نوع الرسالة بمفتاح الجهاز (لا يحمل رمز دخول الطفل)
 * ويختار النص من نصوص التذكير المراجَعة (salah.json) التي حفظها التطبيق. */
const BASE = self.registration.scope.replace(/\/$/, "");
// الإعدادات محفوظة بعنوان ثابت؛ ولو الجهاز لسه عليه حفظ قديم بعنوان نسبي (صفحة التطبيق اللي كانت مفتوحة) ندور عليه بآخر الاسم
const readJson = async (c, k) => {
  try {
    let r = await c.match(BASE + "/__notify/" + k);
    if (!r) {
      const old = (await c.keys()).filter((q) => new URL(q.url).pathname.endsWith("/" + k)).pop();
      if (old) r = await c.match(old);
    }
    return r ? await r.json() : null;
  } catch { return null; }
};
const pick = (arr, i) => (arr && arr.length ? arr[(i ?? Math.floor(Math.random() * arr.length)) % arr.length] : null);

// إشعار الصلاة: باسم صاحب الجهاز (الطفل بصيغة تحمّسه، والمعلمة بوقار) ومعه حديث صحيح في فضل الصلاة
function prayerText(item, t) {
  const r = t.reminders || {}, who = t.who || {}, pre = item.kind.startsWith("pre:");
  const key = item.kind.slice(pre ? 4 : 2), prayer = (t.names && t.names[key]) || "";
  const url = who.staff ? "/teacher/prayer/" : "/kid/prayer/";
  const m = r.prayerMsg, list = (r.prayerHadith || []).filter((h) => (h.prayer === key || h.prayer === "any")
    && (h.aud === "all" || (h.aud === "boys" && who.mosque) || (h.aud === "adults" && who.staff)));
  if (!m || !list.length) { // نصوص قديمة محفوظة: الصيغة العامة
    const p = (pre ? r.pre : r.prayer) || { title: pre ? "اقترب وقت صلاة {name}" : "حان وقت صلاة {name}", body: "هيا نتوضأ ونصلي" };
    return { title: p.title.replace("{name}", prayer), body: p.body, url };
  }
  const tpl = (who.staff ? m.staff : m.kid)[pre ? "pre" : "at"];
  let title = tpl.replace("{prayer}", prayer).replace("{name}", who.name || "");
  if (!who.name) title = title.replace(/^،\s*/, "").replace(/ يا !/, "!"); // بدون اسم محفوظ
  const h = pick(list, item.idx);
  const body = (h.text.startsWith("«") ? m.lead : "") + h.text + " (" + h.ref + ")";
  return { title, body, url };
}

function textFor(item, t) {
  const r = (t && t.reminders) || {};
  if (item.title) return { title: item.title, body: item.body || "", url: item.url || "/kid/" };
  if (/^(pre|p):/.test(item.kind)) return prayerText(item, t || {});
  if (item.kind === "duha") { const x = pick(r.duha, item.idx) || { title: "صلاة الضحى", body: "ركعتان من الضحى" }; return { ...x, url: "/kid/prayer/" }; }
  if (item.kind === "fri") { const x = pick(r.friday, item.idx) || { title: "جمعة مباركة", body: "اقرأ سورة الكهف" }; return { ...x, url: "/kid/prayer/" }; }
  const d = pick(r.dhikr, item.idx) || { text: "سبحان الله وبحمده" };
  return { title: "اذكر الله 🤍", body: d.text, url: "/kid/prayer/" };
}

self.addEventListener("push", (e) => e.waitUntil((async () => {
  const c = await caches.open(NOTIFY);
  const cfg = (await readJson(c, "cfg")) || {};
  const texts = await readJson(c, "texts");
  let items = [];
  try {
    if (cfg.api && cfg.key) {
      const res = await fetch(cfg.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "pullNotices", key: cfg.key }) });
      const j = await res.json();
      if (j.ok) items = j.data.items || [];
    }
  } catch { /* بدون إنترنت: نعرض ذكرًا عامًا */ }
  // لو النص ما وصلش (نت ضعيف أو تأخير): نعرض الموعد المحفوظ في جدول الجهاز اللي حان وقته، وإلا ذكر عام
  // (سفاري يلغي الاشتراك لو وصل إشعار ولم يُعرض شيء)
  if (!items.length) {
    const plan = (await readJson(c, "plan")) || [], now = Date.now() / 1000;
    const hit = plan.filter((e) => e[0] <= now + 60 && e[0] > now - 15 * 60).pop();
    items = [hit ? { kind: hit[1], idx: hit[2] } : { kind: "dhikr" }];
  }
  await Promise.all(items.slice(-3).map((it, i) => {
    const n = textFor(it, texts);
    return self.registration.showNotification(n.title, {
      body: n.body, dir: "rtl", lang: "ar", tag: it.kind + ":" + i + ":" + Date.now(),
      icon: BASE + "/brand/icon-192.png", badge: BASE + "/brand/favicon-32.png", data: { url: BASE + n.url }
    });
  }));
})()));

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE + "/kid/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => x.url.startsWith(BASE));
    if (w) return w.focus().then(() => w.navigate ? w.navigate(url) : null).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
