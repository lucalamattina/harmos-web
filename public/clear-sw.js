// Script para limpiar service workers registrados
// Ejecutar en consola del navegador si es necesario

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister().then(function(boolean) {
                console.log('Service Worker desregistrado:', boolean);
            });
        }
        console.log('Todos los service workers han sido limpiados');
    });
}

// También limpiar todos los caches
if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.map(function(cacheName) {
                return caches.delete(cacheName);
            })
        );
    }).then(function() {
        console.log('Todos los caches han sido limpiados');
    });
}

console.log('Service Worker y caches limpiados. Recarga la página.'); 