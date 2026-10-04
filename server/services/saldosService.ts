import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { CXP_MEMORIA } from './compraService';
import { CXC_MEMORIA } from './ventaService';
import { anexoService } from './anexoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface SaldoDocumento {
  id: string;
  comprobanteId: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  anexoId: string;
  anexoNombre: string;
  anexoRuc: string;
  fechaEmision: string;
  fechaVencimiento: string;
  moneda: 'PEN' | 'USD';
  importeOriginal: number;
  saldo: number;
  diasVencido: number;
  tramoAntiguedad: 'CORRIENTE' | '1_30' | '31_60' | '61_90' | 'MAS_90';
  estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO';
}

export interface AplicacionPagoInput {
  fechaPago: string;
  referenciaBanco?: string;
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  aplicaciones: Array<{
    cuentaPorPagarId: string;
    importe: number;
  }>;
}

export interface AplicacionCobranzaInput {
  fechaCobranza: string;
  referenciaBanco?: string;
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  aplicaciones: Array<{
    cuentaPorCobrarId: string;
    importe: number;
  }>;
}

export const APLICACIONES_PAGO_MEMORIA: any[] = [];
export const APLICACIONES_COBRANZA_MEMORIA: any[] = [];

export const saldosService = {
  async listarCxP(empresaId: string, filtros?: { estado?: string; anexoId?: string; search?: string }): Promise<SaldoDocumento[]> {
    if (db.isPostgresConnected()) {
      let sql = `
        SELECT p.*, c.tipo_comprobante as "tipoComprobante", c.serie, c.numero,
               a.razon_social as "proveedorNombre", a.numero_documento as "proveedorRuc",
               CURRENT_DATE - p.fecha_vencimiento as "diasVencido"
        FROM cuentas_por_pagar p
        JOIN comprobantes_compra c ON c.id = p.comprobante_id
        JOIN anexos a ON a.id = p.proveedor_id
        WHERE p.empresa_id = $1
      `;
      const params: any[] = [empresaId];

      if (filtros?.estado) {
        params.push(filtros.estado);
        sql += ` AND p.estado = $${params.length}`;
      } else {
        sql += ` AND p.saldo > 0`;
      }

      if (filtros?.anexoId) {
        params.push(filtros.anexoId);
        sql += ` AND p.proveedor_id = $${params.length}`;
      }

      if (filtros?.search) {
        params.push(`%${filtros.search.toLowerCase()}%`);
        sql += ` AND (LOWER(a.razon_social) LIKE $${params.length} OR a.numero_documento LIKE $${params.length} OR c.serie LIKE $${params.length} OR c.numero LIKE $${params.length})`;
      }

      sql += ` ORDER BY p.fecha_vencimiento ASC`;
      const res = await db.query(sql, params);
      return res.rows.map(r => this.enriquecerTramo(r));
    }

    let filtrados = CXP_MEMORIA.filter(p => p.empresaId === empresaId);
    if (filtros?.estado && filtros.estado !== 'TODOS') {
      filtrados = filtrados.filter(p => p.estado === filtros.estado);
    } else if (!filtros?.estado) {
      filtrados = filtrados.filter(p => p.saldo > 0);
    }
    if (filtros?.anexoId) filtrados = filtrados.filter(p => p.proveedorId === filtros.anexoId);
    if (filtros?.search) {
      const q = filtros.search.toLowerCase();
      filtrados = filtrados.filter(p => 
        (p.proveedorNombre && p.proveedorNombre.toLowerCase().includes(q)) ||
        (p.proveedorRuc && p.proveedorRuc.includes(q)) ||
        p.serie.toLowerCase().includes(q) ||
        p.numero.includes(q)
      );
    }

    return filtrados.map(p => {
      const hoy = new Date();
      const venc = new Date(p.fechaVencimiento);
      const diffTime = hoy.getTime() - venc.getTime();
      const diasVencido = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return this.enriquecerTramo({
        ...p,
        comprobante_id: p.comprobanteId,
        proveedor_id: p.proveedorId,
        proveedorNombre: p.proveedorNombre,
        proveedorRuc: p.proveedorRuc,
        importe_original: p.importeOriginal,
        fecha_emision: p.fechaEmision,
        fecha_vencimiento: p.fechaVencimiento,
        diasVencido
      });
    });
  },

  async listarCxC(empresaId: string, filtros?: { estado?: string; anexoId?: string; search?: string }): Promise<SaldoDocumento[]> {
    if (db.isPostgresConnected()) {
      let sql = `
        SELECT c.*, v.tipo_comprobante as "tipoComprobante", v.serie, v.numero,
               a.razon_social as "clienteNombre", a.numero_documento as "clienteRuc",
               CURRENT_DATE - c.fecha_vencimiento as "diasVencido"
        FROM cuentas_por_cobrar c
        JOIN comprobantes_venta v ON v.id = c.comprobante_id
        JOIN anexos a ON a.id = c.cliente_id
        WHERE c.empresa_id = $1
      `;
      const params: any[] = [empresaId];

      if (filtros?.estado) {
        params.push(filtros.estado);
        sql += ` AND c.estado = $${params.length}`;
      } else {
        sql += ` AND c.saldo > 0`;
      }

      if (filtros?.anexoId) {
        params.push(filtros.anexoId);
        sql += ` AND c.cliente_id = $${params.length}`;
      }

      if (filtros?.search) {
        params.push(`%${filtros.search.toLowerCase()}%`);
        sql += ` AND (LOWER(a.razon_social) LIKE $${params.length} OR a.numero_documento LIKE $${params.length} OR v.serie LIKE $${params.length} OR v.numero LIKE $${params.length})`;
      }

      sql += ` ORDER BY c.fecha_vencimiento ASC`;
      const res = await db.query(sql, params);
      return res.rows.map(r => this.enriquecerTramo(r));
    }

    let filtrados = CXC_MEMORIA.filter(c => c.empresaId === empresaId);
    if (filtros?.estado && filtros.estado !== 'TODOS') {
      filtrados = filtrados.filter(c => c.estado === filtros.estado);
    } else if (!filtros?.estado) {
      filtrados = filtrados.filter(c => c.saldo > 0);
    }
    if (filtros?.anexoId) filtrados = filtrados.filter(c => c.clienteId === filtros.anexoId);
    if (filtros?.search) {
      const q = filtros.search.toLowerCase();
      filtrados = filtrados.filter(c => 
        (c.clienteNombre && c.clienteNombre.toLowerCase().includes(q)) ||
        (c.clienteRuc && c.clienteRuc.includes(q)) ||
        c.serie.toLowerCase().includes(q) ||
        c.numero.includes(q)
      );
    }

    return filtrados.map(c => {
      const hoy = new Date();
      const venc = new Date(c.fechaVencimiento);
      const diffTime = hoy.getTime() - venc.getTime();
      const diasVencido = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return this.enriquecerTramo({
        ...c,
        comprobante_id: c.comprobanteId,
        cliente_id: c.clienteId,
        clienteNombre: c.clienteNombre,
        clienteRuc: c.clienteRuc,
        importe_original: c.importeOriginal,
        fecha_emision: c.fechaEmision,
        fecha_vencimiento: c.fechaVencimiento,
        diasVencido
      });
    });
  },

  enriquecerTramo(item: any, fechaCorte?: string): SaldoDocumento {
    let dias = parseInt(item.diasVencido, 10);
    if (isNaN(dias)) {
      const baseDate = fechaCorte ? new Date(fechaCorte) : new Date();
      const vencDate = new Date(item.fecha_vencimiento || item.fechaVencimiento);
      dias = Math.floor((baseDate.getTime() - vencDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    let tramo: 'CORRIENTE' | '1_30' | '31_60' | '61_90' | 'MAS_90' = 'CORRIENTE';
    if (dias <= 0) tramo = 'CORRIENTE';
    else if (dias <= 30) tramo = '1_30';
    else if (dias <= 60) tramo = '31_60';
    else if (dias <= 90) tramo = '61_90';
    else tramo = 'MAS_90';

    return {
      id: item.id,
      comprobanteId: item.comprobante_id || item.comprobanteId,
      tipoComprobante: item.tipoComprobante || item.tipo_comprobante || '01',
      serie: item.serie,
      numero: item.numero,
      anexoId: item.proveedor_id || item.cliente_id || item.proveedorId || item.clienteId,
      anexoNombre: item.proveedorNombre || item.clienteNombre,
      anexoRuc: item.proveedorRuc || item.clienteRuc,
      fechaEmision: item.fecha_emision || item.fechaEmision,
      fechaVencimiento: item.fecha_vencimiento || item.fechaVencimiento,
      moneda: item.moneda || 'PEN',
      importeOriginal: Number(item.importe_original || item.importeOriginal),
      saldo: Number(item.saldo),
      diasVencido: Math.max(0, dias),
      tramoAntiguedad: tramo,
      estado: item.estado
    };
  },

  /**
   * Reporte de Antigüedad de Saldos por Tramos en fecha de corte
   */
  async reporteAntiguedad(empresaId: string, tipo: 'CXP' | 'CXC', fechaCorte?: string) {
    const lista = tipo === 'CXP' ? await this.listarCxP(empresaId) : await this.listarCxC(empresaId);

    const revaluados = lista.map(doc => {
      return this.enriquecerTramo(doc, fechaCorte);
    });

    const resumen = {
      corriente: 0,
      de1a30: 0,
      de31a60: 0,
      de61a90: 0,
      mas90: 0,
      totalSaldo: 0
    };

    revaluados.forEach(doc => {
      resumen.totalSaldo = Money.toNumber(Money.add(resumen.totalSaldo, doc.saldo));
      if (doc.tramoAntiguedad === 'CORRIENTE') resumen.corriente = Money.toNumber(Money.add(resumen.corriente, doc.saldo));
      else if (doc.tramoAntiguedad === '1_30') resumen.de1a30 = Money.toNumber(Money.add(resumen.de1a30, doc.saldo));
      else if (doc.tramoAntiguedad === '31_60') resumen.de31a60 = Money.toNumber(Money.add(resumen.de31a60, doc.saldo));
      else if (doc.tramoAntiguedad === '61_90') resumen.de61a90 = Money.toNumber(Money.add(resumen.de61a90, doc.saldo));
      else resumen.mas90 = Money.toNumber(Money.add(resumen.mas90, doc.saldo));
    });

    return {
      empresaId,
      tipo,
      fechaCorte: fechaCorte || new Date().toISOString().substring(0, 10),
      resumen,
      documentos: revaluados
    };
  },

  /**
   * Obtiene el Estado de Cuenta de un cliente o proveedor
   */
  async obtenerEstadoCuenta(empresaId: string, anexoId: string, tipo: 'PROVEEDOR' | 'CLIENTE') {
    const anexo = await anexoService.obtenerPorId(empresaId, anexoId);
    if (!anexo) {
      throw new Error('ANEXO_NO_ENCONTRADO: El cliente o proveedor no existe.');
    }

    const docs = tipo === 'PROVEEDOR'
      ? await this.listarCxP(empresaId, { anexoId, estado: 'TODOS' })
      : await this.listarCxC(empresaId, { anexoId, estado: 'TODOS' });

    let totalFacturado = 0;
    let totalSaldoPendiente = 0;

    docs.forEach(d => {
      totalFacturado = Money.toNumber(Money.add(totalFacturado, d.importeOriginal));
      totalSaldoPendiente = Money.toNumber(Money.add(totalSaldoPendiente, d.saldo));
    });

    const totalPagado = Money.toNumber(Money.sub(totalFacturado, totalSaldoPendiente));

    return {
      anexo: {
        id: anexo.id,
        razonSocial: anexo.razonSocial,
        numeroDocumento: anexo.numeroDocumento,
        condicionSunat: anexo.condicionSunat,
        estadoSunat: anexo.estadoSunat,
        direccion: anexo.direccion
      },
      tipo,
      totalFacturado,
      totalPagado,
      totalSaldoPendiente,
      documentos: docs
    };
  },

  /**
   * Aplica un pago a una o varias cuentas por pagar (Proveedores)
   */
  async aplicarPago(empresaId: string, input: AplicacionPagoInput, userId: string) {
    if (!input.aplicaciones || input.aplicaciones.length === 0) {
      throw new Error('APLICACIONES_REQUERIDAS: Debe especificar al menos una cuenta por pagar a la cual aplicar.');
    }

    const resultados: any[] = [];

    for (const app of input.aplicaciones) {
      const importe = Money.create(app.importe);
      if (importe.isZero() || importe.isNegative()) {
        throw new Error('IMPORTE_INVALIDO: El importe a aplicar debe ser mayor a cero.');
      }

      if (db.isPostgresConnected()) {
        const cxpRes = await db.query(`SELECT * FROM cuentas_por_pagar WHERE id = $1 AND empresa_id = $2`, [app.cuentaPorPagarId, empresaId]);
        if (cxpRes.rows.length === 0) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: No se encontró la cuenta por pagar con ID ${app.cuentaPorPagarId}`);
        }

        const cxp = cxpRes.rows[0];
        const saldoActual = Money.create(cxp.saldo);

        if (importe.greaterThan(saldoActual)) {
          throw new Error(`IMPORTE_EXCEDE_SALDO: El importe a aplicar (S/ ${importe}) excede el saldo pendiente (S/ ${saldoActual}).`);
        }

        const nuevoSaldo = Money.toNumber(Money.sub(saldoActual, importe));
        const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL';

        await db.query(`
          UPDATE cuentas_por_pagar
          SET saldo = $1, estado = $2, updated_at = NOW()
          WHERE id = $3
        `, [nuevoSaldo, nuevoEstado, app.cuentaPorPagarId]);

        const appRes = await db.query(`
          INSERT INTO aplicaciones_pago (
            empresa_id, cuenta_por_pagar_id, fecha_pago, importe_aplicado,
            moneda, tipo_cambio, referencia_banco
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          empresaId, app.cuentaPorPagarId, input.fechaPago, Money.toNumber(importe),
          input.moneda || 'PEN', input.tipoCambio || 1.0, input.referenciaBanco || null
        ]);

        resultados.push({
          aplicacionId: appRes.rows[0]?.id,
          cuentaPorPagarId: app.cuentaPorPagarId,
          importeAplicado: Money.toNumber(importe),
          nuevoSaldo,
          nuevoEstado
        });
      } else {
        const cxp = CXP_MEMORIA.find(p => p.id === app.cuentaPorPagarId && p.empresaId === empresaId);
        if (!cxp) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: No se encontró la cuenta por pagar con ID ${app.cuentaPorPagarId}`);
        }

        const saldoActual = Money.create(cxp.saldo);
        if (importe.greaterThan(saldoActual)) {
          throw new Error(`IMPORTE_EXCEDE_SALDO: El importe a aplicar (S/ ${importe}) excede el saldo pendiente (S/ ${saldoActual}).`);
        }

        const nuevoSaldo = Money.toNumber(Money.sub(saldoActual, importe));
        const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL';

        cxp.saldo = nuevoSaldo;
        cxp.estado = nuevoEstado;

        const appPago = {
          id: `app-pago-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          empresaId,
          cuentaPorPagarId: app.cuentaPorPagarId,
          fechaPago: input.fechaPago,
          importeAplicado: Money.toNumber(importe),
          moneda: input.moneda || 'PEN',
          tipoCambio: input.tipoCambio || 1.0,
          referenciaBanco: input.referenciaBanco || null
        };
        APLICACIONES_PAGO_MEMORIA.push(appPago);

        resultados.push({
          aplicacionId: appPago.id,
          cuentaPorPagarId: app.cuentaPorPagarId,
          importeAplicado: Money.toNumber(importe),
          nuevoSaldo,
          nuevoEstado
        });
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'aplicaciones_pago',
      registroId: resultados[0]?.aplicacionId || 'batch-pago',
      accion: 'INSERT',
      datosNuevos: { input, resultados }
    });

    return {
      success: true,
      mensaje: `Pago aplicado exitosamente a ${resultados.length} documento(s)`,
      resultados
    };
  },

  /**
   * Aplica una cobranza a una o varias cuentas por cobrar (Clientes)
   */
  async aplicarCobranza(empresaId: string, input: AplicacionCobranzaInput, userId: string) {
    if (!input.aplicaciones || input.aplicaciones.length === 0) {
      throw new Error('APLICACIONES_REQUERIDAS: Debe especificar al menos una cuenta por cobrar a la cual aplicar.');
    }

    const resultados: any[] = [];

    for (const app of input.aplicaciones) {
      const importe = Money.create(app.importe);
      if (importe.isZero() || importe.isNegative()) {
        throw new Error('IMPORTE_INVALIDO: El importe a aplicar debe ser mayor a cero.');
      }

      if (db.isPostgresConnected()) {
        const cxcRes = await db.query(`SELECT * FROM cuentas_por_cobrar WHERE id = $1 AND empresa_id = $2`, [app.cuentaPorCobrarId, empresaId]);
        if (cxcRes.rows.length === 0) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: No se encontró la cuenta por cobrar con ID ${app.cuentaPorCobrarId}`);
        }

        const cxc = cxcRes.rows[0];
        const saldoActual = Money.create(cxc.saldo);

        if (importe.greaterThan(saldoActual)) {
          throw new Error(`IMPORTE_EXCEDE_SALDO: El importe a cobrar (S/ ${importe}) excede el saldo pendiente (S/ ${saldoActual}).`);
        }

        const nuevoSaldo = Money.toNumber(Money.sub(saldoActual, importe));
        const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL';

        await db.query(`
          UPDATE cuentas_por_cobrar
          SET saldo = $1, estado = $2, updated_at = NOW()
          WHERE id = $3
        `, [nuevoSaldo, nuevoEstado, app.cuentaPorCobrarId]);

        const appRes = await db.query(`
          INSERT INTO aplicaciones_cobranza (
            empresa_id, cuenta_por_cobrar_id, fecha_cobranza, importe_aplicado,
            moneda, tipo_cambio, referencia_banco
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          empresaId, app.cuentaPorCobrarId, input.fechaCobranza, Money.toNumber(importe),
          input.moneda || 'PEN', input.tipoCambio || 1.0, input.referenciaBanco || null
        ]);

        resultados.push({
          aplicacionId: appRes.rows[0]?.id,
          cuentaPorCobrarId: app.cuentaPorCobrarId,
          importeAplicado: Money.toNumber(importe),
          nuevoSaldo,
          nuevoEstado
        });
      } else {
        const cxc = CXC_MEMORIA.find(c => c.id === app.cuentaPorCobrarId && c.empresaId === empresaId);
        if (!cxc) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: No se encontró la cuenta por cobrar con ID ${app.cuentaPorCobrarId}`);
        }

        const saldoActual = Money.create(cxc.saldo);
        if (importe.greaterThan(saldoActual)) {
          throw new Error(`IMPORTE_EXCEDE_SALDO: El importe a cobrar (S/ ${importe}) excede el saldo pendiente (S/ ${saldoActual}).`);
        }

        const nuevoSaldo = Money.toNumber(Money.sub(saldoActual, importe));
        const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL';

        cxc.saldo = nuevoSaldo;
        cxc.estado = nuevoEstado;

        const appCobranza = {
          id: `app-cobranza-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          empresaId,
          cuentaPorCobrarId: app.cuentaPorCobrarId,
          fechaCobranza: input.fechaCobranza,
          importeAplicado: Money.toNumber(importe),
          moneda: input.moneda || 'PEN',
          tipoCambio: input.tipoCambio || 1.0,
          referenciaBanco: input.referenciaBanco || null
        };
        APLICACIONES_COBRANZA_MEMORIA.push(appCobranza);

        resultados.push({
          aplicacionId: appCobranza.id,
          cuentaPorCobrarId: app.cuentaPorCobrarId,
          importeAplicado: Money.toNumber(importe),
          nuevoSaldo,
          nuevoEstado
        });
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'aplicaciones_cobranza',
      registroId: resultados[0]?.aplicacionId || 'batch-cobranza',
      accion: 'INSERT',
      datosNuevos: { input, resultados }
    });

    return {
      success: true,
      mensaje: `Cobranza aplicada exitosamente a ${resultados.length} documento(s)`,
      resultados
    };
  }
};
