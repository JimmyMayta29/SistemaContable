import axios from 'axios';
import { guardarSesion, limpiarSesion, obtenerAccessToken, obtenerRefreshToken } from './session';

// Soporte para cliente web y aplicación de escritorio
const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// La empresa autorizada se resuelve desde el token emitido por el servidor.
apiClient.interceptors.request.use((config) => {
  const token = obtenerAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let renovacionPendiente: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config;
    const esAccesoPublico = /\/auth\/(login|refresh)$|\/setup\//.test(config?.url || '');
    if (error.response?.status === 401 && config && !esAccesoPublico) {
      const refreshToken = obtenerRefreshToken();
      if (!config.sesionReintentada && refreshToken) {
        config.sesionReintentada = true;
        try {
          if (!renovacionPendiente) {
            renovacionPendiente = axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
              .then(({ data }) => {
                if (!data.success || !data.data?.accessToken) throw new Error('No se pudo renovar la sesión.');
                if (obtenerRefreshToken() !== refreshToken) throw new Error('La sesión cambió durante la renovación.');
                guardarSesion(data.data);
                return data.data.accessToken as string;
              })
              .finally(() => { renovacionPendiente = null; });
          }
          config.headers.Authorization = `Bearer ${await renovacionPendiente}`;
          return apiClient.request(config);
        } catch (refreshError) {
          if (obtenerRefreshToken() === refreshToken) limpiarSesion();
          return Promise.reject(refreshError);
        }
      }
      limpiarSesion();
    }
    const errorMsg = error.response?.data?.error || error.message || 'Error de red o servidor';
    error.message = typeof errorMsg === 'string' ? errorMsg : 'Error de red o servidor';
    return Promise.reject(error);
  }
);
