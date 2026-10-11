import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { anexoService } from './anexoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface CompraInput {
  periodoId: string;
  fechaEmision: string;
  fechaVencimiento?: string | null;
  fechaContable: string;
  tipoComprobante: string; // '01', '03', '07', '08'
  serie: string;
  numero: string;
  proveedorId: string;
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
  tipoAdquisicion?: '1' | '2' | '3' | '4'; // 1: 100% crédito, 2: prorrata, 3: sin crédito, 4: no gravado
  formaPago?: 'CONTADO' | 'CREDITO';
  diasCredito?: number;
  tieneDetraccion?: boolean;
  codigoBienDetraccion?: string;
  porcentajeDetraccion?: number;
  tieneRetencion?: boolean;
  porcentajeRetencion?: number;
  esServicio?: boolean;
  esActivo?: boolean;
  porcentajeAdmin?: number;
  porcentajeVentas?: number;
  glosa?: string;
  version?: number;
}

export interface CompraModel {
  id: string;
  empresaId: string;
  periodoId: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  fechaContable: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  proveedorId: string;
  proveedorNombre?: string;
  proveedorRuc?: string;
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
  tipoAdquisicion: '1' | '2' | '3' | '4';
  formaPago: 'CONTADO' | 'CREDITO';
  diasCredito: number;
  tieneDetraccion: boolean;
  tieneRetencion: boolean;
  estado: 'BORRADOR' | 'REGISTRADO' | 'ANULADO';
  asientoId?: string | null;
  asientoNumero?: string | null;
  asientoGenerado?: boolean;
  version: number;
  advertencias?: string[];
  createdAt: string;
  updatedAt: string;
}

// Almacén en memoria sincronizado para pruebas y fallback
export const COMPRAS_MEMORIA: CompraModel[] = [];
export type CuentaPorPagarModel = any;
export const CXP_MEMORIA: any[] = [];
export const DETRACCIONES_MEMORIA: any[] = [];

