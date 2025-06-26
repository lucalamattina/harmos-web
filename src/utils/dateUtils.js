// Utilidades para el manejo correcto de fechas y zonas horarias

/**
 * Formatea una fecha para mostrar correctamente en la zona horaria local
 * @param {string|Date} dateString - Fecha en formato string o objeto Date
 * @param {Object} options - Opciones de formateo
 * @returns {string} Fecha formateada
 */
export const formatDate = (dateString, options = {}) => {
    // Manejar valores null, undefined o vacíos
    if (!dateString) {
        return 'Fecha no disponible';
    }

    try {
        let date;
        
        if (typeof dateString === 'string') {
            // Si la fecha viene con Z, es UTC explícito
            if (dateString.includes('Z')) {
                date = new Date(dateString);
            } 
            // Si la fecha no tiene Z ni offset (+/-), asumimos que es hora local de Argentina
            else if (dateString.includes('T') && !dateString.includes('+') && !dateString.includes('-', 10)) {
                // Fechas como "2025-06-26T18:12:42.826067" son hora local Argentina
                date = new Date(dateString);
            } 
            // Caso por defecto
            else {
                date = new Date(dateString);
            }
        } else {
            date = new Date(dateString);
        }

        // Verificar que la fecha sea válida
        if (isNaN(date.getTime())) {
            return 'Fecha no válida';
        }

        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Formato 24 horas
        };

        const formatOptions = { ...defaultOptions, ...options };

        // Usar toLocaleString para mejor manejo de horas
        return date.toLocaleString('es-AR', formatOptions);
    } catch (err) {
        console.error('Error al formatear fecha:', err);
        return 'Fecha no válida';
    }
};

/**
 * Formatea una fecha para mostrar solo la fecha (sin hora)
 * @param {string|Date} dateString - Fecha en formato string o objeto Date
 * @returns {string} Fecha formateada sin hora
 */
export const formatDateOnly = (dateString) => {
    return formatDate(dateString, {
        hour: undefined,
        minute: undefined
    });
};

/**
 * Formatea una fecha para mostrar de forma compacta (fecha y hora corta)
 * @param {string|Date} dateString - Fecha en formato string o objeto Date
 * @returns {string} Fecha formateada de forma compacta
 */
export const formatDateCompact = (dateString) => {
    return formatDate(dateString, {
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Formatea una fecha para notificaciones (formato completo pero legible)
 * @param {string|Date} dateString - Fecha en formato string o objeto Date
 * @returns {string} Fecha formateada para notificaciones
 */
export const formatNotificationDate = (dateString) => {
    // Manejar valores null, undefined o vacíos
    if (!dateString) {
        return 'Fecha no disponible';
    }

    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return 'Fecha no válida';
        }

        const now = new Date();
        const diffInMilliseconds = now - date;
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        // Si es muy reciente, mostrar tiempo relativo
        if (diffInMinutes < 1) {
            return 'Hace un momento';
        } else if (diffInMinutes < 60) {
            return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
        } else if (diffInHours < 24) {
            return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
        } else if (diffInDays < 7) {
            return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
        } else {
            // Para fechas más antiguas, mostrar fecha completa con hora correcta en formato 24h
            return formatDate(dateString, { hour12: false });
        }
    } catch (err) {
        console.error('Error al formatear fecha de notificación:', err);
        return 'Fecha no válida';
    }
};

/**
 * Convierte una fecha a ISO string pero manteniendo la zona horaria local
 * @param {Date} date - Fecha a convertir
 * @returns {string} Fecha en formato ISO con zona horaria local
 */
export const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, -1); // Quitar la Z para indicar hora local
}; 