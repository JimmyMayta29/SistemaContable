import axios from 'axios';

// Soporte para cliente web y aplicación de escritorio
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar token y empresa activa si existen
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sunaconta_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const empresaActivaId = localStorage.getItem('sunaconta_empresa_activa_id');
  if (empresaActivaId) {
    config.headers['x-empresa-id'] = empresaActivaId;
  }

  return config;
});

// Interceptor para extraer data
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.error || error.message || 'Error de red o servidor';
    return Promise.reject(new Error(errorMsg));
  }
);
