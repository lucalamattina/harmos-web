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
    // Asegurarse de que el token se envíe con el formato correcto
    config.headers.Authorization = `Bearer ${token.trim()}`;
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

// Obtener schedules con filtros opcionales
export const getSchedules = async (params = {}) => {
  const response = await api.get('/api/schedules', { params });
  return response.data;
};

// Obtener todas las locaciones o filtrar por nombre
export const getLocations = async (params = {}) => {
  const response = await api.get('/api/locations', { params });
 return response.data;
};

// Obtener una locación por ID
export const getLocationById = async (id) => {
  if (!id) throw new Error("Location ID is required");
  const response = await api.get(`/api/locations/${id}`);
  return response.data;
};

// Obtener un usuario por ID
export const getUserById = async (id) => {
  if (!id) throw new Error("User ID is required");
  const response = await api.get(`/api/users/${id}`);
  return response.data;
};

// Obtener un paciente por ID
export const getPatientById = async (id) => {
  if (!id) throw new Error("Patient ID is required");
  const response = await api.get(`/api/patients/${id}`);
  return response.data;
};

// Obtener usuarios con filtros opcionales (ej. por nombre, rol)
export const getUsers = async (params = {}) => {
  const response = await api.get('/api/users', { params });
  // Si la respuesta es paginada y tiene 'content', devolver 'content'.
  // De lo contrario, si la respuesta es un array, devolverla.
  // Si no, devolver un array vacío para evitar errores en el consumidor.
  if (response.data && Array.isArray(response.data.content)) {
    return response.data.content;
  }
  return Array.isArray(response.data) ? response.data : [];
};

// Obtener pacientes con filtros opcionales (ej. por nombre)
export const getPatients = async (params = {}) => {
  const response = await api.get('/api/patients', { params });
  if (response.data && Array.isArray(response.data.content)) {
    return response.data.content;
  }
  return Array.isArray(response.data) ? response.data : [];
};

// Crear un nuevo schedule
export const createSchedule = async (scheduleData) => {
  const response = await api.post('/api/schedules', scheduleData);
  return response.data;
};

// Eliminar un schedule por ID
export const deleteSchedule = async (id) => {
  if (!id) throw new Error("Schedule ID is required");
  await api.delete(`/api/schedules/${id}`);
};



export default api;