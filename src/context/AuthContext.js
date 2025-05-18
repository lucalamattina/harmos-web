import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Verificar si hay un token al cargar
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        setIsLoading(false);

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

    if (isLoading) {
        return null;
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};