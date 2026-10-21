// オフライン用の仕組み。一度開いたページと部品を端末に覚えておき、通信がなくても開けるようにします。
// 患者さんの情報は扱いません（ここで覚えるのは、ツールの画面と部品だけです）。
// ツールを更新したときは、下の VERSION の数字を変えると、確実に入れ替わります。
const VERSION = 'v1';
const CACHE = 'rehab-task-tool-' + VERSION;
const PARTS = ['pwa/manifest.webmanifest', 'pwa/icon-180.png', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PARTS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rehab-task-tool-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// 先に覚えてあるものを表示し、通信できるときは裏で最新版に更新します（次に開いたときに反映）
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || (await cache.match(req.mode === 'navigate' ? new URL('./', location.href).href : req)) || new Response('オフラインです', { status: 503 });
    })
  );
});
