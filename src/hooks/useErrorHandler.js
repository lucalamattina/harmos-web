import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

const useErrorHandler = () => {
    const navigate = useNavigate();

    const handleError = useCallback((error) => {
        console.error('Error handled by useErrorHandler:', error);

        // Si el error es de la respuesta HTTP
        if (error.response) {
            const status = error.response.status;
            
            switch (status) {
                case 404:
                    // Para errores 404, no redirigir inmediatamente
                    // Dejar que el componente maneje el error localmente
                    // Recurso no encontrado (404)
                    break;
                    
                case 500:
                    // Error interno del servidor
                    navigate('/error/500', { replace: true, state: { error } });
                    break;
                    
                case 503:
                    // Servicio no disponible
                    navigate('/error/503', { replace: true, state: { error } });
                    break;
                    
                case 401:
                    // No autorizado - esto se maneja en el interceptor
                    break;
                    
                case 403:
                    // Prohibido - usuario autenticado pero sin permisos
                    // Acceso prohibido (403)
                    // Podríamos mostrar un mensaje o redirigir
                    break;
                    
                case 429:
                    // Demasiadas peticiones
                    // Demasiadas peticiones (429)
                    // Podríamos mostrar un mensaje de rate limiting
                    break;
                    
                default:
                    // Para otros errores HTTP, log pero no redirigir automáticamente
                    // Error HTTP
                    break;
            }
        } else if (error.request) {
            // Error de red (sin respuesta del servidor)
            // Error de conexión - sin respuesta del servidor
            navigate('/error/503', { replace: true, state: { error } });
        } else {
            // Error en la configuración de la petición
            console.error('Error en la configuración de la petición:', error.message);
        }
        
        return error;
    }, [navigate]);

    const createErrorMessage = useCallback((error) => {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            
            switch (status) {
                case 400:
                    return 'Datos inválidos en la petición';
                case 401:
                    return 'No tienes autorización para acceder a este recurso';
                case 403:
                    return 'No tienes permisos para realizar esta acción';
                case 404:
                    return 'El recurso solicitado no fue encontrado';
                case 429:
                    return 'Demasiadas peticiones. Intenta de nuevo más tarde';
                case 500:
                    return 'Error interno del servidor';
                case 503:
                    return 'Servicio temporalmente no disponible';
                default:
                    return message || 'Ha ocurrido un error inesperado';
            }
        } else if (error.request) {
            return 'Error de conexión. Verifica tu conexión a internet';
        } else {
            return error.message || 'Error inesperado';
        }
    }, []);

    const isNetworkError = useCallback((error) => {
        return !error.response && error.request;
    }, []);

    const isServerError = useCallback((error) => {
        return error.response && error.response.status >= 500;
    }, []);

    const isClientError = useCallback((error) => {
        return error.response && error.response.status >= 400 && error.response.status < 500;
    }, []);

    return {
        handleError,
        createErrorMessage,
        isNetworkError,
        isServerError,
        isClientError
    };
};

export default useErrorHandler; 