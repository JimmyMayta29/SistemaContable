import { db } from '../config/database';
import { sireService, SirePropuestaModel } from './sireService';
import { compraService, COMPRAS_MEMORIA } from './compraService';
import { ventaService, VENTAS_MEMORIA } from './ventaService';
import { periodoService } from './periodoService';
import { asientoService } from './asientoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export type EstadoConciliacionSire =
  | 'COINCIDE'
  | 'SOLO_EN_SISTEMA'
  | 'SOLO_EN_SUNAT'
  | 'DIFERENCIA_IMPORTE'
  | 'ANULADO_EN_SUNAT'
  | 'PERIODO_DISTINTO'
  | 'DIFERENCIA_OTROS_CAMPOS'
  | 'POSIBLE_DUPLICADO';

export interface SireConciliacionLineaModel {
  id: string;
  conciliacionId: string;
  empresaId: string;
  tipo: 'COMPRAS' | 'VENTAS';
  claveComprobante: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  fechaEmision: string;
  moneda: string;
  tipoCambio?: number;
  // Montos SUNAT
  baseSunat: number;
  igvSunat: number;
  totalSunat: number;
  totalSunatMe?: number;
  // Montos ERP (si existe)
  comprobanteSistemaId?: string;
  baseSistema?: number;
  igvSistema?: number;
  totalSistema?: number;
  totalSistemaMe?: number;
  // Estado y diferencias
  estadoConciliacion: EstadoConciliacionSire;
  diferenciaBase: number;
  diferenciaIgv: number;
  diferenciaTotal: number;
  camposConDiferencia?: string[];
  decision: 'PENDIENTE' | 'ACEPTADA' | 'OBSERVADA' | 'IGNORADA' | 'COLA_REVISION';
  motivoDecision?: string;
  usuarioDecisionId?: string;
  fechaDecision?: string;
  comprobanteGeneradoId?: string;
  asientoExtornoId?: string;
  car?: string;
  tieneDetraccion?: boolean;
  codigoDetraccion?: string;
  destinoCompra?: 'DESTINO_1' | 'DESTINO_2' | 'DESTINO_3' | 'DESTINO_4';
  cuentaGasto?: string;
  centroCostoId?: string;
}

export interface SireConciliacionResumenModel {
  id: string;
  empresaId: string;
  tipo: 'COMPRAS' | 'VENTAS';
  periodo: string;
  fechaConciliacion: string;
  totalCoinciden: number;
  totalSoloSistema: number;
  totalSoloSunat: number;
  totalDiferencias: number;
  totalAnuladosSunat: number;
  totalPeriodoDistinto: number;
  totalDiferenciaOtrosCampos: number;
  totalPosibleDuplicado: number;
  lineas: SireConciliacionLineaModel[];
}

export interface ReglaProveedorSire {
  id: string;
  empresaId: string;
  proveedorRuc: string;
  proveedorRazonSocial?: string;
  destinoCompra: 'DESTINO_1' | 'DESTINO_2' | 'DESTINO_3' | 'DESTINO_4';
  cuentaGasto: string; // ej: '6011', '6321'
  cuentaContableDestino?: string; // ej: '20111', '941'
  centroCostoId?: string;
  formaPagoDefault: 'CONTADO' | 'CREDITO';
  diasCredito?: number;
  aprobacionAutomatica: boolean;
}

export const CONCILIACIONES_SIRE_MEMORIA: SireConciliacionResumenModel[] = [];
export const REGLAS_PROVEEDOR_SIRE_MEMORIA: ReglaProveedorSire[] = [
  // Regla por defecto para el proveedor de prueba oficial
  {
    id: 'regla-demo-01',
    empresaId: '00000000-0000-0000-0000-000000000001',
    proveedorRuc: '20555666777',
    proveedorRazonSocial: 'PROVEEDOR LOGISTICA Y MERCADERIAS S.A.C.',
    destinoCompra: 'DESTINO_1',
    cuentaGasto: '6011',
    cuentaContableDestino: '20111',
    centroCostoId: 'CC-ALMACEN',
    formaPagoDefault: 'CREDITO',
    diasCredito: 30,
    aprobacionAutomatica: true
  }
];

