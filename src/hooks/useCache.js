import { useState, useEffect, useCallback } from 'react';

const useCache = () => {
    const [cacheStatus, setCacheStatus] = useState({
        isSupported: 'serviceWorker' in navigator,
        isRegistered: false,
        cacheSize: 0,
        lastUpdate: null
    });

    useEffect(() => {
        if (cacheStatus.isSupported) {
            navigator.serviceWorker.ready.then(() => {
                setCacheStatus(prev => ({ ...prev, isRegistered: true }));
                updateCacheInfo();
            });
        }
    }, []);

    // Obtener información del caché
    const updateCacheInfo = useCallback(async () => {
        if (!cacheStatus.isSupported) return;

        try {
            const cacheNames = await caches.keys();
            let totalSize = 0;

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                totalSize += keys.length;
            }

            setCacheStatus(prev => ({
                ...prev,
                cacheSize: totalSize,
                lastUpdate: new Date()
            }));
        } catch (error) {
            console.error('Error al obtener información del caché:', error);
        }
    }, [cacheStatus.isSupported]);

    // Limpiar todo el caché
    const clearAllCache = useCallback(async () => {
        if (!cacheStatus.isSupported) return false;

        try {
            // Enviar mensaje al Service Worker para limpiar caché
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CLEAR_CACHE'
                });
            }

            // También limpiar desde aquí como backup
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );

            setCacheStatus(prev => ({
                ...prev,
                cacheSize: 0,
                lastUpdate: new Date()
            }));

            console.log('Caché limpiado exitosamente');
            return true;
        } catch (error) {
            console.error('Error al limpiar caché:', error);
            return false;
        }
    }, [cacheStatus.isSupported]);

    // Limpiar caché específico
    const clearSpecificCache = useCallback(async (cacheName) => {
        if (!cacheStatus.isSupported) return false;

        try {
            const deleted = await caches.delete(cacheName);
            if (deleted) {
                updateCacheInfo();
                console.log(`Caché ${cacheName} eliminado`);
            }
            return deleted;
        } catch (error) {
            console.error(`Error al eliminar caché ${cacheName}:`, error);
            return false;
        }
    }, [cacheStatus.isSupported, updateCacheInfo]);

    // Precargar recursos específicos
    const preloadResources = useCallback(async (urls) => {
        if (!cacheStatus.isSupported) return false;

        try {
            const cache = await caches.open('harmos-preload-cache');
            await cache.addAll(urls);
            updateCacheInfo();
            console.log('Recursos precargados:', urls);
            return true;
        } catch (error) {
            console.error('Error al precargar recursos:', error);
            return false;
        }
    }, [cacheStatus.isSupported, updateCacheInfo]);

    // Verificar si un recurso está en caché
    const isResourceCached = useCallback(async (url) => {
        if (!cacheStatus.isSupported) return false;

        try {
            const response = await caches.match(url);
            return !!response;
        } catch (error) {
            console.error('Error al verificar caché:', error);
            return false;
        }
    }, [cacheStatus.isSupported]);

    // Obtener estadísticas detalladas del caché
    const getCacheStats = useCallback(async () => {
        if (!cacheStatus.isSupported) return null;

        try {
            const cacheNames = await caches.keys();
            const stats = {};

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                stats[cacheName] = {
                    count: keys.length,
                    urls: keys.map(request => request.url)
                };
            }

            return stats;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return null;
        }
    }, [cacheStatus.isSupported]);

    return {
        cacheStatus,
        clearAllCache,
        clearSpecificCache,
        preloadResources,
        isResourceCached,
        getCacheStats,
        updateCacheInfo
    };
};

export default useCache; 