// Service Worker para cacheo de recursos estáticos
const CACHE_NAME = 'harmos-cache-v1';
const STATIC_CACHE_NAME = 'harmos-static-v1';

// Recursos que queremos cachear
const STATIC_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Imágenes del proyecto
  '/static/media/Fondo.jpg',
  '/static/media/Harmos-Logo.jpg',
  '/static/media/Harmos-Logo-Letras.jpg',
  '/static/media/Harmos-Logo-no-letras.png',
  '/static/media/Harmos-Logo-Transparente.png'
];

// URLs que NO queremos cachear (APIs, anuncios dinámicos)
const EXCLUDE_PATTERNS = [
  '/api/',
  '/announcements/',
  'cloudinary.com',
  'res.cloudinary.com'
];

// Función para verificar si una URL debe ser cacheada
function shouldCache(url) {
  return !EXCLUDE_PATTERNS.some(pattern => url.includes(pattern));
}

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos...');
        return cache.addAll(STATIC_RESOURCES);
      })
      .catch((error) => {
        console.error('[SW] Error al cachear recursos:', error);
      })
  );
  
  // Activar el SW inmediatamente
  self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    // Limpiar cachés viejos
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Eliminando caché viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control de todas las pestañas
  self.clients.claim();
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Solo manejar requests GET
  if (request.method !== 'GET') {
    return;
  }
  
  // No cachear URLs excluidas
  if (!shouldCache(request.url)) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Si está en caché, devolverlo
        if (cachedResponse) {
          // Para recursos estáticos, usar caché directamente
          if (isStaticResource(request.url)) {
            return cachedResponse;
          }
          
          // Para otros recursos, hacer fetch en background para actualizar
          fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
            })
            .catch(() => {
              // Si falla el fetch, usar caché
            });
          
          return cachedResponse;
        }
        
        // Si no está en caché, hacer fetch
        return fetch(request)
          .then((response) => {
            // Solo cachear respuestas exitosas
            if (!response.ok) {
              return response;
            }
            
            const responseClone = response.clone();
            
            // Determinar qué caché usar
            const cacheName = isStaticResource(request.url) ? STATIC_CACHE_NAME : CACHE_NAME;
            
            caches.open(cacheName)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            // Si falla el fetch y es una página, devolver página offline
            if (request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Función para determinar si es un recurso estático
function isStaticResource(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.includes(ext)) || 
         STATIC_RESOURCES.some(resource => url.includes(resource));
}

// Evento para limpiar caché cuando se solicite
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Limpiando caché:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Logging para debugging
console.log('[SW] Service Worker cargado correctamente'); 