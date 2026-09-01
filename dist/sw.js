const CACHE_NAME = "mon-entrainement-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./programme.json",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
