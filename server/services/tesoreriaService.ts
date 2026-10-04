import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { CXP_MEMORIA } from './compraService';
import { CXC_MEMORIA } from './ventaService';
import { DETRACCIONES_MEMORIA } from './detraccionService';

export interface CuentaFinancieraModel {
  id: string;
  empresaId: string;
  tipo: 'CAJA' | 'BANCO' | 'DETRACCIONES_BN';
  banco: string;
  numero: string;
  moneda: 'PEN' | 'USD';
  cuentaContableCodigo: string;
  saldoInicial: number;
  saldoActual: number;
  activa: boolean;
}

export interface MovimientoTesoreriaModel {
  id: string;
  empresaId: string;
  periodoId: string;
  cuentaFinancieraId: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'COMISION' | 'ITF' | 'DEPOSITO_DETRACCION';
  medioPago: string;
  numeroOperacion?: string;
  anexoId?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  importe: number;
  importeMe?: number;
  saldoSinAplicar: number;
  glosa: string;
  estado: 'BORRADOR' | 'REGISTRADO' | 'ANULADO';
  conciliado: boolean;
  asientoId?: string;
  version: number;
  createdAt: string;
  aplicaciones?: Array<{
    documentoId: string;
    importeAplicado: number;
  }>;
}

export interface TransferenciaModel {
  id: string;
  empresaId: string;
  periodoId: string;
  cuentaOrigenId: string;
  cuentaDestinoId: string;
  fecha: string;
  importeOrigen: number;
  monedaOrigen: 'PEN' | 'USD';
  importeDestino: number;
  monedaDestino: 'PEN' | 'USD';
  tipoCambio: number;
  diferenciaCambio: number;
  tipoDiferencia: 'GANANCIA' | 'PERDIDA' | 'NINGUNA';
  glosa: string;
  estado: 'BORRADOR' | 'REGISTRADO' | 'ANULADO';
  asientoId?: string;
}

// Almacenes en memoria para fallback resiliente
export const CUENTAS_FINANCIERAS_MEMORIA: CuentaFinancieraModel[] = [
  {
    id: 'cta-bcp-soles-01',
    empresaId: '00000000-0000-0000-0000-000000000001',
    tipo: 'BANCO',
    banco: 'BCP',
    numero: '193-4819283-0-21',
    moneda: 'PEN',
    cuentaContableCodigo: '1041',
    saldoInicial: 50000.00,
    saldoActual: 50000.00,
    activa: true
  },
  {
    id: 'cta-bbva-usd-01',
    empresaId: '00000000-0000-0000-0000-000000000001',
    tipo: 'BANCO',
    banco: 'BBVA',
    numero: '0011-0182-0100049182',
    moneda: 'USD',
    cuentaContableCodigo: '10412',
    saldoInicial: 10000.00,
    saldoActual: 10000.00,
    activa: true
  },
  {
    id: 'cta-bn-detracciones-01',
    empresaId: '00000000-0000-0000-0000-000000000001',
    tipo: 'DETRACCIONES_BN',
    banco: 'BANCO_DE_LA_NACION',
    numero: '00-068-192831',
    moneda: 'PEN',
    cuentaContableCodigo: '1042',
    saldoInicial: 15000.00,
    saldoActual: 15000.00,
    activa: true
  }
];

export const MOVIMIENTOS_TESORERIA_MEMORIA: MovimientoTesoreriaModel[] = [];
export const TRANSFERENCIAS_MEMORIA: TransferenciaModel[] = [];

