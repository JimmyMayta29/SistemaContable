import { apiClient } from './client';

export interface SistemaAuditMapa {
  sistema: {
    nombre: string;
    version: string;
    descripcion: string;
    estadoMotorDatos: string;
    generadoEl: string;
  };
  stack: {
    frontend: Record<string, string>;
    backend: Record<string, string>;
    persistencia: Record<string, string>;
    integracionesExternas: Record<string, any>;
  };
  topologiaModulos: Array<{
    modulo: string;
    rutaUI: string;
    endpoints: string[];
    tablasAfectadas: string[];
    seguridad: string;
  }>;
  esquemaBaseDatos: Array<{
    tabla: string;
    descripcion: string;
    clavePrimaria: string;
    indices: string[];
    camposClave: string[];
  }>;
  reglasTributariasSunat: {
    igv: {
      tasaNominal: string;
      formulaBase: string;
      redondeo: string;
      creditoFiscalRequisitos: string[];
    };
    regimenesRenta: Record<string, any>;
    spotDetracciones: {
      concepto: string;
      montoMinimoGeneral: string;
      serviciosFrecuentes: Array<{
        codigo: string;
        descripcion: string;
        tasa: string;
      }>;
    };
  };
}

export interface SistemaDiagnosticoResult {
  empresaId: string;
  fechaDiagnostico: string;
  dictamen: 'CONFORME_SIN_OBSERVACIONES' | 'CONFORME_CON_OBSERVACIONES_PREVENTIVAS' | 'NO_CONFORME_REQUIERE_SUBSANACION';
  resumen: {
    totalAsientos: number;
    asientosDescuadradosCount: number;
    totalDebe: number;
    totalHaber: number;
    diferenciaGlobal: number;
    totalCompras: number;
    comprasConAlertaIgv: number;
    totalVentas: number;
    totalAnexos: number;
    anexosNoHabidos: number;
    anexosNoActivos: number;
    cadenaAuditoriaValida: boolean;
    eventosAuditoriaRegistrados: number;
  };
  detalles: {
    asientosDescuadrados: any[];
    comprasAlertas: any[];
    cadenaAuditoria: any;
  };
  hallazgosCriticos: string[];
  observaciones: string[];
}

export const sistemaAuditApi = {
  obtenerMapa(): Promise<SistemaAuditMapa> {
    return apiClient.get('/auditoria/sistema/mapa');
  },

  ejecutarDiagnostico(empresaId: string): Promise<SistemaDiagnosticoResult> {
    return apiClient.get(`/auditoria/sistema/diagnostico/${empresaId}`);
  }
};
