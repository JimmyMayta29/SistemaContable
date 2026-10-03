import { apiClient } from './client';

export interface ActivoFijoModel {
  id: string;
  empresaId: string;
  codigoActivo: string;
  descripcion: string;
  categoria: 'EDIFICIOS' | 'VEHICULOS' | 'MAQUINARIA' | 'EQUIPOS_COMPUTO' | 'MUEBLES_ENSERES' | 'OTROS';
  fechaAdquisicion: string;
  fechaInicioUso: string;
  moneda: 'PEN' | 'USD';
  valorAdquisicion: number;
  tipoCambio?: number;
  valorAdquisicionSoles: number;
  vidaUtilMesesFinanciera: number;
  tasaDepreciacionTributariaAnual: number;
  cuentaActivoPCGE: string;
  cuentaDepreciacionPCGE: string;
  centroCosto: string;
  depreciacionAcumuladaFinanciera: number;
  depreciacionAcumuladaTributaria: number;
  valorNetoEnLibrosFinanciero: number;
  valorNetoEnLibrosTributario: number;
  estado: 'ACTIVO' | 'DEPRECIADO_TOTAL' | 'BAJA';
}

export interface CalculoDepreciacionPeriodo {
  periodo: string;
  totalActivosDepreciados: number;
  totalDepreciacionFinanciera: number;
  totalDepreciacionTributaria: number;
  diferenciaTemporariaTotal: number;
  totalIrDiferido: number;
  detalles: Array<{
    activoId: string;
    codigoActivo: string;
    descripcion: string;
    periodo: string;
    depreciacionMensualFinanciera: number;
    depreciacionMensualTributaria: number;
    diferenciaTemporariaMes: number;
    irDiferidoMes: number;
    tipoEfecto: 'ACTIVO_IR_DIFERIDO' | 'PASIVO_IR_DIFERIDO' | 'SIN_DIFERENCIA';
  }>;
}

export interface ProductoKardexModel {
  id: string;
  empresaId: string;
  codigoProducto: string;
  descripcion: string;
  unidadMedidaSUNAT: string;
  tipoExistenciaSUNAT: string;
  metodoValuacion: 'PROMEDIO_PONDERADO' | 'PEPS';
  cuentaExistenciasPCGE: string;
  cuentaCostoVentasPCGE: string;
  stockActual: number;
  costoUnitarioActual: number;
  costoTotalValorado: number;
}

export interface MovimientoKardexModel {
  id: string;
  empresaId: string;
  productoId: string;
  periodo: string;
  fecha: string;
  tipoComprobanteSUNAT?: string;
  serieComprobante?: string;
  numeroComprobante?: string;
  tipoOperacionSUNAT: string;
  cantidadEntrada: number;
  costoUnitarioEntrada: number;
  costoTotalEntrada: number;
  cantidadSalida: number;
  costoUnitarioSalida: number;
  costoTotalSalida: number;
  saldoCantidad: number;
  saldoCostoUnitario: number;
  saldoCostoTotal: number;
  glosa?: string;
}

export interface LiquidacionProrrataIgv {
  empresaId: string;
  periodo: string;
  ventasGravadas: number;
  ventasNoGravadas: number;
  ventasTotales: number;
  coeficienteProrrata: number;
  porcentajeProrrata: number;
  totalBaseComprasDestinoComun: number;
  totalIgvDestinoComun: number;
  igvCreditoFiscalPermitido: number;
  igvGastoCostoNoAdmitido: number;
  cuentaGastoAsignada: string;
  esRegularizacionAnual: boolean;
}

function extractData<T>(res: any, fallback?: T): T {
  if (res && res.data !== undefined) return res.data;
  if (res !== undefined && res !== null) return res;
  return fallback as T;
}

