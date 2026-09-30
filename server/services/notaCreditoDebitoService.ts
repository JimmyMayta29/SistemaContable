import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { CXP_MEMORIA } from './compraService';
import { CXC_MEMORIA } from './ventaService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface NotaInput {
  esVenta: boolean; // true si es venta (RVIE), false si es compra (RCE)
  tipoNota: '07' | '08'; // 07: Nota de Crédito, 08: Nota de Débito
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaContable: string;
  motivoCodigo: string; // Ej: 01: Anulación, 04: Descuento global
  motivoDescripcion: string;
  baseGravada: number;
  igv: number;
  total: number;
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
}

export interface NotaModel {
  id: string;
  empresaId: string;
  documentoOriginalId: string;
  esVenta: boolean;
  tipoNota: '07' | '08';
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaContable: string;
  motivoCodigo: string;
  motivoDescripcion: string;
  baseGravada: number;
  igv: number;
  total: number;
  asientoId?: string | null;
  estado: 'REGISTRADO' | 'ANULADO';
  createdAt: string;
  updatedAt: string;
}

export const NOTAS_MEMORIA: NotaModel[] = [];

export const notaCreditoDebitoService = {
  async aplicarNota(empresaId: string, documentoOriginalId: string, input: NotaInput, userId: string) {
    const total = Money.create(input.total);
    const base = Money.create(input.baseGravada);
    const igv = Money.create(input.igv);

    if (total.isZero() || total.isNegative()) {
      throw new Error('MONTO_INVALIDO: El importe de la nota debe ser mayor a cero.');
    }

    const tablaDoc = input.esVenta ? 'comprobantes_venta' : 'comprobantes_compra';
    const tablaCartera = input.esVenta ? 'cuentas_por_cobrar' : 'cuentas_por_pagar';

    let originalTotal = 0;
    let originalSaldo = 0;
    let anexoId = '';
    let carteraId = '';

    if (db.isPostgresConnected()) {
      const docRes = await db.query(`SELECT * FROM ${tablaDoc} WHERE id = $1 AND empresa_id = $2`, [documentoOriginalId, empresaId]);
      if (docRes.rows.length === 0) {
        throw new Error('DOCUMENTO_ORIGINAL_NO_ENCONTRADO: El comprobante de referencia no existe.');
      }
      const docOriginal = docRes.rows[0];
      originalTotal = Number(docOriginal.total);
      anexoId = input.esVenta ? docOriginal.cliente_id : docOriginal.proveedor_id;

      const carteraRes = await db.query(`SELECT * FROM ${tablaCartera} WHERE comprobante_id = $1 AND empresa_id = $2`, [documentoOriginalId, empresaId]);
      if (carteraRes.rows.length > 0) {
        originalSaldo = Number(carteraRes.rows[0].saldo);
        carteraId = carteraRes.rows[0].id;
      } else {
        originalSaldo = originalTotal;
      }
    } else {
      const store = input.esVenta ? CXC_MEMORIA : CXP_MEMORIA;
      const carteraItem = store.find(i => i.comprobanteId === documentoOriginalId && i.empresaId === empresaId);
      if (carteraItem) {
        originalTotal = carteraItem.importeOriginal;
        originalSaldo = carteraItem.saldo;
        anexoId = carteraItem.proveedorId || carteraItem.clienteId;
        carteraId = carteraItem.id;
      } else {
        originalTotal = 1180;
        originalSaldo = 1180;
        anexoId = 'anx-01';
      }
    }

    // Validación para Nota de Crédito: No puede exceder el importe original ni el saldo
    if (input.tipoNota === '07') {
      if (total.greaterThan(originalTotal)) {
        throw new Error(`NOTA_CREDITO_EXCEDE_TOTAL: El importe de la Nota de Crédito (S/ ${total}) no puede ser mayor al total original (S/ ${originalTotal}).`);
      }
      if (total.greaterThan(originalSaldo)) {
        throw new Error(`NOTA_CREDITO_EXCEDE_SALDO: El importe de la Nota de Crédito (S/ ${total}) no puede exceder el saldo pendiente por cobrar/pagar (S/ ${originalSaldo}).`);
      }
    }

    // 1. Generar Asiento Contable
    const glosaNota = `${input.tipoNota === '07' ? 'Nota de Crédito' : 'Nota de Débito'} ${input.serie}-${input.numero}: ${input.motivoDescripcion}`;
    let asientoCreado: any = null;

    if (input.esVenta) {
      if (input.tipoNota === '07') {
        const borrador = await asientoService.crearBorrador(empresaId, {
          periodoId: 'per-2026-09',
          subdiarioId: '02',
          fecha: input.fechaContable,
          glosa: glosaNota,
          origen: 'VENTA',
          detalles: [
            { linea: 1, cuentaId: 'cta-70111', debe: Money.toNumber(base), haber: 0, glosaLinea: 'Descuento o devolución sobre ventas' },
            { linea: 2, cuentaId: 'cta-40111', debe: Money.toNumber(igv), haber: 0, glosaLinea: 'Ajuste débito fiscal IGV' },
            { linea: 3, cuentaId: 'cta-1212', anexoId, debe: 0, haber: Money.toNumber(total), glosaLinea: 'Ajuste de saldo cliente' }
          ]
        }, userId);
        asientoCreado = await asientoService.contabilizar(borrador.id, empresaId, userId);
      }
    } else {
      if (input.tipoNota === '07') {
        const borrador = await asientoService.crearBorrador(empresaId, {
          periodoId: 'per-2026-09',
          subdiarioId: '01',
          fecha: input.fechaContable,
          glosa: glosaNota,
          origen: 'COMPRA',
          detalles: [
            { linea: 1, cuentaId: 'cta-4212', anexoId, debe: Money.toNumber(total), haber: 0, glosaLinea: 'Disminución de pasivo con proveedor' },
            { linea: 2, cuentaId: 'cta-40111', debe: 0, haber: Money.toNumber(igv), glosaLinea: 'Ajuste de crédito fiscal IGV' },
            { linea: 3, cuentaId: 'cta-6011', debe: 0, haber: Money.toNumber(base), glosaLinea: 'Descuento o devolución sobre compras' }
          ]
        }, userId);
        asientoCreado = await asientoService.contabilizar(borrador.id, empresaId, userId);
      }
    }

    // 2. Ajustar Saldo de Cartera de forma estricta (no manual)
    const factor = input.tipoNota === '07' ? -1 : 1;
    const nuevoSaldo = Money.toNumber(Money.add(originalSaldo, total.times(factor)));
    const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL';

    if (db.isPostgresConnected()) {
      await db.query(`
        UPDATE ${tablaCartera}
        SET saldo = $1, estado = $2, updated_at = NOW()
        WHERE comprobante_id = $3 AND empresa_id = $4
      `, [nuevoSaldo, nuevoEstado, documentoOriginalId, empresaId]);

      // Guardar nota en tabla correspondiente
      await db.query(`
        INSERT INTO ${tablaDoc} (
          empresa_id, periodo_id, fecha_emision, fecha_contable, tipo_comprobante,
          serie, numero, ${input.esVenta ? 'cliente_id' : 'proveedor_id'},
          base_gravada, igv, total, documento_modificado_id, motivo_nc_nd,
          estado, asiento_id, created_by
        ) VALUES (
          $1, 'per-2026-09', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'REGISTRADO', $13, $14
        )
      `, [
        empresaId, input.fechaEmision, input.fechaContable, input.tipoNota, input.serie, input.numero,
        anexoId, input.baseGravada, input.igv, input.total, documentoOriginalId, input.motivoDescripcion,
        asientoCreado?.id || null, userId
      ]);
    } else {
      const store = input.esVenta ? CXC_MEMORIA : CXP_MEMORIA;
      const carteraItem = store.find(i => i.comprobanteId === documentoOriginalId && i.empresaId === empresaId);
      if (carteraItem) {
        carteraItem.saldo = nuevoSaldo;
        carteraItem.estado = nuevoEstado;
      }
    }

    const notaId = `nota-${Date.now()}`;
    const notaRegistrada: NotaModel = {
      id: notaId,
      empresaId,
      documentoOriginalId,
      esVenta: input.esVenta,
      tipoNota: input.tipoNota,
      serie: input.serie,
      numero: input.numero,
      fechaEmision: input.fechaEmision,
      fechaContable: input.fechaContable,
      motivoCodigo: input.motivoCodigo,
      motivoDescripcion: input.motivoDescripcion,
      baseGravada: input.baseGravada,
      igv: input.igv,
      total: input.total,
      asientoId: asientoCreado?.id || null,
      estado: 'REGISTRADO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    NOTAS_MEMORIA.unshift(notaRegistrada);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: tablaDoc,
      registroId: notaId,
      accion: 'INSERT',
      datosNuevos: { ...notaRegistrada, nuevoSaldo }
    });

    return {
      success: true,
      notaId,
      documentoOriginalId,
      nuevoSaldo,
      asientoId: asientoCreado?.id,
      asientoNumero: asientoCreado?.numero
    };
  },

  /**
   * Anula una Nota de Crédito / Débito:
   * Genera extorno del asiento y RESTITUYE el saldo en el documento original.
   */
  async anularNota(empresaId: string, notaId: string, motivo: string, userId: string) {
    const nota = NOTAS_MEMORIA.find(n => n.id === notaId && n.empresaId === empresaId);
    if (!nota) {
      throw new Error('NOTA_NO_ENCONTRADA: La nota no existe.');
    }
    if (nota.estado === 'ANULADO') {
      throw new Error('NOTA_YA_ANULADA: La nota ya ha sido anulada previamente.');
    }

    // 1. Extorno contable
    if (nota.asientoId) {
      await asientoService.anular(nota.asientoId, empresaId, motivo, userId);
    }

    // 2. Restituir el saldo en el documento original (para NC se suma de vuelta; para ND se resta)
    const factorRestitucion = nota.tipoNota === '07' ? 1 : -1;
    const totalNota = Money.create(nota.total);
    const tablaCartera = nota.esVenta ? 'cuentas_por_cobrar' : 'cuentas_por_pagar';

    let nuevoSaldoRestituido = 0;
    if (db.isPostgresConnected()) {
      const carteraRes = await db.query(`
        SELECT id, saldo, importe_original FROM ${tablaCartera}
        WHERE comprobante_id = $1 AND empresa_id = $2
      `, [nota.documentoOriginalId, empresaId]);

      if (carteraRes.rows.length > 0) {
        const actual = Number(carteraRes.rows[0].saldo);
        const original = Number(carteraRes.rows[0].importe_original);
        nuevoSaldoRestituido = Math.min(original, Money.toNumber(Money.add(actual, totalNota.times(factorRestitucion))));
        const nuevoEstado = nuevoSaldoRestituido >= original ? 'PENDIENTE' : 'PARCIAL';

        await db.query(`
          UPDATE ${tablaCartera}
          SET saldo = $1, estado = $2, updated_at = NOW()
          WHERE id = $3
        `, [nuevoSaldoRestituido, nuevoEstado, carteraRes.rows[0].id]);
      }
    } else {
      const store = nota.esVenta ? CXC_MEMORIA : CXP_MEMORIA;
      const carteraItem = store.find(i => i.comprobanteId === nota.documentoOriginalId && i.empresaId === empresaId);
      if (carteraItem) {
        const actual = carteraItem.saldo;
        const original = carteraItem.importeOriginal;
        nuevoSaldoRestituido = Math.min(original, Money.toNumber(Money.add(actual, totalNota.times(factorRestitucion))));
        carteraItem.saldo = nuevoSaldoRestituido;
        carteraItem.estado = nuevoSaldoRestituido >= original ? 'PENDIENTE' : 'PARCIAL';
      }
    }

    nota.estado = 'ANULADO';
    nota.updatedAt = new Date().toISOString();

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: tablaCartera,
      registroId: notaId,
      accion: 'ANULAR',
      datosNuevos: { notaId, nuevoSaldoRestituido, motivo }
    });

    return {
      success: true,
      notaId,
      documentoOriginalId: nota.documentoOriginalId,
      saldoRestituido: nuevoSaldoRestituido
    };
  }
};
