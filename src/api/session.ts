const ACCESS_TOKEN_KEY = 'sunaconta_auth_token';
const REFRESH_TOKEN_KEY = 'sunaconta_refresh_token';

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  empresaActivaId?: string;
}

export function obtenerAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function obtenerRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function guardarSesion(sesion: SessionTokens) {
  if (!sesion || typeof sesion.accessToken !== 'string' || !sesion.accessToken.trim()) {
    throw new Error('Respuesta de sesión inválida.');
  }
  if (sesion.refreshToken !== undefined && (typeof sesion.refreshToken !== 'string' || !sesion.refreshToken.trim())) {
    throw new Error('Respuesta de renovación inválida.');
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, sesion.accessToken);
  if (sesion.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, sesion.refreshToken);
  if (sesion.empresaActivaId !== undefined) {
    if (sesion.empresaActivaId) localStorage.setItem('sunaconta_empresa_activa_id', sesion.empresaActivaId);
    else localStorage.removeItem('sunaconta_empresa_activa_id');
  }
  localStorage.removeItem('sunaconta_jwt_token');
}

export function limpiarSesion() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('sunaconta_jwt_token');
  localStorage.removeItem('sunaconta_empresa_activa_id');
  window.dispatchEvent(new Event('sunaconta_session_expired'));
}
