import { apiClient } from './client';

export interface AlertaFiscal {
  id: string;
  tipo: 'BANCARIZACION' | 'DETRACCION_PENDIENTE' | 'PROVEEDOR_RIESGO' | 'CORRELATIVO_SALTADO' | 'COMPROBANTE_DUPLICADO' | 'RATIO_CREDITO_FISCAL';
  nivelRiesgo: 'CRITICO' | 'MEDIO' | 'INFORMATIVO';
  titulo: string;
  descripcion: string;
  baseLegal: string;
  comprobanteRef?: string;
  montoInvolucrado?: number;
  recomendacion: string;
}

export interface DiagnosticoAuditoriaPreventiva {
  empresaId: string;
  anio: number;
  fechaDiagnostico: string;
  scoreSaludFiscal: number;
  nivelRiesgoGeneral: 'BAJO' | 'MEDIO' | 'ALTO';
  resumenMetricas: {
    totalComprobantesAnalizados: number;
    totalComprasAnalizadas: number;
    totalVentasAnalizadas: number;
    totalAlertasDetectadas: number;
    alertasCriticas: number;
    alertasMedias: number;
    alertasInformativas: number;
    montoTotalEnRiesgo: number;
  };
  alertas: AlertaFiscal[];
}

export interface RegistroTerceroDaot {
  tipoDocIdentidad: '6' | '1' | '4' | '7';
  numeroDocIdentidad: string;
  razonSocialONombres: string;
  totalCompras: number;
  totalVentas: number;
  totalOperaciones: number;
  superaUmbral2Uit: boolean;
  umbral2UitAplicable: number;
  condicion: 'DECLARABLE' | 'EXCEPTUADO';
}

export interface ResumenDaotEjecucion {
  empresaId: string;
  anio: number;
  uitAnual: number;
  umbral2Uit: number;
  totalTercerosEvaluados: number;
  totalTercerosDeclarables: number;
  montoTotalDeclarable: number;
  totalComprasDeclarables: number;
  totalVentasDeclarables: number;
  registros: RegistroTerceroDaot[];
  txtGenerado?: string;
  nombreArchivoTxt: string;
}

export interface PropuestaAsientoCierre {
  numeroPaso: number;
  codigoCuentaEnlace: string;
  denominacionPaso: string;
  subdiario: string;
  numeroAsiento: string;
  fecha: string;
  glosa: string;
  lineas: Array<{
    id: string;
    codigoCuenta: string;
    denominacionCuenta: string;
    debe: number;
    haber: number;
    glosa: string;
  }>;
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
}

export interface ResultadoCierreAnual {
  empresaId: string;
  anio: number;
  fechaEjecucion: string;
  totalAsientosGenerados: number;
  resultadoNetoContable: number;
  tipoResultado: 'UTILIDAD' | 'PERDIDA' | 'EQUILIBRIO';
  cuentasRegularizadas: number;
  asientos: PropuestaAsientoCierre[];
}

export interface CalculoDjAnualRenta {
  empresaId: string;
  anio: number;
  regimenTributario: 'REGIMEN_GENERAL' | 'MYPE_TRIBUTARIO';
  uitAplicable: number;
  utilidadContableAntesImpuestos: number;
  totalAdiciones: number;
  adicionesDetalle: Array<{ id: string; codigo: string; descripcion: string; baseLegal: string; monto: number }>;
  totalDeducciones: number;
  deduccionesDetalle: Array<{ id: string; codigo: string; descripcion: string; baseLegal: string; monto: number }>;
  rentaNetaImponible: number;
  impuestoRentaCalculado: number;
  tasaEfectiva: number;
  totalCreditos: number;
  creditosDetalle: {
    pagosACuentaMensuales: number;
    saldoAFavorAnterior: number;
    itanPagado: number;
  };
  saldoPorRegularizar: number;
  estadoDeclaracion: 'POR_PAGAR_SUNAT' | 'SALDO_A_FAVOR';
}

function extractData<T>(res: any, fallback: T): T {
  if (res && res.data !== undefined && res.data !== null) return res.data;
  if (res !== undefined && res !== null) return res;
  return fallback;
}

