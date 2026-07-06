const CACHE = 'mi-rutina-v3';
const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './data/ejercicios.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(c => c !== CACHE).map(c => caches.delete(c)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Las llamadas a la API de GitHub siempre van a la red
  if (event.request.url.includes('api.github.com')) return;

  event.respondWith(
    caches.match(event.request).then(respuesta => {
      return respuesta || fetch(event.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copia));
        return res;
      }).catch(() => respuesta);
    })
  );
});
