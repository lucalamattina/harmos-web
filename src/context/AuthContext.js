import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Función para validar el token
    const validateToken = async (token) => {
        try {
            // Hacer una petición al backend para validar el token
            await api.get('/api/validate-token', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Validar el token con el backend
                const isValid = await validateToken(token);
                if (isValid) {
                    setIsAuthenticated(true);
                } else {
                    // Si el token no es válido, limpiar el localStorage
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
            }
            setIsLoading(false);
        };

        checkAuth();

        // Listen for logout event
        const handleLogout = () => {
            setIsAuthenticated(false);
            navigate('/login', { replace: true });
        };

        window.addEventListener('auth-logout', handleLogout);

        return () => {
            window.removeEventListener('auth-logout', handleLogout);
        };
    }, [navigate]);

    const login = (token) => {
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
        navigate('/', { replace: true });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
    };

    // Si está cargando, mostrar un spinner o null
    if (isLoading) {
        return null; // O un componente de loading si prefieres
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};