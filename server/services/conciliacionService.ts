import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { MOVIMIENTOS_TESORERIA_MEMORIA, CUENTAS_FINANCIERAS_MEMORIA } from './tesoreriaService';

export interface ExtractoLineaModel {
  id: string;
  extractoId: string;
  empresaId: string;
  fecha: string;
  descripcion: string;
  referencia?: string;
  monto: number; // Positivo = Abono, Negativo = Cargo
  saldo?: number;
  conciliada: boolean;
  movimientoTesoreriaId?: string;
}

export interface ExtractoBancarioModel {
  id: string;
  empresaId: string;
  cuentaFinancieraId: string;
  nombreArchivo: string;
  fechaCorteDesde: string;
  fechaCorteHasta: string;
  saldoInicial: number;
  saldoFinal: number;
  hashArchivo: string;
  estado: 'CARGADO' | 'CONCILIADO' | 'ANULADO';
  lineas: ExtractoLineaModel[];
}

export interface ConciliacionPeriodoModel {
  id: string;
  empresaId: string;
  cuentaFinancieraId: string;
  periodoId: string;
  fechaCorte: string;
  saldoSegunLibros: number;
  saldoSegunBanco: number;
  partidasConciliadas: number;
  partidasEnTransito: number;
  diferencia: number;
  estado: 'ABIERTA' | 'CERRADA';
  cerradaPor?: string;
  fechaCierre?: string;
}

export const EXTRACTOS_MEMORIA: ExtractoBancarioModel[] = [];
export const CONCILIACIONES_MEMORIA: ConciliacionPeriodoModel[] = [];

