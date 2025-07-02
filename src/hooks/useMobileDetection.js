import { useState, useEffect } from 'react';

// Hook GLOBAL para detección móvil - BASADO EN TAMAÑO DE VENTANA
export const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        function checkMobile() {
            // PRIMERO: Verificar tamaño de ventana
            const windowWidth = window.innerWidth;
            const isMobileWidth = windowWidth <= 768;
            
            // Mobile Detection check
            
            setIsMobile(isMobileWidth);
        }

        // Llamar al cargar
        checkMobile();

        // Agregar listener para cambios de tamaño
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => {
            window.removeEventListener('resize', checkMobile);
        };

    }, []);

    return isMobile;
};

export default useMobileDetection; 