import { db } from '../config/database';

export interface ParametroTributario {
  id?: string;
  codigoParametro: string;
  descripcion: string;
  valorNumerico: number;
  vigenteDesde: string;
  vigenteHasta?: string | null;
  categoria: string;
}

export interface CronogramaVencimiento {
  id?: string;
  periodo: string;
  ultimoDigitoRuc: string;
  fechaVencimientoPdt621: string;
  fechaVencimientoSire: string;
  fechaVencimientoPlame: string;
}

// Semilla en memoria como fallback resiliente
const PARAMETROS_IN_MEMORY: ParametroTributario[] = [
  { codigoParametro: 'TASA_IGV', descripcion: 'Tasa General del IGV (18%)', valorNumerico: 0.18, vigenteDesde: '2020-01-01', categoria: 'IGV' },
  { codigoParametro: 'TASA_ESSALUD', descripcion: 'Aporte Patronal EsSalud (9%)', valorNumerico: 0.09, vigenteDesde: '2020-01-01', categoria: 'LABORAL' },
  { codigoParametro: 'TASA_ONP', descripcion: 'Aporte Obligatorio Sistema Nacional de Pensiones ONP (13%)', valorNumerico: 0.13, vigenteDesde: '2020-01-01', categoria: 'LABORAL' },
  { codigoParametro: 'RMV_2026', descripcion: 'Remuneración Mínima Vital 2026 (S/ 1,025.00)', valorNumerico: 1025.00, vigenteDesde: '2022-05-01', categoria: 'LABORAL' },
  { codigoParametro: 'TASA_ASIGNACION_FAMILIAR', descripcion: 'Tasa Asignación Familiar (10% de RMV)', valorNumerico: 0.10, vigenteDesde: '2020-01-01', categoria: 'LABORAL' },
  { codigoParametro: 'TASA_RETENCION_4TA', descripcion: 'Tasa Retención 4ta Categoría (8%)', valorNumerico: 0.08, vigenteDesde: '2020-01-01', categoria: 'RENTA' },
  { codigoParametro: 'TOPE_RETENCION_4TA', descripcion: 'Monto a partir del cual aplica retención 4ta (S/ 1,500)', valorNumerico: 1500.00, vigenteDesde: '2020-01-01', categoria: 'RENTA' },
  { codigoParametro: 'TASA_RENTA_MYPE_SUB300', descripcion: 'Pago a cuenta mensual MYPE Tributario hasta 300 UIT (1%)', valorNumerico: 0.01, vigenteDesde: '2020-01-01', categoria: 'RENTA' },
  { codigoParametro: 'TASA_RENTA_RER', descripcion: 'Pago definitivo Régimen Especial de Renta (1.5%)', valorNumerico: 0.015, vigenteDesde: '2020-01-01', categoria: 'RENTA' },
  { codigoParametro: 'VALOR_UIT_2026', descripcion: 'Valor oficial UIT 2026', valorNumerico: 5350.00, vigenteDesde: '2026-01-01', categoria: 'UIT' },
  
  // Parámetros AFP Comisión Flujo y Seguros (Vigentes)
  { codigoParametro: 'AFP_INTEGRA_APORTE', descripcion: 'AFP Integra - Fondo Obligatorio', valorNumerico: 0.10, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_INTEGRA_COMISION_FLUJO', descripcion: 'AFP Integra - Comisión sobre flujo', valorNumerico: 0.0155, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_INTEGRA_PRIMA_SEGURO', descripcion: 'AFP Integra - Prima de seguro', valorNumerico: 0.0184, vigenteDesde: '2020-01-01', categoria: 'AFP' },

  { codigoParametro: 'AFP_PRIMA_APORTE', descripcion: 'AFP Prima - Fondo Obligatorio', valorNumerico: 0.10, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_PRIMA_COMISION_FLUJO', descripcion: 'AFP Prima - Comisión sobre flujo', valorNumerico: 0.0160, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_PRIMA_PRIMA_SEGURO', descripcion: 'AFP Prima - Prima de seguro', valorNumerico: 0.0184, vigenteDesde: '2020-01-01', categoria: 'AFP' },

  { codigoParametro: 'AFP_PROFUTURO_APORTE', descripcion: 'AFP Profuturo - Fondo Obligatorio', valorNumerico: 0.10, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_PROFUTURO_COMISION_FLUJO', descripcion: 'AFP Profuturo - Comisión sobre flujo', valorNumerico: 0.0169, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_PROFUTURO_PRIMA_SEGURO', descripcion: 'AFP Profuturo - Prima de seguro', valorNumerico: 0.0184, vigenteDesde: '2020-01-01', categoria: 'AFP' },

  { codigoParametro: 'AFP_HABITAT_APORTE', descripcion: 'AFP Habitat - Fondo Obligatorio', valorNumerico: 0.10, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_HABITAT_COMISION_FLUJO', descripcion: 'AFP Habitat - Comisión sobre flujo', valorNumerico: 0.0147, vigenteDesde: '2020-01-01', categoria: 'AFP' },
  { codigoParametro: 'AFP_HABITAT_PRIMA_SEGURO', descripcion: 'AFP Habitat - Prima de seguro', valorNumerico: 0.0184, vigenteDesde: '2020-01-01', categoria: 'AFP' },
];

const CRONOGRAMA_IN_MEMORY: CronogramaVencimiento[] = [
  { periodo: '2026-09', ultimoDigitoRuc: '0', fechaVencimientoPdt621: '2026-10-15', fechaVencimientoSire: '2026-10-14', fechaVencimientoPlame: '2026-10-15' },
  { periodo: '2026-09', ultimoDigitoRuc: '1', fechaVencimientoPdt621: '2026-10-16', fechaVencimientoSire: '2026-10-15', fechaVencimientoPlame: '2026-10-16' },
  { periodo: '2026-09', ultimoDigitoRuc: '2', fechaVencimientoPdt621: '2026-10-19', fechaVencimientoSire: '2026-10-16', fechaVencimientoPlame: '2026-10-19' },
  { periodo: '2026-09', ultimoDigitoRuc: '3', fechaVencimientoPdt621: '2026-10-20', fechaVencimientoSire: '2026-10-19', fechaVencimientoPlame: '2026-10-20' },
  { periodo: '2026-09', ultimoDigitoRuc: '4', fechaVencimientoPdt621: '2026-10-21', fechaVencimientoSire: '2026-10-20', fechaVencimientoPlame: '2026-10-21' },
  { periodo: '2026-09', ultimoDigitoRuc: '5', fechaVencimientoPdt621: '2026-10-22', fechaVencimientoSire: '2026-10-21', fechaVencimientoPlame: '2026-10-22' },
  { periodo: '2026-09', ultimoDigitoRuc: '6', fechaVencimientoPdt621: '2026-10-23', fechaVencimientoSire: '2026-10-22', fechaVencimientoPlame: '2026-10-23' },
  { periodo: '2026-09', ultimoDigitoRuc: '7', fechaVencimientoPdt621: '2026-10-26', fechaVencimientoSire: '2026-10-23', fechaVencimientoPlame: '2026-10-26' },
  { periodo: '2026-09', ultimoDigitoRuc: '8', fechaVencimientoPdt621: '2026-10-27', fechaVencimientoSire: '2026-10-26', fechaVencimientoPlame: '2026-10-27' },
  { periodo: '2026-09', ultimoDigitoRuc: '9', fechaVencimientoPdt621: '2026-10-28', fechaVencimientoSire: '2026-10-27', fechaVencimientoPlame: '2026-10-28' },
  { periodo: '2026-09', ultimoDigitoRuc: 'B', fechaVencimientoPdt621: '2026-10-29', fechaVencimientoSire: '2026-10-28', fechaVencimientoPlame: '2026-10-29' },
];

export const parametroRepository = {
  async obtenerParametros(): Promise<ParametroTributario[]> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT codigo_parametro as "codigoParametro", descripcion, valor_numerico as "valorNumerico",
               vigente_desde as "vigenteDesde", vigente_hasta as "vigenteHasta", categoria
        FROM parametros_tributarios
        ORDER BY categoria, codigo_parametro
      `);
      if (res.rows.length > 0) return res.rows;
    }
    return PARAMETROS_IN_MEMORY;
  },

  async obtenerParametroPorCodigo(codigo: string, fechaReferencia = new Date().toISOString().split('T')[0]): Promise<ParametroTributario | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT codigo_parametro as "codigoParametro", descripcion, valor_numerico as "valorNumerico",
               vigente_desde as "vigenteDesde", vigente_hasta as "vigenteHasta", categoria
        FROM parametros_tributarios
        WHERE codigo_parametro = $1 AND vigente_desde <= $2 AND (vigente_hasta IS NULL OR vigente_hasta >= $2)
        ORDER BY vigente_desde DESC
        LIMIT 1
      `, [codigo, fechaReferencia]);
      if (res.rows.length > 0) return res.rows[0];
    }
    return PARAMETROS_IN_MEMORY.find(p => p.codigoParametro === codigo) || null;
  },

  async obtenerCronograma(periodo: string, ultimoDigitoRuc: string): Promise<CronogramaVencimiento | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT periodo, ultimo_digito_ruc as "ultimoDigitoRuc",
               fecha_vencimiento_pdt621 as "fechaVencimientoPdt621",
               fecha_vencimiento_sire as "fechaVencimientoSire",
               fecha_vencimiento_plame as "fechaVencimientoPlame"
        FROM cronograma_vencimientos
        WHERE periodo = $1 AND ultimo_digito_ruc = $2
        LIMIT 1
      `, [periodo, ultimoDigitoRuc]);
      if (res.rows.length > 0) return res.rows[0];
    }
    return CRONOGRAMA_IN_MEMORY.find(c => c.periodo === periodo && c.ultimoDigitoRuc === ultimoDigitoRuc) || null;
  }
};
