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
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for handling auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token if refresh token exists
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${api.defaults.baseURL}/api/refresh-token`, {
            refreshToken
          });
          
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Update the failed request's authorization header
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
      }
      
      // If we get here, either there was no refresh token or the refresh failed
      handleLogout();
      return Promise.reject(error);
    }

    // Handle other errors
    if (error.response?.status === 403) {
      // Handle forbidden access
      console.error('Access forbidden');
      handleLogout();
    }

    // If it's a 401 and we've already tried to refresh, or any other error
    if (error.response?.status === 401) {
      handleLogout();
    }

    return Promise.reject(error);
  }
);

// Login function
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/api/authenticate', { email, password });
    const { token, refreshToken } = response.data;
    
    // Store tokens
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Logout function
export const logoutUser = () => {
  handleLogout();
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

// Helper function to handle logout
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  // Dispatch a custom event that the AuthContext will listen to
  window.dispatchEvent(new Event('auth-logout'));
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