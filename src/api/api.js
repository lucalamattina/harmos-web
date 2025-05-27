import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import { FaEye, FaEyeSlash } from 'react-icons/fa';

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
    // Solo redirige si hay un token guardado (usuario autenticado)
    const token = localStorage.getItem('token');
    if (error.response?.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth-logout'));
      window.location.href = '/login';
    }
    // Si no hay token, solo rechaza el error para que el login lo maneje
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
    const response = await api.post(`/api/users/forgot-password?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const checkUserExists = async (email) => {
  try {
    const response = await api.get(`/api/users?email=${encodeURIComponent(email)}`);
    // Si la respuesta tiene usuarios, existe
    if (Array.isArray(response.data.content)) {
      return response.data.content.length > 0;
    }
    if (Array.isArray(response.data)) {
      return response.data.length > 0;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export default api; 