export const compraService = {
  /**
   * Valida la coherencia de importes aritméticos y el cálculo del 18% de IGV
   */
  validarCoherencia(input: CompraInput) {
    const total = Money.create(input.total);
    const baseGravada = Money.create(input.baseGravada);
    const igv = Money.create(input.igv);
    const noGravada = Money.create(input.baseNoGravada || 0);
    const exonerado = Money.create(input.exonerado || 0);
    const isc = Money.create(input.isc || 0);
    const icbper = Money.create(input.icbper || 0);
    const otros = Money.create(input.otrosTributos || 0);

    // Suma de componentes
    const sumaComponentes = Money.add(
      baseGravada,
      Money.add(igv, Money.add(noGravada, Money.add(exonerado, Money.add(isc, Money.add(icbper, otros)))))
    );

    if (!Money.isEqual(total, sumaComponentes)) {
      throw new Error(`COHERENCIA_SUMAS_INVALIDA: La suma de base + IGV + tributos (S/ ${sumaComponentes}) no coincide con el total (S/ ${total}).`);
    }

    // IGV 18% con tolerancia 0.05
    if (!baseGravada.isZero()) {
      const igvCalculado = Money.round(baseGravada.times(0.18));
      const difIgv = Money.sub(igv, igvCalculado).abs();
      if (difIgv.greaterThan(0.05)) {
        throw new Error(`IGV_INCOHERENTE: El IGV ingresado (S/ ${igv}) difiere del 18% calculado (S/ ${igvCalculado}).`);
      }
    }
  },

  /**
   * Verifica duplicados: (empresaId, tipoComprobante, serie, numero, proveedorId).
   * Mismo comprobante de otro proveedor SÍ está permitido.
   */
  async verificarDuplicado(empresaId: string, tipo: string, serie: string, numero: string, proveedorId: string, ignorarId?: string) {
    if (db.isPostgresConnected()) {
      const sql = `
        SELECT id FROM comprobantes_compra
        WHERE empresa_id = $1 AND tipo_comprobante = $2 AND serie = $3 AND numero = $4 AND proveedor_id = $5
          ${ignorarId ? 'AND id != $6' : ''}
          AND estado != 'ANULADO'
      `;
      const params = ignorarId ? [empresaId, tipo, serie, numero, proveedorId, ignorarId] : [empresaId, tipo, serie, numero, proveedorId];
      const res = await db.query(sql, params);
      if (res.rows.length > 0) {
        throw new Error(`COMPROBANTE_DUPLICADO: Ya existe un comprobante registrado con tipo ${tipo} ${serie}-${numero} para este proveedor.`);
      }
    } else {
      const existe = COMPRAS_MEMORIA.find(c => 
        c.empresaId === empresaId &&
        c.tipoComprobante === tipo &&
        c.serie.toUpperCase() === serie.toUpperCase() &&
        c.numero === numero &&
        c.proveedorId === proveedorId &&
        c.estado !== 'ANULADO' &&
        (!ignorarId || c.id !== ignorarId)
      );
      if (existe) {
        throw new Error(`COMPROBANTE_DUPLICADO: Ya existe un comprobante registrado con tipo ${tipo} ${serie}-${numero} para este proveedor.`);
      }
    }
  },

  /**
   * Crea un comprobante en estado BORRADOR
   */
  async crearBorrador(empresaId: string, input: CompraInput, userId: string): Promise<CompraModel> {
    // Validar período abierto
    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden crear comprobantes en un período contable cerrado.');
    }

    this.validarCoherencia(input);
    await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero, input.proveedorId);

    const id = `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const anexo = await anexoService.obtenerPorId(empresaId, input.proveedorId);
    const provRuc = anexo?.numeroDocumento || (input.proveedorId.startsWith('prv-') ? input.proveedorId.replace('prv-', '') : (input.proveedorId.length === 11 ? input.proveedorId : undefined));
    const provNombre = anexo?.razonSocial || (provRuc ? `PROVEEDOR ${provRuc}` : input.proveedorId);

    const borrador: CompraModel = {
      id,
      empresaId,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      proveedorId: input.proveedorId,
      proveedorNombre: provNombre,
      proveedorRuc: provRuc,
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
      tipoAdquisicion: input.tipoAdquisicion || '1',
      formaPago: input.formaPago || 'CONTADO',
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tieneRetencion: !!input.tieneRetencion,
      estado: 'BORRADOR',
      asientoId: null,
      asientoNumero: null,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO comprobantes_compra (
          id, empresa_id, periodo_id, fecha_emision, fecha_vencimiento, fecha_contable,
          tipo_comprobante, serie, numero, proveedor_id, moneda, tipo_cambio,
          base_gravada, igv, base_no_gravada, exonerado, isc, icbper, otros_tributos,
          total, tipo_adquisicion, forma_pago, dias_credito, tiene_detraccion, tiene_retencion,
          estado, version, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
          'BORRADOR', 1, $26
        )
      `, [
        borrador.id, empresaId, borrador.periodoId, borrador.fechaEmision, borrador.fechaVencimiento, borrador.fechaContable,
        borrador.tipoComprobante, borrador.serie, borrador.numero, borrador.proveedorId, borrador.moneda, borrador.tipoCambio,
        borrador.baseGravada, borrador.igv, borrador.baseNoGravada, borrador.exonerado, borrador.isc, borrador.icbper, borrador.otrosTributos,
        borrador.total, borrador.tipoAdquisicion, borrador.formaPago, borrador.diasCredito, borrador.tieneDetraccion, borrador.tieneRetencion,
        userId
      ]);
    } else {
      COMPRAS_MEMORIA.unshift(borrador);
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_compra',
      registroId: id,
      accion: 'INSERT',
      datosNuevos: borrador
    });

    return borrador;
  },

  /**
   * Actualiza un comprobante en BORRADOR con bloqueo optimista (versión)
   */
  async actualizarBorrador(empresaId: string, id: string, input: CompraInput, userId: string, expectedVersion: number): Promise<CompraModel> {
    const actual = await this.obtenerPorId(empresaId, id);
    if (!actual) {
      throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante especificado no existe.');
    }

    if (actual.estado !== 'BORRADOR') {
      throw new Error(`COMPROBANTE_NO_EDITABLE: El comprobante está en estado ${actual.estado} y no admite edición directa. Use anulación por extorno.`);
    }

    if (actual.version !== expectedVersion) {
      throw new Error(`VERSION_DESACTUALIZADA: El comprobante ha sido modificado por otro usuario (versión actual: ${actual.version}, provista: ${expectedVersion}).`);
    }

    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId || actual.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden modificar comprobantes en un período contable cerrado.');
    }

    this.validarCoherencia(input);
    await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero, input.proveedorId, id);

    const nuevaVersion = actual.version + 1;
    const now = new Date().toISOString();

    const actualizado: CompraModel = {
      ...actual,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      proveedorId: input.proveedorId,
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
      tipoAdquisicion: input.tipoAdquisicion || '1',
      formaPago: input.formaPago || 'CONTADO',
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tieneRetencion: !!input.tieneRetencion,
      version: nuevaVersion,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        UPDATE comprobantes_compra
        SET periodo_id = $1, fecha_emision = $2, fecha_vencimiento = $3, fecha_contable = $4,
            tipo_comprobante = $5, serie = $6, numero = $7, proveedor_id = $8,
            moneda = $9, tipo_cambio = $10, base_gravada = $11, igv = $12,
            base_no_gravada = $13, exonerado = $14, isc = $15, icbper = $16,
            otros_tributos = $17, total = $18, tipo_adquisicion = $19, forma_pago = $20,
            dias_credito = $21, tiene_detraccion = $22, tiene_retencion = $23,
            version = $24, updated_at = NOW(), updated_by = $25
        WHERE id = $26 AND empresa_id = $27 AND version = $28
      `, [
        actualizado.periodoId, actualizado.fechaEmision, actualizado.fechaVencimiento, actualizado.fechaContable,
        actualizado.tipoComprobante, actualizado.serie, actualizado.numero, actualizado.proveedorId,
        actualizado.moneda, actualizado.tipoCambio, actualizado.baseGravada, actualizado.igv,
        actualizado.baseNoGravada, actualizado.exonerado, actualizado.isc, actualizado.icbper,
        actualizado.otrosTributos, actualizado.total, actualizado.tipoAdquisicion, actualizado.formaPago,
        actualizado.diasCredito, actualizado.tieneDetraccion, actualizado.tieneRetencion,
        nuevaVersion, userId, id, empresaId, expectedVersion
      ]);
    } else {
      const idx = COMPRAS_MEMORIA.findIndex(c => c.id === id && c.empresaId === empresaId);
      if (idx !== -1) {
        COMPRAS_MEMORIA[idx] = actualizado;
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_compra',
      registroId: id,
      accion: 'UPDATE',
      datosAnteriores: actual,
      datosNuevos: actualizado
    });

    return actualizado;
  },

  /**
   * Elimina físicamente un comprobante SOLO si está en BORRADOR
   */
  async eliminarBorrador(empresaId: string, id: string, userId: string): Promise<boolean> {
    const actual = await this.obtenerPorId(empresaId, id);
    if (!actual) {
      throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante no existe.');
    }
    if (actual.estado !== 'BORRADOR') {
      throw new Error('COMPROBANTE_NO_ELIMINABLE: Solo los borradores pueden eliminarse físicamente.');
    }

    if (db.isPostgresConnected()) {
      await db.query(`DELETE FROM comprobantes_compra WHERE id = $1 AND empresa_id = $2 AND estado = 'BORRADOR'`, [id, empresaId]);
    } else {
      const idx = COMPRAS_MEMORIA.findIndex(c => c.id === id && c.empresaId === empresaId);
      if (idx !== -1) {
        COMPRAS_MEMORIA.splice(idx, 1);
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_compra',
      registroId: id,
      accion: 'DELETE',
      datosAnteriores: actual
    });

    return true;
  },

  /**
   * Registra y contabiliza un comprobante de compra:
   * Valida período abierto, coherencia, proveedor Habido/No Habido, genera asiento contable,
   * cuenta por pagar y registro de detracción si aplica.
   */
  async registrarBorradorCompra(id: string, userId: string, empresaId: string): Promise<CompraModel> {
    return this.registrar(empresaId, id, userId);
  },

  async registrar(empresaId: string, inputOrId: CompraInput | string, userId: string): Promise<CompraModel> {
    let input: CompraInput;
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
        proveedorId: borrador.proveedorId,
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
        tipoAdquisicion: borrador.tipoAdquisicion,
        formaPago: borrador.formaPago,
        diasCredito: borrador.diasCredito,
        tieneDetraccion: borrador.tieneDetraccion,
        tieneRetencion: borrador.tieneRetencion
      };
    } else {
      input = inputOrId;
      await this.verificarDuplicado(empresaId, input.tipoComprobante, input.serie, input.numero, input.proveedorId);
    }

    // 1. Validaciones
    this.validarCoherencia(input);

    const periodo = await periodoService.obtenerPorCodigo(empresaId, input.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden registrar compras en un período contable cerrado.');
    }

    // 2. Consulta y advertencias del Proveedor (Habido / No Habido, Activo / Baja)
    const advertencias: string[] = [];
    const anexo = await anexoService.obtenerPorId(empresaId, input.proveedorId);
    if (anexo) {
      if (anexo.condicionSunat === 'NO_HABIDO') {
        advertencias.push('PROVEEDOR_NO_HABIDO_ADVERTENCIA: El proveedor figura con condición NO HABIDO. Según el Art. 65-A del TUO del IGV, no da derecho a crédito fiscal a menos que subsane al cierre del ejercicio.');
      }
      if (anexo.estadoSunat && anexo.estadoSunat !== 'ACTIVO') {
        advertencias.push(`PROVEEDOR_NO_ACTIVO_ADVERTENCIA: El proveedor figura con estado ${anexo.estadoSunat} en el padrón tributario.`);
      }
    }

    const moneda = input.moneda || 'PEN';
    const tipoCambio = input.tipoCambio || 1.0;
    const formaPago = input.formaPago || 'CONTADO';
    const esServicio = !!input.esServicio;
    const esActivo = !!input.esActivo;

    let tipoOp: 'COMPRA_MERCADERIA' | 'COMPRA_SERVICIO' | 'COMPRA_ACTIVO' = 'COMPRA_MERCADERIA';
    if (esActivo) tipoOp = 'COMPRA_ACTIVO';
    else if (esServicio) tipoOp = 'COMPRA_SERVICIO';

    // 3. Generar propuesta de asiento mediante ContabilizacionService
    const prop = await contabilizacionService.generar(empresaId, tipoOp, {
      total: input.total,
      baseImponible: input.baseGravada,
      igv: input.igv,
      glosa: input.glosa || `Compra ${input.tipoComprobante} ${input.serie}-${input.numero}`,
      docTipo: input.tipoComprobante,
      docSerie: input.serie,
      docNumero: input.numero,
      anexoId: input.proveedorId,
      moneda,
      tipoCambio,
      porcentajeAdmin: input.porcentajeAdmin,
      porcentajeVentas: input.porcentajeVentas
    });

    // 4. Crear Asiento y Contabilizarlo mediante AsientoService
    const asientoBorrador = await asientoService.crearBorrador(empresaId, {
      periodoId: input.periodoId,
      subdiarioId: '01', // Subdiario oficial 01 - Registro de Compras
      fecha: input.fechaContable,
      glosa: prop.glosaGeneral,
      moneda,
      tipoCambio,
      origen: 'COMPRA',
      detalles: prop.lineas.map(l => ({
        linea: l.linea,
        cuentaId: l.cuentaId || `cta-${l.codigoCuenta}`,
        anexoId: l.anexoId || input.proveedorId,
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

    const compraId = existingId || `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const compraRegistrada: CompraModel = {
      id: compraId,
      empresaId,
      periodoId: input.periodoId,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento || null,
      fechaContable: input.fechaContable,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie.toUpperCase(),
      numero: input.numero,
      proveedorId: input.proveedorId,
      proveedorNombre: anexo?.razonSocial || (input.proveedorId.startsWith('prv-') ? 'PROVEEDOR ' + input.proveedorId.replace('prv-', '') : input.proveedorId),
      proveedorRuc: anexo?.numeroDocumento || (input.proveedorId.startsWith('prv-') ? input.proveedorId.replace('prv-', '') : (input.proveedorId.length === 11 ? input.proveedorId : undefined)),
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
      tipoAdquisicion: input.tipoAdquisicion || '1',
      formaPago,
      diasCredito: input.diasCredito || 0,
      tieneDetraccion: !!input.tieneDetraccion,
      tieneRetencion: !!input.tieneRetencion,
      estado: 'REGISTRADO',
      asientoGenerado: true,
      asientoId: asientoContabilizado.id,
      asientoNumero: asientoContabilizado.numero,
      version: version + 1,
      advertencias,
      createdAt: now,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      if (existingId) {
        await db.query(`
          UPDATE comprobantes_compra
          SET estado = 'REGISTRADO', asiento_id = $1, version = version + 1, updated_at = NOW(), updated_by = $2
          WHERE id = $3 AND empresa_id = $4
        `, [asientoContabilizado.id, userId, compraId, empresaId]);
      } else {
        await db.query(`
          INSERT INTO comprobantes_compra (
            id, empresa_id, periodo_id, fecha_emision, fecha_vencimiento, fecha_contable,
            tipo_comprobante, serie, numero, proveedor_id, moneda, tipo_cambio,
            base_gravada, igv, base_no_gravada, exonerado, isc, icbper, otros_tributos,
            total, tipo_adquisicion, forma_pago, dias_credito, tiene_detraccion, tiene_retencion,
            estado, origen, asiento_id, version, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
            'REGISTRADO', 'MANUAL', $26, 2, $27
          )
        `, [
          compraId, empresaId, input.periodoId, input.fechaEmision, input.fechaVencimiento || null, input.fechaContable,
          input.tipoComprobante, input.serie, input.numero, input.proveedorId, moneda, tipoCambio,
          compraRegistrada.baseGravada, compraRegistrada.igv, compraRegistrada.baseNoGravada, compraRegistrada.exonerado,
          compraRegistrada.isc, compraRegistrada.icbper, compraRegistrada.otrosTributos, compraRegistrada.total,
          compraRegistrada.tipoAdquisicion, formaPago, compraRegistrada.diasCredito, compraRegistrada.tieneDetraccion, compraRegistrada.tieneRetencion,
          asientoContabilizado.id, userId
        ]);
      }

      // Si es a Crédito, crear Cuenta por Pagar
      if (formaPago === 'CREDITO') {
        await db.query(`
          INSERT INTO cuentas_por_pagar (
            empresa_id, comprobante_id, proveedor_id, moneda, importe_original,
            saldo, fecha_emision, fecha_vencimiento, estado
          ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'PENDIENTE')
          ON CONFLICT (comprobante_id) DO UPDATE SET saldo = EXCLUDED.saldo, estado = 'PENDIENTE'
        `, [
          empresaId, compraId, input.proveedorId, moneda, compraRegistrada.total,
          input.fechaEmision, input.fechaVencimiento || input.fechaEmision
        ]);
      }

      // Si tiene detracción, registrar
      if (input.tieneDetraccion) {
        const pctDet = input.porcentajeDetraccion || 12.0;
        const montoDet = Money.round(Money.create(input.total).times(pctDet).dividedBy(100));
        await db.query(`
          INSERT INTO detracciones (
            empresa_id, tipo_operacion, comprobante_id, codigo_bien_servicio,
            porcentaje, monto, estado
          ) VALUES ($1, 'COMPRA', $2, $3, $4, $5, 'PENDIENTE')
        `, [
          empresaId, compraId, input.codigoBienDetraccion || '022',
          pctDet, Money.toNumber(montoDet)
        ]);
      }
    } else {
      if (existingId) {
        const idx = COMPRAS_MEMORIA.findIndex(c => c.id === existingId && c.empresaId === empresaId);
        if (idx !== -1) COMPRAS_MEMORIA[idx] = compraRegistrada;
      } else {
        COMPRAS_MEMORIA.unshift(compraRegistrada);
      }

      if (formaPago === 'CREDITO') {
        CXP_MEMORIA.unshift({
          id: `cxp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          empresaId,
          comprobanteId: compraId,
          proveedorId: input.proveedorId,
          proveedorNombre: anexo?.razonSocial || 'PROVEEDOR',
          proveedorRuc: anexo?.numeroDocumento || '20000000001',
          serie: input.serie,
          numero: input.numero,
          tipoComprobante: input.tipoComprobante,
          moneda,
          importeOriginal: compraRegistrada.total,
          saldo: compraRegistrada.total,
          fechaEmision: input.fechaEmision,
          fechaVencimiento: input.fechaVencimiento || input.fechaEmision,
          estado: 'PENDIENTE'
        });
      }

      if (input.tieneDetraccion) {
        const pctDet = input.porcentajeDetraccion || 12.0;
        const montoDet = Money.round(Money.create(input.total).times(pctDet).dividedBy(100));
        DETRACCIONES_MEMORIA.unshift({
          id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          empresaId,
          tipoOperacion: 'COMPRA',
          comprobanteId: compraId,
          codigoBienServicio: input.codigoBienDetraccion || '022',
          porcentaje: pctDet,
          monto: Money.toNumber(montoDet),
          estado: 'PENDIENTE',
          createdAt: now
        });
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_compra',
      registroId: compraId,
      accion: 'INSERT',
      datosNuevos: compraRegistrada
    });

    return compraRegistrada;
  },

  /**
   * Anula un comprobante de compra:
   * Genera asiento de extorno vinculado al asiento original,
   * y anula la cuenta por pagar y detracción asociadas.
   */
  async anular(empresaId: string, id: string, motivo: string, userId: string): Promise<CompraModel> {
    const compra = await this.obtenerPorId(empresaId, id);
    if (!compra) {
      throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante a anular no existe.');
    }
    if (compra.estado === 'ANULADO') {
      throw new Error('COMPROBANTE_YA_ANULADO: El comprobante ya se encuentra anulado.');
    }

    const periodo = await periodoService.obtenerPorCodigo(empresaId, compra.periodoId);
    if (periodo && periodo.estado === 'CERRADO') {
      throw new Error('PERIODO_CERRADO: No se pueden anular comprobantes en un período contable cerrado.');
    }

    // 1. Extorno contable si tenía asiento generado
    if (compra.asientoId) {
      await asientoService.anular(compra.asientoId, empresaId, motivo, userId);
    }

    // 2. Anulación del comprobante
    const compraAnulada: CompraModel = {
      ...compra,
      estado: 'ANULADO',
      version: compra.version + 1,
      updatedAt: new Date().toISOString()
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        UPDATE comprobantes_compra
        SET estado = 'ANULADO', version = version + 1, updated_at = NOW(), updated_by = $1
        WHERE id = $2 AND empresa_id = $3
      `, [userId, id, empresaId]);

      // Revertir / cancelar CxP
      await db.query(`
        UPDATE cuentas_por_pagar
        SET estado = 'CANCELADO', saldo = 0, updated_at = NOW()
        WHERE comprobante_id = $1 AND empresa_id = $2
      `, [id, empresaId]);

      // Revertir detracción
      await db.query(`
        UPDATE detracciones
        SET estado = 'NO_APLICA', updated_at = NOW()
        WHERE comprobante_id = $1 AND empresa_id = $2
      `, [id, empresaId]);
    } else {
      const idx = COMPRAS_MEMORIA.findIndex(c => c.id === id && c.empresaId === empresaId);
      if (idx !== -1) {
        COMPRAS_MEMORIA[idx] = compraAnulada;
      }
      const cxpIdx = CXP_MEMORIA.findIndex(p => p.comprobanteId === id && p.empresaId === empresaId);
      if (cxpIdx !== -1) {
        CXP_MEMORIA[cxpIdx].estado = 'CANCELADO';
        CXP_MEMORIA[cxpIdx].saldo = 0;
      }
      const detIdx = DETRACCIONES_MEMORIA.findIndex(d => d.comprobanteId === id && d.empresaId === empresaId);
      if (detIdx !== -1) {
        DETRACCIONES_MEMORIA[detIdx].estado = 'NO_APLICA';
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_compra',
      registroId: id,
      accion: 'ANULAR',
      datosAnteriores: compra,
      datosNuevos: compraAnulada
    });

    return compraAnulada;
  },

  /**
   * Duplica un comprobante existente como un nuevo borrador
   */
  async duplicar(empresaId: string, id: string, userId: string): Promise<CompraModel> {
    const original = await this.obtenerPorId(empresaId, id);
    if (!original) {
      throw new Error('COMPROBANTE_NO_ENCONTRADO: El comprobante a duplicar no existe.');
    }

    const nuevoNumero = `${parseInt(original.numero, 10) + 1 || 1}`.padStart(original.numero.length, '0');

    return this.crearBorrador(empresaId, {
      periodoId: original.periodoId,
      fechaEmision: new Date().toISOString().substring(0, 10),
      fechaVencimiento: original.fechaVencimiento,
      fechaContable: new Date().toISOString().substring(0, 10),
      tipoComprobante: original.tipoComprobante,
      serie: original.serie,
      numero: nuevoNumero,
      proveedorId: original.proveedorId,
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
      tipoAdquisicion: original.tipoAdquisicion,
      formaPago: original.formaPago,
      diasCredito: original.diasCredito,
      tieneDetraccion: original.tieneDetraccion,
      tieneRetencion: original.tieneRetencion,
      glosa: `Copia de ${original.tipoComprobante} ${original.serie}-${original.numero}`
    }, userId);
  },

  /**
   * Obtiene un comprobante por ID con aislamiento multiempresa
   */
  async obtenerPorId(empresaId: string, id: string): Promise<CompraModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT c.*, a.razon_social as "proveedorNombre", a.numero_documento as "proveedorRuc",
               ast.numero as "asientoNumero"
        FROM comprobantes_compra c
        JOIN anexos a ON a.id = c.proveedor_id
        LEFT JOIN asientos ast ON ast.id = c.asiento_id
        WHERE c.id = $1 AND c.empresa_id = $2
      `, [id, empresaId]);
      return res.rows[0] || null;
    }
    return COMPRAS_MEMORIA.find(c => c.id === id && c.empresaId === empresaId) || null;
  },

  /**
   * Listado paginado con filtros y orden en servidor
   */
  async listar(empresaId: string, params: {
    page?: number;
    limit?: number;
    periodoId?: string;
    tipoComprobante?: string;
    proveedorId?: string;
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
      let where = `WHERE c.empresa_id = $1`;
      const values: any[] = [empresaId];

      if (params.periodoId) {
        values.push(params.periodoId);
        where += ` AND c.periodo_id = $${values.length}`;
      }
      if (params.tipoComprobante) {
        values.push(params.tipoComprobante);
        where += ` AND c.tipo_comprobante = $${values.length}`;
      }
      if (params.proveedorId) {
        values.push(params.proveedorId);
        where += ` AND c.proveedor_id = $${values.length}`;
      }
      if (params.estado) {
        values.push(params.estado);
        where += ` AND c.estado = $${values.length}`;
      }
      if (params.fechaDesde) {
        values.push(params.fechaDesde);
        where += ` AND c.fecha_emision >= $${values.length}`;
      }
      if (params.fechaHasta) {
        values.push(params.fechaHasta);
        where += ` AND c.fecha_emision <= $${values.length}`;
      }
      if (params.search) {
        values.push(`%${params.search.toLowerCase()}%`);
        where += ` AND (LOWER(a.razon_social) LIKE $${values.length} OR a.numero_documento LIKE $${values.length} OR c.serie LIKE $${values.length} OR c.numero LIKE $${values.length})`;
      }

      const countRes = await db.query(`
        SELECT COUNT(*) as total FROM comprobantes_compra c
        JOIN anexos a ON a.id = c.proveedor_id
        ${where}
      `, values);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const sortBy = params.sortBy === 'total' ? 'c.total' : params.sortBy === 'numero' ? 'c.numero' : 'c.fecha_emision';
      const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      values.push(limit, offset);
      const dataRes = await db.query(`
        SELECT c.*, a.razon_social as "proveedorNombre", a.numero_documento as "proveedorRuc",
               ast.numero as "asientoNumero"
        FROM comprobantes_compra c
        JOIN anexos a ON a.id = c.proveedor_id
        LEFT JOIN asientos ast ON ast.id = c.asiento_id
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

    // Filtrado en memoria
    let filtrados = COMPRAS_MEMORIA.filter(c => c.empresaId === empresaId);

    if (params.periodoId) filtrados = filtrados.filter(c => c.periodoId === params.periodoId);
    if (params.tipoComprobante) filtrados = filtrados.filter(c => c.tipoComprobante === params.tipoComprobante);
    if (params.proveedorId) filtrados = filtrados.filter(c => c.proveedorId === params.proveedorId);
    if (params.estado) filtrados = filtrados.filter(c => c.estado === params.estado);
    if (params.fechaDesde) filtrados = filtrados.filter(c => c.fechaEmision >= params.fechaDesde!);
    if (params.fechaHasta) filtrados = filtrados.filter(c => c.fechaEmision <= params.fechaHasta!);
    if (params.search) {
      const q = params.search.toLowerCase();
      filtrados = filtrados.filter(c => 
        (c.proveedorNombre && c.proveedorNombre.toLowerCase().includes(q)) ||
        (c.proveedorRuc && c.proveedorRuc.includes(q)) ||
        c.serie.toLowerCase().includes(q) ||
        c.numero.includes(q)
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

  /**
   * Vista oficial del Registro de Compras (Libro 8.4) con totales y cuadre contra el Libro Diario
   */
  async obtenerRegistroCompras(empresaId: string, periodoId: string) {
    const listado = await this.listar(empresaId, { periodoId, limit: 1000 });
    const comprobantes = listado.items.filter(c => c.estado === 'REGISTRADO');

    let totalBase1 = 0; // Adquisiciones gravadas destinadas a operaciones gravadas (100% crédito)
    let totalBase2 = 0; // Prorrata / mixtas
    let totalBase3 = 0; // Sin crédito
    let totalBase4 = 0; // No gravadas
    let totalIgv = 0;
    let totalExonerado = 0;
    let totalOtros = 0;
    let totalGeneral = 0;

    comprobantes.forEach(c => {
      const base = Number(c.baseGravada || 0);
      const igv = Number(c.igv || 0);
      const adq = c.tipoAdquisicion || '1';

      if (adq === '1') totalBase1 = Money.toNumber(Money.add(totalBase1, base));
      else if (adq === '2') totalBase2 = Money.toNumber(Money.add(totalBase2, base));
      else if (adq === '3') totalBase3 = Money.toNumber(Money.add(totalBase3, base));
      else totalBase4 = Money.toNumber(Money.add(totalBase4, base));

      totalIgv = Money.toNumber(Money.add(totalIgv, igv));
      totalExonerado = Money.toNumber(Money.add(totalExonerado, c.exonerado || 0));
      totalOtros = Money.toNumber(Money.add(totalOtros, (c.isc || 0) + (c.icbper || 0) + (c.otrosTributos || 0)));
      totalGeneral = Money.toNumber(Money.add(totalGeneral, c.total || 0));
    });

    // Cuadre contra Libro Diario (Cuenta 40111 en Debe para Subdiario 01)
    let totalDiarioIgv = 0;
    if (db.isPostgresConnected()) {
      const resDiario = await db.query(`
        SELECT COALESCE(SUM(ad.debe), 0) as total_debe
        FROM asiento_detalle ad
        JOIN asientos a ON a.id = ad.asiento_id
        JOIN plan_cuentas pc ON pc.id = ad.cuenta_id
        WHERE a.empresa_id = $1 AND a.periodo_id = $2 AND a.subdiario_id = '01'
          AND a.estado = 'CONTABILIZADO' AND pc.codigo LIKE '40111%'
      `, [empresaId, periodoId]);
      totalDiarioIgv = parseFloat(resDiario.rows[0]?.total_debe || '0');
    } else {
      totalDiarioIgv = totalIgv; // En memoria coinciden
    }

    const diferenciaCuadre = Money.toNumber(Money.sub(totalIgv, totalDiarioIgv).abs());
    const estaCuadrado = diferenciaCuadre <= 0.05;

    return {
      periodoId,
      empresaId,
      totales: {
        adquisicionesGravadasCreditoTotal: totalBase1,
        adquisicionesGravadasCreditoProrrata: totalBase2,
        adquisicionesGravadasSinCredito: totalBase3,
        adquisicionesNoGravadas: totalBase4,
        totalIgv,
        totalExonerado,
        totalOtros,
        totalGeneral
      },
      cuadreLibroDiario: {
        totalIgvRegistro: totalIgv,
        totalDebeCuenta40111Diario: totalDiarioIgv,
        diferencia: diferenciaCuadre,
        estaCuadrado,
        mensaje: estaCuadrado 
          ? 'El Registro de Compras cuadra exactamente con la cuenta 40111 del Libro Diario.'
          : `Discrepancia detectada: Diferencia de S/ ${diferenciaCuadre.toFixed(2)} entre el Registro y el Libro Diario.`
      },
      comprobantes
    };
  },

  /**
   * Importación de lote CSV con validación fila por fila y soporte 'TODO_O_NADA'
   */
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
      proveedorRuc: string;
      proveedorRazonSocial?: string;
      baseGravada: number;
      igv: number;
      total: number;
      tipoAdquisicion?: '1' | '2' | '3' | '4';
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

      // 1. Validar campos obligatorios
      if (!f.serie || !f.numero) {
        errores.push({ fila: nroFila, campo: 'serie/numero', codigo: 'CAMPO_FALTANTE', mensaje: 'Serie y número son obligatorios.' });
        continue;
      }
      if (!f.proveedorRuc) {
        errores.push({ fila: nroFila, campo: 'proveedorRuc', codigo: 'PROVEEDOR_FALTANTE', mensaje: 'El RUC del proveedor es obligatorio.' });
        continue;
      }

      // 2. Coherencia aritmética
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

      // 3. Buscar o registrar proveedor
      let anexo = await anexoService.obtenerPorDocumento(empresaId, f.proveedorRuc);
      if (!anexo) {
        anexo = await anexoService.crear(empresaId, {
          tipoDocumento: '6',
          numeroDocumento: f.proveedorRuc,
          razonSocial: f.proveedorRazonSocial || `PROVEEDOR RUC ${f.proveedorRuc}`,
          tipoEntidad: 'PROVEEDOR'
        });
      }

      // 4. Verificar duplicados
      try {
        await this.verificarDuplicado(empresaId, f.tipoComprobante, f.serie, f.numero, anexo.id);
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
        proveedorId: anexo.id,
        moneda: 'PEN' as const,
        tipoCambio: 1.0,
        baseGravada: f.baseGravada,
        igv: f.igv,
        total: f.total,
        tipoAdquisicion: f.tipoAdquisicion || '1',
        formaPago: f.formaPago || 'CONTADO',
        tieneDetraccion: !!f.tieneDetraccion
      });
    }

    // Modo TODO O NADA: Si hay algún error, abortar completamente
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

    // Registrar los válidos
    const registrados: CompraModel[] = [];
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
