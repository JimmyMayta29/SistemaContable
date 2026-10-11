import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { anexoService } from './anexoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface VentaInput {
  periodoId: string;
  fechaEmision: string;
  fechaVencimiento?: string | null;
  fechaContable: string;
  tipoComprobante: string; // '01', '03', '07', '08'
  serie: string;
  numero: string;
  clienteId: string;
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  baseGravada: number;
  igv: number;
  baseNoGravada?: number;
  exonerado?: number;
  isc?: number;
  icbper?: number;
  otrosTributos?: number;
  total: number;
  tipoOperacion?: string;
  formaPago?: 'CONTADO' | 'CREDITO';
  diasCredito?: number;
  tieneDetraccion?: boolean;
  codigoBienDetraccion?: string;
  porcentajeDetraccion?: number;
  tienePercepcion?: boolean;
  porcentajePercepcion?: number;
  hashCpe?: string;
  glosa?: string;
  version?: number;
}

export interface VentaModel {
  id: string;
  empresaId: string;
  periodoId: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  fechaContable: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  clienteId: string;
  clienteNombre?: string;
  clienteRuc?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  baseGravada: number;
  igv: number;
  baseNoGravada: number;
  exonerado: number;
  isc: number;
  icbper: number;
  otrosTributos: number;
  total: number;
  tipoOperacion: string;
  formaPago: 'CONTADO' | 'CREDITO';
  diasCredito: number;
  tieneDetraccion: boolean;
  tienePercepcion: boolean;
  estado: 'BORRADOR' | 'REGISTRADO' | 'ANULADO';
  asientoId?: string | null;
  asientoNumero?: string | null;
  asientoGenerado?: boolean;
  hashCpe?: string;
  version: number;
  advertencias?: string[];
  createdAt: string;
  updatedAt: string;
}

export const VENTAS_MEMORIA: VentaModel[] = [];
export type CuentaPorCobrarModel = any;
export const CXC_MEMORIA: any[] = [];
const VENTA_LOCKS = new Set<string>();