export const activosKardexApi = {
  // Activos Fijos
  async listarActivos(empresaId: string): Promise<ActivoFijoModel[]> {
    const res = await apiClient.get<ActivoFijoModel[]>(`/empresas/${empresaId}/activos-fijos`);
    return extractData<ActivoFijoModel[]>(res, []);
  },

  async registrarActivo(empresaId: string, data: any): Promise<ActivoFijoModel> {
    const res = await apiClient.post<ActivoFijoModel>(`/empresas/${empresaId}/activos-fijos`, data);
    return extractData<ActivoFijoModel>(res, data);
  },

  async calcularDepreciacion(empresaId: string, periodo: string): Promise<CalculoDepreciacionPeriodo> {
    const res = await apiClient.get<CalculoDepreciacionPeriodo>(`/empresas/${empresaId}/activos-fijos/depreciacion?periodo=${periodo}`);
    return extractData<CalculoDepreciacionPeriodo>(res, {
      periodo,
      totalActivosDepreciados: 0,
      totalDepreciacionFinanciera: 0,
      totalDepreciacionTributaria: 0,
      diferenciaTemporariaTotal: 0,
      totalIrDiferido: 0,
      detalles: []
    });
  },

  async generarAsientoDepreciacion(empresaId: string, periodo: string): Promise<any> {
    const res = await apiClient.post(`/empresas/${empresaId}/activos-fijos/depreciacion/asiento`, { periodo });
    return extractData<any>(res, { ok: true });
  },

  // Kardex
  async listarProductos(empresaId: string): Promise<ProductoKardexModel[]> {
    const res = await apiClient.get<ProductoKardexModel[]>(`/empresas/${empresaId}/kardex/productos`);
    return extractData<ProductoKardexModel[]>(res, []);
  },

  async registrarProducto(empresaId: string, data: any): Promise<ProductoKardexModel> {
    const res = await apiClient.post<ProductoKardexModel>(`/empresas/${empresaId}/kardex/productos`, data);
    return extractData<ProductoKardexModel>(res, data);
  },

  async registrarMovimiento(empresaId: string, data: any): Promise<MovimientoKardexModel> {
    const res = await apiClient.post<MovimientoKardexModel>(`/empresas/${empresaId}/kardex/movimientos`, data);
    return extractData<MovimientoKardexModel>(res, data);
  },

  async obtenerKardexProducto(empresaId: string, productoId: string): Promise<{
    producto: ProductoKardexModel;
    movimientos: MovimientoKardexModel[];
    totalEntradasValoradas: number;
    totalSalidasValoradas: number;
    saldoFinalValorado: number;
  }> {
    const res = await apiClient.get<any>(`/empresas/${empresaId}/kardex/productos/${productoId}`);
    return extractData<any>(res, {
      producto: null,
      movimientos: [],
      totalEntradasValoradas: 0,
      totalSalidasValoradas: 0,
      saldoFinalValorado: 0
    });
  },

  async generarAsientoCostoVentas(empresaId: string, periodo: string): Promise<any> {
    const res = await apiClient.post(`/empresas/${empresaId}/kardex/costo-ventas/asiento`, { periodo });
    return extractData<any>(res, { ok: true });
  },

  // Prorrata IGV
  async calcularProrrata(empresaId: string, periodo: string): Promise<LiquidacionProrrataIgv> {
    const res = await apiClient.get<LiquidacionProrrataIgv>(`/empresas/${empresaId}/prorrata-igv?periodo=${periodo}`);
    return extractData<LiquidacionProrrataIgv>(res, {
      empresaId,
      periodo,
      ventasGravadas: 0,
      ventasNoGravadas: 0,
      ventasTotales: 0,
      coeficienteProrrata: 1.0,
      porcentajeProrrata: 100,
      totalBaseComprasDestinoComun: 0,
      totalIgvDestinoComun: 0,
      igvCreditoFiscalPermitido: 0,
      igvGastoCostoNoAdmitido: 0,
      cuentaGastoAsignada: '6411',
      esRegularizacionAnual: false
    });
  }
};
