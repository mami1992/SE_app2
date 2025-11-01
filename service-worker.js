const CACHE_NAME = "se-app-v1";
const FILES_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./kirakomesalada.mp3",
  "./kirakomesalada2.mp3",
  "./SE.mp3",
  "./SE2.mp3",
  "./patison.mp3",
  "./patison2.mp3",
  "./icon192.png",
  "./icon512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

// service-worker.js
const CACHE_NAME = 'se-app-cache-v20251101a'; // ★毎回変える
const ASSETS = [
  '/',             // GitHub Pages のプロジェクト直下に合わせて調整
  '/SE_app/',
  '/SE_app/index.html',
  '/SE_app/style.css?v=20251101-a',
  '/SE_app/script.js?v=20251101-a',
  // 必要な静的ファイルを列挙（音声・画像にも ?v= を付ける）
];

// インストール時：必要ファイルをプリキャッシュ
self.addEventListener('install', (event) => {
  self.skipWaiting(); // ★新SWを即座に「待機→スキップ」
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 有効化時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      await self.clients.claim(); // ★ページ制御を即時引き継ぐ
    })()
  );
});

// 取得時：キャッシュ優先→なければネット（必要に応じて戦略を変更）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        // ランタイムキャッシュ（必要なら）
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, res.clone());
          return res;
        });
      }).catch(() => cached); // オフライン時のフォールバック
    })
  );
});