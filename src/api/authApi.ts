import { apiClient } from './client';
import { obtenerRefreshToken } from './session';

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rolGlobal: string;
}

export interface Sesion {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  usuario: UsuarioSesion;
  empresaActivaId: string;
  empresasPermitidas: string[];
  rolEnEmpresa?: string;
  estudio?: { nombreEstudio: string };
}

export interface PerfilSesion {
  usuario: UsuarioSesion;
  empresaActivaId?: string;
  rolEnEmpresa?: string;
}

export const authApi = {
  async estadoSetup(): Promise<{ configurado: boolean; estudio: { nombreEstudio: string } | null }> {
    const res: any = await apiClient.get('/setup/status');
    if (typeof res.data?.configurado !== 'boolean') throw new Error('Respuesta de configuración inválida.');
    return res.data;
  },

  async login(email: string, password: string, totpCode: string): Promise<Sesion> {
    const res: any = await apiClient.post('/auth/login', { email, password, totpCode: totpCode || undefined });
    return res.data;
  },

  async perfil(): Promise<PerfilSesion> {
    const res: any = await apiClient.get('/auth/perfil');
    if (!res.data?.usuario?.id) throw new Error('Respuesta de perfil inválida.');
    return res.data;
  },

  async seleccionarEmpresa(empresaId: string): Promise<Sesion> {
    const res: any = await apiClient.post('/auth/seleccionar-empresa', { empresaId });
    if (res.data?.empresaActivaId !== empresaId) throw new Error('El servidor no confirmó la empresa solicitada.');
    return res.data;
  },

  async logout() {
    const refreshToken = obtenerRefreshToken();
    if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
  }
};
