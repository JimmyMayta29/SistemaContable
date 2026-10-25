import { apiClient } from './client';

export interface ParametrosBusqueda {
  page?: number;
  limit?: number;
  periodoId?: string;
  tipoComprobante?: string;
  proveedorId?: string;
  clienteId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const operacionesApi = {
  // --------------------------------------------------------------------------
  // COMPRAS (RCE)
  // --------------------------------------------------------------------------
  async listarCompras(empresaId: string, params?: ParametrosBusqueda) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/compras`, { params });
    return res.data;
  },

  async crearCompra(empresaId: string, data: any) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/compras`, data);
    return res.data;
  },

  async obtenerCompra(id: string) {
    const res: any = await apiClient.get(`/compras/${id}`);
    return res.data;
  },

  async actualizarCompra(id: string, data: any) {
    const res: any = await apiClient.put(`/compras/${id}`, data);
    return res.data;
  },

  async eliminarCompra(id: string) {
    const res: any = await apiClient.delete(`/compras/${id}`);
    return res.data;
  },

  async registrarBorradorCompra(id: string) {
    const res: any = await apiClient.post(`/compras/${id}/registrar`);
    return res.data;
  },

  async anularCompra(id: string, motivo: string) {
    const res: any = await apiClient.post(`/compras/${id}/anular`, { motivo });
    return res.data;
  },

  async duplicarCompra(id: string) {
    const res: any = await apiClient.post(`/compras/${id}/duplicar`);
    return res.data;
  },

  async obtenerRegistroCompras(empresaId: string, periodo: string) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/registro-compras`, { params: { periodo } });
    return res.data;
  },

  async importarLoteCompras(empresaId: string, data: { formato: 'CSV'; modo: 'TODO_O_NADA' | 'PARCIAL'; filas: any[] }) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/compras/importar-lote`, data);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // VENTAS (RVIE)
  // --------------------------------------------------------------------------
  async listarVentas(empresaId: string, params?: ParametrosBusqueda) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/ventas`, { params });
    return res.data;
  },

  async crearVenta(empresaId: string, data: any) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/ventas`, data);
    return res.data;
  },

  async obtenerVenta(id: string) {
    const res: any = await apiClient.get(`/ventas/${id}`);
    return res.data;
  },

  async actualizarVenta(id: string, data: any) {
    const res: any = await apiClient.put(`/ventas/${id}`, data);
    return res.data;
  },

  async eliminarVenta(id: string) {
    const res: any = await apiClient.delete(`/ventas/${id}`);
    return res.data;
  },

  async registrarBorradorVenta(id: string) {
    const res: any = await apiClient.post(`/ventas/${id}/registrar`);
    return res.data;
  },

  async anularVenta(id: string, motivo: string) {
    const res: any = await apiClient.post(`/ventas/${id}/anular`, { motivo });
    return res.data;
  },

  async duplicarVenta(id: string) {
    const res: any = await apiClient.post(`/ventas/${id}/duplicar`);
    return res.data;
  },

  async obtenerRegistroVentas(empresaId: string, periodo: string) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/registro-ventas`, { params: { periodo } });
    return res.data;
  },

  async importarLoteVentas(empresaId: string, data: { formato: 'CSV'; modo: 'TODO_O_NADA' | 'PARCIAL'; filas: any[] }) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/ventas/importar-lote`, data);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // PREVISUALIZACIÓN CONTABLE
  // --------------------------------------------------------------------------
  async previsualizarAsiento(empresaId: string, tipoOperacion: string, datosOperacion: any) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/contabilizacion/previsualizar`, {
      tipoOperacion,
      datosOperacion
    });
    return res.data;
  },

  // --------------------------------------------------------------------------
  // NOTAS DE CRÉDITO / DÉBITO
  // --------------------------------------------------------------------------
  async aplicarNotaCredito(comprobanteId: string, data: any) {
    const res: any = await apiClient.post(`/comprobantes/${comprobanteId}/nota-credito`, data);
    return res.data;
  },

  async aplicarNotaDebito(comprobanteId: string, data: any) {
    const res: any = await apiClient.post(`/comprobantes/${comprobanteId}/nota-debito`, data);
    return res.data;
  },

  async anularNota(notaId: string, motivo: string) {
    const res: any = await apiClient.post(`/notas/${notaId}/anular`, { motivo });
    return res.data;
  },

  // --------------------------------------------------------------------------
  // CARTERA CxP / CxC & APLICACIONES
  // --------------------------------------------------------------------------
  async listarCxP(empresaId: string, filtros?: { estado?: string; anexoId?: string; search?: string }) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/cuentas-por-pagar`, { params: filtros });
    return res.data || [];
  },

  async listarCxC(empresaId: string, filtros?: { estado?: string; anexoId?: string; search?: string }) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/cuentas-por-cobrar`, { params: filtros });
    return res.data || [];
  },

  async reporteAntiguedad(empresaId: string, tipo: 'CXP' | 'CXC', fechaCorte?: string) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/antiguedad-de-saldos`, { params: { tipo, fechaCorte } });
    return res.data;
  },

  async obtenerEstadoCuenta(empresaId: string, anexoId: string, tipo: 'PROVEEDOR' | 'CLIENTE') {
    const res: any = await apiClient.get(`/empresas/${empresaId}/estado-de-cuenta/${anexoId}`, { params: { tipo } });
    return res.data;
  },

  async aplicarPago(empresaId: string, data: { fechaPago: string; referenciaBanco?: string; aplicaciones: Array<{ cuentaPorPagarId: string; importe: number }> }) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/aplicaciones-pago`, data);
    return res.data;
  },

  async aplicarCobranza(empresaId: string, data: { fechaCobranza: string; referenciaBanco?: string; aplicaciones: Array<{ cuentaPorCobrarId: string; importe: number }> }) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/aplicaciones-cobranza`, data);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // ANEXOS
  // --------------------------------------------------------------------------
  async listarAnexos(empresaId: string, query?: string, tipoEntidad?: string) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/anexos`, { params: { query, tipoEntidad } });
    return res.data || [];
  },

  async crearAnexo(empresaId: string, data: any) {
    const res: any = await apiClient.post(`/empresas/${empresaId}/anexos`, data);
    return res.data;
  },

  async consultarRuc(empresaId: string, ruc: string, tipoEntidad: 'PROVEEDOR' | 'CLIENTE' | 'AMBOS' = 'PROVEEDOR', forzar = false) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/sunat/consulta-ruc/${ruc}`, {
      params: { tipoEntidad, forzar }
    });
    return res.data;
  },

  // --------------------------------------------------------------------------
  // DETRACCIONES SPOT
  // --------------------------------------------------------------------------
  async listarDetracciones(empresaId: string) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/detracciones`);
    return res.data || [];
  },

  async registrarDepositoDetraccion(detraccionId: string, data: { numeroConstancia: string; fechaDeposito: string }) {
    const res: any = await apiClient.post(`/detracciones/${detraccionId}/deposito`, data);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // LIQUIDACIÓN TRIBUTARIA
  // --------------------------------------------------------------------------
  async liquidarIGV(empresaId: string, periodo: string, saldoAnterior = 0) {
    const res: any = await apiClient.get(`/empresas/${empresaId}/liquidacion-igv`, {
      params: { periodo, saldoAnterior }
    });
    return res.data;
  }
};
