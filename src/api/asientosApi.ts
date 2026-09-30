import { apiClient } from './client';

export interface DetalleDto {
  id?: string;
  linea: number;
  cuentaId: string;
  cuentaCodigo?: string;
  cuentaNombre?: string;
  anexoId?: string | null;
  anexoNumero?: string | null;
  anexoRazonSocial?: string | null;
  debe: number;
  haber: number;
  debeMe?: number;
  haberMe?: number;
  docTipo?: string | null;
  docSerie?: string | null;
  docNumero?: string | null;
  fechaVencimiento?: string | null;
  glosaLinea?: string | null;
}

export interface AsientoDto {
  id: string;
  empresaId: string;
  periodoId: string;
  periodoCodigo?: string;
  subdiarioId: string;
  subdiarioCodigo?: string;
  subdiarioNombre?: string;
  numero: string | null;
  fecha: string;
  glosa: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  estado: 'BORRADOR' | 'CONTABILIZADO' | 'ANULADO';
  origen: string;
  asientoExtornoId?: string | null;
  motivoAnulacion?: string | null;
  version: number;
  totalDebe?: number;
  totalHaber?: number;
  lineasCount?: number;
  createdAt: string;
  detalles?: DetalleDto[];
}

export const asientosApi = {
  async listar(empresaId: string, params: Record<string, any> = {}): Promise<{ data: AsientoDto[]; total: number; page: number; totalPages: number }> {
    const res: any = await apiClient.get(`/empresas/${empresaId}/asientos`, { params });
    return res.data;
  },

  async obtener(id: string): Promise<AsientoDto> {
    const res: any = await apiClient.get(`/asientos/${id}`);
    return res.data;
  },

  async crear(empresaId: string, data: any): Promise<AsientoDto> {
    const res: any = await apiClient.post(`/empresas/${empresaId}/asientos`, data);
    return res.data;
  },

  async actualizar(id: string, data: any): Promise<AsientoDto> {
    const res: any = await apiClient.put(`/asientos/${id}`, data);
    return res.data;
  },

  async contabilizar(id: string): Promise<AsientoDto> {
    const res: any = await apiClient.post(`/asientos/${id}/contabilizar`);
    return res.data;
  },

  async anular(id: string, motivo: string): Promise<{ asientoOriginalId: string; extornoId: string; estado: string }> {
    const res: any = await apiClient.post(`/asientos/${id}/anular`, { motivo });
    return res.data;
  },

  async duplicar(id: string): Promise<AsientoDto> {
    const res: any = await apiClient.post(`/asientos/${id}/duplicar`);
    return res.data;
  },

  async previsualizar(empresaId: string, data: any) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/contabilizacion/previsualizar`, data);
    return res.data;
  },

  async listarPeriodos(empresaId: string, anio = 2026) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/periodos`, { params: { anio } });
    return res.data;
  },

  async cerrarPeriodo(periodoId: string) {
    const res: any = await apiClient.post(`/periodos/${periodoId}/cerrar`);
    return res.data;
  },

  async reabrirPeriodo(periodoId: string, motivo: string) {
    const res: any = await apiClient.post(`/periodos/${periodoId}/reabrir`, { motivo });
    return res.data;
  },

  async listarAuditoria(empresaId: string, limit = 50) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/auditoria`, { params: { limit } });
    return res.data;
  },

  async obtenerLibroDiario(empresaId: string, params: Record<string, any> = {}) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/libro-diario`, { params });
    return res.data;
  }
};
