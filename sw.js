// こけにわ Service Worker
// アプリ本体のファイルを端末に保存して、オフラインでも開けるようにする。
// 通常はネットの最新版を使い、つながらないときだけ保存した版を使う。
const CACHE = 'kokeniwa-v2';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'config.js', 'theme.js', 'register-sw.js',
  'vendor/supabase.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Supabase への通信（ログイン・データ）やフォントなど、ほかのサイトへの通信には触らない
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // まずネットから最新版を取り、保存しておく。つながらないときだけ保存しておいた版を出す
  // （config.js を書き換えたときも、次に開いた時点で反映される）
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? 'index.html' : req, copy)); }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req))
  );
});
