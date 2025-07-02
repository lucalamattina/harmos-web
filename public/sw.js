// Service Worker optimizado para Harmos
const CACHE_NAME = 'harmos-cache-v2'; // Incrementar versión para forzar actualización
const STATIC_CACHE_NAME = 'harmos-static-v2';

// Solo recursos críticos para performance
const STATIC_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// URLs que NO queremos cachear (APIs, contenido dinámico)
const EXCLUDE_PATTERNS = [
  '/api/',
  '/announcements/',
  'cloudinary.com',
  'res.cloudinary.com',
  'herokuapp.com/api', // Excluir todas las APIs de Heroku
  'localhost:8080' // Excluir API local
];

// Función para verificar si una URL debe ser cacheada
function shouldCache(url) {
  // No cachear si es una API o contenido dinámico
  if (EXCLUDE_PATTERNS.some(pattern => url.includes(pattern))) {
    return false;
  }
  
  // Solo cachear recursos estáticos esenciales
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.ico'];
  return staticExtensions.some(ext => url.includes(ext)) || url === location.origin + '/';
}

// Instalar Service Worker
self.addEventListener('install', (event) => {

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_RESOURCES.filter(resource => {
          // Solo cachear recursos que realmente existen
          return resource === '/' || resource.includes('/static/') || resource.includes('.ico') || resource.includes('manifest');
        }));
      })
      .catch((error) => {
        // Error al cachear recursos
      })
  );

  // Activar inmediatamente para reemplazar versión anterior
  self.skipWaiting();
});

// Activar Service Worker y limpiar cachés viejos
self.addEventListener('activate', (event) => {

  event.waitUntil(
    Promise.all([
      // Limpiar cachés viejos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las pestañas
      self.clients.claim()
    ])
  );
});

// Interceptar requests con estrategia más conservadora
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo manejar requests GET del mismo origen
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // No interceptar APIs ni contenido dinámico
  if (!shouldCache(request.url)) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Para recursos estáticos críticos, usar caché si existe
        if (cachedResponse && isStaticResource(request.url)) {
          return cachedResponse;
        }

        // Para todo lo demás, hacer fetch primero (network first)
        return fetch(request)
          .then((response) => {
            // Solo cachear respuestas exitosas de recursos estáticos
            if (response.ok && isStaticResource(request.url)) {
              const responseClone = response.clone();
              const cacheName = STATIC_RESOURCES.some(resource => request.url.includes(resource)) 
                ? STATIC_CACHE_NAME 
                : CACHE_NAME;

              caches.open(cacheName)
                .then((cache) => {
                  cache.put(request, responseClone);
                })
                .catch(error => {});
            }

            return response;
          })
          .catch(() => {
            // Solo usar caché como fallback para recursos estáticos
            if (cachedResponse && isStaticResource(request.url)) {
              return cachedResponse;
            }
            
            // Para la página principal, devolver index si está en caché
            if (request.destination === 'document') {
              return caches.match('/').then(fallback => fallback || Response.error());
            }
            
            return Response.error();
          });
      })
  );
});

// Función más estricta para determinar recursos estáticos
function isStaticResource(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.ico'];
  return staticExtensions.some(ext => url.includes(ext)) || 
         url === location.origin + '/' ||
         url.includes('/static/');
}

// Manejar mensajes para control manual del caché
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminando caché
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Notificar que el caché fue limpiado
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Service Worker v2 cargado - Cacheo optimizado 