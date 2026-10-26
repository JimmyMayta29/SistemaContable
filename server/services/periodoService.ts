import { db } from '../config/database';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface PeriodoModel {
  id: string;
  empresaId: string;
  ejercicioId: string;
  anio: number;
  mes: number;
  codigoPeriodo: string; // '2026-09'
  estado: 'ABIERTO' | 'CERRADO' | 'BLOQUEADO_AUDITORIA';
  fechaCierre?: string | null;
  cerradoPor?: string | null;
}

export const PERIODOS_MEMORIA: PeriodoModel[] = [
  { id: 'per-2026-09', empresaId: 'emp-01', ejercicioId: 'eje-2026', anio: 2026, mes: 9, codigoPeriodo: '2026-09', estado: 'ABIERTO' },
  { id: 'per-2026-08', empresaId: 'emp-01', ejercicioId: 'eje-2026', anio: 2026, mes: 8, codigoPeriodo: '2026-08', estado: 'CERRADO' },
  { id: 'per-2026-10', empresaId: 'emp-01', ejercicioId: 'eje-2026', anio: 2026, mes: 10, codigoPeriodo: '2026-10', estado: 'ABIERTO' }
];

export const periodoService = {
  async listar(empresaId: string, anio = 2026): Promise<PeriodoModel[]> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", ejercicio_id as "ejercicioId",
               anio, mes, codigo_periodo as "codigoPeriodo", estado,
               fecha_cierre as "fechaCierre", cerrado_por as "cerradoPor"
        FROM periodos
        WHERE empresa_id = $1 AND anio = $2
        ORDER BY mes ASC
      `, [empresaId, anio]);
      if (res.rows.length > 0) return res.rows;
    }
    const filtered = PERIODOS_MEMORIA.filter(p => p.empresaId === empresaId && (!anio || p.anio === anio));
    if (filtered.length > 0) return filtered;
    return PERIODOS_MEMORIA.filter(p => p.empresaId === empresaId);
  },

  async obtenerPorCodigo(empresaId: string, codigoPeriodo: string): Promise<PeriodoModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", ejercicio_id as "ejercicioId",
               anio, mes, codigo_periodo as "codigoPeriodo", estado,
               fecha_cierre as "fechaCierre", cerrado_por as "cerradoPor"
        FROM periodos
        WHERE empresa_id = $1 AND codigo_periodo = $2
        LIMIT 1
      `, [empresaId, codigoPeriodo]);
      if (res.rows.length > 0) return res.rows[0];
    }
    return PERIODOS_MEMORIA.find(p => p.empresaId === empresaId && p.codigoPeriodo === codigoPeriodo) || null;
  },

  async cerrar(periodoId: string, userId: string, empresaId: string) {
    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // 1. Validar que no existan asientos en estado BORRADOR
        const borradorRes = await client.query(`
          SELECT COUNT(*) FROM asientos
          WHERE periodo_id = $1 AND estado = 'BORRADOR'
        `, [periodoId]);

        const borradoresPendientes = parseInt(borradorRes.rows[0].count, 10);
        if (borradoresPendientes > 0) {
          throw new Error(`BORRADORES_PENDIENTES: Existen ${borradoresPendientes} asientos en borrador sin contabilizar ni anular.`);
        }

        // 2. Validar cuadre de sumas del balance
        const balanceRes = await client.query(`
          SELECT COALESCE(SUM(d.debe), 0.00) as sum_debe, COALESCE(SUM(d.haber), 0.00) as sum_haber
          FROM asiento_detalle d
          JOIN asientos a ON a.id = d.asiento_id
          WHERE a.periodo_id = $1 AND a.estado = 'CONTABILIZADO'
        `, [periodoId]);

        const debe = balanceRes.rows[0]?.sum_debe || 0;
        const haber = balanceRes.rows[0]?.sum_haber || 0;
        if (Number(debe) !== Number(haber)) {
          throw new Error(`BALANCE_DESCUADRADO: El balance del período no cuadra (Debe S/ ${debe} != Haber S/ ${haber}).`);
        }

        // 3. Cerrar período
        const updRes = await client.query(`
          UPDATE periodos SET
            estado = 'CERRADO', fecha_cierre = CURRENT_TIMESTAMP, cerrado_por = $1
          WHERE id = $2
          RETURNING *
        `, [userId, periodoId]);

        await client.query('COMMIT');

        await auditoriaRepository.registrar({
          empresaId,
          usuarioId: userId,
          tablaAfectada: 'periodos',
          registroId: periodoId,
          accion: 'CIERRE_PERIODO',
          datosNuevos: { estado: 'CERRADO', totalDebe: debe, totalHaber: haber }
        });

        return updRes.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const p = PERIODOS_MEMORIA.find(x => x.id === periodoId && (!empresaId || x.empresaId === empresaId)) || PERIODOS_MEMORIA.find(x => x.id === periodoId);
    if (!p) throw new Error('PERIODO_NO_ENCONTRADO');
    p.estado = 'CERRADO';
    p.fechaCierre = new Date().toISOString();
    return p;
  },

  async reabrir(periodoId: string, motivo: string, userId: string, userRole: string, empresaId: string) {
    if (userRole !== 'ADMINISTRADOR') {
      throw new Error('PERMISO_DENEGADO: Solo un usuario con rol Administrador puede reabrir un período cerrado.');
    }
    if (!motivo || motivo.trim().length < 10) {
      throw new Error('MOTIVO_INSUFICIENTE: Debe detallar una justificación de reapertura de al menos 10 caracteres.');
    }

    if (db.isPostgresConnected()) {
      const updRes = await db.query(`
        UPDATE periodos SET
          estado = 'ABIERTO', fecha_cierre = NULL, cerrado_por = NULL
        WHERE id = $1
        RETURNING *
      `, [periodoId]);

      await auditoriaRepository.registrar({
        empresaId,
        usuarioId: userId,
        tablaAfectada: 'periodos',
        registroId: periodoId,
        accion: 'UPDATE',
        datosNuevos: { accion: 'REAPERTURA_PERIODO', motivo }
      });

      return updRes.rows[0];
    }

    const p = PERIODOS_MEMORIA.find(x => x.id === periodoId && (!empresaId || x.empresaId === empresaId)) || PERIODOS_MEMORIA.find(x => x.id === periodoId);
    if (!p) throw new Error('PERIODO_NO_ENCONTRADO');
    p.estado = 'ABIERTO';
    return p;
  },

  async obtenerEstadoPeriodo(empresaId: string, mesOcodigo: string): Promise<string> {
    const periodo = await this.obtenerPorCodigo(empresaId, mesOcodigo);
    return periodo ? periodo.estado : 'ABIERTO';
  },

  async estaCerrado(empresaId: string, periodoIdOrCodigo: string): Promise<boolean> {
    const cleanCodigo = periodoIdOrCodigo.replace(/^per-/, '');
    const p = await this.obtenerPorCodigo(empresaId, cleanCodigo);
    if (!p) {
      const byId = PERIODOS_MEMORIA.find(x => (x.id === periodoIdOrCodigo || x.codigoPeriodo === cleanCodigo) && x.empresaId === empresaId);
      return byId ? byId.estado === 'CERRADO' : false;
    }
    return p.estado === 'CERRADO';
  },

  async abrirPeriodo(empresaId: string, mesOcodigo: string, userId: string) {
    let p = PERIODOS_MEMORIA.find(x => x.empresaId === empresaId && x.codigoPeriodo === mesOcodigo);
    if (!p) {
      p = {
        id: `per-${empresaId}-${mesOcodigo}`,
        empresaId,
        ejercicioId: `eje-${mesOcodigo.substring(0, 4)}`,
        anio: parseInt(mesOcodigo.substring(0, 4), 10),
        mes: parseInt(mesOcodigo.substring(5, 7), 10),
        codigoPeriodo: mesOcodigo,
        estado: 'ABIERTO'
      };
      PERIODOS_MEMORIA.push(p);
    } else {
      p.estado = 'ABIERTO';
      p.empresaId = empresaId;
    }
    return p;
  },

  async cerrarPeriodo(empresaId: string, mesOcodigo: string, userId: string) {
    let p = PERIODOS_MEMORIA.find(x => x.empresaId === empresaId && x.codigoPeriodo === mesOcodigo);
    if (!p) {
      p = {
        id: `per-${empresaId}-${mesOcodigo}`,
        empresaId,
        ejercicioId: `eje-${mesOcodigo.substring(0, 4)}`,
        anio: parseInt(mesOcodigo.substring(0, 4), 10),
        mes: parseInt(mesOcodigo.substring(5, 7), 10),
        codigoPeriodo: mesOcodigo,
        estado: 'CERRADO'
      };
      PERIODOS_MEMORIA.push(p);
    } else {
      p.estado = 'CERRADO';
      p.empresaId = empresaId;
    }
    return p;
  },

  async reabrirPeriodo(empresaId: string, mesOcodigo: string, role: string = 'ADMINISTRADOR', userId?: string) {
    let p = PERIODOS_MEMORIA.find(x => x.empresaId === empresaId && x.codigoPeriodo === mesOcodigo);
    if (p) {
      p.estado = 'ABIERTO';
      p.empresaId = empresaId;
    }
    return p;
  }
};
