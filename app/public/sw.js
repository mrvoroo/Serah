// عامل خدمة بسيط: الصفحات من الشبكة أولًا، والملفات الثابتة من الذاكرة أولًا. لا يخزّن الـ API ولا الصوت.
const V = "serah-v2";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match(self.registration.scope))));
    return;
  }
  if (/\/_next\/static\/|\/3d\/|\.(woff2|svg|png)$/.test(u.pathname)) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const c = res.clone(); caches.open(V).then((x) => x.put(e.request, c)); return res; })));
  }
});
