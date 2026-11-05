// Service Worker: يجعل التطبيق يفتح بدون إنترنت.
// الشبكة أولاً: عند وجود إنترنت تُجلب دائماً أحدث نسخة من GitHub (فتظهر التحديثات فوراً)،
// وبدون إنترنت تُستخدم النسخة المحفوظة. البيانات المشفّرة لا تمر من هنا.
const VERSION = 'zm-v22';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json', 'vendor/bcrypt.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});

// ───── إشعارات المكتب (يرسلها الجهاز الرئيسي — تصل حتى والتطبيق مغلق) ─────
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'مكتب زين المختار', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'مكتب زين المختار', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { at: d.at || Date.now() },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => 'focus' in c);
    if (w) { w.postMessage({ type: 'refresh' }); return w.focus(); }
    return self.clients.openWindow('./');
  }));
});
