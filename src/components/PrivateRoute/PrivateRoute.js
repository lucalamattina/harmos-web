import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from "../../context/AuthContext";

const PrivateRoute = () => {
    const { isAuthenticated } = useContext(AuthContext);
    const location = useLocation();

    // Verificar el token en localStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && isAuthenticated) {
            // Si no hay token pero el estado dice que está autenticado,
            // forzar el logout
            window.dispatchEvent(new Event('auth-logout'));
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        // Guardar la ubicación actual para redirigir después del login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;