export const tesoreriaService = {
  // --------------------------------------------------------------------------
  // CUENTAS FINANCIERAS
  // --------------------------------------------------------------------------
  async listarCuentas(empresaId: string): Promise<CuentaFinancieraModel[]> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", tipo, banco, numero, moneda,
               cuenta_contable_codigo as "cuentaContableCodigo",
               saldo_inicial as "saldoInicial", saldo_actual as "saldoActual", activa
        FROM cuentas_financieras
        WHERE empresa_id = $1
        ORDER BY tipo, banco
      `, [empresaId]);
      if (res.rows && res.rows.length > 0) return res.rows;
    }
    const cuentas = CUENTAS_FINANCIERAS_MEMORIA.filter(c => c.empresaId === empresaId);
    return cuentas || [];
  },

  async obtenerCuentaPorId(empresaId: string, id: string): Promise<CuentaFinancieraModel | null> {
    const cuentas = await this.listarCuentas(empresaId);
    return cuentas.find(c => c.id === id) || null;
  },

  async crearCuenta(empresaId: string, datos: Omit<CuentaFinancieraModel, 'id' | 'empresaId' | 'saldoActual'>): Promise<CuentaFinancieraModel> {
    const nueva: CuentaFinancieraModel = {
      id: `cta-${Date.now()}`,
      empresaId,
      tipo: datos.tipo,
      banco: datos.banco,
      numero: datos.numero,
      moneda: datos.moneda,
      cuentaContableCodigo: datos.cuentaContableCodigo || (datos.tipo === 'CAJA' ? '1011' : (datos.tipo === 'DETRACCIONES_BN' ? '1042' : '1041')),
      saldoInicial: datos.saldoInicial || 0,
      saldoActual: datos.saldoInicial || 0,
      activa: datos.activa !== undefined ? datos.activa : true
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO cuentas_financieras (
          id, empresa_id, tipo, banco, numero, moneda, cuenta_contable_codigo, saldo_inicial, saldo_actual, activa
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        nueva.id, nueva.empresaId, nueva.tipo, nueva.banco, nueva.numero,
        nueva.moneda, nueva.cuentaContableCodigo, nueva.saldoInicial, nueva.saldoActual, nueva.activa
      ]);
    }
    CUENTAS_FINANCIERAS_MEMORIA.push(nueva);
    return nueva;
  },

  // --------------------------------------------------------------------------
  // MOVIMIENTOS DE TESORERÍA (INGRESOS, EGRESOS, DETRACCIONES SPOT)
  // --------------------------------------------------------------------------
  async listarMovimientos(empresaId: string, filtros?: {
    cuentaFinancieraId?: string;
    tipo?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }) {
    let items = MOVIMIENTOS_TESORERIA_MEMORIA.filter(m => m.empresaId === empresaId);

    if (filtros?.cuentaFinancieraId) {
      items = items.filter(m => m.cuentaFinancieraId === filtros.cuentaFinancieraId);
    }
    if (filtros?.tipo && filtros.tipo !== 'TODOS') {
      items = items.filter(m => m.tipo === filtros.tipo);
    }
    if (filtros?.estado && filtros.estado !== 'TODOS') {
      items = items.filter(m => m.estado === filtros.estado);
    }
    if (filtros?.fechaDesde) {
      items = items.filter(m => m.fecha >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      items = items.filter(m => m.fecha <= filtros.fechaHasta!);
    }

    // Orden cronológico descendente
    items.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const page = filtros?.page || 1;
    const limit = filtros?.limit || 50;
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async registrarMovimiento(
    empresaId: string,
    datos: {
      periodoId: string;
      cuentaFinancieraId: string;
      fecha: string;
      tipo: 'INGRESO' | 'EGRESO' | 'COMISION' | 'ITF' | 'DEPOSITO_DETRACCION';
      medioPago: string;
      numeroOperacion?: string;
      anexoId?: string;
      moneda?: 'PEN' | 'USD';
      tipoCambio?: number;
      importe: number;
      glosa: string;
      detraccionId?: string;
      aplicaciones?: Array<{
        documentoId: string;
        importeAplicado: number;
      }>;
    },
    userId: string
  ): Promise<MovimientoTesoreriaModel> {
    // 1. Validar Período Contable Abierto
    const mesPeriodo = datos.fecha.substring(0, 7);
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mesPeriodo);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período contable ${mesPeriodo} se encuentra ${estadoPeriodo}. No se permiten movimientos de tesorería.`);
    }

    // 2. Validar Cuenta Financiera
    const cuenta = await this.obtenerCuentaPorId(empresaId, datos.cuentaFinancieraId);
    if (!cuenta) {
      throw new Error('CUENTA_FINANCIERA_NO_EXISTE: La cuenta financiera especificada no existe.');
    }

    const moneda = datos.moneda || cuenta.moneda || 'PEN';
    const tipoCambio = datos.tipoCambio || 1.0;
    const importeTotal = Money.create(datos.importe);
    let totalAplicado = Money.create(0);

    // 3. Procesar Aplicaciones a Cartera (CxC o CxP)
    const aplicacionesProcesadas: Array<{ documentoId: string; importeAplicado: number }> = [];

    if (datos.tipo === 'INGRESO' && datos.aplicaciones && datos.aplicaciones.length > 0) {
      // Aplicar a Cuentas por Cobrar
      for (const app of datos.aplicaciones) {
        const doc = CXC_MEMORIA.find(d => d.id === app.documentoId && d.empresaId === empresaId);
        if (!doc) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: El documento por cobrar ${app.documentoId} no existe en la empresa.`);
        }
        if (doc.estado === 'CANCELADO' || doc.saldo <= 0) {
          throw new Error(`DOCUMENTO_YA_CANCELADO: El comprobante ${doc.comprobanteId} ya se encuentra totalmente cancelado.`);
        }

        const montoApp = Money.create(app.importeAplicado);
        if (montoApp.greaterThan(doc.saldo)) {
          throw new Error(`SALDO_INSUFICIENTE_APLICACION: El monto aplicado (${Money.toNumber(montoApp)}) excede el saldo pendiente (${doc.saldo}).`);
        }

        const nuevoSaldo = Money.sub(doc.saldo, montoApp);
        doc.saldo = Money.toNumber(nuevoSaldo);
        doc.estado = nuevoSaldo.isZero() ? 'CANCELADO' : 'PARCIAL';
        totalAplicado = Money.add(totalAplicado, montoApp);
        aplicacionesProcesadas.push({ documentoId: doc.id, importeAplicado: Money.toNumber(montoApp) });
      }
    } else if (datos.tipo === 'EGRESO' && datos.aplicaciones && datos.aplicaciones.length > 0) {
      // Aplicar a Cuentas por Pagar
      for (const app of datos.aplicaciones) {
        const doc = CXP_MEMORIA.find(d => d.id === app.documentoId && d.empresaId === empresaId);
        if (!doc) {
          throw new Error(`DOCUMENTO_NO_ENCONTRADO: El documento por pagar ${app.documentoId} no existe en la empresa.`);
        }
        if (doc.estado === 'CANCELADO' || doc.saldo <= 0) {
          throw new Error(`DOCUMENTO_YA_CANCELADO: El comprobante ${doc.comprobanteId} ya se encuentra totalmente cancelado.`);
        }

        const montoApp = Money.create(app.importeAplicado);
        if (montoApp.greaterThan(doc.saldo)) {
          throw new Error(`SALDO_INSUFICIENTE_APLICACION: El monto aplicado (${Money.toNumber(montoApp)}) excede el saldo pendiente (${doc.saldo}).`);
        }

        const nuevoSaldo = Money.sub(doc.saldo, montoApp);
        doc.saldo = Money.toNumber(nuevoSaldo);
        doc.estado = nuevoSaldo.isZero() ? 'CANCELADO' : 'PARCIAL';
        totalAplicado = Money.add(totalAplicado, montoApp);
        aplicacionesProcesadas.push({ documentoId: doc.id, importeAplicado: Money.toNumber(montoApp) });
      }
    }

    // Saldo sin aplicar queda como anticipo
    const saldoSinAplicar = Money.sub(importeTotal, totalAplicado);
    if (saldoSinAplicar.isNegative()) {
      throw new Error(`IMPORTE_INSUFICIENTE: La suma de aplicaciones (${Money.toNumber(totalAplicado)}) supera el importe del movimiento (${Money.toNumber(importeTotal)}).`);
    }

    // 4. Si es Depósito de Detracción SPOT, actualizar estado de la detracción en el BN
    if (datos.tipo === 'DEPOSITO_DETRACCION') {
      const detraccion = DETRACCIONES_MEMORIA.find(d => 
        d.empresaId === empresaId && (d.id === datos.detraccionId || d.comprobanteCompraId === datos.detraccionId)
      );
      if (detraccion) {
        detraccion.estado = 'DEPOSITADA';
        detraccion.numeroConstancia = datos.numeroOperacion || `CONST-${Date.now()}`;
        detraccion.fechaDeposito = datos.fecha;
        detraccion.permiteCreditoFiscal = true;
      }
    }

    // 5. Generar Asiento Contable a través de ContabilizacionService y AsientoService
    let tipoOpContable: any = 'PAGO';
    let subdiario: any = cuenta.tipo === 'CAJA' ? '03' : '05';

    if (datos.tipo === 'INGRESO') {
      tipoOpContable = 'COBRANZA';
      subdiario = cuenta.tipo === 'CAJA' ? '03' : '05';
    } else if (datos.tipo === 'EGRESO') {
      tipoOpContable = 'PAGO';
      subdiario = cuenta.tipo === 'CAJA' ? '03' : '05';
    } else if (datos.tipo === 'DEPOSITO_DETRACCION') {
      tipoOpContable = 'DETRACCION_DEPOSITO';
      subdiario = '05';
    }

    const propuestaAsiento = await contabilizacionService.generar(empresaId, tipoOpContable, {
      total: Money.toNumber(importeTotal),
      glosa: datos.glosa || `${datos.tipo} en ${cuenta.banco} ${cuenta.numero}`,
      cuentaFinancieraCodigo: cuenta.cuentaContableCodigo,
      anexoId: datos.anexoId,
      moneda,
      tipoCambio
    });

    const asientoCreado = await asientoService.crearAsiento(empresaId, {
      periodoId: datos.periodoId || `per-${mesPeriodo}`,
      subdiario,
      fecha: datos.fecha,
      moneda,
      tipoCambio,
      glosa: datos.glosa || `${datos.tipo} ${cuenta.banco} ${cuenta.numero}`,
      origenModulo: 'TESORERIA',
      lineas: propuestaAsiento.lineas.map(l => ({
        codigoCuenta: l.codigoCuenta,
        debe: l.debe,
        haber: l.haber,
        debeMe: l.debeMe,
        haberMe: l.haberMe,
        glosa: l.glosaLinea,
        anexoId: l.anexoId
      }))
    }, userId);

    // 6. Actualizar Saldo de la Cuenta Financiera
    if (datos.tipo === 'INGRESO') {
      cuenta.saldoActual = Money.toNumber(Money.add(cuenta.saldoActual, importeTotal));
    } else {
      cuenta.saldoActual = Money.toNumber(Money.sub(cuenta.saldoActual, importeTotal));
    }

    // 7. Persistir Movimiento
    const nuevoMovimiento: MovimientoTesoreriaModel = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      empresaId,
      periodoId: datos.periodoId || `per-${mesPeriodo}`,
      cuentaFinancieraId: datos.cuentaFinancieraId,
      fecha: datos.fecha,
      tipo: datos.tipo,
      medioPago: datos.medioPago || '003',
      numeroOperacion: datos.numeroOperacion,
      anexoId: datos.anexoId,
      moneda,
      tipoCambio,
      importe: Money.toNumber(importeTotal),
      importeMe: moneda === 'USD' ? Money.toNumber(importeTotal) : 0,
      saldoSinAplicar: Money.toNumber(saldoSinAplicar),
      glosa: datos.glosa,
      estado: 'REGISTRADO',
      conciliado: false,
      asientoId: asientoCreado.id,
      version: 1,
      createdAt: new Date().toISOString(),
      aplicaciones: aplicacionesProcesadas
    };

    MOVIMIENTOS_TESORERIA_MEMORIA.push(nuevoMovimiento);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'REGISTRAR_MOVIMIENTO_TESORERIA',
      tabla: 'movimientos_tesoreria',
      registroId: nuevoMovimiento.id,
      valoresNuevos: nuevoMovimiento
    });

    return nuevoMovimiento;
  },

  // --------------------------------------------------------------------------
  // TRANSFERENCIAS ENTRE CUENTAS (CON DIFERENCIA DE CAMBIO Y PARTIDA DOBLE)
  // --------------------------------------------------------------------------
  async registrarTransferencia(
    empresaId: string,
    datos: {
      periodoId: string;
      cuentaOrigenId: string;
      cuentaDestinoId: string;
      fecha: string;
      importeOrigen: number;
      importeDestino?: number;
      tipoCambio?: number;
      glosa: string;
    },
    userId: string
  ): Promise<TransferenciaModel> {
    const mesPeriodo = datos.fecha.substring(0, 7);
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mesPeriodo);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período contable ${mesPeriodo} se encuentra cerrado.`);
    }

    const ctaOrigen = await this.obtenerCuentaPorId(empresaId, datos.cuentaOrigenId);
    const ctaDestino = await this.obtenerCuentaPorId(empresaId, datos.cuentaDestinoId);
    if (!ctaOrigen || !ctaDestino) {
      throw new Error('CUENTAS_INVALIDAS: Cuentas de origen y destino deben existir en la empresa.');
    }

    const montoOrigen = Money.create(datos.importeOrigen);
    const tc = datos.tipoCambio || 1.0;

    let montoDestino = datos.importeDestino !== undefined 
      ? Money.create(datos.importeDestino) 
      : (ctaOrigen.moneda === ctaDestino.moneda 
          ? montoOrigen 
          : (ctaOrigen.moneda === 'USD' && ctaDestino.moneda === 'PEN' ? Money.mul(montoOrigen, tc) : Money.div(montoOrigen, tc)));

    // Calcular valores en PEN para verificar diferencia de cambio
    const montoOrigenPen = ctaOrigen.moneda === 'USD' ? Money.mul(montoOrigen, tc) : montoOrigen;
    const montoDestinoPen = ctaDestino.moneda === 'USD' ? Money.mul(montoDestino, tc) : montoDestino;

    const diff = Money.sub(montoDestinoPen, montoOrigenPen);
    let tipoDif: 'GANANCIA' | 'PERDIDA' | 'NINGUNA' = 'NINGUNA';
    let difCambioAbs = 0;

    if (!diff.isZero()) {
      if (diff.isPositive()) {
        tipoDif = 'GANANCIA'; // Cuenta 776
        difCambioAbs = Money.toNumber(diff);
      } else {
        tipoDif = 'PERDIDA';  // Cuenta 676
        difCambioAbs = Math.abs(Money.toNumber(diff));
      }
    }

    // Contabilizar asiento de transferencia
    const propuesta = await contabilizacionService.generar(empresaId, 'TRANSFERENCIA', {
      total: Money.toNumber(montoOrigenPen),
      cuentaOrigenCodigo: ctaOrigen.cuentaContableCodigo,
      cuentaDestinoCodigo: ctaDestino.cuentaContableCodigo,
      montoOrigen: Money.toNumber(montoOrigenPen),
      montoDestino: Money.toNumber(montoDestinoPen),
      diferenciaCambio: difCambioAbs,
      tipoDiferencia: tipoDif,
      glosa: datos.glosa || `Transferencia de ${ctaOrigen.banco} a ${ctaDestino.banco}`
    });

    const asiento = await asientoService.crearAsiento(empresaId, {
      periodoId: datos.periodoId || `per-${mesPeriodo}`,
      subdiario: '05',
      fecha: datos.fecha,
      moneda: 'PEN',
      tipoCambio: tc,
      glosa: datos.glosa || `Transferencia entre cuentas bancarias`,
      origenModulo: 'TESORERIA',
      lineas: propuesta.lineas.map(l => ({
        codigoCuenta: l.codigoCuenta,
        debe: l.debe,
        haber: l.haber,
        glosa: l.glosaLinea
      }))
    }, userId);

    // Actualizar saldos financieros
    ctaOrigen.saldoActual = Money.toNumber(Money.sub(ctaOrigen.saldoActual, montoOrigen));
    ctaDestino.saldoActual = Money.toNumber(Money.add(ctaDestino.saldoActual, montoDestino));

    const nuevaTransf: TransferenciaModel = {
      id: `trf-${Date.now()}`,
      empresaId,
      periodoId: datos.periodoId || `per-${mesPeriodo}`,
      cuentaOrigenId: datos.cuentaOrigenId,
      cuentaDestinoId: datos.cuentaDestinoId,
      fecha: datos.fecha,
      importeOrigen: Money.toNumber(montoOrigen),
      monedaOrigen: ctaOrigen.moneda,
      importeDestino: Money.toNumber(montoDestino),
      monedaDestino: ctaDestino.moneda,
      tipoCambio: tc,
      diferenciaCambio: difCambioAbs,
      tipoDiferencia: tipoDif,
      glosa: datos.glosa,
      estado: 'REGISTRADO',
      asientoId: asiento.id
    };

    TRANSFERENCIAS_MEMORIA.push(nuevaTransf);
    return nuevaTransf;
  },

  // --------------------------------------------------------------------------
  // ANULAR MOVIMIENTO (EXTORNO Y REVERSIÓN DE APLICACIONES)
  // --------------------------------------------------------------------------
  async anularMovimiento(empresaId: string, movimientoId: string, motivo: string, userId: string) {
    const mov = MOVIMIENTOS_TESORERIA_MEMORIA.find(m => m.id === movimientoId && m.empresaId === empresaId);
    if (!mov) {
      throw new Error('MOVIMIENTO_NO_ENCONTRADO: El movimiento de tesorería no existe.');
    }
    if (mov.estado === 'ANULADO') {
      throw new Error('MOVIMIENTO_YA_ANULADO: El movimiento ya se encuentra en estado ANULADO.');
    }

    const mes = mov.fecha.substring(0, 7);
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: No se puede anular un movimiento en el período cerrado ${mes}.`);
    }

    // 1. Revertir Asiento Contable con Extorno
    if (mov.asientoId) {
      await asientoService.anularAsiento(empresaId, mov.asientoId, motivo, userId);
    }

    // 2. Revertir Aplicaciones en Cartera
    if (mov.aplicaciones && mov.aplicaciones.length > 0) {
      if (mov.tipo === 'INGRESO') {
        for (const app of mov.aplicaciones) {
          const doc = CXC_MEMORIA.find(d => d.id === app.documentoId);
          if (doc) {
            doc.saldo = Money.toNumber(Money.add(doc.saldo, app.importeAplicado));
            doc.estado = doc.saldo >= doc.importeOriginal ? 'PENDIENTE' : 'PARCIAL';
          }
        }
      } else if (mov.tipo === 'EGRESO') {
        for (const app of mov.aplicaciones) {
          const doc = CXP_MEMORIA.find(d => d.id === app.documentoId);
          if (doc) {
            doc.saldo = Money.toNumber(Money.add(doc.saldo, app.importeAplicado));
            doc.estado = doc.saldo >= doc.importeOriginal ? 'PENDIENTE' : 'PARCIAL';
          }
        }
      }
    }

    // 3. Revertir Saldo en Cuenta Financiera
    const cuenta = await this.obtenerCuentaPorId(empresaId, mov.cuentaFinancieraId);
    if (cuenta) {
      if (mov.tipo === 'INGRESO') {
        cuenta.saldoActual = Money.toNumber(Money.sub(cuenta.saldoActual, mov.importe));
      } else {
        cuenta.saldoActual = Money.toNumber(Money.add(cuenta.saldoActual, mov.importe));
      }
    }

    mov.estado = 'ANULADO';

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'ANULAR_MOVIMIENTO_TESORERIA',
      tabla: 'movimientos_tesoreria',
      registroId: mov.id,
      valoresAnteriores: { estado: 'REGISTRADO' },
      valoresNuevos: { estado: 'ANULADO', motivo }
    });

    return { success: true, message: 'Movimiento anulado y aplicaciones revertidas exitosamente' };
  },

  // --------------------------------------------------------------------------
  // FLUJO DE CAJA RESUMIDO
  // --------------------------------------------------------------------------
  async obtenerFlujoCaja(empresaId: string, fechaDesde?: string, fechaHasta?: string) {
    const cuentas = await this.listarCuentas(empresaId);
    let movimientos = MOVIMIENTOS_TESORERIA_MEMORIA.filter(m => m.empresaId === empresaId && m.estado === 'REGISTRADO');

    if (fechaDesde) movimientos = movimientos.filter(m => m.fecha >= fechaDesde);
    if (fechaHasta) movimientos = movimientos.filter(m => m.fecha <= fechaHasta);

    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const m of movimientos) {
      if (m.tipo === 'INGRESO') totalIngresos += m.importe;
      else if (m.tipo === 'EGRESO' || m.tipo === 'DEPOSITO_DETRACCION' || m.tipo === 'COMISION' || m.tipo === 'ITF') {
        totalEgresos += m.importe;
      }
    }

    const saldoTotalCuentas = cuentas.reduce((acc, c) => acc + (c.activa ? c.saldoActual : 0), 0);

    return {
      fechaDesde: fechaDesde || '2026-09-01',
      fechaHasta: fechaHasta || '2026-09-30',
      totalIngresos: Number(totalIngresos.toFixed(2)),
      totalEgresos: Number(totalEgresos.toFixed(2)),
      flujoNeto: Number((totalIngresos - totalEgresos).toFixed(2)),
      saldoTotalDisponible: Number(saldoTotalCuentas.toFixed(2)),
      cuentas: cuentas.map(c => ({
        id: c.id,
        banco: c.banco,
        numero: c.numero,
        tipo: c.tipo,
        moneda: c.moneda,
        saldoActual: c.saldoActual
      }))
    };
  }
};
