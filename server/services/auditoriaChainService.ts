import crypto from 'crypto';
import { db } from '../config/database';

export interface AuditoriaLogEntry {
  id: string;
  empresaId: string;
  usuarioId: string;
  tablaAfectada: string;
  registroId: string;
  accion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  hashPrevio: string;
  hashActual: string;
  createdAt: string;
}

export type AuditoriaChainLog = AuditoriaLogEntry;

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Almacén append-only en memoria (en PostgreSQL se persiste en tabla auditoria_log con permisos REVOKE UPDATE, DELETE)
export const AUDITORIA_LOG_CHAIN_MEMORIA: AuditoriaLogEntry[] = [];

export const auditoriaChainService = {
  /**
   * Calcula el hash criptográfico SHA-256 de una entrada de auditoría encadenada
   */
  calcularHash(
    id: string,
    empresaId: string,
    usuarioId: string,
    tablaAfectada: string,
    registroId: string,
    accion: string,
    datosNuevos: any,
    hashPrevio: string
  ): string {
    const raw = `${id}|${empresaId}|${usuarioId}|${tablaAfectada}|${registroId}|${accion}|${JSON.stringify(datosNuevos || {})}|${hashPrevio}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  },

  /**
   * Registra un nuevo evento de auditoría agregándolo al final de la cadena inmutable
   */
  async registrar(params: {
    empresaId: string;
    usuarioId: string;
    tablaAfectada: string;
    registroId: string;
    accion: string;
    datosAnteriores?: any;
    datosNuevos?: any;
  }): Promise<AuditoriaLogEntry> {
    const id = `aud-chain-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Obtener el último hash de la empresa
    const logsEmpresa = AUDITORIA_LOG_CHAIN_MEMORIA.filter(l => l.empresaId === params.empresaId);
    const hashPrevio = logsEmpresa.length > 0
      ? logsEmpresa[logsEmpresa.length - 1].hashActual
      : GENESIS_HASH;

    const hashActual = this.calcularHash(
      id,
      params.empresaId,
      params.usuarioId,
      params.tablaAfectada,
      params.registroId,
      params.accion,
      params.datosNuevos,
      hashPrevio
    );

    const entrada: AuditoriaLogEntry = {
      id,
      empresaId: params.empresaId,
      usuarioId: params.usuarioId,
      tablaAfectada: params.tablaAfectada,
      registroId: params.registroId,
      accion: params.accion,
      datosAnteriores: params.datosAnteriores,
      datosNuevos: params.datosNuevos,
      hashPrevio,
      hashActual,
      createdAt: now
    };

    if (db.isPostgresConnected()) {
      try {
        await db.query(`
          INSERT INTO auditoria_log (
            id, empresa_id, usuario_id, tabla_afectada, registro_id,
            accion, datos_anteriores, datos_nuevos, hash_previo, hash_actual, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          entrada.id, entrada.empresaId, entrada.usuarioId, entrada.tablaAfectada, entrada.registroId,
          entrada.accion, JSON.stringify(entrada.datosAnteriores || null), JSON.stringify(entrada.datosNuevos || null),
          entrada.hashPrevio, entrada.hashActual, entrada.createdAt
        ]);
      } catch (err) {
        console.error('Error insertando en auditoria_log (Postgres):', err);
      }
    }

    AUDITORIA_LOG_CHAIN_MEMORIA.push(entrada);
    return entrada;
  },

  /**
   * Recorre toda la cadena criptográfica de una empresa y verifica si ha habido manipulación,
   * inserción forzada o eliminación de registros históricos.
   */
  async verificarIntegridad(empresaId: string): Promise<{
    valido: boolean;
    totalRegistros: number;
    mensaje: string;
    indiceCorrupto?: number;
    ultimoHash?: string;
  }> {
    let logs: AuditoriaLogEntry[] = [];

    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", usuario_id as "usuarioId",
               tabla_afectada as "tablaAfectada", registro_id as "registroId",
               accion, datos_anteriores as "datosAnteriores", datos_nuevos as "datosNuevos",
               hash_previo as "hashPrevio", hash_actual as "hashActual", created_at as "createdAt"
        FROM auditoria_log
        WHERE empresa_id = $1
        ORDER BY created_at ASC, id ASC
      `, [empresaId]);
      logs = res.rows;
    } else {
      logs = AUDITORIA_LOG_CHAIN_MEMORIA.filter(l => l.empresaId === empresaId);
    }

    if (logs.length === 0) {
      return {
        valido: true,
        totalRegistros: 0,
        mensaje: 'Cadena de auditoría sin registros (Génesis intacto).'
      };
    }

    for (let i = 0; i < logs.length; i++) {
      const actual = logs[i];
      const hashPrevioEsperado = i === 0 ? GENESIS_HASH : logs[i - 1].hashActual;

      // 1. Validar enlace al bloque anterior
      if (actual.hashPrevio !== hashPrevioEsperado) {
        return {
          valido: false,
          totalRegistros: logs.length,
          indiceCorrupto: i,
          mensaje: `INTEGRIDAD_COMPROMETIDA: Enlace roto en registro #${i} (ID: ${actual.id}). Hash previo almacenado no coincide con el registro anterior.`
        };
      }

      // 2. Recalcular el hash del bloque actual
      const hashRecalculado = this.calcularHash(
        actual.id,
        actual.empresaId,
        actual.usuarioId,
        actual.tablaAfectada,
        actual.registroId,
        actual.accion,
        actual.datosNuevos,
        actual.hashPrevio
      );

      if (actual.hashActual !== hashRecalculado) {
        return {
          valido: false,
          totalRegistros: logs.length,
          indiceCorrupto: i,
          mensaje: `INTEGRIDAD_COMPROMETIDA: Contenido alterado en registro #${i} (ID: ${actual.id}). El hash recalculado difiere del hash sellado.`
        };
      }
    }

    return {
      valido: true,
      totalRegistros: logs.length,
      mensaje: `Cadena de auditoría 100% íntegra (${logs.length} registros verificados).`,
      ultimoHash: logs[logs.length - 1].hashActual
    };
  }
};
