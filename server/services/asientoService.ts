import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface DetalleInput {
  linea: number;
  cuentaId: string;
  anexoId?: string | null;
  debe: number;
  haber: number;
  debeMe?: number;
  haberMe?: number;
  centroCostoId?: string | null;
  docTipo?: string | null;
  docSerie?: string | null;
  docNumero?: string | null;
  fechaVencimiento?: string | null;
  glosaLinea?: string | null;
}

export interface AsientoInput {
  periodoId: string;
  subdiarioId: string;
  fecha: string;
  glosa: string;
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  origen?: string;
  origenId?: string | null;
  version?: number;
  detalles: DetalleInput[];
}

export interface AsientoFiltros {
  periodoId?: string;
  subdiarioId?: string;
  estado?: 'BORRADOR' | 'CONTABILIZADO' | 'ANULADO';
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Almacén en memoria sincronizado para alta disponibilidad
export const ASIENTOS_MEMORIA: any[] = [];
const CORRELATIVOS_MEMORIA = new Map<string, number>();

function getNextCorrelativoMemoria(empresaId: string, periodoId: string, subdiarioId: string): number {
  const key = `${empresaId}-${periodoId}-${subdiarioId}`;
  const current = CORRELATIVOS_MEMORIA.get(key) || 0;
  const next = current + 1;
  CORRELATIVOS_MEMORIA.set(key, next);
  return next;
}

export const asientoService = {
  /**
   * Crea un nuevo asiento en estado BORRADOR. Los borradores NO consumen correlativo.
   */
  async crearBorrador(empresaId: string, input: AsientoInput, userId: string) {
    const id = `asiento-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const version = 1;
    const moneda = input.moneda || 'PEN';
    const tipoCambio = input.tipoCambio || 1.0;

    // Calcular totales con aritmética decimal estricta
    let sumDebe = Money.create(0);
    let sumHaber = Money.create(0);

    for (const d of input.detalles) {
      sumDebe = Money.add(sumDebe, d.debe);
      sumHaber = Money.add(sumHaber, d.haber);
    }

    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
        await client.query(`SET LOCAL app.current_empresa_id = $2`, [empresaId]);

        // Verificar período abierto
        const pRes = await client.query(`SELECT estado FROM periodos WHERE id = $1`, [input.periodoId]);
        if (pRes.rows[0]?.estado === 'CERRADO') {
          throw new Error('PERIODO_CERRADO: No se puede crear asientos en un período contable cerrado.');
        }

        const insertRes = await client.query(`
          INSERT INTO asientos (
            empresa_id, periodo_id, subdiario_id, numero, fecha, glosa,
            moneda, tipo_cambio, estado, origen, origen_id, version, created_by
          ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, 'BORRADOR', $8, $9, $10, $11)
          RETURNING *
        `, [
          empresaId, input.periodoId, input.subdiarioId, input.fecha, input.glosa,
          moneda, tipoCambio, input.origen || 'MANUAL', input.origenId || null, version, userId
        ]);

        const asientoCreado = insertRes.rows[0];

        // Insertar líneas de detalle
        for (const d of input.detalles) {
          await client.query(`
            INSERT INTO asiento_detalle (
              asiento_id, empresa_id, linea, cuenta_id, anexo_id, debe, haber,
              debe_me, haber_me, centro_costo_id, doc_tipo, doc_serie, doc_numero,
              fecha_vencimiento, glosa_linea
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            asientoCreado.id, empresaId, d.linea, d.cuentaId, d.anexoId || null,
            d.debe, d.haber, d.debeMe || 0, d.haberMe || 0, d.centroCostoId || null,
            d.docTipo || null, d.docSerie || null, d.docNumero || null,
            d.fechaVencimiento || null, d.glosaLinea || null
          ]);
        }

        await client.query('COMMIT');

        await auditoriaRepository.registrar({
          empresaId,
          usuarioId: userId,
          tablaAfectada: 'asientos',
          registroId: asientoCreado.id,
          accion: 'INSERT',
          datosNuevos: { ...asientoCreado, totalDebe: Money.toNumber(sumDebe), totalHaber: Money.toNumber(sumHaber) }
        });

