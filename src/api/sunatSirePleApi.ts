import { apiClient } from './client';

export interface SunatConexionEstado {
  configurado: boolean;
  ruc?: string;
  estado: string;
  modoSimulado: boolean;
  ultimoChequeo?: string;
  ultimoError?: string;
}

export interface SireConciliacionLinea {
  id: string;
  conciliacionId: string;
  empresaId: string;
  tipo: 'COMPRAS' | 'VENTAS';
  claveComprobante: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  fechaEmision: string;
  moneda: string;
  baseSunat: number;
  igvSunat: number;
  totalSunat: number;
  comprobanteSistemaId?: string;
  baseSistema?: number;
  igvSistema?: number;
  totalSistema?: number;
  estadoConciliacion: 'COINCIDE' | 'SOLO_EN_SISTEMA' | 'SOLO_EN_SUNAT' | 'DIFERENCIA_IMPORTE' | 'ANULADO_EN_SUNAT' | 'PERIODO_DISTINTO' | 'DIFERENCIA_OTROS_CAMPOS' | 'POSIBLE_DUPLICADO';
  diferenciaBase: number;
  diferenciaIgv: number;
  diferenciaTotal: number;
  decision: 'PENDIENTE' | 'ACEPTADA' | 'OBSERVADA' | 'IGNORADA';
  motivoDecision?: string;
  comprobanteGeneradoId?: string;
  car?: string;
  tieneDetraccion?: boolean;
}

export interface SireConciliacionResumen {
  id: string;
  empresaId: string;
  tipo: 'COMPRAS' | 'VENTAS';
  periodo: string;
  fechaConciliacion: string;
  totalCoinciden: number;
  totalSoloSistema: number;
  totalSoloSunat: number;
  totalDiferencias: number;
  totalAnuladosSunat?: number;
  totalPeriodoDistinto?: number;
  totalDiferenciaOtrosCampos?: number;
  totalPosibleDuplicado?: number;
  lineas: SireConciliacionLinea[];
}

export interface PleLibroConfig {
  codigoLibro: string;
  nombreLibro: string;
  versionFormato: string;
  validadoOficial: boolean;
  especificacionNormativa: string;
}

export interface PleExportacion {
  id: string;
  empresaId: string;
  periodo: string;
  codigoLibro: string;
  nombreArchivo: string;
  contenidoTxt: string;
  hashSha256: string;
  totalFilas: number;
  esOficial: boolean;
  validacionesSuperadas: boolean;
  detalleValidaciones: {
    asientosBorrador: number;
    cuadreContableOk: boolean;
    camposRequeridosOk: boolean;
    advertencias: string[];
  };
  createdAt: string;
}

function extractData<T>(res: any, fallback?: T): T {
  if (res && res.data !== undefined) return res.data;
  if (res !== undefined) return res;
  return fallback as T;
}

export const sunatSirePleApi = {
  // 1. Conexión SUNAT
  async guardarConexion(empresaId: string, datos: any) {
    const res = await apiClient.put<any>(`/empresas/${empresaId}/sunat/conexion`, datos);
    return extractData(res);
  },

  async obtenerEstadoConexion(empresaId: string): Promise<SunatConexionEstado> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/sunat/conexion/estado`);
    return extractData<SunatConexionEstado>(res, { configurado: false, estado: 'SIN_CONFIGURAR', modoSimulado: true });
  },

  async validarConexion(empresaId: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sunat/conexion/validar`);
    return extractData(res);
  },

  // 2. SIRE
  async descargarPropuesta(empresaId: string, tipo: 'COMPRAS' | 'VENTAS', periodo: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/descargar`, { tipo, periodo });
    return extractData(res);
  },

  async consultarJob(jobId: string) {
    const res = await apiClient.get<any>(`/sunat-jobs/${jobId}`);
    return extractData(res);
  },

  async obtenerConciliacion(empresaId: string, tipo: 'COMPRAS' | 'VENTAS', periodo: string, tolerancia = 0.05): Promise<SireConciliacionResumen> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/sire/conciliacion`, {
      params: { tipo, periodo, tolerancia }
    });
    return extractData<SireConciliacionResumen>(res);
  },

  async aplicarConciliacion(empresaId: string, accion: 'ACEPTAR' | 'OBSERVAR' | 'IGNORAR', lineasIds: string[], motivo?: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/conciliacion/aplicar`, {
      accion,
      lineasIds,
      motivo
    });
    return extractData(res);
  },

  async revertirLinea(empresaId: string, lineaId: string, motivo: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/lineas/${lineaId}/revertir`, { motivo });
    return extractData(res);
  },

  async listarReglasProveedor(empresaId: string) {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/sire/reglas-proveedor`);
    return extractData<any[]>(res, []);
  },

  async guardarReglaProveedor(empresaId: string, regla: any) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/reglas-proveedor`, regla);
    return extractData(res);
  },

  async aceptarPropuestaOficial(empresaId: string, datos: { tipo: 'COMPRAS' | 'VENTAS'; periodo: string }) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/aceptar-oficial`, datos);
    return extractData(res);
  },

  async reemplazarPropuestaOficial(empresaId: string, datos: { tipo: 'COMPRAS' | 'VENTAS'; periodo: string; archivoContenidoTxt?: string }) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/reemplazar-oficial`, datos);
    return extractData(res);
  },

  async registrarAjustePosterior(empresaId: string, datos: { tipo: 'COMPRAS' | 'VENTAS'; periodoAjuste: string; periodoAfectado: string; comprobante: any }) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/sire/ajustes-posteriores`, datos);
    return extractData(res);
  },

  // 3. XML / CDR
  async importarXml(empresaId: string, archivos: Array<{ nombre: string; contenidoBase64: string }>) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/comprobantes-xml/importar`, { archivos });
    return extractData(res);
  },

  async listarComprobantesXml(empresaId: string) {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/comprobantes-xml`);
    return extractData<any[]>(res, []);
  },

  // 4. PLE
  async listarLibrosPle(empresaId: string): Promise<PleLibroConfig[]> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/ple/libros`);
    return extractData<PleLibroConfig[]>(res, []);
  },

  async exportarPle(empresaId: string, periodo: string, codigoLibro: string, ruc?: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/ple/exportar`, { periodo, codigoLibro, ruc });
    return extractData(res);
  },

  async obtenerExportacionPle(exportacionId: string): Promise<PleExportacion> {
    const res = await apiClient.get<any>(`/ple-exportaciones/${exportacionId}`);
    return extractData<PleExportacion>(res);
  }
};
