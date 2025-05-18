import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://harmos-api-a77d01707678.herokuapp.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el error es 401, limpiar el token y redirigir al login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

// Login function
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/api/authenticate', { email, password });
    const { token } = response.data;
    
    // Store token
    localStorage.setItem('token', token);
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Logout function
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.dispatchEvent(new Event('auth-logout'));
};

// Password reset request function
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/api/messages', {
      to: email,
      subject: "Recuperación de Contraseña - Harmos",
      body: `Hola,\n\nHas solicitado restablecer tu contraseña en Harmos. Por favor, contacta a un administrador para que te ayude con este proceso.\n\nSaludos,\nEquipo Harmos`
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Helper function to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const message = error.response.data?.message || 'Error en la petición';
    return new Error(message);
  } else if (error.request) {
    // The request was made but no response was received
    return new Error('No se recibió respuesta del servidor');
  } else {
    // Something happened in setting up the request that triggered an Error
    return new Error('Error al configurar la petición');
  }
};

export default api; 