export const ventaService = {
  validarCoherencia(input: VentaInput) {
    const total = Money.create(input.total);
    const baseGravada = Money.create(input.baseGravada);
    const igv = Money.create(input.igv);
    const noGravada = Money.create(input.baseNoGravada || 0);
    const exonerado = Money.create(input.exonerado || 0);
    const isc = Money.create(input.isc || 0);
    const icbper = Money.create(input.icbper || 0);
    const otros = Money.create(input.otrosTributos || 0);

    const sumaComponentes = Money.add(
      baseGravada,
      Money.add(igv, Money.add(noGravada, Money.add(exonerado, Money.add(isc, Money.add(icbper, otros)))))
    );

    if (!Money.isEqual(total, sumaComponentes)) {
      throw new Error(`COHERENCIA_SUMAS_INVALIDA: La suma de base + IGV + tributos (S/ ${sumaComponentes}) no coincide con el total (S/ ${total}).`);
    }

    if (!baseGravada.isZero()) {
      const igvCalculado = Money.round(baseGravada.times(0.18));
      const difIgv = Money.sub(igv, igvCalculado).abs();
      if (difIgv.greaterThan(0.05)) {
        throw new Error(`IGV_INCOHERENTE: El IGV de venta (S/ ${igv}) difiere del 18% calculado (S/ ${igvCalculado}).`);
      }
    }
  },

  async verificarDuplicado(empresaId: string, tipo: string, serie: string, numero: string, ignorarId?: string) {
    if (db.isPostgresConnected()) {
      const sql = `
        SELECT id FROM comprobantes_venta
        WHERE empresa_id = $1 AND tipo_comprobante = $2 AND serie = $3 AND numero = $4
          ${ignorarId ? 'AND id != $5' : ''}
          AND estado != 'ANULADO'
      `;
      const params = ignorarId ? [empresaId, tipo, serie, numero, ignorarId] : [empresaId, tipo, serie, numero];
      const res = await db.query(sql, params);
      if (res.rows.length > 0) {
        throw new Error(`COMPROBANTE_DUPLICADO: Ya existe un comprobante de venta emitido con tipo ${tipo} ${serie}-${numero}.`);
      }
    } else {
      const existe = VENTAS_MEMORIA.find(v => 
        v.empresaId === empresaId &&
        v.tipoComprobante === tipo &&
        v.serie.toUpperCase() === serie.toUpperCase() &&
        v.numero === numero &&
        v.estado !== 'ANULADO' &&
        (!ignorarId || v.id !== ignorarId)
      );
      if (existe) {
        throw new Error(`COMPROBANTE_DUPLICADO: Ya existe un comprobante de venta emitido con tipo ${tipo} ${serie}-${numero}.`);
      }
    }
  },

  async crearBorrador(empresaId: string, input: VentaInput, userId: string): Promise<VentaModel> {
    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden crear comprobantes en un período contable cerrado.');
    }

    this.validarCoherencia(input);
    await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero);

    const id = `vent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const borrador: VentaModel = {
      id,
      empresaId,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      clienteId: input.clienteId,
      moneda: input.moneda || 'PEN',
      tipoCambio: input.tipoCambio || 1.0,
      baseGravada: input.baseGravada,
      igv: input.igv,
      baseNoGravada: input.baseNoGravada || 0,
      exonerado: input.exonerado || 0,
      isc: input.isc || 0,
      icbper: input.icbper || 0,
      otrosTributos: input.otrosTributos || 0,
      total: input.total,
      tipoOperacion: input.tipoOperacion || 'VENTA_INTERNA',
      formaPago: input.formaPago || 'CONTADO',
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tienePercepcion: !!input.tienePercepcion,
      estado: 'BORRADOR',
      asientoId: null,
      asientoNumero: null,
      hashCpe: input.hashCpe,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO comprobantes_venta (
          id, empresa_id, periodo_id, fecha_emision, fecha_vencimiento, fecha_contable,
          tipo_comprobante, serie, numero, cliente_id, moneda, tipo_cambio,
          base_gravada, igv, base_no_gravada, exonerado, isc, icbper, otros_tributos,
          total, tipo_operacion, forma_pago, dias_credito, tiene_detraccion, tiene_percepcion,
          estado, version, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
          'BORRADOR', 1, $26
        )
      `, [
        borrador.id, empresaId, borrador.periodoId, borrador.fechaEmision, borrador.fechaVencimiento, borrador.fechaContable,
        borrador.tipoComprobante, borrador.serie, borrador.numero, borrador.clienteId, borrador.moneda, borrador.tipoCambio,
        borrador.baseGravada, borrador.igv, borrador.baseNoGravada, borrador.exonerado, borrador.isc, borrador.icbper, borrador.otrosTributos,
        borrador.total, borrador.tipoOperacion, borrador.formaPago, borrador.diasCredito, borrador.tieneDetraccion, borrador.tienePercepcion,
        userId
      ]);
    } else {
      VENTAS_MEMORIA.unshift(borrador);
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_venta',
      registroId: id,
      accion: 'INSERT',
      datosNuevos: borrador
    });

    return borrador;
  },

  async actualizarBorrador(empresaId: string, id: string, input: VentaInput, userId: string, expectedVersion: number): Promise<VentaModel> {
    const actual = await this.obtenerPorId(empresaId, id);
    if (!actual) throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante de venta no existe.');
    if (actual.estado !== 'BORRADOR') throw new Error(`COMPROBANTE_NO_EDITABLE: El comprobante está en estado ${actual.estado} y no puede modificarse.`);
    if (actual.version !== expectedVersion) throw new Error(`VERSION_DESACTUALIZADA: El comprobante ha sido modificado por otro usuario.`);

    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId || actual.periodoId);
    if (periodo && periodo.estado === 'CERRADO') throw new Error('PERIODO_CERRADO: No se pueden modificar comprobantes en un período contable cerrado.');

    this.validarCoherencia(input);
    await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero, id);

    const nuevaVersion = actual.version + 1;
    const now = new Date().toISOString();

    const actualizado: VentaModel = {
      ...actual,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      clienteId: input.clienteId,
      moneda: input.moneda || 'PEN',
      tipoCambio: input.tipoCambio || 1.0,
      baseGravada: input.baseGravada,
      igv: input.igv,
      baseNoGravada: input.baseNoGravada || 0,
      exonerado: input.exonerado || 0,
      isc: input.isc || 0,
      icbper: input.icbper || 0,
      otrosTributos: input.otrosTributos || 0,
      total: input.total,
      tipoOperacion: input.tipoOperacion || 'VENTA_INTERNA',
      formaPago: input.formaPago || 'CONTADO',
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tienePercepcion: !!input.tienePercepcion,
      version: nuevaVersion,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        UPDATE comprobantes_venta
        SET periodo_id = $1, fecha_emision = $2, fecha_vencimiento = $3, fecha_contable = $4,
            tipo_comprobante = $5, serie = $6, numero = $7, cliente_id = $8,
            moneda = $9, tipo_cambio = $10, base_gravada = $11, igv = $12,
            base_no_gravada = $13, exonerado = $14, isc = $15, icbper = $16,
            otros_tributos = $17, total = $18, tipo_operacion = $19, forma_pago = $20,
            dias_credito = $21, tiene_detraccion = $22, tiene_percepcion = $23,
            version = $24, updated_at = NOW(), updated_by = $25
        WHERE id = $26 AND empresa_id = $27 AND version = $28
      `, [
        actualizado.periodoId, actualizado.fechaEmision, actualizado.fechaVencimiento, actualizado.fechaContable,
        actualizado.tipoComprobante, actualizado.serie, actualizado.numero, actualizado.clienteId,
        actualizado.moneda, actualizado.tipoCambio, actualizado.baseGravada, actualizado.igv,
        actualizado.baseNoGravada, actualizado.exonerado, actualizado.isc, actualizado.icbper,
        actualizado.otrosTributos, actualizado.total, actualizado.tipoOperacion, actualizado.formaPago,
        actualizado.diasCredito, actualizado.tieneDetraccion, actualizado.tienePercepcion,
        nuevaVersion, userId, id, empresaId, expectedVersion
      ]);
    } else {
      const idx = VENTAS_MEMORIA.findIndex(v => v.id === id && v.empresaId === empresaId);
      if (idx !== -1) VENTAS_MEMORIA[idx] = actualizado;
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_venta',
      registroId: id,
      accion: 'UPDATE',
      datosAnteriores: actual,
      datosNuevos: actualizado
    });

    return actualizado;
  },

  async eliminarBorrador(empresaId: string, id: string, userId: string): Promise<boolean> {
    const actual = await this.obtenerPorId(empresaId, id);
    if (!actual) throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante no existe.');
    if (actual.estado !== 'BORRADOR') throw new Error('COMPROBANTE_NO_ELIMINABLE: Solo los borradores pueden eliminarse físicamente.');

    if (db.isPostgresConnected()) {
      await db.query(`DELETE FROM comprobantes_venta WHERE id = $1 AND empresa_id = $2 AND estado = 'BORRADOR'`, [id, empresaId]);
    } else {
      const idx = VENTAS_MEMORIA.findIndex(v => v.id === id && v.empresaId === empresaId);
      if (idx !== -1) VENTAS_MEMORIA.splice(idx, 1);
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_venta',
      registroId: id,
      accion: 'DELETE',
      datosAnteriores: actual
    });

    return true;
  },

  async registrarBorradorVenta(id: string, userId: string, empresaId: string): Promise<VentaModel> {
    return this.registrar(empresaId, id, userId);
  },

  async registrar(empresaId: string, inputOrId: VentaInput | string, userId: string): Promise<VentaModel> {
    let input: VentaInput;
    let existingId: string | null = null;
    let version = 1;

    if (typeof inputOrId === 'string') {
      const borrador = await this.obtenerPorId(empresaId, inputOrId);
      if (!borrador) throw new Error('COMPROBANTE_NO_ENCONTRADO: Borrador no encontrado.');
      if (borrador.estado !== 'BORRADOR') throw new Error('COMPROBANTE_YA_REGISTRADO: El comprobante ya se encuentra registrado.');
      existingId = borrador.id;
      version = borrador.version;
      input = {
        periodoId: borrador.periodoId,
        fechaEmision: borrador.fechaEmision,
        fechaVencimiento: borrador.fechaVencimiento,
        fechaContable: borrador.fechaContable,
        tipoComprobante: borrador.tipoComprobante,
        serie: borrador.serie,
        numero: borrador.numero,
        clienteId: borrador.clienteId,
        moneda: borrador.moneda,
        tipoCambio: borrador.tipoCambio,
        baseGravada: borrador.baseGravada,
        igv: borrador.igv,
        baseNoGravada: borrador.baseNoGravada,
        exonerado: borrador.exonerado,
        isc: borrador.isc,
        icbper: borrador.icbper,
        otrosTributos: borrador.otrosTributos,
        total: borrador.total,
        tipoOperacion: borrador.tipoOperacion,
        formaPago: borrador.formaPago,
        diasCredito: borrador.diasCredito,
        tieneDetraccion: borrador.tieneDetraccion,
        tienePercepcion: borrador.tienePercepcion
      };
    } else {
      input = inputOrId;
      await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero);
    }

    const lockKey = `${empresaId}_${input.tipoComprobante}_${input.serie.toUpperCase()}_${input.numero}`;
    if (VENTA_LOCKS.has(lockKey)) {
      throw new Error(`COMPROBANTE_DUPLICADO: Ya existe una operación concurrente registrando este comprobante.`);
    }
    VENTA_LOCKS.add(lockKey);

    try {
      this.validarCoherencia(input);

    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden registrar ventas en un período contable cerrado.');
    }

    const cliente = await anexoService.obtenerPorId(empresaId, input.clienteId);
    const advertencias: string[] = [];
    if (cliente && cliente.estadoSunat !== 'ACTIVO') {
      advertencias.push(`CLIENTE_NO_ACTIVO_ADVERTENCIA: El cliente figura con estado ${cliente.estadoSunat} en el padrón.`);
    }

    const moneda = input.moneda || 'PEN';
    const tipoCambio = input.tipoCambio || 1.0;
    const formaPago = input.formaPago || 'CONTADO';

    // Generar asiento contable mediante ContabilizacionService y AsientoService
    const prop = await contabilizacionService.generar(empresaId, 'VENTA', {
      total: input.total,
      baseImponible: input.baseGravada,
      igv: input.igv,
      glosa: input.glosa || `Venta ${input.tipoComprobante} ${input.serie}-${input.numero}`,
      docTipo: input.tipoComprobante,
      docSerie: input.serie,
      docNumero: input.numero,
      anexoId: input.clienteId,
      moneda,
      tipoCambio
    });

    const asientoBorrador = await asientoService.crearBorrador(empresaId, {
      periodoId: input.periodoId,
      subdiarioId: '02', // Subdiario oficial 02 - Registro de Ventas
      fecha: input.fechaContable,
      glosa: prop.glosaGeneral,
      moneda,
      tipoCambio,
      origen: 'VENTA',
      detalles: prop.lineas.map(l => ({
        linea: l.linea,
        cuentaId: l.cuentaId || `cta-${l.codigoCuenta}`,
        anexoId: l.anexoId || input.clienteId,
        debe: l.debe,
        haber: l.haber,
        debeMe: l.debeMe,
        haberMe: l.haberMe,
        docTipo: l.docTipo || input.tipoComprobante,
        docSerie: l.docSerie || input.serie,
        docNumero: l.docNumero || input.numero,
        glosaLinea: l.glosaLinea
      }))
    }, userId);

    const asientoContabilizado = await asientoService.contabilizar(asientoBorrador.id, empresaId, userId);

    const ventaId = existingId || `vent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const ventaRegistrada: VentaModel = {
      id: ventaId,
      empresaId,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      clienteId: input.clienteId,
      clienteNombre: cliente?.razonSocial,
      clienteRuc: cliente?.numeroDocumento,
      moneda,
      tipoCambio,
      baseGravada: input.baseGravada,
      igv: input.igv,
      baseNoGravada: input.baseNoGravada || 0,
      exonerado: input.exonerado || 0,
      isc: input.isc || 0,
      icbper: input.icbper || 0,
      otrosTributos: input.otrosTributos || 0,
      total: input.total,
      tipoOperacion: input.tipoOperacion || 'VENTA_INTERNA',
      formaPago,
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tienePercepcion: !!input.tienePercepcion,
      estado: 'REGISTRADO',
      asientoGenerado: true,
      asientoId: asientoContabilizado.id,
      asientoNumero: asientoContabilizado.numero,
      hashCpe: input.hashCpe,
      version: version + 1,
      advertencias,
      createdAt: now,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      if (existingId) {
        await db.query(`
          UPDATE comprobantes_venta
          SET estado = 'REGISTRADO', asiento_id = $1, version = version + 1, updated_at = NOW(), updated_by = $2
          WHERE id = $3 AND empresa_id = $4
        `, [asientoContabilizado.id, userId, ventaId, empresaId]);
      } else {
        await db.query(`
          INSERT INTO comprobantes_venta (
            id, empresa_id, periodo_id, fecha_emision, fecha_vencimiento, fecha_contable,
            tipo_comprobante, serie, numero, cliente_id, moneda, tipo_cambio,
            base_gravada, igv, base_no_gravada, exonerado, isc, icbper, otros_tributos,
            total, tipo_operacion, forma_pago, dias_credito, tiene_detraccion, tiene_percepcion,
            estado, origen, hash_cpe, asiento_id, version, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
            'REGISTRADO', 'MANUAL', $26, $27, 2, $28
          )
        `, [
          ventaId, empresaId, input.periodoId, input.fechaEmision, input.fechaVencimiento || null, input.fechaContable,
          input.tipoComprobante, input.serie, input.numero, input.clienteId, moneda, tipoCambio,
          ventaRegistrada.baseGravada, ventaRegistrada.igv, ventaRegistrada.baseNoGravada, ventaRegistrada.exonerado,
          ventaRegistrada.isc, ventaRegistrada.icbper, ventaRegistrada.otrosTributos, ventaRegistrada.total,
          ventaRegistrada.tipoOperacion, formaPago, ventaRegistrada.diasCredito, ventaRegistrada.tieneDetraccion, ventaRegistrada.tienePercepcion,
          input.hashCpe || null, asientoContabilizado.id, userId
        ]);
      }

      if (formaPago === 'CREDITO') {
        await db.query(`
          INSERT INTO cuentas_por_cobrar (
            empresa_id, comprobante_id, cliente_id, moneda, importe_original,
            saldo, fecha_emision, fecha_vencimiento, estado
          ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'PENDIENTE')
          ON CONFLICT (comprobante_id) DO UPDATE SET saldo = EXCLUDED.saldo, estado = 'PENDIENTE'
        `, [
          empresaId, ventaId, input.clienteId, moneda, ventaRegistrada.total,
          input.fechaEmision, input.fechaVencimiento || input.fechaEmision
        ]);
      }
    } else {
      if (existingId) {
        const idx = VENTAS_MEMORIA.findIndex(v => v.id === existingId && v.empresaId === empresaId);
        if (idx !== -1) VENTAS_MEMORIA[idx] = ventaRegistrada;
      } else {
        VENTAS_MEMORIA.unshift(ventaRegistrada);
      }

      if (formaPago === 'CREDITO') {
        CXC_MEMORIA.unshift({
          id: `cxc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          empresaId,
          comprobanteId: ventaId,
          clienteId: input.clienteId,
          clienteNombre: cliente?.razonSocial || 'CLIENTE',
          clienteRuc: cliente?.numeroDocumento || '20000000002',
          serie: input.serie,
          numero: input.numero,
          tipoComprobante: input.tipoComprobante,
          moneda,
          importeOriginal: ventaRegistrada.total,
          saldo: ventaRegistrada.total,
          fechaEmision: input.fechaEmision,
          fechaVencimiento: input.fechaVencimiento || input.fechaEmision,
          estado: 'PENDIENTE'
        });
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_venta',
      registroId: ventaId,
      accion: 'INSERT',
      datosNuevos: ventaRegistrada
    });

    return ventaRegistrada;
    } finally {
      VENTA_LOCKS.delete(lockKey);
    }
  },

  async anular(empresaId: string, id: string, motivo: string, userId: string): Promise<VentaModel> {
    const venta = await this.obtenerPorId(empresaId, id);
    if (!venta) throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante no existe.');
    if (venta.estado === 'ANULADO') throw new Error('COMPROBANTE_YA_ANULADO: El comprobante ya está anulado.');

    const periodo = await periodoService.obtenerPorCodigo(empresaId, venta.periodoId);
    if (periodo && periodo.estado === 'CERRADO') throw new Error('PERIODO_CERRADO: No se pueden anular comprobantes en un período contable cerrado.');

    if (venta.asientoId) {
      await asientoService.anular(venta.asientoId, empresaId, motivo, userId);
    }

    const ventaAnulada: VentaModel = {
      ...venta,
      estado: 'ANULADO',
      version: venta.version + 1,
      updatedAt: new Date().toISOString()
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        UPDATE comprobantes_venta
        SET estado = 'ANULADO', version = version + 1, updated_at = NOW(), updated_by = $1
        WHERE id = $2 AND empresa_id = $3
      `, [userId, id, empresaId]);

      await db.query(`
        UPDATE cuentas_por_cobrar
        SET estado = 'CANCELADO', saldo = 0, updated_at = NOW()
        WHERE comprobante_id = $1 AND empresa_id = $2
      `, [id, empresaId]);
    } else {
      const idx = VENTAS_MEMORIA.findIndex(v => v.id === id && v.empresaId === empresaId);
      if (idx !== -1) VENTAS_MEMORIA[idx] = ventaAnulada;
      const cxcIdx = CXC_MEMORIA.findIndex(c => c.comprobanteId === id && c.empresaId === empresaId);
      if (cxcIdx !== -1) {
        CXC_MEMORIA[cxcIdx].estado = 'CANCELADO';
        CXC_MEMORIA[cxcIdx].saldo = 0;
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_venta',
      registroId: id,
      accion: 'ANULAR',
      datosAnteriores: venta,
      datosNuevos: ventaAnulada
    });

    return ventaAnulada;
  },

  async duplicar(empresaId: string, id: string, userId: string): Promise<VentaModel> {
    const original = await this.obtenerPorId(empresaId, id);
    if (!original) throw new Error('COMPROBANTE_NO_ENCONTRADO: Comprobante no encontrado.');

    const nuevoNumero = `${parseInt(original.numero, 10) + 1 || 1}`.padStart(original.numero.length, '0');

    return this.crearBorrador(empresaId, {
      periodoId: original.periodoId,
      fechaEmision: new Date().toISOString().substring(0, 10),
      fechaVencimiento: original.fechaVencimiento,
      fechaContable: new Date().toISOString().substring(0, 10),
      tipoComprobante: original.tipoComprobante,
      serie: original.serie,
      numero: nuevoNumero,
      clienteId: original.clienteId,
      moneda: original.moneda,
      tipoCambio: original.tipoCambio,
      baseGravada: original.baseGravada,
      igv: original.igv,
      baseNoGravada: original.baseNoGravada,
      exonerado: original.exonerado,
      isc: original.isc,
      icbper: original.icbper,
      otrosTributos: original.otrosTributos,
      total: original.total,
      tipoOperacion: original.tipoOperacion,
      formaPago: original.formaPago,
      diasCredito: original.diasCredito,
      tieneDetraccion: original.tieneDetraccion,
      tienePercepcion: original.tienePercepcion,
      glosa: `Copia de ${original.tipoComprobante} ${original.serie}-${original.numero}`
    }, userId);
  },

  async obtenerPorId(empresaId: string, id: string): Promise<VentaModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT v.*, a.razon_social as "clienteNombre", a.numero_documento as "clienteRuc",
               ast.numero as "asientoNumero"
        FROM comprobantes_venta v
        JOIN anexos a ON a.id = v.cliente_id
        LEFT JOIN asientos ast ON ast.id = v.asiento_id
        WHERE v.id = $1 AND v.empresa_id = $2
      `, [id, empresaId]);
      return res.rows[0] || null;
    }
    return VENTAS_MEMORIA.find(v => v.id === id && v.empresaId === empresaId) || null;
  },

  async listar(empresaId: string, params: {
    page?: number;
    limit?: number;
    periodoId?: string;
    tipoComprobante?: string;
    clienteId?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    if (db.isPostgresConnected()) {
      let where = `WHERE v.empresa_id = $1`;
      const values: any[] = [empresaId];

      if (params.periodoId) {
        values.push(params.periodoId);
        where += ` AND v.periodo_id = $${values.length}`;
      }
      if (params.tipoComprobante) {
        values.push(params.tipoComprobante);
        where += ` AND v.tipo_comprobante = $${values.length}`;
      }
      if (params.clienteId) {
        values.push(params.clienteId);
        where += ` AND v.cliente_id = $${values.length}`;
      }
      if (params.estado) {
        values.push(params.estado);
        where += ` AND v.estado = $${values.length}`;
      }
      if (params.fechaDesde) {
        values.push(params.fechaDesde);
        where += ` AND v.fecha_emision >= $${values.length}`;
      }
      if (params.fechaHasta) {
        values.push(params.fechaHasta);
        where += ` AND v.fecha_emision <= $${values.length}`;
      }
      if (params.search) {
        values.push(`%${params.search.toLowerCase()}%`);
        where += ` AND (LOWER(a.razon_social) LIKE $${values.length} OR a.numero_documento LIKE $${values.length} OR v.serie LIKE $${values.length} OR v.numero LIKE $${values.length})`;
      }

      const countRes = await db.query(`
        SELECT COUNT(*) as total FROM comprobantes_venta v
        JOIN anexos a ON a.id = v.cliente_id
        ${where}
      `, values);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const sortBy = params.sortBy === 'total' ? 'v.total' : params.sortBy === 'numero' ? 'v.numero' : 'v.fecha_emision';
      const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      values.push(limit, offset);
      const dataRes = await db.query(`
        SELECT v.*, a.razon_social as "clienteNombre", a.numero_documento as "clienteRuc",
               ast.numero as "asientoNumero"
        FROM comprobantes_venta v
        JOIN anexos a ON a.id = v.cliente_id
        LEFT JOIN asientos ast ON ast.id = v.asiento_id
        ${where}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `, values);

      return {
        items: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    let filtrados = VENTAS_MEMORIA.filter(v => v.empresaId === empresaId);

    if (params.periodoId) filtrados = filtrados.filter(v => v.periodoId === params.periodoId);
    if (params.tipoComprobante) filtrados = filtrados.filter(v => v.tipoComprobante === params.tipoComprobante);
    if (params.clienteId) filtrados = filtrados.filter(v => v.clienteId === params.clienteId);
    if (params.estado) filtrados = filtrados.filter(v => v.estado === params.estado);
    if (params.fechaDesde) filtrados = filtrados.filter(v => v.fechaEmision >= params.fechaDesde!);
    if (params.fechaHasta) filtrados = filtrados.filter(v => v.fechaEmision <= params.fechaHasta!);
    if (params.search) {
      const q = params.search.toLowerCase();
      filtrados = filtrados.filter(v => 
        (v.clienteNombre && v.clienteNombre.toLowerCase().includes(q)) ||
        (v.clienteRuc && v.clienteRuc.includes(q)) ||
        v.serie.toLowerCase().includes(q) ||
        v.numero.includes(q)
      );
    }

    const total = filtrados.length;
    const paginados = filtrados.slice(offset, offset + limit);

    return {
      items: paginados,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async obtenerRegistroVentas(empresaId: string, periodoId: string) {
    const listado = await this.listar(empresaId, { periodoId, limit: 1000 });
    const comprobantes = listado.items.filter(v => v.estado === 'REGISTRADO');

    let totalBaseGravada = 0;
    let totalIgv = 0;
    let totalExonerado = 0;
    let totalInafecto = 0;
    let totalOtros = 0;
    let totalGeneral = 0;

    comprobantes.forEach(v => {
      totalBaseGravada = Money.toNumber(Money.add(totalBaseGravada, v.baseGravada || 0));
      totalIgv = Money.toNumber(Money.add(totalIgv, v.igv || 0));
      totalExonerado = Money.toNumber(Money.add(totalExonerado, v.exonerado || 0));
      totalInafecto = Money.toNumber(Money.add(totalInafecto, v.baseNoGravada || 0));
      totalOtros = Money.toNumber(Money.add(totalOtros, (v.isc || 0) + (v.icbper || 0) + (v.otrosTributos || 0)));
      totalGeneral = Money.toNumber(Money.add(totalGeneral, v.total || 0));
    });

    let totalDiarioVentas = 0; // Cuenta 70 al Haber
    let totalDiarioIgv = 0; // Cuenta 40111 al Haber
    if (db.isPostgresConnected()) {
      const res70 = await db.query(`
        SELECT COALESCE(SUM(ad.haber), 0) as total_haber
        FROM asiento_detalle ad
        JOIN asientos a ON a.id = ad.asiento_id
        JOIN plan_cuentas pc ON pc.id = ad.cuenta_id
        WHERE a.empresa_id = $1 AND a.periodo_id = $2 AND a.subdiario_id = '02'
          AND a.estado = 'CONTABILIZADO' AND pc.codigo LIKE '70%'
      `, [empresaId, periodoId]);
      totalDiarioVentas = parseFloat(res70.rows[0]?.total_haber || '0');

      const res40 = await db.query(`
        SELECT COALESCE(SUM(ad.haber), 0) as total_haber
        FROM asiento_detalle ad
        JOIN asientos a ON a.id = ad.asiento_id
        JOIN plan_cuentas pc ON pc.id = ad.cuenta_id
        WHERE a.empresa_id = $1 AND a.periodo_id = $2 AND a.subdiario_id = '02'
          AND a.estado = 'CONTABILIZADO' AND pc.codigo LIKE '40111%'
      `, [empresaId, periodoId]);
      totalDiarioIgv = parseFloat(res40.rows[0]?.total_haber || '0');
    } else {
      totalDiarioVentas = totalBaseGravada;
      totalDiarioIgv = totalIgv;
    }

    const difBase = Money.toNumber(Money.sub(totalBaseGravada, totalDiarioVentas).abs());
    const difIgv = Money.toNumber(Money.sub(totalIgv, totalDiarioIgv).abs());
    const estaCuadrado = difBase <= 0.05 && difIgv <= 0.05;

    return {
      periodoId,
      empresaId,
      totales: {
        totalBaseGravada,
        totalIgv,
        totalExonerado,
        totalInafecto,
        totalOtros,
        totalGeneral
      },
      cuadreLibroDiario: {
        totalVentasRegistro: totalBaseGravada,
        totalHaberCuenta70Diario: totalDiarioVentas,
        diferenciaBase: difBase,
        totalIgvRegistro: totalIgv,
        totalHaberCuenta40111Diario: totalDiarioIgv,
        diferenciaIgv: difIgv,
        estaCuadrado,
        mensaje: estaCuadrado
          ? 'El Registro de Ventas cuadra exactamente con las cuentas 70 y 40111 del Libro Diario.'
          : `Discrepancia detectada en ventas o débito fiscal contra el Libro Diario.`
      },
      comprobantes
    };
  },

  async importarLote(empresaId: string, data: {
    formato: 'CSV';
    modo: 'TODO_O_NADA' | 'PARCIAL';
    filas: Array<{
      periodoId: string;
      fechaEmision: string;
      fechaVencimiento?: string;
      tipoComprobante: string;
      serie: string;
      numero: string;
      clienteRuc: string;
      clienteRazonSocial?: string;
      baseGravada: number;
      igv: number;
      total: number;
      tipoOperacion?: string;
      formaPago?: 'CONTADO' | 'CREDITO';
      tieneDetraccion?: boolean;
    }>;
  }, userId: string) {
    const modo = data.modo || 'TODO_O_NADA';
    const errores: Array<{ fila: number; campo: string; codigo: string; mensaje: string }> = [];
    const validadosParaRegistrar: any[] = [];

    for (let i = 0; i < data.filas.length; i++) {
      const f = data.filas[i];
      const nroFila = i + 1;

      if (!f.serie || !f.numero) {
        errores.push({ fila: nroFila, campo: 'serie/numero', codigo: 'CAMPO_FALTANTE', mensaje: 'Serie y número son obligatorios.' });
        continue;
      }
      if (!f.clienteRuc) {
        errores.push({ fila: nroFila, campo: 'clienteRuc', codigo: 'CLIENTE_FALTANTE', mensaje: 'El RUC del cliente es obligatorio.' });
        continue;
      }

      const base = Money.create(f.baseGravada || 0);
      const igv = Money.create(f.igv || 0);
      const total = Money.create(f.total || 0);
      if (!Money.isEqual(total, Money.add(base, igv))) {
        errores.push({
          fila: nroFila,
          campo: 'total',
          codigo: 'SUMA_INCOHERENTE',
          mensaje: `La suma de Base (S/ ${base}) + IGV (S/ ${igv}) no coincide con el Total (S/ ${total}).`
        });
        continue;
      }

      let anexo = await anexoService.obtenerPorDocumento(empresaId, f.clienteRuc);
      if (!anexo) {
        anexo = await anexoService.crear(empresaId, {
          tipoDocumento: '6',
          numeroDocumento: f.clienteRuc,
          razonSocial: f.clienteRazonSocial || `CLIENTE RUC ${f.clienteRuc}`,
          tipoEntidad: 'CLIENTE'
        });
      }

      try {
        await this.verificarDuplicado(empresaId, f.tipoComprobante, f.serie, f.numero);
      } catch (err: any) {
        errores.push({ fila: nroFila, campo: 'documento', codigo: 'COMPROBANTE_DUPLICADO', mensaje: err.message });
        continue;
      }

      validadosParaRegistrar.push({
        periodoId: f.periodoId,
        fechaEmision: f.fechaEmision,
        fechaVencimiento: f.fechaVencimiento || f.fechaEmision,
        fechaContable: f.fechaEmision,
        tipoComprobante: f.tipoComprobante,
        serie: f.serie,
        numero: f.numero,
        clienteId: anexo.id,
        moneda: 'PEN' as const,
        tipoCambio: 1.0,
        baseGravada: f.baseGravada,
        igv: f.igv,
        total: f.total,
        tipoOperacion: f.tipoOperacion || 'VENTA_INTERNA',
        formaPago: f.formaPago || 'CONTADO',
        tieneDetraccion: !!f.tieneDetraccion
      });
    }

    if (modo === 'TODO_O_NADA' && errores.length > 0) {
      return {
        success: false,
        modo,
        totalFilas: data.filas.length,
        procesados: 0,
        importados: 0,
        errores
      };
    }

    const registrados: VentaModel[] = [];
    for (const v of validadosParaRegistrar) {
      const reg = await this.registrar(empresaId, v, userId);
      registrados.push(reg);
    }

    return {
      success: true,
      modo,
      totalFilas: data.filas.length,
      procesados: validadosParaRegistrar.length,
      importados: registrados.length,
      errores
    };
  }
};
