import { apiClient } from './client';
import { EmpresaCliente } from '../types';

export interface ParametroTributarioDto {
  codigoParametro: string;
  descripcion: string;
  valorNumerico: number;
  vigenteDesde: string;
  vigenteHasta?: string | null;
  categoria: string;
}

export const empresasApi = {
  async listar(): Promise<EmpresaCliente[]> {
    const res: any = await apiClient.get('/empresas');
    return res.data || [];
  },

  async obtener(id: string): Promise<EmpresaCliente> {
    const res: any = await apiClient.get(`/empresas/${id}`);
    return res.data;
  },

  async crear(empresa: Partial<EmpresaCliente>): Promise<EmpresaCliente> {
    const res: any = await apiClient.post('/empresas', { ...empresa, domicilioFiscal: empresa.direccionFiscal });
    return res.data;
  },

  async guardarCredencialesSunat(
    empresaId: string, 
    data: { usuarioSol: string; claveSol: string; clientIdSire?: string; clientSecretSire?: string }
  ) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/credenciales-sunat`, data);
    return res.data;
  },

  async listarParametros(): Promise<ParametroTributarioDto[]> {
    const res: any = await apiClient.get('/parametros');
    return res.data || [];
  },

  async migrarLocalStorage(payload: any) {
    const res: any = await apiClient.post('/migration/localstorage', payload);
    return res.data;
  }
};