export const conciliacionService = {
  // --------------------------------------------------------------------------
  // IMPORTACIÓN DE EXTRACTO BANCARIO (CSV / HOJA DE CÁLCULO)
  // --------------------------------------------------------------------------
  async importarExtracto(
    empresaId: string,
    cuentaFinancieraId: string,
    archivo: {
      nombreArchivo: string;
      lineas: Array<{
        fecha: string;
        descripcion: string;
        referencia?: string;
        monto: number;
        saldo?: number;
      }>;
      saldoInicial?: number;
      saldoFinal?: number;
    },
    userId: string
  ): Promise<ExtractoBancarioModel> {
    if (!archivo.lineas || archivo.lineas.length === 0) {
      throw new Error('ARCHIVO_VACIO: El archivo de extracto bancario no contiene filas válidas.');
    }

    // 1. Validar fila por fila
    archivo.lineas.forEach((fila, idx) => {
      if (!fila.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fila.fecha)) {
        throw new Error(`FORMATO_FECHA_INVALIDO: Fila ${idx + 1} tiene fecha inválida (${fila.fecha}). Se requiere YYYY-MM-DD.`);
      }
      if (typeof fila.monto !== 'number' || isNaN(fila.monto)) {
        throw new Error(`MONTO_INVALIDO: Fila ${idx + 1} tiene un importe inválido.`);
      }
    });

    // 2. Control estricto de Duplicados (Hash de contenido)
    const contenidoString = archivo.lineas.map(l => `${l.fecha}_${l.monto}_${l.referencia || ''}`).join('|');
    let hash = 0;
    for (let i = 0; i < contenidoString.length; i++) {
      hash = (hash << 5) - hash + contenidoString.charCodeAt(i);
      hash |= 0;
    }
    const hashArchivo = `hash-${Math.abs(hash)}`;

    const duplicado = EXTRACTOS_MEMORIA.find(
      e => e.empresaId === empresaId && e.cuentaFinancieraId === cuentaFinancieraId && e.hashArchivo === hashArchivo
    );
    if (duplicado) {
      throw new Error('EXTRACTO_DUPLICADO: Este extracto bancario ya fue importado previamente para esta cuenta.');
    }

    const extractoId = `ext-${Date.now()}`;
    const fechas = archivo.lineas.map(l => l.fecha).sort();
    const fechaDesde = fechas[0];
    const fechaHasta = fechas[fechas.length - 1];

    const lineasProcesadas: ExtractoLineaModel[] = archivo.lineas.map((l, index) => ({
      id: `extline-${Date.now()}-${index}`,
      extractoId,
      empresaId,
      fecha: l.fecha,
      descripcion: l.descripcion,
      referencia: l.referencia,
      monto: l.monto,
      saldo: l.saldo,
      conciliada: false
    }));

    const nuevoExtracto: ExtractoBancarioModel = {
      id: extractoId,
      empresaId,
      cuentaFinancieraId,
      nombreArchivo: archivo.nombreArchivo,
      fechaCorteDesde: fechaDesde,
      fechaCorteHasta: fechaHasta,
      saldoInicial: archivo.saldoInicial || 0,
      saldoFinal: archivo.saldoFinal || (lineasProcesadas[lineasProcesadas.length - 1]?.saldo || 0),
      hashArchivo,
      estado: 'CARGADO',
      lineas: lineasProcesadas
    };

    EXTRACTOS_MEMORIA.push(nuevoExtracto);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'IMPORTAR_EXTRACTO_BANCARIO',
      tabla: 'extractos_bancarios',
      registroId: extractoId,
      valoresNuevos: { nombreArchivo: archivo.nombreArchivo, totalLineas: lineasProcesadas.length }
    });

    return nuevoExtracto;
  },

  // --------------------------------------------------------------------------
  // CÁLCULO DE CONCILIACIÓN Y COINCIDENCIAS AUTOMÁTICAS
  // --------------------------------------------------------------------------
  async obtenerEstadoConciliacion(
    empresaId: string,
    cuentaFinancieraId: string,
    periodoId: string,
    fechaCorte: string
  ) {
    const cuenta = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.id === cuentaFinancieraId && c.empresaId === empresaId);
    if (!cuenta) {
      throw new Error('CUENTA_NO_ENCONTRADA: Cuenta financiera no válida.');
    }

    // 1. Obtener movimientos en libros registrados hasta la fecha de corte
    const movimientosLibros = MOVIMIENTOS_TESORERIA_MEMORIA.filter(m => 
      m.empresaId === empresaId &&
      m.cuentaFinancieraId === cuentaFinancieraId &&
      m.estado === 'REGISTRADO' &&
      m.fecha <= fechaCorte
    );

    // 2. Obtener líneas de extracto bancario cargadas
    const extractos = EXTRACTOS_MEMORIA.filter(e => 
      e.empresaId === empresaId && e.cuentaFinancieraId === cuentaFinancieraId
    );
    const lineasExtracto = extractos.flatMap(e => e.lineas).filter(l => l.fecha <= fechaCorte);

    // 3. Sugerencia de Coincidencias Automáticas
    // Coincidencia: Mismo importe exacto (tomando signo), fecha cercana (+- 3 días) y/o coincidencia de referencia
    const coincidenciasSugeridas: Array<{
      lineaExtractoId: string;
      movimientoId: string;
      score: number;
      motivo: string;
    }> = [];

    for (const le of lineasExtracto) {
      if (le.conciliada) continue;

      for (const ml of movimientosLibros) {
        if (ml.conciliado) continue;

        // Comprobar monto: Ingreso en libros (+) = Monto positivo en extracto; Egreso en libros (-) = Monto negativo en extracto
        const montoEsperado = ml.tipo === 'INGRESO' ? ml.importe : -ml.importe;
        const montoCoincide = Math.abs(le.monto - montoEsperado) < 0.01;

        if (montoCoincide) {
          const diffDias = Math.abs(
            (new Date(le.fecha).getTime() - new Date(ml.fecha).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDias <= 3) {
            let score = 80;
            let motivo = `Monto exacto (S/ ${Math.abs(le.monto).toFixed(2)}) y fecha cercana (${diffDias} días de diferencia)`;

            if (ml.numeroOperacion && le.referencia && le.referencia.includes(ml.numeroOperacion)) {
              score = 100;
              motivo += ` con número de operación coincidente (${ml.numeroOperacion})`;
            }

            coincidenciasSugeridas.push({
              lineaExtractoId: le.id,
              movimientoId: ml.id,
              score,
              motivo
            });
            break;
          }
        }
      }
    }

    // 4. Totales de Conciliación
    // Saldo según libros
    let saldoLibros = cuenta.saldoInicial;
    for (const m of movimientosLibros) {
      if (m.tipo === 'INGRESO') saldoLibros += m.importe;
      else saldoLibros -= m.importe;
    }

    // Saldo según banco (del último extracto o sumatoria de abonos y cargos)
    const ultimoExtracto = extractos[extractos.length - 1];
    let saldoBanco = ultimoExtracto?.saldoFinal ?? (cuenta.saldoInicial + lineasExtracto.reduce((acc, l) => acc + l.monto, 0));

    // Partidas conciliadas
    const lineasConciliadas = lineasExtracto.filter(l => l.conciliada);
    const partidasConciliadas = lineasConciliadas.reduce((acc, l) => acc + l.monto, 0);

    // Partidas en tránsito (movimientos en libros pendientes de conciliar)
    const movimientosEnTransito = movimientosLibros.filter(m => !m.conciliado);
    let totalEnTransitoLibros = 0;
    for (const m of movimientosEnTransito) {
      totalEnTransitoLibros += (m.tipo === 'INGRESO' ? m.importe : -m.importe);
    }

    // Diferencia final de cuadre
    const diferencia = Number((saldoLibros - saldoBanco - totalEnTransitoLibros).toFixed(2));

    return {
      cuenta: {
        id: cuenta.id,
        banco: cuenta.banco,
        numero: cuenta.numero,
        moneda: cuenta.moneda
      },
      fechaCorte,
      resumen: {
        saldoSegunLibros: Number(saldoLibros.toFixed(2)),
        saldoSegunBanco: Number(saldoBanco.toFixed(2)),
        partidasConciliadas: Number(partidasConciliadas.toFixed(2)),
        partidasEnTransito: Number(totalEnTransitoLibros.toFixed(2)),
        diferencia: Math.abs(diferencia) < 0.01 ? 0.00 : diferencia,
        cuadrado: Math.abs(diferencia) < 0.01
      },
      coincidenciasSugeridas,
      extractoLineas: lineasExtracto,
      movimientosLibros
    };
  },

  // --------------------------------------------------------------------------
  // CONCILIACIÓN MANUAL / AUTOMÁTICA
  // --------------------------------------------------------------------------
  async conciliar(empresaId: string, extractoLineaId: string, movimientoId: string, userId: string) {
    const extracto = EXTRACTOS_MEMORIA.find(e => e.empresaId === empresaId && e.lineas.some(l => l.id === extractoLineaId));
    if (!extracto) throw new Error('LINEA_EXTRACTO_NO_ENCONTRADA');

    const linea = extracto.lineas.find(l => l.id === extractoLineaId)!;
    const movimiento = MOVIMIENTOS_TESORERIA_MEMORIA.find(m => m.id === movimientoId && m.empresaId === empresaId);
    if (!movimiento) throw new Error('MOVIMIENTO_NO_ENCONTRADO');

    linea.conciliada = true;
    linea.movimientoTesoreriaId = movimientoId;
    movimiento.conciliado = true;

    return { success: true, message: 'Partida conciliada exitosamente' };
  },

  async desconciliar(empresaId: string, extractoLineaId: string, userId: string) {
    const extracto = EXTRACTOS_MEMORIA.find(e => e.empresaId === empresaId && e.lineas.some(l => l.id === extractoLineaId));
    if (!extracto) throw new Error('LINEA_EXTRACTO_NO_ENCONTRADA');

    const linea = extracto.lineas.find(l => l.id === extractoLineaId)!;
    if (linea.movimientoTesoreriaId) {
      const movimiento = MOVIMIENTOS_TESORERIA_MEMORIA.find(m => m.id === linea.movimientoTesoreriaId);
      if (movimiento) movimiento.conciliado = false;
    }

    linea.conciliada = false;
    linea.movimientoTesoreriaId = undefined;

    return { success: true, message: 'Partida desconciliada' };
  },

  // --------------------------------------------------------------------------
  // CERRAR CONCILIACIÓN DE PERÍODO
  // --------------------------------------------------------------------------
  async cerrarConciliacion(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte: string, userId: string) {
    const estado = await this.obtenerEstadoConciliacion(empresaId, cuentaFinancieraId, periodoId, fechaCorte);

    const conciliacion: ConciliacionPeriodoModel = {
      id: `cnc-${Date.now()}`,
      empresaId,
      cuentaFinancieraId,
      periodoId,
      fechaCorte,
      saldoSegunLibros: estado.resumen.saldoSegunLibros,
      saldoSegunBanco: estado.resumen.saldoSegunBanco,
      partidasConciliadas: estado.resumen.partidasConciliadas,
      partidasEnTransito: estado.resumen.partidasEnTransito,
      diferencia: estado.resumen.diferencia,
      estado: 'CERRADA',
      cerradaPor: userId,
      fechaCierre: new Date().toISOString()
    };

    CONCILIACIONES_MEMORIA.push(conciliacion);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'CERRAR_CONCILIACION_BANCARIA',
      tabla: 'conciliaciones_bancarias',
      registroId: conciliacion.id,
      valoresNuevos: conciliacion
    });

    return conciliacion;
  }
};
