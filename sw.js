// Service Worker: يجعل التطبيق يفتح بدون إنترنت.
// الشبكة أولاً: عند وجود إنترنت تُجلب دائماً أحدث نسخة من GitHub (فتظهر التحديثات فوراً)،
// وبدون إنترنت تُستخدم النسخة المحفوظة. البيانات المشفّرة لا تمر من هنا.
const VERSION = 'zm-v3';
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
