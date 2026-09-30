import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { parametroRepository } from '../repositories/parametroRepository';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { CXP_MEMORIA } from './compraService';

export interface CuentaPorPagarModel {
  id: string;
  empresaId: string;
  comprobanteId: string;
  proveedorId: string;
  proveedorNombre?: string;
  proveedorRuc?: string;
  serieNumero: string;
  importeOriginal: number;
  saldo: number;
  moneda: 'PEN' | 'USD';
  fechaEmision: string;
  fechaVencimiento: string;
  diasCredito: number;
  estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO';
}

export interface ReciboHonorarioModel {
  id: string;
  empresaId: string;
  periodoId: string;
  proveedorId: string;
  proveedorNombre?: string;
  proveedorRuc?: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaPago?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  importeBruto: number;
  aplicaRetencion: boolean;
  tasaRetencion: number;
  retencion: number;
  netoPagar: number;
  suspensionCuarta: boolean;
  numeroResolucionSuspension?: string;
  vigenciaSuspensionDesde?: string;
  vigenciaSuspensionHasta?: string;
  cuentaGasto: string;
  glosa: string;
  estado: 'BORRADOR' | 'REGISTRADO' | 'PAGADO' | 'ANULADO';
  asientoId?: string;
  cuentaPorPagarId?: string;
  version: number;
  origenParametroTasa?: string;
}

export const HONORARIOS_MEMORIA: ReciboHonorarioModel[] = [];

