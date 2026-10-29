// Service Worker: يحفظ ملفات التطبيق ليفتح فوراً وبدون إنترنت.
// البيانات نفسها (اللقطة المشفّرة) لا تمر من هنا؛ التطبيق يحفظ آخر نسخة منها بنفسه.
const VERSION = 'zm-v1';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json', 'vendor/bcrypt.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ملفات التطبيق: من الذاكرة فوراً ثم تحديث في الخلفية. أي طلب لموقع آخر (GitHub API) يمر مباشرة للشبكة.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
