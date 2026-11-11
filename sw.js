// Garde l'outil en mémoire sur le téléphone pour qu'il s'ouvre sans réseau.
// Aucune donnée personnelle ici : elles restent dans le stockage du téléphone.
const CACHE = 'armement-v2';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// La page : la dernière version en ligne si le réseau répond en moins de 4 s, sinon celle en mémoire
function pageAJour(req, c) {
  const enMemoire = async () => (await c.match(req, { ignoreSearch: true })) || (await c.match('./index.html'));
  return new Promise(resolve => {
    let fini = false;
    const fin = r => { if (!fini && r) { fini = true; resolve(r); } };
    const delai = setTimeout(async () => fin(await enMemoire()), 4000);
    fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); clearTimeout(delai); fin(r); })
      .catch(async () => { clearTimeout(delai); fin((await enMemoire()) || Response.error()); });
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    if (e.request.mode === 'navigate') return pageAJour(e.request, c);
    const enCache = await c.match(e.request, { ignoreSearch: true });
    const reseau = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => enCache);
    return enCache || reseau;
  }));
});