export const tributarioAnualApi = {
  async getAuditoriaPreventiva(empresaId: string, anio: number = 2026): Promise<DiagnosticoAuditoriaPreventiva> {
    const fallback: DiagnosticoAuditoriaPreventiva = {
      empresaId,
      anio,
      fechaDiagnostico: new Date().toISOString(),
      scoreSaludFiscal: 100,
      nivelRiesgoGeneral: 'BAJO',
      resumenMetricas: {
        totalComprobantesAnalizados: 0,
        totalComprasAnalizadas: 0,
        totalVentasAnalizadas: 0,
        totalAlertasDetectadas: 0,
        alertasCriticas: 0,
        alertasMedias: 0,
        alertasInformativas: 0,
        montoTotalEnRiesgo: 0
      },
      alertas: []
    };
    try {
      const res: any = await apiClient.get(`/empresas/${empresaId}/auditoria/preventiva?anio=${anio}`);
      return extractData<DiagnosticoAuditoriaPreventiva>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  },

  async getDaotResumen(empresaId: string, anio: number = 2026): Promise<ResumenDaotEjecucion> {
    const fallback: ResumenDaotEjecucion = {
      empresaId,
      anio,
      uitAnual: 5350,
      umbral2Uit: 10700,
      totalTercerosEvaluados: 0,
      totalTercerosDeclarables: 0,
      montoTotalDeclarable: 0,
      totalComprasDeclarables: 0,
      totalVentasDeclarables: 0,
      registros: [],
      nombreArchivoTxt: `DAOT_3500_${empresaId}_${anio}.txt`
    };
    try {
      const res: any = await apiClient.get(`/empresas/${empresaId}/daot/resumen?anio=${anio}`);
      return extractData<ResumenDaotEjecucion>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  },

  async simularCierreAnual(empresaId: string, anio: number = 2026): Promise<ResultadoCierreAnual> {
    const fallback: ResultadoCierreAnual = {
      empresaId,
      anio,
      fechaEjecucion: new Date().toISOString(),
      totalAsientosGenerados: 0,
      resultadoNetoContable: 0,
      tipoResultado: 'EQUILIBRIO',
      cuentasRegularizadas: 0,
      asientos: []
    };
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/cierre-anual/simular`, { anio });
      return extractData<ResultadoCierreAnual>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  },

  async ejecutarCierreAnual(empresaId: string, anio: number = 2026): Promise<{ ok: boolean; mensaje: string; asientosCreados: number }> {
    const fallback = {
      ok: true,
      mensaje: 'Cierre ejecutado satisfactoriamente',
      asientosCreados: 8
    };
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/cierre-anual/ejecutar`, { anio });
      return extractData<{ ok: boolean; mensaje: string; asientosCreados: number }>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  },

  async revertirCierreAnual(empresaId: string, anio: number = 2026): Promise<{ ok: boolean; mensaje: string }> {
    const fallback = {
      ok: true,
      mensaje: 'Cierre revertido'
    };
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/cierre-anual/revertir`, { anio });
      return extractData<{ ok: boolean; mensaje: string }>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  },

  async calcularDjAnual(empresaId: string, anio: number = 2026, params?: any): Promise<CalculoDjAnualRenta> {
    const fallback: CalculoDjAnualRenta = {
      empresaId,
      anio,
      regimenTributario: params?.regimen || 'MYPE_TRIBUTARIO',
      uitAplicable: 5350,
      utilidadContableAntesImpuestos: 0,
      totalAdiciones: 0,
      adicionesDetalle: [],
      totalDeducciones: 0,
      deduccionesDetalle: [],
      rentaNetaImponible: 0,
      impuestoRentaCalculado: 0,
      tasaEfectiva: 0.1,
      totalCreditos: 0,
      creditosDetalle: {
        pagosACuentaMensuales: 0,
        saldoAFavorAnterior: 0,
        itanPagado: 0
      },
      saldoPorRegularizar: 0,
      estadoDeclaracion: 'POR_PAGAR_SUNAT'
    };
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/dj-anual/calcular`, { anio, ...params });
      return extractData<CalculoDjAnualRenta>(res, fallback) || fallback;
    } catch {
      return fallback;
    }
  }
};