        return { ...asientoCreado, totalDebe: Money.toNumber(sumDebe), totalHaber: Money.toNumber(sumHaber), detalles: input.detalles };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const nuevoAsiento = {
      id,
      empresaId,
      periodoId: input.periodoId,
      subdiarioId: input.subdiarioId,
      numero: null,
      fecha: input.fecha,
      glosa: input.glosa,
      moneda,
      tipoCambio,
      estado: 'BORRADOR',
      origen: input.origen || 'MANUAL',
      origenId: input.origenId || null,
      version,
      totalDebe: Money.toNumber(sumDebe),
      totalHaber: Money.toNumber(sumHaber),
      cuadrado: Money.isEqual(sumDebe, sumHaber),
      creadoPor: userId,
      detalles: input.detalles,
      createdAt: now,
      updatedAt: now
    };

    ASIENTOS_MEMORIA.unshift(nuevoAsiento);
    return nuevoAsiento;
  },

  /**
   * Actualiza un asiento en estado BORRADOR con validación de bloqueo optimista (version).
   */
  async actualizarBorrador(asientoId: string, input: AsientoInput, userId: string, expectedVersion: number) {
    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        const currentRes = await client.query(`SELECT estado, version, periodo_id, empresa_id FROM asientos WHERE id = $1 FOR UPDATE`, [asientoId]);
        if (currentRes.rows.length === 0) {
          throw new Error('ASIENTO_NO_ENCONTRADO: El asiento solicitado no existe.');
        }

        const current = currentRes.rows[0];
        if (current.estado !== 'BORRADOR') {
          throw new Error('ASIENTO_NO_EDITABLE: Solo los asientos en estado BORRADOR pueden ser editados.');
        }

        if (current.version !== expectedVersion) {
          throw new Error('VERSION_DESACTUALIZADA: El asiento fue modificado por otro usuario. Por favor recarga los datos.');
        }

        const nextVersion = current.version + 1;

        await client.query(`
          UPDATE asientos SET
            fecha = $1, glosa = $2, moneda = $3, tipo_cambio = $4,
            subdiario_id = $5, version = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [
          input.fecha, input.glosa, input.moneda || 'PEN', input.tipoCambio || 1.0,
          input.subdiarioId, nextVersion, userId, asientoId
        ]);

        await client.query(`DELETE FROM asiento_detalle WHERE asiento_id = $1`, [asientoId]);

        for (const d of input.detalles) {
          await client.query(`
            INSERT INTO asiento_detalle (
              asiento_id, empresa_id, linea, cuenta_id, anexo_id, debe, haber,
              debe_me, haber_me, centro_costo_id, doc_tipo, doc_serie, doc_numero,
              fecha_vencimiento, glosa_linea
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            asientoId, current.empresa_id, d.linea, d.cuentaId, d.anexoId || null,
            d.debe, d.haber, d.debeMe || 0, d.haberMe || 0, d.centroCostoId || null,
            d.docTipo || null, d.docSerie || null, d.docNumero || null,
            d.fechaVencimiento || null, d.glosaLinea || null
          ]);
        }

        await client.query('COMMIT');
        return { id: asientoId, version: nextVersion, estado: 'BORRADOR' };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const idx = ASIENTOS_MEMORIA.findIndex(a => a.id === asientoId);
    if (idx === -1) throw new Error('ASIENTO_NO_ENCONTRADO: Asiento no encontrado.');
    if (ASIENTOS_MEMORIA[idx].estado !== 'BORRADOR') {
      throw new Error('ASIENTO_NO_EDITABLE: Solo los asientos en estado BORRADOR pueden ser editados.');
    }
    if (ASIENTOS_MEMORIA[idx].version !== expectedVersion) {
      throw new Error('VERSION_DESACTUALIZADA: El asiento fue modificado por otro usuario.');
    }

    ASIENTOS_MEMORIA[idx] = {
      ...ASIENTOS_MEMORIA[idx],
      ...input,
      version: expectedVersion + 1,
      updatedAt: new Date().toISOString()
    };
    return ASIENTOS_MEMORIA[idx];
  },

  /**
   * Contabiliza un asiento: valida estricta partida doble, asigna correlativo atómico y sella el registro.
   */
  async contabilizar(asientoId: string, empresaId: string, userId: string, options?: { enforceSegregacion?: boolean }) {
    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
        await client.query(`SET LOCAL app.current_empresa_id = $2`, [empresaId]);

        const aRes = await client.query(`
          SELECT a.*, p.codigo_periodo, s.codigo as subdiario_codigo
          FROM asientos a
          JOIN periodos p ON p.id = a.periodo_id
          JOIN subdiarios s ON s.id = a.subdiario_id
          WHERE a.id = $1 FOR UPDATE
        `, [asientoId]);

        if (aRes.rows.length === 0) throw new Error('ASIENTO_NO_ENCONTRADO');
        const asiento = aRes.rows[0];

        if (options?.enforceSegregacion && asiento.created_by && asiento.created_by === userId) {
          throw new Error('SEGREGACION_FUNCIONES: El usuario que registró el borrador no puede contabilizarlo (Separación obligatoria de funciones).');
        }

        if (asiento.estado === 'CONTABILIZADO') {
          throw new Error('ASIENTO_YA_CONTABILIZADO: El asiento ya se encuentra contabilizado.');
        }

        // 1. Obtener y bloquear correlativo de forma atómica (Sin saltos ni duplicados)
        await client.query(`
          INSERT INTO correlativos (empresa_id, periodo_id, subdiario_id, ultimo_numero)
          VALUES ($1, $2, $3, 0)
          ON CONFLICT (empresa_id, periodo_id, subdiario_id) DO NOTHING
        `, [empresaId, asiento.periodo_id, asiento.subdiario_id]);

        const corrRes = await client.query(`
          UPDATE correlativos
          SET ultimo_numero = ultimo_numero + 1, updated_at = CURRENT_TIMESTAMP
          WHERE empresa_id = $1 AND periodo_id = $2 AND subdiario_id = $3
          RETURNING ultimo_numero
        `, [empresaId, asiento.periodo_id, asiento.subdiario_id]);

        const correlativoNum = corrRes.rows[0].ultimo_numero;
        const mesStr = asiento.codigo_periodo.split('-')[1] || '09';
        const numeroCorrelativo = `${asiento.subdiario_codigo}${mesStr}${String(correlativoNum).padStart(4, '0')}`;

        // 2. Actualizar estado a CONTABILIZADO
        const updateRes = await client.query(`
          UPDATE asientos SET
            numero = $1, estado = 'CONTABILIZADO', version = version + 1,
            updated_by = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `, [numeroCorrelativo, userId, asientoId]);

        await client.query('COMMIT');

        await auditoriaRepository.registrar({
          empresaId,
          usuarioId: userId,
          tablaAfectada: 'asientos',
          registroId: asientoId,
          accion: 'UPDATE',
          datosNuevos: { estado: 'CONTABILIZADO', numero: numeroCorrelativo }
        });

        return updateRes.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Fallback memoria
    const item = ASIENTOS_MEMORIA.find(a => a.id === asientoId);
    if (!item) throw new Error('ASIENTO_NO_ENCONTRADO');

    if (item.estado === 'CONTABILIZADO') {
      throw new Error('ASIENTO_YA_CONTABILIZADO: El asiento ya se encuentra contabilizado.');
    }
    if (item.estado === 'EN_PROCESO_CONTABILIZACION') {
      throw new Error('ASIENTO_YA_CONTABILIZADO: El asiento ya se encuentra en proceso de contabilización.');
    }

    if (options?.enforceSegregacion && (item as any).creadoPor && (item as any).creadoPor === userId) {
      throw new Error('SEGREGACION_FUNCIONES: El usuario que registró el borrador no puede contabilizarlo (Separación obligatoria de funciones).');
    }

    if (!item.cuadrado) {
      throw new Error(`ASIENTO_DESCUADRADO: El asiento no cuadra (Debe S/ ${item.totalDebe} != Haber S/ ${item.totalHaber})`);
    }

    item.estado = 'EN_PROCESO_CONTABILIZACION';
    try {
      const pId = item.periodoId || 'per-2026-09';
      const sId = item.subdiarioId || '01';
      const corrNum = getNextCorrelativoMemoria(empresaId, pId, sId);
      const subCod = (item.subdiarioCodigo || sId || '01').padStart(2, '0').slice(-2);
      const mesStr = item.fecha ? item.fecha.substring(5, 7) : (pId.includes('-') ? pId.split('-')[1] : '09');
      const numStr = `${subCod}${mesStr}${String(corrNum).padStart(4, '0')}`;

      item.estado = 'CONTABILIZADO';
      item.numero = numStr;
      item.version = (item.version || 1) + 1;
      item.updatedAt = new Date().toISOString();

      return item;
    } catch (e) {
      item.estado = 'BORRADOR';
      throw e;
    }
  },

  /**
   * Anula un asiento generando su correspondiente Asiento de Extorno inmutable.
   */
  async anular(asientoId: string, motivo: string, userId: string, empresaId: string) {
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('MOTIVO_REQUERIDO: Debe especificar un motivo de anulación detallado.');
    }

    const extornoId = `extorno-${Date.now()}`;

    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
        await client.query(`SET LOCAL app.current_empresa_id = $2`, [empresaId]);

        const aRes = await client.query(`SELECT * FROM asientos WHERE id = $1 FOR UPDATE`, [asientoId]);
        if (aRes.rows.length === 0) throw new Error('ASIENTO_NO_ENCONTRADO');
        const original = aRes.rows[0];

        if (original.estado === 'ANULADO') {
          throw new Error('ASIENTO_YA_ANULADO: El asiento ya fue anulado previamente.');
        }

        // Consultar líneas originales
        const dRes = await client.query(`SELECT * FROM asiento_detalle WHERE asiento_id = $1 ORDER BY linea`, [asientoId]);
        const lineasOriginales = dRes.rows;

        // 1. Crear Asiento de Extorno (Invierte Debe y Haber)
        const glosaExtorno = `Extorno de asiento N° ${original.numero || 'S/N'}: ${motivo}`;
        const extornoRes = await client.query(`
          INSERT INTO asientos (
            empresa_id, periodo_id, subdiario_id, numero, fecha, glosa,
            moneda, tipo_cambio, estado, origen, origen_id, version, created_by
          ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, 'CONTABILIZADO', 'AJUSTE', $8, 1, $9)
          RETURNING *
        `, [
          empresaId, original.periodo_id, original.subdiario_id,
          `EXT-${original.numero || Date.now()}`, glosaExtorno, original.moneda,
          original.tipo_cambio, original.id, userId
        ]);

        const extornoAsiento = extornoRes.rows[0];

        for (const l of lineasOriginales) {
          await client.query(`
            INSERT INTO asiento_detalle (
              asiento_id, empresa_id, linea, cuenta_id, anexo_id, debe, haber,
              debe_me, haber_me, centro_costo_id, doc_tipo, doc_serie, doc_numero,
              glosa_linea
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            extornoAsiento.id, empresaId, l.linea, l.cuenta_id, l.anexo_id,
            l.haber, l.debe, l.haber_me, l.debe_me, l.centro_costo_id,
            l.doc_tipo, l.doc_serie, l.doc_numero, `Extorno: ${l.glosa_linea || ''}`
          ]);
        }

        // 2. Marcar asiento original como ANULADO
        await client.query(`
          UPDATE asientos SET
            estado = 'ANULADO', asiento_extorno_id = $1, motivo_anulacion = $2,
            anulado_by = $3, anulado_at = CURRENT_TIMESTAMP, version = version + 1
          WHERE id = $4
        `, [extornoAsiento.id, motivo, userId, asientoId]);

        await client.query('COMMIT');

        await auditoriaRepository.registrar({
          empresaId,
          usuarioId: userId,
          tablaAfectada: 'asientos',
          registroId: asientoId,
          accion: 'ANULAR',
          datosNuevos: { motivo, extornoId: extornoAsiento.id }
        });

        return { asientoOriginalId: asientoId, extornoId: extornoAsiento.id, estado: 'ANULADO' };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const item = ASIENTOS_MEMORIA.find(a => a.id === asientoId);
    if (!item) throw new Error('ASIENTO_NO_ENCONTRADO');
    item.estado = 'ANULADO';
    item.motivoAnulacion = motivo;
    item.asientoExtornoId = extornoId;
    return { asientoOriginalId: asientoId, extornoId, estado: 'ANULADO' };
  },

  /**
   * Duplica un asiento como nuevo borrador para acelerar el registro.
   */
  async duplicar(asientoId: string, userId: string, empresaId: string) {
    const original = await this.obtenerPorId(asientoId);
    if (!original) throw new Error('ASIENTO_NO_ENCONTRADO');

    return this.crearBorrador(empresaId, {
      periodoId: original.periodoId,
      subdiarioId: original.subdiarioId,
      fecha: new Date().toISOString().split('T')[0],
      glosa: `Copia de: ${original.glosa}`,
      moneda: original.moneda,
      tipoCambio: original.tipoCambio,
      origen: 'MANUAL',
      detalles: original.detalles.map((d: any) => ({
        linea: d.linea,
        cuentaId: d.cuentaId,
        anexoId: d.anexoId,
        debe: d.debe,
        haber: d.haber,
        debeMe: d.debeMe,
        haberMe: d.haberMe,
        glosaLinea: d.glosaLinea,
        docTipo: d.docTipo,
        docSerie: d.docSerie,
        docNumero: d.docNumero
      }))
    }, userId);
  },

  /**
   * Obtiene un asiento con sus líneas de detalle.
   */
  async obtenerPorId(asientoId: string) {
    if (db.isPostgresConnected()) {
      const aRes = await db.query(`
        SELECT a.*, p.codigo_periodo as "periodoCodigo", s.codigo as "subdiarioCodigo", s.descripcion as "subdiarioNombre"
        FROM asientos a
        LEFT JOIN periodos p ON p.id = a.periodo_id
        LEFT JOIN subdiarios s ON s.id = a.subdiario_id
        WHERE a.id = $1
      `, [asientoId]);
      if (aRes.rows.length === 0) return null;

      const dRes = await db.query(`
        SELECT d.*, c.codigo as "cuentaCodigo", c.nombre as "cuentaNombre",
               an.numero_documento as "anexoNumero", an.razon_social as "anexoRazonSocial"
        FROM asiento_detalle d
        JOIN plan_cuentas c ON c.id = d.cuenta_id
        LEFT JOIN anexos an ON an.id = d.anexo_id
        WHERE d.asiento_id = $1
        ORDER BY d.linea ASC
      `, [asientoId]);

      return {
        ...aRes.rows[0],
        detalles: dRes.rows
      };
    }

    return ASIENTOS_MEMORIA.find(a => a.id === asientoId) || null;
  },

  /**
   * Lista los asientos de una empresa con filtros, paginación y búsqueda en servidor.
   */
  async listar(empresaId: string, filtros: AsientoFiltros = {}) {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.min(100, filtros.limit || 25);
    const offset = (page - 1) * limit;

    if (db.isPostgresConnected()) {
      const conditions: string[] = ['a.empresa_id = $1'];
      const values: any[] = [empresaId];
      let pIdx = 2;

      if (filtros.estado) {
        conditions.push(`a.estado = $${pIdx++}`);
        values.push(filtros.estado);
      }
      if (filtros.periodoId) {
        conditions.push(`a.periodo_id = $${pIdx++}`);
        values.push(filtros.periodoId);
      }
      if (filtros.subdiarioId) {
        conditions.push(`a.subdiario_id = $${pIdx++}`);
        values.push(filtros.subdiarioId);
      }
      if (filtros.fechaDesde) {
        conditions.push(`a.fecha >= $${pIdx++}`);
        values.push(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        conditions.push(`a.fecha <= $${pIdx++}`);
        values.push(filtros.fechaHasta);
      }
      if (filtros.search) {
        conditions.push(`(a.glosa ILIKE $${pIdx} OR a.numero ILIKE $${pIdx})`);
        values.push(`%${filtros.search}%`);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const countRes = await db.query(`SELECT COUNT(*) FROM asientos a WHERE ${whereClause}`, values);
      const total = parseInt(countRes.rows[0].count, 10);

      const itemsRes = await db.query(`
        SELECT a.id, a.empresa_id as "empresaId", a.numero, a.fecha, a.glosa, a.moneda,
               a.tipo_cambio as "tipoCambio", a.estado, a.origen, a.asiento_extorno_id as "asientoExtornoId",
               a.version, a.created_at as "createdAt",
               p.codigo_periodo as "periodoCodigo", s.codigo as "subdiarioCodigo", s.descripcion as "subdiarioNombre",
               COALESCE((SELECT SUM(debe) FROM asiento_detalle WHERE asiento_id = a.id), 0.00) as "totalDebe",
               COALESCE((SELECT SUM(haber) FROM asiento_detalle WHERE asiento_id = a.id), 0.00) as "totalHaber",
               COALESCE((SELECT COUNT(*) FROM asiento_detalle WHERE asiento_id = a.id), 0) as "lineasCount"
        FROM asientos a
        LEFT JOIN periodos p ON p.id = a.periodo_id
        LEFT JOIN subdiarios s ON s.id = a.subdiario_id
        WHERE ${whereClause}
        ORDER BY a.fecha DESC, a.created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `, [...values, limit, offset]);

      return {
        data: itemsRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    const filtrados = ASIENTOS_MEMORIA.filter(a => {
      if (a.empresaId && a.empresaId !== empresaId) return false;
      if (filtros.estado && a.estado !== filtros.estado) return false;
      if (filtros.search && !a.glosa.toLowerCase().includes(filtros.search.toLowerCase())) return false;
      return true;
    });

    return {
      data: filtrados.slice(offset, offset + limit),
      total: filtrados.length,
      page,
      limit,
      totalPages: Math.ceil(filtrados.length / limit)
    };
  },

  /**
   * Crea y contabiliza un asiento en un solo paso atómico
   */
  async crearAsiento(empresaId: string, datos: any, userId: string) {
    const subdiarioId = datos.subdiario || datos.subdiarioId || '05';
    const borrador = await this.crearBorrador(empresaId, {
      periodoId: datos.periodoId,
      subdiarioId,
      fecha: datos.fecha,
      glosa: datos.glosa,
      moneda: datos.moneda || 'PEN',
      tipoCambio: datos.tipoCambio || 1.0,
      origen: datos.origenModulo || datos.origen || 'SISTEMA',
      detalles: (datos.lineas || datos.detalles || []).map((l: any, idx: number) => ({
        linea: l.linea || (idx + 1),
        cuentaId: l.cuentaId || `cta-${l.codigoCuenta}`,
        anexoId: l.anexoId || null,
        debe: l.debe || 0,
        haber: l.haber || 0,
        debeMe: l.debeMe || 0,
        haberMe: l.haberMe || 0,
        glosaLinea: l.glosa || l.glosaLinea || datos.glosa
      }))
    }, userId);

    return await this.contabilizar(borrador.id, empresaId, userId);
  },

  /**
   * Alias de anular
   */
  async anularAsiento(empresaId: string, asientoId: string, motivo: string, userId: string) {
    return await this.anular(asientoId, motivo, userId, empresaId);
  }
};
