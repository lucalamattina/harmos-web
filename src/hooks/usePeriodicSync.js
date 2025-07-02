import { useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getNotifications } from '../api/notifications';
import api from '../api/api';

/**
 * Hook personalizado para manejar sincronización periódica de notificaciones y estado del usuario
 * @param {Function} onNotificationsUpdate - Callback para actualizar notificaciones
 * @param {Function} onUserUpdate - Callback para actualizar datos del usuario (opcional)
 * @param {number} intervalMs - Intervalo en milisegundos (default: 2 minutos)
 */
export const usePeriodicSync = (onNotificationsUpdate, onUserUpdate = null, intervalMs = 120000) => {
    const { isAuthenticated, currentUser, setCurrentUser, setIsAdmin } = useContext(AuthContext);

    const checkUserRoles = (user) => {
        if (!user || !user.roles) return false;
        return user.roles.includes('ADMIN') || user.roles.includes('ADMINISTRATOR');
    };

    const syncData = useCallback(async () => {
        // Solo hacer sync si el usuario está autenticado
        if (!isAuthenticated) return;

        try {
            // Hacer ambas consultas en paralelo para ser más eficiente
            const promises = [
                getNotifications().catch(error => {
                    console.error('Error fetching notifications during sync:', error);
                    return null;
                })
            ];

            // Solo agregar consulta de usuario si hay un callback o si queremos verificar cambios
            if (onUserUpdate || currentUser) {
                promises.push(
                    api.get('/api/users/me').catch(error => {
                        console.error('Error fetching user during sync:', error);
                        // Si hay error 401, el interceptor de axios ya maneja el logout
                        return null;
                    })
                );
            }

            const results = await Promise.all(promises);
            const [notificationsData, userResponse] = results;

            // Actualizar notificaciones si se obtuvieron correctamente
            if (notificationsData && onNotificationsUpdate) {
                onNotificationsUpdate(notificationsData);
            }

            // Actualizar datos del usuario si hay cambios
            if (userResponse?.data) {
                const userData = userResponse.data;
                
                // Solo actualizar si hay cambios para evitar re-renders innecesarios
                if (JSON.stringify(currentUser) !== JSON.stringify(userData)) {
                    setCurrentUser?.(userData);
                    setIsAdmin?.(checkUserRoles(userData));
                    
                    // Llamar callback personalizado si existe
                    if (onUserUpdate) {
                        onUserUpdate(userData);
                    }
                }
            }
        } catch (error) {
            // Error during periodic sync
        }
    }, [isAuthenticated, onNotificationsUpdate, onUserUpdate, currentUser, setCurrentUser, setIsAdmin]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Ejecutar sync inicial inmediatamente
        syncData();

        // Configurar polling cada 2 minutos
        const pollInterval = setInterval(syncData, intervalMs);

        // Limpiar intervalo al desmontar
        return () => clearInterval(pollInterval);
    }, [isAuthenticated, syncData, intervalMs]);

    // Retornar función para sincronización manual
    return { syncNow: syncData };
};

export default usePeriodicSync; 