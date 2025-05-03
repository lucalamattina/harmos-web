import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado inicial: no autenticado
    const navigate = useNavigate();

    // Aquí podrías tener lógica para verificar si el usuario ya está logeado
    // al cargar la aplicación (por ejemplo, revisando un token en localStorage).
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const login = (token) => {
        localStorage.setItem('authToken', token);
        setIsAuthenticated(true);
        // Redirección se maneja en el componente de login
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        navigate('/login'); // Redirigir a la página de login después del logout
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};