import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { CUENTAS_FINANCIERAS_MEMORIA } from './tesoreriaService';

export interface CajaChicaModel {
  id: string;
  empresaId: string;
  nombre: string;
  responsableAnexoId?: string;
  cuentaFinancieraId: string;
  montoFondo: number;
  saldoActual: number;
  estado: 'ABIERTA' | 'CERRADA';
}

export interface RendicionCajaChicaModel {
  id: string;
  cajaChicaId: string;
  empresaId: string;
  fecha: string;
  totalRendido: number;
  glosa: string;
  estado: 'PENDIENTE' | 'REPUERTA' | 'ANULADA';
  asientoReposicionId?: string;
}

export const CAJAS_CHICAS_MEMORIA: CajaChicaModel[] = [];
export const RENDICIONES_MEMORIA: RendicionCajaChicaModel[] = [];

export const cajaChicaService = {
  async listarCajas(empresaId: string): Promise<CajaChicaModel[]> {
    return CAJAS_CHICAS_MEMORIA.filter(c => c.empresaId === empresaId);
  },

  async abrirFondo(
    empresaId: string,
    datos: {
      nombre: string;
      responsableAnexoId?: string;
      cuentaFinancieraId: string;
      montoFondo: number;
      periodoId?: string;
    },
    userId: string
  ): Promise<CajaChicaModel> {
    const ctaBanco = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.id === datos.cuentaFinancieraId && c.empresaId === empresaId);
    if (!ctaBanco) throw new Error('CUENTA_ORIGEN_NO_EXISTE');

    const nuevaCaja: CajaChicaModel = {
      id: `cc-${Date.now()}`,
      empresaId,
      nombre: datos.nombre,
      responsableAnexoId: datos.responsableAnexoId,
      cuentaFinancieraId: datos.cuentaFinancieraId,
      montoFondo: datos.montoFondo,
      saldoActual: datos.montoFondo,
      estado: 'ABIERTA'
    };

    CAJAS_CHICAS_MEMORIA.push(nuevaCaja);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'APERTURA_CAJA_CHICA',
      tabla: 'cajas_chicas',
      registroId: nuevaCaja.id,
      valoresNuevos: nuevaCaja
    });

    return nuevaCaja;
  },

  async registrarRendicion(
    empresaId: string,
    cajaChicaId: string,
    datos: {
      fecha: string;
      totalRendido: number;
      glosa: string;
    },
    userId: string
  ): Promise<RendicionCajaChicaModel> {
    const caja = CAJAS_CHICAS_MEMORIA.find(c => c.id === cajaChicaId && c.empresaId === empresaId);
    if (!caja) throw new Error('CAJA_CHICA_NO_EXISTE');

    if (datos.totalRendido > caja.saldoActual) {
      throw new Error('FONDO_INSUFICIENTE: El total rendido supera el saldo disponible en la caja chica.');
    }

    caja.saldoActual = Money.toNumber(Money.sub(caja.saldoActual, datos.totalRendido));

    const rendicion: RendicionCajaChicaModel = {
      id: `rend-${Date.now()}`,
      cajaChicaId,
      empresaId,
      fecha: datos.fecha,
      totalRendido: datos.totalRendido,
      glosa: datos.glosa,
      estado: 'PENDIENTE'
    };

    RENDICIONES_MEMORIA.push(rendicion);
    return rendicion;
  },

  async reponerFondo(
    empresaId: string,
    rendicionId: string,
    periodoId: string,
    userId: string
  ) {
    const rendicion = RENDICIONES_MEMORIA.find(r => r.id === rendicionId && r.empresaId === empresaId);
    if (!rendicion) throw new Error('RENDICION_NO_EXISTE');
    if (rendicion.estado === 'REPUERTA') throw new Error('RENDICION_YA_REPUERTA');

    const caja = CAJAS_CHICAS_MEMORIA.find(c => c.id === rendicion.cajaChicaId);
    if (!caja) throw new Error('CAJA_NO_EXISTE');

    const ctaBanco = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.id === caja.cuentaFinancieraId);
    if (!ctaBanco) throw new Error('CUENTA_FINANCIERA_NO_EXISTE');

    // Asiento de reposición de caja chica
    const propuesta = await contabilizacionService.generar(empresaId, 'CAJA_CHICA_REPOSICION', {
      total: rendicion.totalRendido,
      cuentaFinancieraCodigo: ctaBanco.cuentaContableCodigo,
      glosa: `Reposición de Caja Chica - ${rendicion.glosa}`
    });

    const asiento = await asientoService.crearAsiento(empresaId, {
      periodoId,
      subdiario: '05',
      fecha: rendicion.fecha,
      moneda: 'PEN',
      tipoCambio: 1.0,
      glosa: `Reposición de fondo fijo ${caja.nombre}`,
      origenModulo: 'TESORERIA',
      lineas: propuesta.lineas.map(l => ({
        codigoCuenta: l.codigoCuenta,
        debe: l.debe,
        haber: l.haber,
        glosa: l.glosaLinea
      }))
    }, userId);

    caja.saldoActual = Money.toNumber(Money.add(caja.saldoActual, rendicion.totalRendido));
    ctaBanco.saldoActual = Money.toNumber(Money.sub(ctaBanco.saldoActual, rendicion.totalRendido));

    rendicion.estado = 'REPUERTA';
    rendicion.asientoReposicionId = asiento.id;

    return {
      success: true,
      message: 'Fondo de caja chica repuesto exitosamente',
      asientoId: asiento.id
    };
  }
};