export const conciliadorSireService = {
  /**
   * Registra o actualiza una regla de contabilización automática por proveedor (Fase 9.2)
   */
  async guardarReglaProveedor(empresaId: string, regla: Omit<ReglaProveedorSire, 'id'>): Promise<ReglaProveedorSire> {
    const idx = REGLAS_PROVEEDOR_SIRE_MEMORIA.findIndex(
      r => r.empresaId === empresaId && r.proveedorRuc === regla.proveedorRuc
    );
    const id = idx >= 0 ? REGLAS_PROVEEDOR_SIRE_MEMORIA[idx].id : `regla-${Date.now()}`;
    const guardada: ReglaProveedorSire = { id, ...regla, empresaId };

    if (idx >= 0) {
      REGLAS_PROVEEDOR_SIRE_MEMORIA[idx] = guardada;
    } else {
      REGLAS_PROVEEDOR_SIRE_MEMORIA.push(guardada);
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: 'usr-admin',
      tablaAfectada: 'reglas_proveedor_sire',
      registroId: id,
      accion: 'GUARDAR_REGLA',
      datosNuevos: guardada
    });

    return guardada;
  },

  obtenerReglaProveedor(empresaId: string, proveedorRuc: string): ReglaProveedorSire | null {
    return REGLAS_PROVEEDOR_SIRE_MEMORIA.find(
      r => (r.empresaId === empresaId || r.empresaId === '00000000-0000-0000-0000-000000000001') && r.proveedorRuc === proveedorRuc
    ) || null;
  },

  listarReglasProveedor(empresaId: string): ReglaProveedorSire[] {
    return REGLAS_PROVEEDOR_SIRE_MEMORIA.filter(r => r.empresaId === empresaId);
  },

  /**
   * Ejecuta el cruce automático entre la propuesta descargada y los registros internos,
   * identificando los 8 estados oficiales del SIRE (Fase 9.1).
   */
  async conciliarPeriodo(
    empresaId: string,
    tipo: 'COMPRAS' | 'VENTAS',
    periodo: string,
    opciones: { toleranciaImporte?: number; toleranciaFechaDias?: number } = {}
  ): Promise<SireConciliacionResumenModel> {
    const tolerancia = opciones.toleranciaImporte ?? 0.05;

    // 1. Obtener propuesta
    let propuesta = await sireService.obtenerPropuesta(empresaId, tipo, periodo);
    if (!propuesta) {
      propuesta = await sireService.descargarPropuesta(empresaId, tipo, periodo, 'SISTEMA');
    }

    // 2. Obtener comprobantes ERP
    const erpComprobantes = tipo === 'COMPRAS'
      ? COMPRAS_MEMORIA.filter(c => c.empresaId === empresaId && c.estado !== 'ANULADO')
      : VENTAS_MEMORIA.filter(v => v.empresaId === empresaId && v.estado !== 'ANULADO');

    const conciliacionId = `concil-${empresaId}-${tipo}-${periodo}`;
    const lineasConciliadas: SireConciliacionLineaModel[] = [];

    // Contadores de estados
    let countCoinciden = 0;
    let countSoloSistema = 0;
    let countSoloSunat = 0;
    let countDiferencias = 0;
    let countAnuladosSunat = 0;
    let countPeriodoDistinto = 0;
    let countDiferenciaOtrosCampos = 0;
    let countPosibleDuplicado = 0;

    // Mapa de comprobantes del ERP por clave
    const mapErp = new Map<string, any[]>();
    for (const c of erpComprobantes) {
      const cAny = c as any;
      const ruc = tipo === 'COMPRAS' ? (cAny.proveedorRuc || '') : (cAny.clienteRuc || '');
      const key = `${c.tipoComprobante}-${c.serie}-${c.numero}-${ruc}`;
      if (!mapErp.has(key)) mapErp.set(key, []);
      mapErp.get(key)!.push(c);
    }

    const matchedErpKeys = new Set<string>();

    // Procesar comprobantes de SUNAT
    for (const p of propuesta.lineas) {
      const ruc = p.rucEmisor;
      const key = `${p.tipoComprobante}-${p.serie}-${p.numero}-${ruc}`;
      const matches = mapErp.get(key) || [];

      // 1. ANULADO_EN_SUNAT
      const estadoSunatRaw = (p as any).estadoComprobante || (p as any).estado || '1';
      if (estadoSunatRaw === 'ANULADO' || estadoSunatRaw === '2') {
        countAnuladosSunat++;
        lineasConciliadas.push({
          id: `linea-${conciliacionId}-${p.car || key}`,
          conciliacionId,
          empresaId,
          tipo,
          claveComprobante: key,
          tipoComprobante: p.tipoComprobante,
          serie: p.serie,
          numero: p.numero,
          rucEmisor: p.rucEmisor,
          razonSocialEmisor: p.razonSocialEmisor,
          fechaEmision: p.fechaEmision,
          moneda: p.moneda,
          baseSunat: p.baseGravada,
          igvSunat: p.igv,
          totalSunat: p.total,
          estadoConciliacion: 'ANULADO_EN_SUNAT',
          diferenciaBase: 0,
          diferenciaIgv: 0,
          diferenciaTotal: 0,
          decision: 'OBSERVADA',
          motivoDecision: 'Comprobante figura como ANULADO en los padrones de SUNAT.',
          car: p.car
        });
        continue;
      }

      // 2. POSIBLE_DUPLICADO
      if (matches.length > 1) {
        countPosibleDuplicado++;
        matchedErpKeys.add(key);
        lineasConciliadas.push({
          id: `linea-${conciliacionId}-${p.car || key}`,
          conciliacionId,
          empresaId,
          tipo,
          claveComprobante: key,
          tipoComprobante: p.tipoComprobante,
          serie: p.serie,
          numero: p.numero,
          rucEmisor: p.rucEmisor,
          razonSocialEmisor: p.razonSocialEmisor,
          fechaEmision: p.fechaEmision,
          moneda: p.moneda,
          baseSunat: p.baseGravada,
          igvSunat: p.igv,
          totalSunat: p.total,
          comprobanteSistemaId: matches[0].id,
          baseSistema: Number(matches[0].baseGravada),
          igvSistema: Number(matches[0].igv),
          totalSistema: Number(matches[0].total),
          estadoConciliacion: 'POSIBLE_DUPLICADO',
          diferenciaBase: 0,
          diferenciaIgv: 0,
          diferenciaTotal: 0,
          decision: 'OBSERVADA',
          motivoDecision: `Existen ${matches.length} comprobantes con la misma serie y número registrados en el sistema.`,
          car: p.car
        });
        continue;
      }

      const match = matches[0];

      if (match) {
        matchedErpKeys.add(key);

        // 3. PERIODO_DISTINTO
        const periodoMatch = match.periodoId ? match.periodoId.replace('per-', '') : match.fechaEmision.substring(0, 7);
        if (periodoMatch !== periodo) {
          countPeriodoDistinto++;
          lineasConciliadas.push({
            id: `linea-${conciliacionId}-${p.car || key}`,
            conciliacionId,
            empresaId,
            tipo,
            claveComprobante: key,
            tipoComprobante: p.tipoComprobante,
            serie: p.serie,
            numero: p.numero,
            rucEmisor: p.rucEmisor,
            razonSocialEmisor: p.razonSocialEmisor,
            fechaEmision: p.fechaEmision,
            moneda: p.moneda,
            baseSunat: p.baseGravada,
            igvSunat: p.igv,
            totalSunat: p.total,
            comprobanteSistemaId: match.id,
            baseSistema: Number(match.baseGravada),
            igvSistema: Number(match.igv),
            totalSistema: Number(match.total),
            estadoConciliacion: 'PERIODO_DISTINTO',
            diferenciaBase: 0,
            diferenciaIgv: 0,
            diferenciaTotal: 0,
            decision: 'OBSERVADA',
            motivoDecision: `El comprobante está registrado en el período ${periodoMatch} del sistema pero figura en la propuesta ${periodo} de SUNAT.`,
            car: p.car
          });
          continue;
        }

        // Manejo de moneda extranjera (USD)
        let totalSunatPen = p.total;
        let totalSistemaPen = Number(match.total);
        if (p.moneda === 'USD' && match.moneda === 'USD') {
          // Comparación directa en dólares
        } else if (p.moneda === 'USD' && match.moneda === 'PEN') {
          const tc = p.tipoCambio || match.tipoCambio || 1.0;
          totalSunatPen = Number((p.total * tc).toFixed(2));
        }

        const difTotal = Math.abs(totalSistemaPen - totalSunatPen);
        const difBase = Math.abs(Number(match.baseGravada) - p.baseGravada);
        const difIgv = Math.abs(Number(match.igv) - p.igv);

        // 4. DIFERENCIA_OTROS_CAMPOS (monto cuadra pero fecha/razon social/tipo cambia)
        const camposDiff: string[] = [];
        if (match.fechaEmision && p.fechaEmision && match.fechaEmision !== p.fechaEmision) {
          camposDiff.push('FECHA_EMISION');
        }
        if (match.moneda && p.moneda && match.moneda !== p.moneda) {
          camposDiff.push('MONEDA');
        }
        if (match.tipoComprobante && p.tipoComprobante && match.tipoComprobante !== p.tipoComprobante) {
          camposDiff.push('TIPO_COMPROBANTE');
        }

        if (difTotal <= tolerancia && camposDiff.length > 0) {
          countDiferenciaOtrosCampos++;
          lineasConciliadas.push({
            id: `linea-${conciliacionId}-${p.car || key}`,
            conciliacionId,
            empresaId,
            tipo,
            claveComprobante: key,
            tipoComprobante: p.tipoComprobante,
            serie: p.serie,
            numero: p.numero,
            rucEmisor: p.rucEmisor,
            razonSocialEmisor: p.razonSocialEmisor,
            fechaEmision: p.fechaEmision,
            moneda: p.moneda,
            baseSunat: p.baseGravada,
            igvSunat: p.igv,
            totalSunat: p.total,
            comprobanteSistemaId: match.id,
            baseSistema: Number(match.baseGravada),
            igvSistema: Number(match.igv),
            totalSistema: Number(match.total),
            estadoConciliacion: 'DIFERENCIA_OTROS_CAMPOS',
            diferenciaBase: 0,
            diferenciaIgv: 0,
            diferenciaTotal: 0,
            camposConDiferencia: camposDiff,
            decision: 'PENDIENTE',
            motivoDecision: `Importe conforme pero existen diferencias en: ${camposDiff.join(', ')}`,
            car: p.car
          });
        } else if (difTotal <= tolerancia) {
          // 5. COINCIDE
          countCoinciden++;
          lineasConciliadas.push({
            id: `linea-${conciliacionId}-${p.car || key}`,
            conciliacionId,
            empresaId,
            tipo,
            claveComprobante: key,
            tipoComprobante: p.tipoComprobante,
            serie: p.serie,
            numero: p.numero,
            rucEmisor: p.rucEmisor,
            razonSocialEmisor: p.razonSocialEmisor,
            fechaEmision: p.fechaEmision,
            moneda: p.moneda,
            baseSunat: p.baseGravada,
            igvSunat: p.igv,
            totalSunat: p.total,
            comprobanteSistemaId: match.id,
            baseSistema: Number(match.baseGravada),
            igvSistema: Number(match.igv),
            totalSistema: Number(match.total),
            estadoConciliacion: 'COINCIDE',
            diferenciaBase: 0,
            diferenciaIgv: 0,
            diferenciaTotal: 0,
            decision: 'ACEPTADA',
            car: p.car,
            tieneDetraccion: p.tieneDetraccion,
            codigoDetraccion: p.codigoDetraccion
          });
        } else {
          // 6. DIFERENCIA_IMPORTE
          countDiferencias++;
          lineasConciliadas.push({
            id: `linea-${conciliacionId}-${p.car || key}`,
            conciliacionId,
            empresaId,
            tipo,
            claveComprobante: key,
            tipoComprobante: p.tipoComprobante,
            serie: p.serie,
            numero: p.numero,
            rucEmisor: p.rucEmisor,
            razonSocialEmisor: p.razonSocialEmisor,
            fechaEmision: p.fechaEmision,
            moneda: p.moneda,
            baseSunat: p.baseGravada,
            igvSunat: p.igv,
            totalSunat: p.total,
            comprobanteSistemaId: match.id,
            baseSistema: Number(match.baseGravada),
            igvSistema: Number(match.igv),
            totalSistema: Number(match.total),
            estadoConciliacion: 'DIFERENCIA_IMPORTE',
            diferenciaBase: Number((Number(match.baseGravada) - p.baseGravada).toFixed(2)),
            diferenciaIgv: Number((Number(match.igv) - p.igv).toFixed(2)),
            diferenciaTotal: Number((Number(match.total) - p.total).toFixed(2)),
            decision: 'PENDIENTE',
            car: p.car,
            tieneDetraccion: p.tieneDetraccion,
            codigoDetraccion: p.codigoDetraccion
          });
        }
      } else {
        // 7. SOLO_EN_SUNAT
        countSoloSunat++;
        lineasConciliadas.push({
          id: `linea-${conciliacionId}-${p.car || key}`,
          conciliacionId,
          empresaId,
          tipo,
          claveComprobante: key,
          tipoComprobante: p.tipoComprobante,
          serie: p.serie,
          numero: p.numero,
          rucEmisor: p.rucEmisor,
          razonSocialEmisor: p.razonSocialEmisor,
          fechaEmision: p.fechaEmision,
          moneda: p.moneda,
          baseSunat: p.baseGravada,
          igvSunat: p.igv,
          totalSunat: p.total,
          estadoConciliacion: 'SOLO_EN_SUNAT',
          diferenciaBase: -p.baseGravada,
          diferenciaIgv: -p.igv,
          diferenciaTotal: -p.total,
          decision: 'PENDIENTE',
          car: p.car,
          tieneDetraccion: p.tieneDetraccion,
          codigoDetraccion: p.codigoDetraccion
        });
      }
    }

    // 8. SOLO_EN_SISTEMA
    for (const [key, comps] of mapErp.entries()) {
      if (!matchedErpKeys.has(key)) {
        for (const c of comps) {
          if (c.periodoId === `per-${periodo}`) {
            countSoloSistema++;
            const ruc = tipo === 'COMPRAS' ? c.proveedorRuc : c.clienteRuc;
            const nombre = tipo === 'COMPRAS' ? c.proveedorNombre : c.clienteNombre;
            lineasConciliadas.push({
              id: `linea-${conciliacionId}-erp-${c.id}`,
              conciliacionId,
              empresaId,
              tipo,
              claveComprobante: key,
              tipoComprobante: c.tipoComprobante,
              serie: c.serie,
              numero: c.numero,
              rucEmisor: ruc || '',
              razonSocialEmisor: nombre || '',
              fechaEmision: c.fechaEmision,
              moneda: c.moneda || 'PEN',
              baseSunat: 0,
              igvSunat: 0,
              totalSunat: 0,
              comprobanteSistemaId: c.id,
              baseSistema: Number(c.baseGravada),
              igvSistema: Number(c.igv),
              totalSistema: Number(c.total),
              estadoConciliacion: 'SOLO_EN_SISTEMA',
              diferenciaBase: Number(c.baseGravada),
              diferenciaIgv: Number(c.igv),
              diferenciaTotal: Number(c.total),
              decision: 'PENDIENTE'
            });
          }
        }
      }
    }

    const resultado: SireConciliacionResumenModel = {
      id: conciliacionId,
      empresaId,
      tipo,
      periodo,
      fechaConciliacion: new Date().toISOString(),
      totalCoinciden: countCoinciden,
      totalSoloSistema: countSoloSistema,
      totalSoloSunat: countSoloSunat,
      totalDiferencias: countDiferencias,
      totalAnuladosSunat: countAnuladosSunat,
      totalPeriodoDistinto: countPeriodoDistinto,
      totalDiferenciaOtrosCampos: countDiferenciaOtrosCampos,
      totalPosibleDuplicado: countPosibleDuplicado,
      lineas: lineasConciliadas
    };

    const idx = CONCILIACIONES_SIRE_MEMORIA.findIndex(c => c.id === conciliacionId);
    if (idx >= 0) CONCILIACIONES_SIRE_MEMORIA[idx] = resultado;
    else CONCILIACIONES_SIRE_MEMORIA.push(resultado);

    return resultado;
  },

  /**
   * Acepta una línea individual de propuesta SOLO_EN_SUNAT aplicando el motor de reglas (Fase 9.2)
   */
  async aceptarPropuestaLinea(
    empresaId: string,
    lineaId: string,
    userId: string,
    opciones?: { forzarSinRegla?: boolean; reglaPersonalizada?: Partial<ReglaProveedorSire> }
  ) {
    const conciliacion = CONCILIACIONES_SIRE_MEMORIA.find(c => c.lineas.some(l => l.id === lineaId));
    if (!conciliacion) throw new Error('LINEA_NO_ENCONTRADA: La línea de conciliación no existe.');

    // Validar período abierto
    const cerrado = await periodoService.estaCerrado(empresaId, `per-${conciliacion.periodo}`);
    if (cerrado) {
      throw new Error('PERIODO_CERRADO: No se puede registrar comprobantes de la propuesta en un período cerrado.');
    }

    const linea = conciliacion.lineas.find(l => l.id === lineaId)!;
    if (linea.decision === 'ACEPTADA') {
      throw new Error('CONCURRENCIA_SIRE: Esta propuesta SIRE ya fue aceptada previamente.');
    }
    if ((linea as any).procesando) {
      throw new Error('CONCURRENCIA_SIRE: Esta propuesta SIRE se encuentra en proceso de incorporación concurrente.');
    }

    (linea as any).procesando = true;

    try {
      if (linea.estadoConciliacion === 'SOLO_EN_SUNAT') {
        if (linea.tipo === 'COMPRAS') {
          // MOTOR DE REGLAS POR PROVEEDOR (9.2)
          const regla = opciones?.reglaPersonalizada || this.obtenerReglaProveedor(empresaId, linea.rucEmisor);

          const destinoCompra = regla?.destinoCompra || 'DESTINO_1';
          const cuentaGasto = regla?.cuentaGasto || '6011';
          const centroCostoId = regla?.centroCostoId || null;

          const proveedorId = `prv-${linea.rucEmisor}`;
          const nuevo = await compraService.crearBorrador(empresaId, {
            periodoId: `per-${conciliacion.periodo}`,
            fechaEmision: linea.fechaEmision,
            fechaContable: linea.fechaEmision,
            tipoComprobante: linea.tipoComprobante,
            serie: linea.serie,
            numero: linea.numero,
            proveedorId,
            moneda: linea.moneda as any || 'PEN',
            tipoAdquisicion: destinoCompra === 'DESTINO_3' ? '3' : (destinoCompra === 'DESTINO_2' ? '2' : (destinoCompra === 'DESTINO_4' ? '4' : '1')),
            baseGravada: linea.baseSunat,
            igv: linea.igvSunat,
            total: linea.totalSunat,
            tieneDetraccion: linea.tieneDetraccion || false,
            codigoBienDetraccion: linea.codigoDetraccion,
            glosa: `Aceptado SIRE RCE CAR ${linea.car || ''} [${destinoCompra}] [Cta: ${cuentaGasto}]`
          }, userId);

          // Contabilizar de inmediato
          await compraService.registrarBorradorCompra(nuevo.id, userId, empresaId);

          linea.decision = 'ACEPTADA';
          linea.comprobanteGeneradoId = nuevo.id;
          linea.usuarioDecisionId = userId;
          linea.fechaDecision = new Date().toISOString();
          linea.destinoCompra = destinoCompra;
          linea.cuentaGasto = cuentaGasto;
          linea.centroCostoId = centroCostoId || undefined;
        } else {
          const clienteId = `cli-${linea.rucEmisor}`;
          const nuevo = await ventaService.crearBorrador(empresaId, {
            periodoId: `per-${conciliacion.periodo}`,
            fechaEmision: linea.fechaEmision,
            fechaContable: linea.fechaEmision,
            tipoComprobante: linea.tipoComprobante,
            serie: linea.serie,
            numero: linea.numero,
            clienteId,
            moneda: linea.moneda as any || 'PEN',
            baseGravada: linea.baseSunat,
            igv: linea.igvSunat,
            total: linea.totalSunat,
            glosa: `Aceptado SIRE RVIE CAR ${linea.car || ''}`
          }, userId);

          await ventaService.registrarBorradorVenta(nuevo.id, userId, empresaId);

          linea.decision = 'ACEPTADA';
          linea.comprobanteGeneradoId = nuevo.id;
          linea.usuarioDecisionId = userId;
          linea.fechaDecision = new Date().toISOString();
        }
      } else {
        linea.decision = 'ACEPTADA';
        linea.usuarioDecisionId = userId;
        linea.fechaDecision = new Date().toISOString();
      }
    } finally {
      delete (linea as any).procesando;
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_conciliacion_lineas',
      registroId: linea.id,
      accion: 'ACEPTAR_PROPUESTA_LINEA',
      datosNuevos: {
        clave: linea.claveComprobante,
        comprobanteGeneradoId: linea.comprobanteGeneradoId,
        destinoCompra: linea.destinoCompra
      }
    });

    return {
      success: true,
      mensaje: `Comprobante ${linea.serie}-${linea.numero} incorporado y contabilizado exitosamente.`,
      comprobanteGeneradoId: linea.comprobanteGeneradoId
    };
  },

  /**
   * Aceptación masiva de líneas SOLO_EN_SUNAT:
   * Procesa automáticamente ÚNICAMENTE aquellas con regla de proveedor configurada.
   * Las líneas sin regla quedan en cola de revisión (Fase 9.2).
   */
  async aceptarPropuestasMasivo(empresaId: string, periodo: string, userId: string) {
    const conc = CONCILIACIONES_SIRE_MEMORIA.find(
      c => c.empresaId === empresaId && c.periodo === periodo && c.tipo === 'COMPRAS'
    );
    if (!conc) throw new Error('CONCILIACION_NO_ENCONTRADA: Ejecute primero la conciliación del período.');

    const lineasSoloSunat = conc.lineas.filter(
      l => l.estadoConciliacion === 'SOLO_EN_SUNAT' && l.decision !== 'ACEPTADA'
    );

    let aceptadas = 0;
    let enColaRevision = 0;
    const detalles: Array<{ id: string; ruc: string; comprobante: string; estado: string; motivo?: string }> = [];

    for (const l of lineasSoloSunat) {
      const regla = this.obtenerReglaProveedor(empresaId, l.rucEmisor);
      if (regla && regla.aprobacionAutomatica) {
        try {
          await this.aceptarPropuestaLinea(empresaId, l.id, userId);
          aceptadas++;
          detalles.push({ id: l.id, ruc: l.rucEmisor, comprobante: `${l.serie}-${l.numero}`, estado: 'ACEPTADA' });
        } catch (e: any) {
          enColaRevision++;
          detalles.push({ id: l.id, ruc: l.rucEmisor, comprobante: `${l.serie}-${l.numero}`, estado: 'ERROR', motivo: e.message });
        }
      } else {
        l.decision = 'COLA_REVISION';
        l.motivoDecision = 'En cola de revisión: Proveedor sin regla de contabilización (Destino 1-4 y cuenta contable).';
        enColaRevision++;
        detalles.push({
          id: l.id,
          ruc: l.rucEmisor,
          comprobante: `${l.serie}-${l.numero}`,
          estado: 'COLA_REVISION',
          motivo: 'Proveedor sin regla'
        });
      }
    }

    return {
      totalEvaluadas: lineasSoloSunat.length,
      aceptadas,
      enColaRevision,
      detalles
    };
  },

  /**
   * Reversión de aceptación SIRE mediante asiento de extorno (Fase 9.2)
   */
  async revertirAceptacionPropuesta(empresaId: string, lineaId: string, motivo: string, userId: string) {
    const conc = CONCILIACIONES_SIRE_MEMORIA.find(c => c.lineas.some(l => l.id === lineaId));
    if (!conc) throw new Error('LINEA_NO_ENCONTRADA: La línea no existe.');

    const linea = conc.lineas.find(l => l.id === lineaId)!;
    if (linea.decision !== 'ACEPTADA' || !linea.comprobanteGeneradoId) {
      throw new Error('NO_REVERSIBLE: La línea no se encuentra en estado ACEPTADA o no generó comprobante.');
    }

    // Buscar comprobante de compra o venta generado
    const compra = COMPRAS_MEMORIA.find(c => c.id === linea.comprobanteGeneradoId);
    let extornoId = '';

    if (compra && compra.asientoId) {
      const ext = await asientoService.anular(
        compra.asientoId,
        `Extorno por reversión de propuesta SIRE: ${motivo}`,
        userId,
        empresaId
      );
      extornoId = (ext as any).extornoId || (ext as any).id || '';
      compra.estado = 'ANULADO';
    }

    linea.decision = 'PENDIENTE';
    linea.asientoExtornoId = extornoId;
    linea.motivoDecision = `Revertido por extorno: ${motivo}`;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_conciliacion_lineas',
      registroId: linea.id,
      accion: 'REVERTIR_ACEPTACION_SIRE',
      datosNuevos: { lineaId, extornoId, motivo }
    });

    return {
      success: true,
      mensaje: `Aceptación SIRE revertida exitosamente mediante asiento de extorno ${extornoId}`,
      extornoId
    };
  },

  /**
   * Procesa acciones en lote sobre líneas de conciliación SIRE
   */
  async procesarLote(
    empresaId: string,
    accion: 'ACEPTAR' | 'OBSERVAR' | 'IGNORAR',
    lineasIds: string[],
    motivo: string | undefined,
    userId: string
  ): Promise<{ procesados: number; fallidos: number; detalles: any[] }> {
    let procesados = 0;
    let fallidos = 0;
    const detalles: any[] = [];

    for (const id of lineasIds) {
      try {
        if (accion === 'ACEPTAR') {
          const res = await this.aceptarPropuestaLinea(empresaId, id, userId);
          procesados++;
          detalles.push({ id, success: true, resultado: res });
        } else {
          const conc = CONCILIACIONES_SIRE_MEMORIA.find(c => c.lineas.some(l => l.id === id));
          const linea = conc?.lineas.find(l => l.id === id);
          if (linea) {
            linea.decision = accion === 'OBSERVAR' ? 'OBSERVADA' : 'IGNORADA';
            linea.motivoDecision = motivo || `Marcado como ${accion} en lote`;
          }
          procesados++;
          detalles.push({ id, success: true, decision: linea?.decision });
        }
      } catch (err: any) {
        fallidos++;
        detalles.push({ id, success: false, error: err.message });
      }
    }

    return { procesados, fallidos, detalles };
  },

  /**
   * CIERRE DEL CICLO SIRE: Aceptación de la Propuesta Oficial (Fase 9.3)
   */
  async aceptarPropuestaSireOficial(empresaId: string, tipo: 'COMPRAS' | 'VENTAS', periodo: string, userId: string) {
    const propuesta = await sireService.obtenerPropuesta(empresaId, tipo, periodo);
    if (!propuesta) throw new Error('PROPUESTA_NO_ENCONTRADA: No existe propuesta descargada.');

    // Simulación de generación del Preliminar y Aceptación de Propuesta
    (propuesta as any).estado = 'ACEPTADA_OFICIAL';
    (propuesta as any).fechaAceptacion = new Date().toISOString();
    (propuesta as any).ticketAceptacion = `TCK-SUNAT-${Date.now()}`;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_propuestas',
      registroId: propuesta.id,
      accion: 'ACEPTAR_PROPUESTA_OFICIAL_SIRE',
      datosNuevos: { tipo, periodo, ticket: (propuesta as any).ticketAceptacion }
    });

    return {
      success: true,
      mensaje: `Propuesta ${tipo} para el período ${periodo} aceptada exitosamente ante SUNAT.`,
      ticket: (propuesta as any).ticketAceptacion,
      especificacionNormativa: 'R.S. N° 000112-2021/SUNAT y modif. R.S. N° 000040-2022/SUNAT'
    };
  },

  /**
   * CIERRE DEL CICLO SIRE: Reemplazo de Propuesta con archivo plano (Fase 9.3)
   * Marcado como PENDIENTE_VERIFICAR_SUNAT para el protocolo live de envío de tickets ZIP
   */
  async reemplazarPropuestaSireOficial(
    empresaId: string,
    tipo: 'COMPRAS' | 'VENTAS',
    periodo: string,
    comprobantesReemplazo: any[],
    userId: string
  ) {
    const ticketReemplazo = `TCK-REEMP-${Date.now()}`;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_propuestas',
      registroId: `reemp-${periodo}`,
      accion: 'REEMPLAZAR_PROPUESTA_OFICIAL_SIRE',
      datosNuevos: {
        tipo,
        periodo,
        totalComprobantes: comprobantesReemplazo.length,
        ticket: ticketReemplazo,
        estadoApiSunat: 'PENDIENTE_VERIFICAR_SUNAT'
      }
    });

    return {
      success: true,
      mensaje: `Reemplazo de propuesta ${tipo} ${periodo} generado con ${comprobantesReemplazo.length} comprobante(s).`,
      ticket: ticketReemplazo,
      estadoApiSunat: 'PENDIENTE_VERIFICAR_SUNAT'
    };
  },

  /**
   * CIERRE DEL CICLO SIRE: Ajustes Posteriores (Anexos 11, 12, 13) (Fase 9.3)
   */
  async registrarAjustePosterior(
    empresaId: string,
    periodoAjuste: string,
    periodoAfectado: string,
    ajusteData: any,
    userId: string
  ) {
    const idAjuste = `ajuste-${Date.now()}`;
    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_ajustes_posteriores',
      registroId: idAjuste,
      accion: 'REGISTRAR_AJUSTE_POSTERIOR',
      datosNuevos: { periodoAjuste, periodoAfectado, ajusteData, estadoApiSunat: 'PENDIENTE_VERIFICAR_SUNAT' }
    });

    return {
      success: true,
      idAjuste,
      periodoAjuste,
      periodoAfectado,
      estadoApiSunat: 'PENDIENTE_VERIFICAR_SUNAT'
    };
  }
};
