import axios from 'axios';

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
});

// Login function
export const loginUser = async (email, password) => {
  const response = await api.post('/api/authenticate', { email, password });
  return response.data;
};

// Password reset request function
export const requestPasswordReset = async (email) => {
  const response = await api.post('/api/messages', {
    to: email,
    subject: "Recuperación de Contraseña - Harmos",
    body: `Hola,\n\nHas solicitado restablecer tu contraseña en Harmos. Por favor, contacta a un administrador para que te ayude con este proceso.\n\nSaludos,\nEquipo Harmos`
  });
  return response.data;
};

export default api; 