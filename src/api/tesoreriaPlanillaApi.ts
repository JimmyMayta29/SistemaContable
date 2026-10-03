import { apiClient } from './client';

export interface CuentaFinancieraApi {
  id: string;
  empresaId: string;
  tipo: 'CAJA' | 'BANCO' | 'DETRACCIONES_BN';
  banco: string;
  numero: string;
  moneda: 'PEN' | 'USD';
  cuentaContableCodigo: string;
  saldoInicial: number;
  saldoActual: number;
  activa: boolean;
}

export interface MovimientoTesoreriaApi {
  id: string;
  empresaId: string;
  periodoId: string;
  cuentaFinancieraId: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'COMISION' | 'ITF' | 'DEPOSITO_DETRACCION';
  medioPago: string;
  numeroOperacion?: string;
  anexoId?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  importe: number;
  saldoSinAplicar: number;
  glosa: string;
  estado: 'BORRADOR' | 'REGISTRADO' | 'ANULADO';
  conciliado: boolean;
  asientoId?: string;
  version: number;
  createdAt: string;
  aplicaciones?: Array<{
    documentoId: string;
    importeAplicado: number;
  }>;
}

export interface ConciliacionResumenApi {
  cuenta: {
    id: string;
    banco: string;
    numero: string;
    moneda: string;
  };
  fechaCorte: string;
  resumen: {
    saldoSegunLibros: number;
    saldoSegunBanco: number;
    partidasConciliadas: number;
    partidasEnTransito: number;
    diferencia: number;
    cuadrado: boolean;
  };
  coincidenciasSugeridas: Array<{
    lineaExtractoId: string;
    movimientoId: string;
    score: number;
    motivo: string;
  }>;
  extractoLineas: Array<{
    id: string;
    fecha: string;
    descripcion: string;
    referencia?: string;
    monto: number;
    saldo?: number;
    conciliada: boolean;
    movimientoTesoreriaId?: string;
  }>;
  movimientosLibros: MovimientoTesoreriaApi[];
}

export interface ReciboHonorarioApi {
  id: string;
  empresaId: string;
  periodoId: string;
  proveedorId: string;
  proveedorNombre?: string;
  proveedorRuc?: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaPago?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  importeBruto: number;
  aplicaRetencion: boolean;
  tasaRetencion: number;
  retencion: number;
  netoPagar: number;
  suspensionCuarta: boolean;
  numeroResolucionSuspension?: string;
  vigenciaSuspensionDesde?: string;
  vigenciaSuspensionHasta?: string;
  cuentaGasto: string;
  glosa: string;
  estado: 'BORRADOR' | 'REGISTRADO' | 'PAGADO' | 'ANULADO';
  asientoId?: string;
  cuentaPorPagarId?: string;
  version: number;
  origenParametroTasa?: string;
}

export interface TrabajadorApi {
  id: string;
  empresaId: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  regimenLaboral: 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA';
  sueldoBase: number;
  tieneAsignacionFamiliar: boolean;
  sistemaPensiones: 'ONP' | 'AFP';
  afpAdministradora?: 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';
  afpTipoComision?: 'FLUJO' | 'MIXTA';
  cuspp?: string;
  centroCosto: string;
  cuentaBancoSueldo?: string;
  bancoSueldo?: string;
  activo: boolean;
}

export interface PlanillaApi {
  id: string;
  empresaId: string;
  periodoId: string;
  mes: string;
  fechaCalculo: string;
  fechaPago?: string;
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesEmpleador: number;
  totalNeto: number;
  estado: 'BORRADOR' | 'CALCULADA' | 'CONTABILIZADA' | 'PAGADA';
  asientoId?: string;
  lineas: Array<{
    id: string;
    trabajadorId: string;
    trabajadorNombre: string;
    trabajadorDocumento: string;
    diasLaborados: number;
    sueldoBasico: number;
    asignacionFamiliar: number;
    horasExtras: number;
    otrosIngresos: number;
    totalRemuneracion: number;
    aporteObligatorioPension: number;
    comisionAfp: number;
    primaSeguroAfp: number;
    retencionQuinta: number;
    otrosDescuentos: number;
    totalDescuentos: number;
    aporteEssalud: number;
    netoPagar: number;
    centroCosto: string;
  }>;
}

export interface FlujoCajaApi {
  fechaDesde: string;
  fechaHasta: string;
  totalIngresos: number;
  totalEgresos: number;
  flujoNeto: number;
  saldoTotalDisponible: number;
  cuentas: Array<{
    id: string;
    banco: string;
    numero: string;
    tipo: string;
    moneda: string;
    saldoActual: number;
  }>;
}

