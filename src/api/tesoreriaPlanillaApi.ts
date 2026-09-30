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

export const tesoreriaPlanillaApi = {
  // Cuentas Financieras
  async listarCuentas(empresaId: string): Promise<CuentaFinancieraApi[]> {
    const res = await apiClient.get<{ success: boolean; data: CuentaFinancieraApi[] }>(`/empresas/${empresaId}/cuentas-financieras`);
    return res.data.data;
  },

  async crearCuenta(empresaId: string, datos: any): Promise<CuentaFinancieraApi> {
    const res = await apiClient.post<{ success: boolean; data: CuentaFinancieraApi }>(`/empresas/${empresaId}/cuentas-financieras`, datos);
    return res.data.data;
  },

  // Movimientos
  async listarMovimientos(empresaId: string, params?: any): Promise<{ items: MovimientoTesoreriaApi[]; total: number }> {
    const res = await apiClient.get<{ success: boolean; data: { items: MovimientoTesoreriaApi[]; total: number } }>(
      `/empresas/${empresaId}/movimientos-tesoreria`,
      { params }
    );
    return res.data.data;
  },

  async registrarMovimiento(empresaId: string, datos: any): Promise<MovimientoTesoreriaApi> {
    const res = await apiClient.post<{ success: boolean; data: MovimientoTesoreriaApi }>(
      `/empresas/${empresaId}/movimientos-tesoreria`,
      datos
    );
    return res.data.data;
  },

  async anularMovimiento(empresaId: string, movimientoId: string, motivo: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/movimientos-tesoreria/${movimientoId}/anular`, { motivo });
    return res.data;
  },

  // Transferencias
  async registrarTransferencia(empresaId: string, datos: any) {
    const res = await apiClient.post(`/empresas/${empresaId}/transferencias`, datos);
    return res.data.data;
  },

  // Conciliación
  async importarExtracto(empresaId: string, datos: any) {
    const res = await apiClient.post(`/empresas/${empresaId}/extractos`, datos);
    return res.data.data;
  },

  async obtenerConciliacion(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte?: string): Promise<ConciliacionResumenApi> {
    const res = await apiClient.get<{ success: boolean; data: ConciliacionResumenApi }>(`/empresas/${empresaId}/conciliaciones`, {
      params: { cuentaFinancieraId, periodoId, fechaCorte }
    });
    return res.data.data;
  },

  async conciliarPartida(empresaId: string, extractoLineaId: string, movimientoId: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/conciliaciones/conciliar`, { extractoLineaId, movimientoId });
    return res.data;
  },

  async desconciliarPartida(empresaId: string, extractoLineaId: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/conciliaciones/desconciliar`, { extractoLineaId });
    return res.data;
  },

  async cerrarConciliacion(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/conciliaciones/cerrar`, { cuentaFinancieraId, periodoId, fechaCorte });
    return res.data;
  },

  // Honorarios
  async listarHonorarios(empresaId: string, params?: any): Promise<ReciboHonorarioApi[]> {
    const res = await apiClient.get<{ success: boolean; data: ReciboHonorarioApi[] }>(`/empresas/${empresaId}/honorarios`, { params });
    return res.data.data;
  },

  async registrarHonorario(empresaId: string, datos: any): Promise<ReciboHonorarioApi> {
    const res = await apiClient.post<{ success: boolean; data: ReciboHonorarioApi }>(`/empresas/${empresaId}/honorarios`, datos);
    return res.data.data;
  },

  async anularHonorario(empresaId: string, honorarioId: string, motivo: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/honorarios/${honorarioId}/anular`, { motivo });
    return res.data;
  },

  // Trabajadores y Planillas
  async listarTrabajadores(empresaId: string): Promise<TrabajadorApi[]> {
    const res = await apiClient.get<{ success: boolean; data: TrabajadorApi[] }>(`/empresas/${empresaId}/trabajadores`);
    return res.data.data;
  },

  async crearTrabajador(empresaId: string, datos: any): Promise<TrabajadorApi> {
    const res = await apiClient.post<{ success: boolean; data: TrabajadorApi }>(`/empresas/${empresaId}/trabajadores`, datos);
    return res.data.data;
  },

  async calcularPlanilla(empresaId: string, periodoId: string, mes: string): Promise<PlanillaApi> {
    const res = await apiClient.post<{ success: boolean; data: PlanillaApi }>(`/empresas/${empresaId}/planillas/calcular`, {
      periodoId,
      mes
    });
    return res.data.data;
  },

  async contabilizarPlanilla(empresaId: string, planillaId: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/planillas/${planillaId}/contabilizar`);
    return res.data;
  },

  async anularPlanilla(empresaId: string, planillaId: string, motivo: string) {
    const res = await apiClient.post(`/empresas/${empresaId}/planillas/${planillaId}/anular`, { motivo });
    return res.data;
  },

  async exportarPlame(empresaId: string, planillaId: string) {
    const res = await apiClient.get(`/empresas/${empresaId}/planillas/${planillaId}/exportar-plame`);
    return res.data.data;
  },

  // Flujo de Caja
  async obtenerFlujoCaja(empresaId: string, desde?: string, hasta?: string): Promise<FlujoCajaApi> {
    const res = await apiClient.get<{ success: boolean; data: FlujoCajaApi }>(`/empresas/${empresaId}/flujo-de-caja`, {
      params: { desde, hasta }
    });
    return res.data.data;
  }
};
