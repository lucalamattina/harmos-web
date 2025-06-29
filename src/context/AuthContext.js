import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    const checkUserRoles = (user) => {
        if (!user || !user.roles) return false;
        return user.roles.includes('ADMIN') || user.roles.includes('ADMINISTRATOR');
    };

    const fetchCurrentUser = async () => {
        try {
            const response = await api.get('/api/users/me');
            const userData = response.data;
            setCurrentUser(userData);
            setIsAdmin(checkUserRoles(userData));


            return userData;
        } catch (error) {
            console.error('Error fetching current user:', error);
            setIsAdmin(false);
            setCurrentUser(null);
            throw error;
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await fetchCurrentUser();
                    setIsAuthenticated(true);
                } catch (error) {
                    localStorage.removeItem('token');
                    setIsAuthenticated(false);
                    setIsAdmin(false);
                    setCurrentUser(null);
                }
            } else {
                setIsAuthenticated(false);
                setIsAdmin(false);
                setCurrentUser(null);
            }
            setIsLoading(false);
        };

        initializeAuth();

        // Listen for logout event
        const handleLogout = () => {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser(null);
            navigate('/login', { replace: true });
        };

        window.addEventListener('auth-logout', handleLogout);

        return () => {
            window.removeEventListener('auth-logout', handleLogout);
        };
    }, [navigate, fetchCurrentUser]);

    const login = async (token) => {
        try {
            localStorage.setItem('token', token);
            await fetchCurrentUser();
            setIsAuthenticated(true);
            navigate('/', { replace: true });
        } catch (error) {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser(null);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setCurrentUser(null);
        navigate('/login', { replace: true });
    };

    if (isLoading) {
        return null;
    }

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            isAdmin, 
            currentUser,
            login, 
            logout 
        }}>
            {children}
        </AuthContext.Provider>
    );
};