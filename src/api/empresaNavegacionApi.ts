import { apiClient } from './client';

export interface VerificarAccesoEmpresaResponse {
  permitida: boolean;
  empresaId: string;
  rolEnEmpresa: 'ADMINISTRADOR' | 'CONTADOR' | 'ASISTENTE' | 'AUDITOR' | string;
  usuarioId?: string;
}

export const empresaNavegacionApi = {
  /**
   * Valida acceso a la empresa en el servidor y retorna el rol del usuario asignado
   */
  async verificarAcceso(empresaId: string): Promise<VerificarAccesoEmpresaResponse> {
    return apiClient.get(`/e/${empresaId}/verificar-acceso`, {
      headers: {
        'x-empresa-id': empresaId
      }
    });
  }
};