function extractData<T>(res: any, fallback?: T): T {
  if (res && res.data !== undefined) return res.data;
  if (res !== undefined) return res;
  return fallback as T;
}

export const tesoreriaPlanillaApi = {
  // Cuentas Financieras
  async listarCuentas(empresaId: string): Promise<CuentaFinancieraApi[]> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/cuentas-financieras`);
    return extractData<CuentaFinancieraApi[]>(res, []);
  },

  async crearCuenta(empresaId: string, datos: any): Promise<CuentaFinancieraApi> {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/cuentas-financieras`, datos);
    return extractData<CuentaFinancieraApi>(res);
  },

  // Movimientos
  async listarMovimientos(empresaId: string, params?: any): Promise<{ items: MovimientoTesoreriaApi[]; total: number }> {
    const res = await apiClient.get<any>(
      `/empresas/${empresaId}/movimientos-tesoreria`,
      { params }
    );
    return extractData<{ items: MovimientoTesoreriaApi[]; total: number }>(res, { items: [], total: 0 });
  },

  async registrarMovimiento(empresaId: string, datos: any): Promise<MovimientoTesoreriaApi> {
    const res = await apiClient.post<any>(
      `/empresas/${empresaId}/movimientos-tesoreria`,
      datos
    );
    return extractData<MovimientoTesoreriaApi>(res);
  },

  async anularMovimiento(empresaId: string, movimientoId: string, motivo: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/movimientos-tesoreria/${movimientoId}/anular`, { motivo });
    return extractData(res);
  },

  // Transferencias
  async registrarTransferencia(empresaId: string, datos: any) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/transferencias`, datos);
    return extractData(res);
  },

  // Conciliación
  async importarExtracto(empresaId: string, datos: any) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/extractos`, datos);
    return extractData(res);
  },

  async obtenerConciliacion(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte?: string): Promise<ConciliacionResumenApi> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/conciliaciones`, {
      params: { cuentaFinancieraId, periodoId, fechaCorte }
    });
    return extractData<ConciliacionResumenApi>(res);
  },

  async conciliarPartida(empresaId: string, extractoLineaId: string, movimientoId: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/conciliaciones/conciliar`, { extractoLineaId, movimientoId });
    return extractData(res);
  },

  async desconciliarPartida(empresaId: string, extractoLineaId: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/conciliaciones/desconciliar`, { extractoLineaId });
    return extractData(res);
  },

  async cerrarConciliacion(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/conciliaciones/cerrar`, { cuentaFinancieraId, periodoId, fechaCorte });
    return extractData(res);
  },

  // Honorarios
  async listarHonorarios(empresaId: string, params?: any): Promise<ReciboHonorarioApi[]> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/honorarios`, { params });
    return extractData<ReciboHonorarioApi[]>(res, []);
  },

  async registrarHonorario(empresaId: string, datos: any): Promise<ReciboHonorarioApi> {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/honorarios`, datos);
    return extractData<ReciboHonorarioApi>(res);
  },

  async anularHonorario(empresaId: string, honorarioId: string, motivo: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/honorarios/${honorarioId}/anular`, { motivo });
    return extractData(res);
  },

  // Trabajadores y Planillas
  async listarTrabajadores(empresaId: string): Promise<TrabajadorApi[]> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/trabajadores`);
    return extractData<TrabajadorApi[]>(res, []);
  },

  async crearTrabajador(empresaId: string, datos: any): Promise<TrabajadorApi> {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/trabajadores`, datos);
    return extractData<TrabajadorApi>(res);
  },

  async calcularPlanilla(empresaId: string, periodoId: string, mes: string): Promise<PlanillaApi> {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/planillas/calcular`, {
      periodoId,
      mes
    });
    return extractData<PlanillaApi>(res);
  },

  async contabilizarPlanilla(empresaId: string, planillaId: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/planillas/${planillaId}/contabilizar`);
    return extractData(res);
  },

  async anularPlanilla(empresaId: string, planillaId: string, motivo: string) {
    const res = await apiClient.post<any>(`/empresas/${empresaId}/planillas/${planillaId}/anular`, { motivo });
    return extractData(res);
  },

  async exportarPlame(empresaId: string, planillaId: string) {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/planillas/${planillaId}/exportar-plame`);
    return extractData(res);
  },

  // Flujo de Caja
  async obtenerFlujoCaja(empresaId: string, desde?: string, hasta?: string): Promise<FlujoCajaApi> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/flujo-de-caja`, {
      params: { desde, hasta }
    });
    return extractData<FlujoCajaApi>(res);
  }
};
