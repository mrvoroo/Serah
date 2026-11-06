// عامل خدمة آمن مع سفاري: لا يتدخل في فتح الصفحات نهائيًا (سفاري يرفض الصفحة لو مرّت بتحويل عبر عامل الخدمة)
// ويخزن فقط الملفات الثابتة (الخطوط، الأيقونات، ملفات الواجهة) لتسريع الفتح. لا يخزن الـ API ولا الصوت.
const V = "serah-v6";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())
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