export const honorariosService = {
  async listarRecibos(empresaId: string, filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    proveedorId?: string;
    estado?: string;
  }): Promise<ReciboHonorarioModel[]> {
    let items = HONORARIOS_MEMORIA.filter(h => h.empresaId === empresaId);

    if (filtros?.proveedorId) items = items.filter(h => h.proveedorId === filtros.proveedorId);
    if (filtros?.estado && filtros.estado !== 'TODOS') items = items.filter(h => h.estado === filtros.estado);
    if (filtros?.fechaDesde) items = items.filter(h => h.fechaEmision >= filtros.fechaDesde!);
    if (filtros?.fechaHasta) items = items.filter(h => h.fechaEmision <= filtros.fechaHasta!);

    items.sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
    return items;
  },

  async registrarRecibo(
    empresaId: string,
    datos: {
      periodoId: string;
      proveedorId: string;
      proveedorNombre?: string;
      proveedorRuc?: string;
      serie: string;
      numero: string;
      fechaEmision: string;
      fechaPago?: string;
      moneda?: 'PEN' | 'USD';
      tipoCambio?: number;
      importeBruto: number;
      cuentaGasto?: string;
      glosa?: string;
      suspensionCuarta?: boolean;
      numeroResolucionSuspension?: string;
      vigenciaSuspensionDesde?: string;
      vigenciaSuspensionHasta?: string;
    },
    userId: string
  ): Promise<ReciboHonorarioModel> {
    const mes = datos.fechaEmision.substring(0, 7);
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período contable ${mes} se encuentra ${estadoPeriodo}. No se pueden registrar honorarios.`);
    }

    // 1. Obtener parámetros tributarios dinámicos con vigencia por fecha
    const paramTasa = await parametroRepository.obtenerParametroPorCodigo('TASA_RETENCION_4TA', datos.fechaEmision);
    const paramTope = await parametroRepository.obtenerParametroPorCodigo('TOPE_RETENCION_4TA', datos.fechaEmision);

    const tasaRetencionDecimal = paramTasa ? paramTasa.valorNumerico : 0.08;
    const topeMonto = paramTope ? paramTope.valorNumerico : 1500.00;

    const bruto = Money.create(datos.importeBruto);
    let retencion = Money.create(0);
    let aplicaRetencion = false;

    // 2. Evaluar suspensión acreditada
    const tieneSuspensionValida = Boolean(
      datos.suspensionCuarta &&
      (!datos.vigenciaSuspensionDesde || datos.fechaEmision >= datos.vigenciaSuspensionDesde) &&
      (!datos.vigenciaSuspensionHasta || datos.fechaEmision <= datos.vigenciaSuspensionHasta)
    );

    if (tieneSuspensionValida) {
      retencion = Money.create(0);
      aplicaRetencion = false;
    } else if (bruto.greaterThan(topeMonto)) {
      retencion = Money.round(bruto.times(tasaRetencionDecimal));
      aplicaRetencion = true;
    }

    const neto = Money.sub(bruto, retencion);

    // 3. Generar Asiento Contable a través de ContabilizacionService y AsientoService
    const propuesta = await contabilizacionService.generar(empresaId, 'HONORARIO', {
      total: Money.toNumber(bruto),
      retencion: Money.toNumber(retencion),
      neto: Money.toNumber(neto),
      glosa: datos.glosa || `Honorario profesional según ${datos.serie}-${datos.numero}`,
      docSerie: datos.serie,
      docNumero: datos.numero,
      anexoId: datos.proveedorId,
      moneda: datos.moneda || 'PEN',
      tipoCambio: datos.tipoCambio || 1.0,
      cuentaGastoHonorario: datos.cuentaGasto || '6321'
    });

    const asiento = await asientoService.crearAsiento(empresaId, {
      periodoId: datos.periodoId || `per-${mes}`,
      subdiario: '06',
      fecha: datos.fechaEmision,
      moneda: datos.moneda || 'PEN',
      tipoCambio: datos.tipoCambio || 1.0,
      glosa: datos.glosa || `Honorarios profesionales ${datos.serie}-${datos.numero}`,
      origenModulo: 'HONORARIOS',
      lineas: propuesta.lineas.map(l => ({
        codigoCuenta: l.codigoCuenta,
        debe: l.debe,
        haber: l.haber,
        glosa: l.glosaLinea,
        anexoId: l.anexoId
      }))
    }, userId);

    const reciboId = `rh-${Date.now()}`;
    const cuentaPorPagarId = `cxp-rh-${Date.now()}`;

    // 4. Crear Cuenta por Pagar en Cartera (para permitir pago por Tesorería)
    const nuevaCxP: CuentaPorPagarModel = {
      id: cuentaPorPagarId,
      empresaId,
      comprobanteId: reciboId,
      proveedorId: datos.proveedorId,
      proveedorNombre: datos.proveedorNombre || 'Prestador de Servicios',
      proveedorRuc: datos.proveedorRuc || '10000000001',
      serieNumero: `${datos.serie}-${datos.numero}`,
      importeOriginal: Money.toNumber(neto),
      saldo: Money.toNumber(neto),
      moneda: datos.moneda || 'PEN',
      fechaEmision: datos.fechaEmision,
      fechaVencimiento: datos.fechaPago || datos.fechaEmision,
      diasCredito: 0,
      estado: 'PENDIENTE'
    };
    CXP_MEMORIA.push(nuevaCxP);

    // 5. Persistir Recibo por Honorarios
    const nuevoRecibo: ReciboHonorarioModel = {
      id: reciboId,
      empresaId,
      periodoId: datos.periodoId || `per-${mes}`,
      proveedorId: datos.proveedorId,
      proveedorNombre: datos.proveedorNombre,
      proveedorRuc: datos.proveedorRuc,
      serie: datos.serie,
      numero: datos.numero,
      fechaEmision: datos.fechaEmision,
      fechaPago: datos.fechaPago,
      moneda: datos.moneda || 'PEN',
      tipoCambio: datos.tipoCambio || 1.0,
      importeBruto: Money.toNumber(bruto),
      aplicaRetencion,
      tasaRetencion: tasaRetencionDecimal * 100,
      retencion: Money.toNumber(retencion),
      netoPagar: Money.toNumber(neto),
      suspensionCuarta: tieneSuspensionValida,
      numeroResolucionSuspension: datos.numeroResolucionSuspension,
      vigenciaSuspensionDesde: datos.vigenciaSuspensionDesde,
      vigenciaSuspensionHasta: datos.vigenciaSuspensionHasta,
      cuentaGasto: datos.cuentaGasto || '6321',
      glosa: datos.glosa || `Honorario profesional según ${datos.serie}-${datos.numero}`,
      estado: 'REGISTRADO',
      asientoId: asiento.id,
      cuentaPorPagarId,
      version: 1,
      origenParametroTasa: `Parámetro vigente: ${(tasaRetencionDecimal * 100).toFixed(0)}% (Tope S/ ${topeMonto.toFixed(2)})`
    };

    HONORARIOS_MEMORIA.push(nuevoRecibo);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'REGISTRAR_RECIBO_HONORARIOS',
      tabla: 'recibos_honorarios',
      registroId: nuevoRecibo.id,
      valoresNuevos: nuevoRecibo
    });

    return nuevoRecibo;
  },

  async anularRecibo(empresaId: string, id: string, motivo: string, userId: string) {
    const recibo = HONORARIOS_MEMORIA.find(r => r.id === id && r.empresaId === empresaId);
    if (!recibo) throw new Error('RECIBO_NO_ENCONTRADO');
    if (recibo.estado === 'ANULADO') throw new Error('RECIBO_YA_ANULADO');

    const mes = recibo.fechaEmision.substring(0, 7);
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: No se puede anular un recibo en el período cerrado ${mes}.`);
    }

    // Extorno contable
    if (recibo.asientoId) {
      await asientoService.anularAsiento(empresaId, recibo.asientoId, motivo, userId);
    }

    // Anular CxP
    if (recibo.cuentaPorPagarId) {
      const cxpIdx = CXP_MEMORIA.findIndex(c => c.id === recibo.cuentaPorPagarId);
      if (cxpIdx !== -1) CXP_MEMORIA.splice(cxpIdx, 1);
    }

    recibo.estado = 'ANULADO';

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'ANULAR_RECIBO_HONORARIOS',
      tabla: 'recibos_honorarios',
      registroId: recibo.id,
      valoresAnteriores: { estado: 'REGISTRADO' },
      valoresNuevos: { estado: 'ANULADO', motivo }
    });

    return { success: true, message: 'Recibo por honorarios anulado y extornado' };
  }
};
