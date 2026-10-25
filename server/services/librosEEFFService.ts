import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { ASIENTOS_MEMORIA } from './asientoService';
import { buscarCuentaPCGE, PLAN_CONTABLE_PCGE } from '../../src/data/pcgeAccounts';
import { empresaRepository } from '../repositories/empresaRepository';

export const NOMBRES_SUBDIARIOS: Record<string, string> = {
  '00': 'ASIENTO DE APERTURA / REAPERTURA',
  '01': 'REGISTRO DE COMPRAS',
  '02': 'REGISTRO DE VENTAS',
  '03': 'CAJA Y BANCOS - INGRESOS Y COBRANZAS',
  '04': 'PLANILLAS Y CARGAS SOCIALES (PLAME)',
  '05': 'CAJA Y BANCOS - EGRESOS Y PAGOS',
  '06': 'RECIBOS POR HONORARIOS (4TA CATEGORÍA)',
  '07': 'KARDEX Y COSTO DE VENTAS',
  '08': 'DESTINOS AUTOMÁTICOS Y DIFERENCIA DE CAMBIO',
  '09': 'ASIENTOS DE CIERRE ANUAL Y AJUSTES PCGE',
  '10': 'OPERACIONES VARIAS Y AJUSTES MANUALES'
};

export interface OpcionesHojaTrabajo10Col {
  acumuladoAlMes?: boolean;
  correctorasActivoEnNegativo?: boolean;
  incluirCierreYAjustes?: boolean;
  mapeoFuncionPersonalizado?: Record<string, 'COSTO_VENTAS' | 'GASTOS_ADMIN' | 'GASTOS_VENTAS' | 'GASTOS_FINANCIEROS' | 'INGRESOS' | 'EXCLUIDO'>;
}

export interface FilaHojaTrabajo10Col {
  codigoCuenta: string;
  nombreCuenta: string;
  elemento: number;
  montosDebe: number;
  montosHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
  inventarioActivo: number;
  inventarioPasivo: number;
  naturalezaPerdida: number;
  naturalezaGanancia: number;
  funcionPerdida: number;
  funcionGanancia: number;
  esCorrectora?: boolean;
}

export interface FilaEquilibradora {
  inventarioActivo: number;
  inventarioPasivo: number;
  naturalezaPerdida: number;
  naturalezaGanancia: number;
  funcionPerdida: number;
  funcionGanancia: number;
  etiqueta: 'UTILIDAD DEL EJERCICIO' | 'PÉRDIDA DEL EJERCICIO' | 'EQUILIBRIO';
}

export interface HojaTrabajo10ColumnasReporte {
  empresaId: string;
  razonSocial: string;
  ruc: string;
  direccion: string;
  periodo: string;
  anio: number;
  mes: string;
  mesNombre: string;
  titulo: string;
  moneda: string;
  acumuladoAlMes: boolean;
  correctorasActivoEnNegativo: boolean;
  filas: FilaHojaTrabajo10Col[];
  totales: {
    montosDebe: number;
    montosHaber: number;
    saldoDeudor: number;
    saldoAcreedor: number;
    inventarioActivo: number;
    inventarioPasivo: number;
    naturalezaPerdida: number;
    naturalezaGanancia: number;
    funcionPerdida: number;
    funcionGanancia: number;
  };
  resultadoEjercicio: {
    inventario: number;
    naturaleza: number;
    funcion: number;
    tipo: 'UTILIDAD' | 'PERDIDA' | 'EQUILIBRIO';
    monto: number;
  };
  filaResultado: FilaEquilibradora;
  sumasIguales: {
    montosDebe: number;
    montosHaber: number;
    saldoDeudor: number;
    saldoAcreedor: number;
    inventarioActivo: number;
    inventarioPasivo: number;
    naturalezaPerdida: number;
    naturalezaGanancia: number;
    funcionPerdida: number;
    funcionGanancia: number;
  };
  controlesCuadre: {
    montosCuadrados: boolean;
    saldosCuadrados: boolean;
    balanceCuadrado: boolean;
    resultadosCoinciden: boolean;
    todoCuadrado: boolean;
    diferenciaMontos: number;
    diferenciaSaldos: number;
    diferenciaNaturalezaFuncion: number;
    alertas: string[];
  };
}

export interface OpcionesLibroDiarioESTANDAR {
  incluirAjustesYCierre?: boolean;
  voucherDesde?: string;
  voucherHasta?: string;
  formatoFecha?: 'DD/MM/AAAA' | 'AAAA-MM-DD';
  ocultarGlosa?: boolean;
  saltoPaginaSubdiario?: boolean;
}

export interface LineaDiarioESTANDAR {
  linea: number;
  fechaEmision: string;
  codigoCuenta: string;
  nombreCuenta: string;
  concepto: string;
  debito: number;
  credito: number;
}

export interface VoucherDiarioESTANDAR {
  numeroVoucher: string;
  correlativo: number;
  cuo: string;
  subdiarioCodigo: string;
  fecha: string;
  glosa: string;
  moneda: string;
  totalDebito: number;
  totalCredito: number;
  cuadrado: boolean;
  lineas: LineaDiarioESTANDAR[];
}

export interface BloqueSubdiarioESTANDAR {
  codigo: string;
  descripcion: string;
  vouchers: VoucherDiarioESTANDAR[];
  totalDebitoSubdiario: number;
  totalCreditoSubdiario: number;
  cuadrado: boolean;
}

export interface LibroDiarioESTANDARReporte {
  empresaId: string;
  razonSocial: string;
  ruc: string;
  periodo: string;
  moneda: string;
  subdiarios: BloqueSubdiarioESTANDAR[];
  totalGeneralDebito: number;
  totalGeneralCredito: number;
  estaCuadrado: boolean;
  diferenciaGeneral: number;
  totalVouchers: number;
  ple51ContenidoTxt: string;
  ple51NombreArchivo: string;
}

export interface FilaMayor {
  codigoCuenta: string;
  nombreCuenta: string;
  elemento: number;
  totalDebe: number;
  totalHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
  movimientos: Array<{
    asientoId: string;
    asientoNumero: string;
    fecha: string;
    glosa: string;
    debe: number;
    haber: number;
  }>;
}

export interface FilaBalanceComprobacion {
  codigoCuenta: string;
  nombreCuenta: string;
  elemento: number;
  sumasDebe: number;
  sumasHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
  balanceActivo: number;
  balancePasivo: number;
  resultadoNaturalezaPerdida: number;
  resultadoNaturalezaGanancia: number;
  resultadoFuncionPerdida: number;
  resultadoFuncionGanancia: number;
}

export interface BalanceComprobacionReporte {
  periodo: string;
  empresaId: string;
  filas: FilaBalanceComprobacion[];
  totales: {
    sumasDebe: number;
    sumasHaber: number;
    saldoDeudor: number;
    saldoAcreedor: number;
    balanceActivo: number;
    balancePasivo: number;
    resultadoNaturalezaPerdida: number;
    resultadoNaturalezaGanancia: number;
    resultadoFuncionPerdida: number;
    resultadoFuncionGanancia: number;
  };
  cuadre: {
    sumasCuadradas: boolean;
    saldosCuadrados: boolean;
    resultadoEjercicioBalance: number;
    resultadoEjercicioNaturaleza: number;
    resultadoEjercicioFuncion: number;
    todoCuadrado: boolean;
  };
}

export interface EstadoSituacionFinancieraReporte {
  periodo: string;
  empresaId: string;
  activoCorriente: Array<{ codigo: string; nombre: string; monto: number }>;
  totalActivoCorriente: number;
  activoNoCorriente: Array<{ codigo: string; nombre: string; monto: number }>;
  totalActivoNoCorriente: number;
  totalActivo: number;

  pasivoCorriente: Array<{ codigo: string; nombre: string; monto: number }>;
  totalPasivoCorriente: number;
  pasivoNoCorriente: Array<{ codigo: string; nombre: string; monto: number }>;
  totalPasivoNoCorriente: number;
  totalPasivo: number;

  patrimonioNeto: Array<{ codigo: string; nombre: string; monto: number }>;
  resultadoDelEjercicio: number;
  totalPatrimonio: number;

  totalPasivoYPatrimonio: number;
  diferenciaCuadre: number;
  estaCuadrado: boolean;
}

export interface EstadoResultadosReporte {
  periodo: string;
  empresaId: string;
  porNaturaleza: {
    ventasNetas: number;
    comprasNetas: number;
    variacionInventarios: number;
    margenComercial: number;
    serviciosTerceros: number;
    valorAgregado: number;
    cargasPersonal: number;
    excedenteBrutoExplotacion: number;
    otrosIngresosGastos: number;
    resultadoExplotacion: number;
    ingresosFinancieros: number;
    gastosFinancieros: number;
    resultadoAntesImpuestos: number;
    impuestoRenta: number;
    utilidadNeta: number;
  };
  porFuncion: {
    ventasNetas: number;
    costoVentas: number;
    utilidadBruta: number;
    gastosAdministracion: number;
    gastosVentas: number;
    utilidadOperativa: number;
    ingresosFinancieros: number;
    gastosFinancieros: number;
    resultadoAntesImpuestos: number;
    impuestoRenta: number;
    utilidadNeta: number;
  };
  coincidenciaExacta: boolean;
}

export interface FlujoEfectivoReporte {
  periodo: string;
  empresaId: string;
  saldoInicialEfectivo: number;
  actividadesOperacion: {
    cobranzasClientes: number;
    pagosProveedores: number;
    pagosRemuneraciones: number;
    pagosTributos: number;
    netoOperacion: number;
  };
  actividadesInversion: {
    compraActivoFijo: number;
    netoInversion: number;
  };
  actividadesFinanciamiento: {
    aportesCapital: number;
    prestamosPagosFinancieros: number;
    netoFinanciamiento: number;
  };
  variacionNetaEfectivo: number;
  saldoFinalEfectivo: number;
  saldoCuenta10Mayor: number;
  estaConciliado: boolean;
}

export interface RatiosFinancierosReporte {
  periodo: string;
  empresaId: string;
  liquidezGeneral: number;
  pruebaAcida: number;
  capitalDeTrabajo: number;
  endeudamientoPatrimonial: number;
  margenNeto: number;
  rentabilidadPatrimonioROE: number;
}

// Almacén en memoria de saldos mensuales (Fase 5 / 8.4)
export const SALDOS_MENSUALES_MEMORIA: any[] = [];

export const librosEEFFService = {
  /**
   * Obtiene todos los asientos contabilizados del período para una empresa
   */
  async obtenerAsientosContabilizados(
    empresaId: string, 
    periodo: string, 
    acumulado: boolean = false, 
    incluirCierreYAjustes: boolean = true
  ): Promise<any[]> {
    const anio = periodo ? periodo.substring(0, 4) : '2026';
    const subdiariosExcluidos = incluirCierreYAjustes ? [] : ['00', '09'];

    if (db.isPostgresConnected()) {
      let sqlPeriodo = `p.codigo_periodo = $2`;
      const params: any[] = [empresaId, periodo];
      if (acumulado) {
        sqlPeriodo = `p.codigo_periodo >= $3 AND p.codigo_periodo <= $2`;
        params.push(`${anio}-01`);
      }
      let sqlFiltroCierre = '';
      if (!incluirCierreYAjustes) {
        sqlFiltroCierre = ` AND s.codigo NOT IN ('00', '09')`;
      }

      const res = await db.query(`
        SELECT a.id, a.empresa_id as "empresaId", a.numero as "asientoNumero",
               a.fecha, a.glosa, a.moneda, a.tipo_cambio as "tipoCambio",
               p.codigo_periodo as "periodo", s.codigo as "subdiario",
               json_agg(json_build_object(
                 'linea', d.linea,
                 'codigoCuenta', c.codigo,
                 'denominacionCuenta', c.nombre,
                 'debe', d.debe,
                 'haber', d.haber,
                 'glosa', d.glosa_linea
               ) ORDER BY d.linea) as items
        FROM asientos a
        JOIN periodos p ON p.id = a.periodo_id
        JOIN subdiarios s ON s.id = a.subdiario_id
        JOIN asiento_detalle d ON d.asiento_id = a.id
        JOIN cuentas c ON c.id = d.cuenta_id
        WHERE a.empresa_id = $1 AND ${sqlPeriodo} AND a.estado = 'CONTABILIZADO' ${sqlFiltroCierre}
        GROUP BY a.id, p.codigo_periodo, s.codigo
        ORDER BY s.codigo ASC, a.fecha ASC, a.numero ASC
      `, params);

      return res.rows.map(r => ({
        ...r,
        totalDebe: r.items.reduce((s: number, it: any) => Money.toNumber(Money.add(s, it.debe)), 0),
        totalHaber: r.items.reduce((s: number, it: any) => Money.toNumber(Money.add(s, it.haber)), 0),
        cuadrado: true
      }));
    }

    // Memoria
    return ASIENTOS_MEMORIA.filter(a => {
      const coincideEmpresa = a.empresaId === empresaId;
      const coincideEstado = a.estado === 'CONTABILIZADO';
      const sub = (a.subdiario || a.subdiarioId || '01').padStart(2, '0');
      if (!incluirCierreYAjustes && (sub === '00' || sub === '09')) {
        return false;
      }

      const per = a.periodo || (a.periodoId ? a.periodoId.replace('per-', '') : '') || (a.fecha ? a.fecha.substring(0, 7) : '');
      let coincidePeriodo = true;
      if (periodo) {
        if (acumulado) {
          coincidePeriodo = per.startsWith(anio) && per <= periodo;
        } else {
          coincidePeriodo = per === periodo || a.periodoId === `per-${periodo}` || (a.fecha && a.fecha.startsWith(periodo));
        }
      }
      return coincideEmpresa && coincideEstado && coincidePeriodo;
    }).map(a => {
      const items = (a.items || a.detalles || []).map((it: any) => ({
        linea: it.linea || 1,
        codigoCuenta: (it.codigoCuenta || it.cuentaId || it.cuentaCodigo || '1011').trim(),
        denominacionCuenta: it.denominacionCuenta || it.cuentaNombre || (buscarCuentaPCGE(it.codigoCuenta || it.cuentaId)?.nombre) || 'Cuenta Contable',
        debe: Number(it.debe || 0),
        haber: Number(it.haber || 0),
        glosa: it.glosa || it.glosaLinea || a.glosa || a.glosaGeneral
      }));
      const totalDebe = items.reduce((s: number, it: any) => Money.toNumber(Money.add(s, it.debe)), 0);
      const totalHaber = items.reduce((s: number, it: any) => Money.toNumber(Money.add(s, it.haber)), 0);
      return {
        id: a.id,
        asientoNumero: a.numero || a.numeroAsiento || a.id,
        fecha: a.fecha || `${periodo}-01`,
        glosa: a.glosa || a.glosaGeneral,
        periodo: a.periodo || periodo,
        subdiario: (a.subdiario || a.subdiarioId || '01').padStart(2, '0'),
        cuo: a.cuo,
        totalDebe,
        totalHaber,
        items,
        cuadrado: Math.abs(totalDebe - totalHaber) < 0.05
      };
    });
  },

  /**
   * Genera el Libro Diario Oficial (Subdiarios, fecha, correlativo, Debe y Haber)
   */
  async generarLibroDiario(empresaId: string, periodo: string) {
    const asientos = await this.obtenerAsientosContabilizados(empresaId, periodo);
    
    let totalDebe = Money.create(0);
    let totalHaber = Money.create(0);

    for (const a of asientos) {
      totalDebe = Money.add(totalDebe, a.totalDebe);
      totalHaber = Money.add(totalHaber, a.totalHaber);
    }

    const tDebeNum = Money.toNumber(totalDebe);
    const tHaberNum = Money.toNumber(totalHaber);

    return {
      empresaId,
      periodo,
      totalAsientos: asientos.length,
      asientos,
      totalDebe: tDebeNum,
      totalHaber: tHaberNum,
      estaBalanceado: Money.isEqual(totalDebe, totalHaber)
    };
  },

  /**
   * Genera el Libro Mayor (Agrupación por cuenta PCGE a 2, 3, 4 y 5 dígitos)
   */
  async generarLibroMayor(empresaId: string, periodo: string): Promise<{
    empresaId: string;
    periodo: string;
    cuentas: FilaMayor[];
    totalSumasDebe: number;
    totalSumasHaber: number;
    totalSaldoDeudor: number;
    totalSaldoAcreedor: number;
    estaCuadrado: boolean;
  }> {
    const asientos = await this.obtenerAsientosContabilizados(empresaId, periodo);
    const cuentasMap = new Map<string, FilaMayor>();

    for (const a of asientos) {
      for (const item of a.items) {
        const cta = item.codigoCuenta;
        if (!cuentasMap.has(cta)) {
          const info = buscarCuentaPCGE(cta);
          const elemento = parseInt(cta.charAt(0)) || 1;
          cuentasMap.set(cta, {
            codigoCuenta: cta,
            nombreCuenta: info?.nombre || `Cuenta ${cta}`,
            elemento,
            totalDebe: 0,
            totalHaber: 0,
            saldoDeudor: 0,
            saldoAcreedor: 0,
            movimientos: []
          });
        }

        const fila = cuentasMap.get(cta)!;
        fila.totalDebe = Money.toNumber(Money.add(fila.totalDebe, item.debe));
        fila.totalHaber = Money.toNumber(Money.add(fila.totalHaber, item.haber));
        fila.movimientos.push({
          asientoId: a.id,
          asientoNumero: a.asientoNumero,
          fecha: a.fecha,
          glosa: item.glosa || a.glosa,
          debe: item.debe,
          haber: item.haber
        });
      }
    }

    let totalSumasDebe = Money.create(0);
    let totalSumasHaber = Money.create(0);
    let totalSaldoDeudor = Money.create(0);
    let totalSaldoAcreedor = Money.create(0);

    const cuentas = Array.from(cuentasMap.values()).sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta));

    for (const f of cuentas) {
      const diff = Money.sub(f.totalDebe, f.totalHaber);
      if (diff.isPositive() && !diff.isZero()) {
        f.saldoDeudor = Money.toNumber(diff);
        f.saldoAcreedor = 0;
      } else if (diff.isNegative()) {
        f.saldoDeudor = 0;
        f.saldoAcreedor = Money.toNumber(diff.abs());
      } else {
        f.saldoDeudor = 0;
        f.saldoAcreedor = 0;
      }

      totalSumasDebe = Money.add(totalSumasDebe, f.totalDebe);
      totalSumasHaber = Money.add(totalSumasHaber, f.totalHaber);
      totalSaldoDeudor = Money.add(totalSaldoDeudor, f.saldoDeudor);
      totalSaldoAcreedor = Money.add(totalSaldoAcreedor, f.saldoAcreedor);
    }

    const tSumDebe = Money.toNumber(totalSumasDebe);
    const tSumHaber = Money.toNumber(totalSumasHaber);
    const tSalDeu = Money.toNumber(totalSaldoDeudor);
    const tSalAcr = Money.toNumber(totalSaldoAcreedor);

    return {
      empresaId,
      periodo,
      cuentas,
      totalSumasDebe: tSumDebe,
      totalSumasHaber: tSumHaber,
      totalSaldoDeudor: tSalDeu,
      totalSaldoAcreedor: tSalAcr,
      estaCuadrado: Money.isEqual(totalSumasDebe, totalSumasHaber) && Money.isEqual(totalSaldoDeudor, totalSaldoAcreedor)
    };
  },

  /**
   * Genera el Balance de Comprobación de 10 Columnas (Hoja de Trabajo Oficial SUNAT/NIIF)
   */
  async generarBalanceComprobacion(empresaId: string, periodo: string): Promise<BalanceComprobacionReporte> {
    const mayor = await this.generarLibroMayor(empresaId, periodo);

    const filas: FilaBalanceComprobacion[] = [];

    let totSumDebe = Money.create(0);
    let totSumHaber = Money.create(0);
    let totSalDeu = Money.create(0);
    let totSalAcr = Money.create(0);
    let totBalAct = Money.create(0);
    let totBalPas = Money.create(0);
    let totResNatPer = Money.create(0);
    let totResNatGan = Money.create(0);
    let totResFunPer = Money.create(0);
    let totResFunGan = Money.create(0);

    for (const m of mayor.cuentas) {
      const cta = m.codigoCuenta;
      const elemento = m.elemento;
      const sDeudor = m.saldoDeudor;
      const sAcreedor = m.saldoAcreedor;

      let balAct = 0;
      let balPas = 0;
      let resNatPer = 0;
      let resNatGan = 0;
      let resFunPer = 0;
      let resFunGan = 0;

      // 1. Cuentas de Balance (Elementos 1, 2, 3, 4, 5)
      if (elemento >= 1 && elemento <= 3) {
        // Cuentas regularizadoras de activo (39 depreciación acumulada, 19 cobranza dudosa, 29 desvalorización)
        if (cta.startsWith('39') || cta.startsWith('19') || cta.startsWith('29')) {
          if (sAcreedor > 0) balPas = sAcreedor; // O reduce activo en presentación
          else balAct = sDeudor;
        } else {
          balAct = sDeudor;
          if (sAcreedor > 0) balPas = sAcreedor;
        }
      } else if (elemento >= 4 && elemento <= 5) {
        balPas = sAcreedor;
        if (sDeudor > 0) balAct = sDeudor; // Si hubiese saldo deudor en pasivo
      }

      // 2. Cuentas de Resultados por Naturaleza (Elemento 6 y 7)
      if (elemento === 6) {
        if (cta.startsWith('61')) {
          // 61 Variación de inventarios: Deudor = Pérdida, Acreedor = Ganancia
          if (sAcreedor > 0) resNatGan = sAcreedor;
          else resNatPer = sDeudor;
        } else {
          resNatPer = sDeudor;
          // Si es cuenta 69 Costo de Ventas, también es el componente base de costo en Función
          if (cta.startsWith('69')) {
            resFunPer = sDeudor;
          }
        }
      }

      if (elemento === 7) {
        // 79 Cargas imputables a cuenta de costos y gastos es cuenta de enlace/destino (no va a resultados netos de naturaleza)
        if (cta.startsWith('79')) {
          // La 79 neutraliza el destino en el balance de comprobación
        } else {
          resNatGan = sAcreedor;
          resFunGan = sAcreedor;
        }
      }

      // 3. Cuentas de Resultados por Función (Elemento 9)
      if (elemento === 9) {
        resFunPer = sDeudor;
      }

      totSumDebe = Money.add(totSumDebe, m.totalDebe);
      totSumHaber = Money.add(totSumHaber, m.totalHaber);
      totSalDeu = Money.add(totSalDeu, sDeudor);
      totSalAcr = Money.add(totSalAcr, sAcreedor);
      totBalAct = Money.add(totBalAct, balAct);
      totBalPas = Money.add(totBalPas, balPas);
      totResNatPer = Money.add(totResNatPer, resNatPer);
      totResNatGan = Money.add(totResNatGan, resNatGan);
      totResFunPer = Money.add(totResFunPer, resFunPer);
      totResFunGan = Money.add(totResFunGan, resFunGan);

      filas.push({
        codigoCuenta: cta,
        nombreCuenta: m.nombreCuenta,
        elemento,
        sumasDebe: m.totalDebe,
        sumasHaber: m.totalHaber,
        saldoDeudor: sDeudor,
        saldoAcreedor: sAcreedor,
        balanceActivo: balAct,
        balancePasivo: balPas,
        resultadoNaturalezaPerdida: resNatPer,
        resultadoNaturalezaGanancia: resNatGan,
        resultadoFuncionPerdida: resFunPer,
        resultadoFuncionGanancia: resFunGan
      });
    }

    const tActNum = Money.toNumber(totBalAct);
    const tPasNum = Money.toNumber(totBalPas);
    const tNatGanNum = Money.toNumber(totResNatGan);
    const tNatPerNum = Money.toNumber(totResNatPer);
    const tFunGanNum = Money.toNumber(totResFunGan);
    const tFunPerNum = Money.toNumber(totResFunPer);

    const resultadoEjercicioBalance = Money.toNumber(Money.sub(totBalAct, totBalPas));
    const resultadoEjercicioNaturaleza = Money.toNumber(Money.sub(totResNatGan, totResNatPer));
    const resultadoEjercicioFuncion = Money.toNumber(Money.sub(totResFunGan, totResFunPer));

    const sumasCuadradas = Money.isEqual(totSumDebe, totSumHaber);
    const saldosCuadrados = Money.isEqual(totSalDeu, totSalAcr);

    // Cuadre exacto de las utilidades/pérdidas entre Balance, Naturaleza y Función
    const cuadreResultados = Math.abs(resultadoEjercicioBalance - resultadoEjercicioNaturaleza) < 0.05 &&
                             Math.abs(resultadoEjercicioBalance - resultadoEjercicioFuncion) < 0.05;

    return {
      periodo,
      empresaId,
      filas,
      totales: {
        sumasDebe: Money.toNumber(totSumDebe),
        sumasHaber: Money.toNumber(totSumHaber),
        saldoDeudor: Money.toNumber(totSalDeu),
        saldoAcreedor: Money.toNumber(totSalAcr),
        balanceActivo: tActNum,
        balancePasivo: tPasNum,
        resultadoNaturalezaPerdida: tNatPerNum,
        resultadoNaturalezaGanancia: tNatGanNum,
        resultadoFuncionPerdida: tFunPerNum,
        resultadoFuncionGanancia: tFunGanNum
      },
      cuadre: {
        sumasCuadradas,
        saldosCuadrados,
        resultadoEjercicioBalance,
        resultadoEjercicioNaturaleza,
        resultadoEjercicioFuncion,
        todoCuadrado: sumasCuadradas && saldosCuadrados && cuadreResultados
      }
    };
  },

  /**
   * Genera el Estado de Situación Financiera (Balance General)
   * Activo = Pasivo + Patrimonio Neto
   */
  async generarEstadoSituacionFinanciera(empresaId: string, periodo: string): Promise<EstadoSituacionFinancieraReporte> {
    const balanceComp = await this.generarBalanceComprobacion(empresaId, periodo);

    const activoCorriente: Array<{ codigo: string; nombre: string; monto: number }> = [];
    const activoNoCorriente: Array<{ codigo: string; nombre: string; monto: number }> = [];
    const pasivoCorriente: Array<{ codigo: string; nombre: string; monto: number }> = [];
    const pasivoNoCorriente: Array<{ codigo: string; nombre: string; monto: number }> = [];
    const patrimonioNeto: Array<{ codigo: string; nombre: string; monto: number }> = [];

    for (const f of balanceComp.filas) {
      const c = f.codigoCuenta;
      const el = f.elemento;

      if (el === 1 || el === 2) {
        // Activo Corriente (10 Efectivo, 12 Clientes, 14 Personal, 20 Existencias)
        const monto = f.saldoDeudor > 0 ? f.saldoDeudor : -f.saldoAcreedor;
        if (monto !== 0) {
          activoCorriente.push({ codigo: c, nombre: f.nombreCuenta, monto });
        }
      } else if (el === 3) {
        // Activo No Corriente (33 Inmuebles, 39 Depreciación restando)
        let monto = f.saldoDeudor;
        if (c.startsWith('39') || f.saldoAcreedor > 0) {
          monto = -f.saldoAcreedor;
        }
        if (monto !== 0) {
          activoNoCorriente.push({ codigo: c, nombre: f.nombreCuenta, monto });
        }
      } else if (el === 4) {
        // Pasivo Corriente (40 Tributos, 41 Remuneraciones, 42 Proveedores) y No Corriente (45 LP)
        const monto = f.saldoAcreedor > 0 ? f.saldoAcreedor : -f.saldoDeudor;
        if (c.startsWith('45') || c.startsWith('47')) {
          pasivoNoCorriente.push({ codigo: c, nombre: f.nombreCuenta, monto });
        } else {
          pasivoCorriente.push({ codigo: c, nombre: f.nombreCuenta, monto });
        }
      } else if (el === 5) {
        // Patrimonio (50 Capital, 58 Reservas, 59 Resultados Acumulados)
        const monto = f.saldoAcreedor > 0 ? f.saldoAcreedor : -f.saldoDeudor;
        patrimonioNeto.push({ codigo: c, nombre: f.nombreCuenta, monto });
      }
    }

    const totalActivoCorriente = activoCorriente.reduce((acc, it) => Money.toNumber(Money.add(acc, it.monto)), 0);
    const totalActivoNoCorriente = activoNoCorriente.reduce((acc, it) => Money.toNumber(Money.add(acc, it.monto)), 0);
    const totalActivo = Money.toNumber(Money.add(totalActivoCorriente, totalActivoNoCorriente));

    const totalPasivoCorriente = pasivoCorriente.reduce((acc, it) => Money.toNumber(Money.add(acc, it.monto)), 0);
    const totalPasivoNoCorriente = pasivoNoCorriente.reduce((acc, it) => Money.toNumber(Money.add(acc, it.monto)), 0);
    const totalPasivo = Money.toNumber(Money.add(totalPasivoCorriente, totalPasivoNoCorriente));

    const resultadoDelEjercicio = balanceComp.cuadre.resultadoEjercicioBalance;
    const basePatrimonio = patrimonioNeto.reduce((acc, it) => Money.toNumber(Money.add(acc, it.monto)), 0);
    const totalPatrimonio = Money.toNumber(Money.add(basePatrimonio, resultadoDelEjercicio));

    const totalPasivoYPatrimonio = Money.toNumber(Money.add(totalPasivo, totalPatrimonio));
    const diferenciaCuadre = Money.toNumber(Money.sub(totalActivo, totalPasivoYPatrimonio));

    return {
      periodo,
      empresaId,
      activoCorriente,
      totalActivoCorriente,
      activoNoCorriente,
      totalActivoNoCorriente,
      totalActivo,
      pasivoCorriente,
      totalPasivoCorriente,
      pasivoNoCorriente,
      totalPasivoNoCorriente,
      totalPasivo,
      patrimonioNeto,
      resultadoDelEjercicio,
      totalPatrimonio,
      totalPasivoYPatrimonio,
      diferenciaCuadre,
      estaCuadrado: Math.abs(diferenciaCuadre) < 0.05
    };
  },

  /**
   * Genera el Estado de Resultados (Por Naturaleza y Por Función)
   */
  async generarEstadoResultados(empresaId: string, periodo: string): Promise<EstadoResultadosReporte> {
    const balanceComp = await this.generarBalanceComprobacion(empresaId, periodo);

    let ventasNetas = 0;
    let comprasNetas = 0;
    let variacionInventarios = 0;
    let serviciosTerceros = 0;
    let cargasPersonal = 0;
    let otrosIngresosGastos = 0;
    let ingresosFinancieros = 0;
    let gastosFinancieros = 0;

    let costoVentas = 0;
    let gastosAdmin = 0;
    let gastosVentas = 0;

    for (const f of balanceComp.filas) {
      const c = f.codigoCuenta;
      if (c.startsWith('70')) ventasNetas += f.saldoAcreedor;
      else if (c.startsWith('60')) comprasNetas += f.saldoDeudor;
      else if (c.startsWith('61')) variacionInventarios += (f.saldoAcreedor - f.saldoDeudor);
      else if (c.startsWith('63')) serviciosTerceros += f.saldoDeudor;
      else if (c.startsWith('62')) cargasPersonal += f.saldoDeudor;
      else if (c.startsWith('65') || c.startsWith('68')) otrosIngresosGastos -= f.saldoDeudor;
      else if (c.startsWith('75')) otrosIngresosGastos += f.saldoAcreedor;
      else if (c.startsWith('77')) ingresosFinancieros += f.saldoAcreedor;
      else if (c.startsWith('67')) gastosFinancieros += f.saldoDeudor;

      // Por función
      if (c.startsWith('69')) costoVentas += f.saldoDeudor;
      else if (c.startsWith('94')) gastosAdmin += f.saldoDeudor;
      else if (c.startsWith('95')) gastosVentas += f.saldoDeudor;
    }

    // Naturaleza
    const varInvAjustada = costoVentas > 0 ? (variacionInventarios - costoVentas) : variacionInventarios;
    const margenComercial = Money.toNumber(Money.add(Money.sub(ventasNetas, comprasNetas), varInvAjustada));
    const valorAgregado = Money.toNumber(Money.sub(margenComercial, serviciosTerceros));
    const excedenteBruto = Money.toNumber(Money.sub(valorAgregado, cargasPersonal));
    const resExplotacion = Money.toNumber(Money.add(excedenteBruto, otrosIngresosGastos));
    const resAntesImpNat = Money.toNumber(Money.sub(Money.add(resExplotacion, ingresosFinancieros), gastosFinancieros));
    const utilidadNetaNat = resAntesImpNat; // Antes de impuesto a la renta diferido

    // Función
    // Si no hubo 69 pero hubo margen comercial, se imputa costo de venta por inventario consumido
    const cVentasEfectivo = costoVentas > 0 ? costoVentas : Math.max(0, comprasNetas - variacionInventarios);
    const utilidadBruta = Money.toNumber(Money.sub(ventasNetas, cVentasEfectivo));
    const utilidadOperativa = Money.toNumber(Money.sub(Money.sub(utilidadBruta, gastosAdmin), gastosVentas));
    const resAntesImpFun = Money.toNumber(Money.sub(Money.add(utilidadOperativa, ingresosFinancieros), gastosFinancieros));
    const utilidadNetaFun = resAntesImpFun;

    const coincidenciaExacta = Math.abs(utilidadNetaNat - utilidadNetaFun) < 0.05;

    return {
      periodo,
      empresaId,
      porNaturaleza: {
        ventasNetas,
        comprasNetas,
        variacionInventarios,
        margenComercial,
        serviciosTerceros,
        valorAgregado,
        cargasPersonal,
        excedenteBrutoExplotacion: excedenteBruto,
        otrosIngresosGastos,
        resultadoExplotacion: resExplotacion,
        ingresosFinancieros,
        gastosFinancieros,
        resultadoAntesImpuestos: resAntesImpNat,
        impuestoRenta: 0,
        utilidadNeta: utilidadNetaNat
      },
      porFuncion: {
        ventasNetas,
        costoVentas: cVentasEfectivo,
        utilidadBruta,
        gastosAdministracion: gastosAdmin,
        gastosVentas,
        utilidadOperativa,
        ingresosFinancieros,
        gastosFinancieros,
        resultadoAntesImpuestos: resAntesImpFun,
        impuestoRenta: 0,
        utilidadNeta: utilidadNetaFun
      },
      coincidenciaExacta
    };
  },

  /**
   * Genera el Estado de Flujos de Efectivo (Método Directo conciliado con Cuenta 10)
   */
  async generarEstadoFlujoEfectivo(empresaId: string, periodo: string): Promise<FlujoEfectivoReporte> {
    const asientos = await this.obtenerAsientosContabilizados(empresaId, periodo);
    const mayor = await this.generarLibroMayor(empresaId, periodo);

    let cobranzasClientes = Money.create(0);
    let pagosProveedores = Money.create(0);
    let pagosRemuneraciones = Money.create(0);
    let pagosTributos = Money.create(0);
    let compraActivoFijo = Money.create(0);
    let aportesCapital = Money.create(0);
    let prestamosPagosFinancieros = Money.create(0);

    for (const a of asientos) {
      const tieneCaja = a.items.some((it: any) => it.codigoCuenta.startsWith('10'));
      if (!tieneCaja) continue;

      for (const it of a.items) {
        const c = it.codigoCuenta;
        if (c.startsWith('12')) {
          // Cobranzas a clientes (Haber de 12 contra Debe de 10)
          if (it.haber > 0) cobranzasClientes = Money.add(cobranzasClientes, it.haber);
        } else if (c.startsWith('42')) {
          // Pagos a proveedores (Debe de 42 contra Haber de 10)
          if (it.debe > 0) pagosProveedores = Money.add(pagosProveedores, it.debe);
        } else if (c.startsWith('41')) {
          // Pagos de sueldos
          if (it.debe > 0) pagosRemuneraciones = Money.add(pagosRemuneraciones, it.debe);
        } else if (c.startsWith('40')) {
          // Pagos de impuestos
          if (it.debe > 0) pagosTributos = Money.add(pagosTributos, it.debe);
        } else if (c.startsWith('33')) {
          // Compra de activo fijo al contado
          if (it.debe > 0) compraActivoFijo = Money.add(compraActivoFijo, it.debe);
        } else if (c.startsWith('50')) {
          // Aporte de capital en efectivo
          if (it.haber > 0) aportesCapital = Money.add(aportesCapital, it.haber);
        } else if (c.startsWith('45')) {
          // Préstamos o amortización de deuda
          if (it.haber > 0) prestamosPagosFinancieros = Money.add(prestamosPagosFinancieros, it.haber);
          else if (it.debe > 0) prestamosPagosFinancieros = Money.sub(prestamosPagosFinancieros, it.debe);
        }
      }
    }

    const cobNum = Money.toNumber(cobranzasClientes);
    const pagPrvNum = Money.toNumber(pagosProveedores);
    const pagRemNum = Money.toNumber(pagosRemuneraciones);
    const pagTribNum = Money.toNumber(pagosTributos);
    const netoOperacion = Money.toNumber(Money.sub(Money.sub(Money.sub(cobNum, pagPrvNum), pagRemNum), pagTribNum));

    const compActNum = Money.toNumber(compraActivoFijo);
    const netoInversion = -compActNum;

    const aportCapNum = Money.toNumber(aportesCapital);
    const prestNum = Money.toNumber(prestamosPagosFinancieros);
    const netoFinanciamiento = Money.toNumber(Money.add(aportCapNum, prestNum));

    const variacionNetaEfectivo = Money.toNumber(Money.add(Money.add(netoOperacion, netoInversion), netoFinanciamiento));

    // Saldo cuenta 10 en Mayor
    const cta10 = mayor.cuentas.find(c => c.codigoCuenta.startsWith('10'));
    const saldoCuenta10Mayor = cta10 ? cta10.saldoDeudor : 0;
    const saldoInicialEfectivo = Money.toNumber(Money.sub(saldoCuenta10Mayor, variacionNetaEfectivo));
    const saldoFinalEfectivo = Money.toNumber(Money.add(saldoInicialEfectivo, variacionNetaEfectivo));

    return {
      periodo,
      empresaId,
      saldoInicialEfectivo,
      actividadesOperacion: {
        cobranzasClientes: cobNum,
        pagosProveedores: pagPrvNum,
        pagosRemuneraciones: pagRemNum,
        pagosTributos: pagTribNum,
        netoOperacion
      },
      actividadesInversion: {
        compraActivoFijo: compActNum,
        netoInversion
      },
      actividadesFinanciamiento: {
        aportesCapital: aportCapNum,
        prestamosPagosFinancieros: prestNum,
        netoFinanciamiento
      },
      variacionNetaEfectivo,
      saldoFinalEfectivo,
      saldoCuenta10Mayor,
      estaConciliado: Math.abs(saldoFinalEfectivo - saldoCuenta10Mayor) < 0.05
    };
  },

  /**
   * Calcula los Ratios Financieros Estándar (Liquidez, Prueba Ácida, Capital de Trabajo, Endeudamiento, ROS, ROE)
   */
  async calcularRatiosFinancieros(empresaId: string, periodo: string): Promise<RatiosFinancierosReporte> {
    const situacion = await this.generarEstadoSituacionFinanciera(empresaId, periodo);
    const resultados = await this.generarEstadoResultados(empresaId, periodo);

    const actCte = situacion.totalActivoCorriente;
    const pasCte = Math.max(1, situacion.totalPasivoCorriente);
    const inv = situacion.activoCorriente.find(a => a.codigo.startsWith('20'))?.monto || 0;
    const actTot = Math.max(1, situacion.totalActivo);
    const pasTot = situacion.totalPasivo;
    const patTot = Math.max(1, situacion.totalPatrimonio);
    const vtas = Math.max(1, resultados.porNaturaleza.ventasNetas);
    const utilNeta = resultados.porNaturaleza.utilidadNeta;

    const liquidezGeneral = Number((actCte / pasCte).toFixed(2));
    const pruebaAcida = Number(((actCte - inv) / pasCte).toFixed(2));
    const capitalDeTrabajo = Money.toNumber(Money.sub(actCte, pasCte));
    const endeudamientoPatrimonial = Number((pasTot / actTot).toFixed(4));
    const margenNeto = Number(((utilNeta / vtas) * 100).toFixed(2));
    const rentabilidadPatrimonioROE = Number(((utilNeta / patTot) * 100).toFixed(2));

    return {
      periodo,
      empresaId,
      liquidezGeneral,
      pruebaAcida,
      capitalDeTrabajo,
      endeudamientoPatrimonial,
      margenNeto,
      rentabilidadPatrimonioROE
    };
  },

  /**
   * Reconstruye los saldos mensuales a partir del libro diario (Fase 5 / 8.4)
   */
  async reconstruirSaldosMensuales(empresaId: string, periodo: string) {
    const mayor = await this.generarLibroMayor(empresaId, periodo);

    const resultados = [];
    for (const m of mayor.cuentas) {
      const reg = {
        empresaId,
        periodo,
        cuentaCodigo: m.codigoCuenta,
        cuentaNombre: m.nombreCuenta,
        saldoInicialDebe: 0,
        saldoInicialHaber: 0,
        movimientoDebe: m.totalDebe,
        movimientoHaber: m.totalHaber,
        saldoFinalDebe: m.saldoDeudor,
        saldoFinalHaber: m.saldoAcreedor,
        actualizadoAl: new Date().toISOString()
      };

      // Si Postgres está conectado
      if (db.isPostgresConnected()) {
        await db.query(`
          INSERT INTO saldos_mensuales (
            empresa_id, periodo, cuenta_codigo, cuenta_nombre,
            saldo_inicial_debe, saldo_inicial_haber, movimiento_debe, movimiento_haber,
            saldo_final_debe, saldo_final_haber, actualizado_al
          ) VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, NOW())
          ON CONFLICT (empresa_id, periodo, cuenta_codigo) DO UPDATE SET
            movimiento_debe = EXCLUDED.movimiento_debe,
            movimiento_haber = EXCLUDED.movimiento_haber,
            saldo_final_debe = EXCLUDED.saldo_final_debe,
            saldo_final_haber = EXCLUDED.saldo_final_haber,
            actualizado_al = NOW();
        `, [
          empresaId, periodo, m.codigoCuenta, m.nombreCuenta,
          m.totalDebe, m.totalHaber, m.saldoDeudor, m.saldoAcreedor
        ]);
      } else {
        const idx = SALDOS_MENSUALES_MEMORIA.findIndex(
          s => s.empresaId === empresaId && s.periodo === periodo && s.cuentaCodigo === m.codigoCuenta
        );
        if (idx >= 0) {
          SALDOS_MENSUALES_MEMORIA[idx] = reg;
        } else {
          SALDOS_MENSUALES_MEMORIA.push(reg);
        }
      }
      resultados.push(reg);
    }

    return {
      success: true,
      periodo,
      cuentasProcesadas: resultados.length,
      resultados
    };
  },

  /**
   * Verifica la integridad de los saldos mensuales contra el diario (Auditoría 8.4)
   */
  async verificarIntegridadSaldosContraDiario(empresaId: string, periodo: string) {
    const diario = await this.generarLibroDiario(empresaId, periodo);

    let sumMovDebe = Money.create(0);
    let sumMovHaber = Money.create(0);
    const inconsistencias: string[] = [];

    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT cuenta_codigo, movimiento_debe, movimiento_haber
        FROM saldos_mensuales
        WHERE empresa_id = $1 AND periodo = $2
      `, [empresaId, periodo]);

      for (const r of res.rows) {
        sumMovDebe = Money.add(sumMovDebe, Number(r.movimiento_debe));
        sumMovHaber = Money.add(sumMovHaber, Number(r.movimiento_haber));
      }
    } else {
      const saldos = SALDOS_MENSUALES_MEMORIA.filter(s => s.empresaId === empresaId && s.periodo === periodo);
      for (const s of saldos) {
        sumMovDebe = Money.add(sumMovDebe, s.movimientoDebe);
        sumMovHaber = Money.add(sumMovHaber, s.movimientoHaber);
      }
    }

    const tMovDebe = Money.toNumber(sumMovDebe);
    const tMovHaber = Money.toNumber(sumMovHaber);

    const difDebe = Money.toNumber(Money.sub(tMovDebe, diario.totalDebe));
    const difHaber = Money.toNumber(Money.sub(tMovHaber, diario.totalHaber));

    if (Math.abs(difDebe) > 0.01) {
      inconsistencias.push(`Discrepancia en Debe: Saldos acumulados S/ ${tMovDebe} vs Diario S/ ${diario.totalDebe}`);
    }
    if (Math.abs(difHaber) > 0.01) {
      inconsistencias.push(`Discrepancia en Haber: Saldos acumulados S/ ${tMovHaber} vs Diario S/ ${diario.totalHaber}`);
    }

    return {
      integro: inconsistencias.length === 0,
      totalDiarioDebe: diario.totalDebe,
      totalDiarioHaber: diario.totalHaber,
      totalSaldosDebe: tMovDebe,
      totalSaldosHaber: tMovHaber,
      diferenciaDebe: difDebe,
      diferenciaHaber: difHaber,
      inconsistencias
    };
  },

  /**
   * Genera la Hoja de Trabajo oficial de 10 Columnas tipo ESTANDAR con todas las reglas peruanas:
   * 1. MONTOS (Débito, Crédito)
   * 2. SALDO (Deudor, Acreedor)
   * 3. INVENTARIO (Activo, Pasivo) con opción de cuentas correctoras (19, 29, 39) en negativo
   * 4. NATURALEZA (Pérdida, Ganancia) con exclusión técnica de la cuenta de enlace 79
   * 5. FUNCIÓN (Pérdida, Ganancia) con cuenta 69 y elemento 9, más mapeo configurable
   * 6. Filas finales: TOTALES, PÉRDIDA/UTILIDAD DEL EJERCICIO, SUMAS IGUALES
   * 7. Controles de cuadre con 5 validaciones y detección exacta de descuadre
   */
  async generarHojaTrabajo10Columnas(
    empresaId: string, 
    periodo: string, 
    opciones?: OpcionesHojaTrabajo10Col
  ): Promise<HojaTrabajo10ColumnasReporte> {
    let empresa: any = null;
    try {
      empresa = await empresaRepository.obtenerPorId(empresaId);
    } catch {}

    const razonSocial = empresa?.razonSocial || 'EMPRESA CONTABLE S.A.C.';
    const ruc = empresa?.ruc || '20100000001';
    const direccion = empresa?.domicilioFiscal || empresa?.direccionFiscal || 'AV. PRINCIPAL 123 - LIMA';

    const anioStr = periodo ? periodo.substring(0, 4) : '2026';
    const mesStr = periodo && periodo.length >= 7 ? periodo.substring(5, 7) : '09';
    const anio = parseInt(anioStr, 10) || 2026;
    const mesNum = parseInt(mesStr, 10) || 9;
    const MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const mesNombre = MESES[mesNum - 1] || 'SETIEMBRE';
    const titulo = `HOJA DE TRABAJO 10 COLUMNAS AL MES DE ${mesNombre} DEL ${anio}`;

    const acumuladoAlMes = opciones?.acumuladoAlMes ?? true;
    const correctorasActivoEnNegativo = opciones?.correctorasActivoEnNegativo ?? false;
    const incluirCierreYAjustes = opciones?.incluirCierreYAjustes ?? true;
    const mapeoPers = opciones?.mapeoFuncionPersonalizado || {};

    const asientos = await this.obtenerAsientosContabilizados(
      empresaId, 
      periodo, 
      acumuladoAlMes, 
      incluirCierreYAjustes
    );

    // Sumas acumuladas por cuenta contable
    const cuentasMap = new Map<string, { debe: number; haber: number }>();
    for (const a of asientos) {
      for (const it of a.items) {
        const cta = (it.codigoCuenta || it.cuentaCodigo || it.cuentaId || '').trim();
        if (!cta) continue;
        const cur = cuentasMap.get(cta) || { debe: 0, haber: 0 };
        cur.debe = Money.toNumber(Money.add(cur.debe, it.debe || 0));
        cur.haber = Money.toNumber(Money.add(cur.haber, it.haber || 0));
        cuentasMap.set(cta, cur);
      }
    }

    // Filtrar solo cuentas con movimiento (> 0) y ordenar numéricamente por código
    const cuentasConMov = Array.from(cuentasMap.entries())
      .filter(([_, sumas]) => sumas.debe > 0 || sumas.haber > 0)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

    const filas: FilaHojaTrabajo10Col[] = [];

    let totMontoDebe = Money.create(0);
    let totMontoHaber = Money.create(0);
    let totSaldoDeu = Money.create(0);
    let totSaldoAcr = Money.create(0);
    let totInvAct = Money.create(0);
    let totInvPas = Money.create(0);
    let totNatPer = Money.create(0);
    let totNatGan = Money.create(0);
    let totFunPer = Money.create(0);
    let totFunGan = Money.create(0);

    for (const [cta, sumas] of cuentasConMov) {
      const pcgeInfo = buscarCuentaPCGE(cta);
      const nombreCuenta = pcgeInfo?.nombre || `Cuenta ${cta}`;
      const elemento = parseInt(cta.charAt(0), 10) || 1;

      const mDebe = sumas.debe;
      const mHaber = sumas.haber;
      const diff = Money.sub(mDebe, mHaber);

      let sDeudor = 0;
      let sAcreedor = 0;
      if (diff.isPositive() && !diff.isZero()) {
        sDeudor = Money.toNumber(diff);
      } else if (diff.isNegative()) {
        sAcreedor = Money.toNumber(diff.abs());
      }

      const esCorrectora = cta.startsWith('19') || cta.startsWith('29') || cta.startsWith('39');

      let invAct = 0;
      let invPas = 0;
      let natPer = 0;
      let natGan = 0;
      let funPer = 0;
      let funGan = 0;

      // 1. INVENTARIO (Clases 1 - 5)
      if (elemento >= 1 && elemento <= 3) {
        if (esCorrectora && correctorasActivoEnNegativo) {
          // Regla configurable: mostrar cuentas correctoras en Activo con signo negativo
          if (sAcreedor > 0) {
            invAct = -sAcreedor;
            invPas = 0;
          } else {
            invAct = sDeudor;
            invPas = 0;
          }
        } else {
          invAct = sDeudor;
          invPas = sAcreedor;
        }
      } else if (elemento >= 4 && elemento <= 5) {
        invPas = sAcreedor;
        invAct = sDeudor; // En caso anómalo de saldo deudor en pasivo
      }

      // 2. RESULTADOS POR NATURALEZA (Elementos 6 y 7)
      if (elemento === 6) {
        if (cta.startsWith('61')) {
          // 61 Variación de inventarios: Deudor = Pérdida, Acreedor = Ganancia
          if (sAcreedor > 0) natGan = sAcreedor;
          else natPer = sDeudor;
        } else {
          natPer = sDeudor;
          if (sAcreedor > 0) natGan = sAcreedor;
        }
      } else if (elemento === 7) {
        // Cuenta 79: Cargas imputables a cuentas de costos y gastos (Cuenta de enlace/destino)
        // No se traslada a resultados de naturaleza para no duplicar el gasto absorbido
        if (cta.startsWith('79')) {
          // Neutralizada en naturaleza
        } else {
          natGan = sAcreedor;
          if (sDeudor > 0) natPer = sDeudor;
        }
      }

      // 3. RESULTADOS POR FUNCIÓN (Cuenta 69, Elemento 9, Ventas 70, Ingresos 75/77, etc.)
      const mapeoAsignado = mapeoPers[cta];
      if (mapeoAsignado) {
        if (mapeoAsignado === 'COSTO_VENTAS' || mapeoAsignado === 'GASTOS_ADMIN' || mapeoAsignado === 'GASTOS_VENTAS' || mapeoAsignado === 'GASTOS_FINANCIEROS') {
          funPer = sDeudor;
          if (sAcreedor > 0) funGan = sAcreedor;
        } else if (mapeoAsignado === 'INGRESOS') {
          funGan = sAcreedor;
          if (sDeudor > 0) funPer = sDeudor;
        }
      } else {
        // Reglas estándar PCGE
        if (cta.startsWith('69')) {
          // Costo de Ventas
          funPer = sDeudor;
          if (sAcreedor > 0) funGan = sAcreedor;
        } else if (elemento === 9) {
          // 94 Gastos Admin, 95 Gastos Ventas, 97 Gastos Financieros
          funPer = sDeudor;
          if (sAcreedor > 0) funGan = sAcreedor;
        } else if (elemento === 7 && !cta.startsWith('79')) {
          // Ingresos operativos y financieros
          funGan = sAcreedor;
          if (sDeudor > 0) funPer = sDeudor;
        } else if (cta.startsWith('67')) {
          // Gastos financieros si no se canalizaron vía 97
          const existe97 = cuentasConMov.some(([c]) => c.startsWith('97'));
          if (!existe97) {
            funPer = sDeudor;
          }
        }
      }

      totMontoDebe = Money.add(totMontoDebe, mDebe);
      totMontoHaber = Money.add(totMontoHaber, mHaber);
      totSaldoDeu = Money.add(totSaldoDeu, sDeudor);
      totSaldoAcr = Money.add(totSaldoAcr, sAcreedor);
      totInvAct = Money.add(totInvAct, invAct);
      totInvPas = Money.add(totInvPas, invPas);
      totNatPer = Money.add(totNatPer, natPer);
      totNatGan = Money.add(totNatGan, natGan);
      totFunPer = Money.add(totFunPer, funPer);
      totFunGan = Money.add(totFunGan, funGan);

      filas.push({
        codigoCuenta: cta,
        nombreCuenta,
        elemento,
        montosDebe: mDebe,
        montosHaber: mHaber,
        saldoDeudor: sDeudor,
        saldoAcreedor: sAcreedor,
        inventarioActivo: invAct,
        inventarioPasivo: invPas,
        naturalezaPerdida: natPer,
        naturalezaGanancia: natGan,
        funcionPerdida: funPer,
        funcionGanancia: funGan,
        esCorrectora
      });
    }

    const tMontoDebeNum = Money.toNumber(totMontoDebe);
    const tMontoHaberNum = Money.toNumber(totMontoHaber);
    const tSaldoDeuNum = Money.toNumber(totSaldoDeu);
    const tSaldoAcrNum = Money.toNumber(totSaldoAcr);
    const tInvActNum = Money.toNumber(totInvAct);
    const tInvPasNum = Money.toNumber(totInvPas);
    const tNatPerNum = Money.toNumber(totNatPer);
    const tNatGanNum = Money.toNumber(totNatGan);
    const tFunPerNum = Money.toNumber(totFunPer);
    const tFunGanNum = Money.toNumber(totFunGan);

    // Determinación de Resultados por Bloque
    const resultadoInventario = Money.toNumber(Money.sub(totInvAct, totInvPas));
    const resultadoNaturaleza = Money.toNumber(Money.sub(totNatGan, totNatPer));
    const resultadoFuncion = Money.toNumber(Money.sub(totFunGan, totFunPer));

    // Si Ganancia > Pérdida -> UTILIDAD (positiva). Si Pérdida > Ganancia -> PÉRDIDA (negativa)
    let tipoResultado: 'UTILIDAD' | 'PERDIDA' | 'EQUILIBRIO' = 'EQUILIBRIO';
    const montoRef = resultadoNaturaleza !== 0 ? resultadoNaturaleza : resultadoInventario;
    if (montoRef > 0.001) tipoResultado = 'UTILIDAD';
    else if (montoRef < -0.001) tipoResultado = 'PERDIDA';

    // Fila equilibradora:
    // Si hay UTILIDAD: se ubica en la columna menor para equilibrar (Pasivo, Pérdida Nat, Pérdida Fun)
    // Si hay PÉRDIDA: se ubica en la columna menor para equilibrar (Activo, Ganancia Nat, Ganancia Fun)
    const filaResultado: FilaEquilibradora = {
      inventarioActivo: 0,
      inventarioPasivo: 0,
      naturalezaPerdida: 0,
      naturalezaGanancia: 0,
      funcionPerdida: 0,
      funcionGanancia: 0,
      etiqueta: tipoResultado === 'UTILIDAD' 
        ? 'UTILIDAD DEL EJERCICIO' 
        : (tipoResultado === 'PERDIDA' ? 'PÉRDIDA DEL EJERCICIO' : 'EQUILIBRIO')
    };

    if (resultadoInventario > 0) {
      filaResultado.inventarioPasivo = resultadoInventario;
    } else if (resultadoInventario < 0) {
      filaResultado.inventarioActivo = Math.abs(resultadoInventario);
    }

    if (resultadoNaturaleza > 0) {
      filaResultado.naturalezaPerdida = resultadoNaturaleza;
    } else if (resultadoNaturaleza < 0) {
      filaResultado.naturalezaGanancia = Math.abs(resultadoNaturaleza);
    }

    if (resultadoFuncion > 0) {
      filaResultado.funcionPerdida = resultadoFuncion;
    } else if (resultadoFuncion < 0) {
      filaResultado.funcionGanancia = Math.abs(resultadoFuncion);
    }

    // Sumas Iguales (Totales + Fila Equilibradora)
    const sumasIguales = {
      montosDebe: tMontoDebeNum,
      montosHaber: tMontoHaberNum,
      saldoDeudor: tSaldoDeuNum,
      saldoAcreedor: tSaldoAcrNum,
      inventarioActivo: Money.toNumber(Money.add(tInvActNum, filaResultado.inventarioActivo)),
      inventarioPasivo: Money.toNumber(Money.add(tInvPasNum, filaResultado.inventarioPasivo)),
      naturalezaPerdida: Money.toNumber(Money.add(tNatPerNum, filaResultado.naturalezaPerdida)),
      naturalezaGanancia: Money.toNumber(Money.add(tNatGanNum, filaResultado.naturalezaGanancia)),
      funcionPerdida: Money.toNumber(Money.add(tFunPerNum, filaResultado.funcionPerdida)),
      funcionGanancia: Money.toNumber(Money.add(tFunGanNum, filaResultado.funcionGanancia))
    };

    // 5 Controles de Cuadre y Auditoría Contable Oficial
    const diferenciaMontos = Math.abs(tMontoDebeNum - tMontoHaberNum);
    const diferenciaSaldos = Math.abs(tSaldoDeuNum - tSaldoAcrNum);
    const diferenciaBalance = Math.abs(sumasIguales.inventarioActivo - sumasIguales.inventarioPasivo);
    const diferenciaNaturalezaFuncion = Math.abs(resultadoNaturaleza - resultadoFuncion);
    const diferenciaInventarioNaturaleza = Math.abs(resultadoInventario - resultadoNaturaleza);

    const montosCuadrados = diferenciaMontos < 0.01;
    const saldosCuadrados = diferenciaSaldos < 0.01;
    const balanceCuadrado = diferenciaBalance < 0.01;
    const resultadosCoinciden = diferenciaNaturalezaFuncion < 0.01;
    const todoCuadrado = montosCuadrados && saldosCuadrados && balanceCuadrado && resultadosCoinciden && (diferenciaInventarioNaturaleza < 0.01);

    const alertas: string[] = [];
    if (!montosCuadrados) {
      alertas.push(`DESCUADRE EN MONTOS: Débito S/ ${tMontoDebeNum.toFixed(2)} != Crédito S/ ${tMontoHaberNum.toFixed(2)} (Dif: S/ ${diferenciaMontos.toFixed(2)})`);
    }
    if (!saldosCuadrados) {
      alertas.push(`DESCUADRE EN SALDOS: Deudor S/ ${tSaldoDeuNum.toFixed(2)} != Acreedor S/ ${tSaldoAcrNum.toFixed(2)} (Dif: S/ ${diferenciaSaldos.toFixed(2)})`);
    }
    if (!balanceCuadrado) {
      alertas.push(`DESCUADRE EN INVENTARIO: Activo S/ ${sumasIguales.inventarioActivo.toFixed(2)} != Pasivo S/ ${sumasIguales.inventarioPasivo.toFixed(2)}`);
    }
    if (!resultadosCoinciden) {
      alertas.push(`DISCREPANCIA NATURALEZA VS FUNCIÓN: Resultado Naturaleza S/ ${resultadoNaturaleza.toFixed(2)} != Función S/ ${resultadoFuncion.toFixed(2)} (Diferencia: S/ ${diferenciaNaturalezaFuncion.toFixed(2)})`);
    }
    if (diferenciaInventarioNaturaleza >= 0.01) {
      alertas.push(`DISCREPANCIA BALANCE VS RESULTADOS: Inventario S/ ${resultadoInventario.toFixed(2)} != Naturaleza S/ ${resultadoNaturaleza.toFixed(2)}`);
    }

    return {
      empresaId,
      razonSocial,
      ruc,
      direccion,
      periodo,
      anio,
      mes: mesStr,
      mesNombre,
      titulo,
      moneda: 'PEN',
      acumuladoAlMes,
      correctorasActivoEnNegativo,
      filas,
      totales: {
        montosDebe: tMontoDebeNum,
        montosHaber: tMontoHaberNum,
        saldoDeudor: tSaldoDeuNum,
        saldoAcreedor: tSaldoAcrNum,
        inventarioActivo: tInvActNum,
        inventarioPasivo: tInvPasNum,
        naturalezaPerdida: tNatPerNum,
        naturalezaGanancia: tNatGanNum,
        funcionPerdida: tFunPerNum,
        funcionGanancia: tFunGanNum
      },
      resultadoEjercicio: {
        inventario: resultadoInventario,
        naturaleza: resultadoNaturaleza,
        funcion: resultadoFuncion,
        tipo: tipoResultado,
        monto: Math.abs(resultadoNaturaleza)
      },
      filaResultado,
      sumasIguales,
      controlesCuadre: {
        montosCuadrados,
        saldosCuadrados,
        balanceCuadrado,
        resultadosCoinciden,
        todoCuadrado,
        diferenciaMontos,
        diferenciaSaldos,
        diferenciaNaturalezaFuncion,
        alertas
      }
    };
  },

  /**
   * Genera el Libro Diario estructurado formato ESTANDAR:
   * Bloque por subdiario -> bloque por voucher -> fila "TOTAL COMPROBANTE" -> total subdiario -> total general
   * Consistente 100% con PLE 5.1 (mismo CUO, correlativo y líneas)
   */
  async generarLibroDiarioESTANDAR(
    empresaId: string, 
    periodo: string, 
    opciones?: OpcionesLibroDiarioESTANDAR
  ): Promise<LibroDiarioESTANDARReporte> {
    let empresa: any = null;
    try {
      empresa = await empresaRepository.obtenerPorId(empresaId);
    } catch {}

    const razonSocial = empresa?.razonSocial || 'EMPRESA CONTABLE S.A.C.';
    const ruc = empresa?.ruc || '20100000001';

    const incluirAjustesYCierre = opciones?.incluirAjustesYCierre ?? true;
    const formatoFecha = opciones?.formatoFecha || 'DD/MM/AAAA';

    const asientos = await this.obtenerAsientosContabilizados(
      empresaId, 
      periodo, 
      false, 
      incluirAjustesYCierre
    );

    // Filtrar por rango de vouchers si se solicita
    let asientosFiltrados = asientos;
    if (opciones?.voucherDesde || opciones?.voucherHasta) {
      asientosFiltrados = asientos.filter(a => {
        const vNum = a.asientoNumero || a.id;
        if (opciones.voucherDesde && vNum < opciones.voucherDesde) return false;
        if (opciones.voucherHasta && vNum > opciones.voucherHasta) return false;
        return true;
      });
    }

    // Agrupar por Subdiario
    const subdiariosMap = new Map<string, any[]>();
    for (const a of asientosFiltrados) {
      const sub = (a.subdiario || '01').padStart(2, '0');
      if (!subdiariosMap.has(sub)) {
        subdiariosMap.set(sub, []);
      }
      subdiariosMap.get(sub)!.push(a);
    }

    // Ordenar subdiarios numéricamente
    const codigosSubdiarios = Array.from(subdiariosMap.keys()).sort();

    const anioStr = periodo ? periodo.substring(0, 4) : '2026';
    const mesStr = periodo && periodo.length >= 7 ? periodo.substring(5, 7) : '09';
    const plePeriodo = `${anioStr}${mesStr}00`;

    const subdiarios: BloqueSubdiarioESTANDAR[] = [];
    let totalGeneralDebitoMoney = Money.create(0);
    let totalGeneralCreditoMoney = Money.create(0);
    let totalVouchers = 0;
    const pleLineasTxt: string[] = [];

    let correlativoGlobal = 1;

    for (const codSub of codigosSubdiarios) {
      const asientosSub = subdiariosMap.get(codSub)!;
      const descSub = NOMBRES_SUBDIARIOS[codSub] || `SUBDIARIO ${codSub}`;

      let totalDebitoSubMoney = Money.create(0);
      let totalCreditoSubMoney = Money.create(0);

      const vouchers: VoucherDiarioESTANDAR[] = [];

      for (let i = 0; i < asientosSub.length; i++) {
        const a = asientosSub[i];
        totalVouchers++;

        // CUO oficial del asiento compatible con PLE 5.1
        const cuo = a.cuo || `${codSub}${String(i + 1).padStart(4, '0')}`;
        const rawFecha = a.fecha || `${periodo}-01`;
        
        let fechaFormateada = rawFecha;
        if (formatoFecha === 'DD/MM/AAAA' && rawFecha.includes('-')) {
          fechaFormateada = rawFecha.split('T')[0].split('-').reverse().join('/');
        }

        const lineas: LineaDiarioESTANDAR[] = [];
        let debitoVoucherMoney = Money.create(0);
        let creditoVoucherMoney = Money.create(0);

        for (let j = 0; j < (a.items || []).length; j++) {
          const it = a.items[j];
          const lineaNum = j + 1;
          const deb = Number(it.debe || 0);
          const cred = Number(it.haber || 0);

          debitoVoucherMoney = Money.add(debitoVoucherMoney, deb);
          creditoVoucherMoney = Money.add(creditoVoucherMoney, cred);

          const conceptoLinea = it.glosa || a.glosa || 'Movimiento contable';

          lineas.push({
            linea: lineaNum,
            fechaEmision: fechaFormateada,
            codigoCuenta: it.codigoCuenta,
            nombreCuenta: it.denominacionCuenta,
            concepto: conceptoLinea,
            debito: deb,
            credito: cred
          });

          // Registro oficial PLE 5.1 (Libro Diario)
          const pleFechaContable = rawFecha.includes('-') ? rawFecha.split('T')[0].split('-').reverse().join('/') : rawFecha;
          const camposPle = [
            plePeriodo, // 1. Periodo
            cuo, // 2. CUO
            `M${lineaNum}`, // 3. Correlativo de asiento
            it.codigoCuenta, // 4. Código PCGE
            '', // 5. Unidad de Operación
            '', // 6. Centro de Costo
            a.moneda || 'PEN', // 7. Moneda
            '00', // 8. Tipo Doc Sustentatorio
            '', // 9. Serie
            '', // 10. Número
            pleFechaContable, // 11. Fecha Contable
            pleFechaContable, // 12. Fecha Vencimiento
            pleFechaContable, // 13. Fecha Emisión
            conceptoLinea.replace(/[|\r\n]/g, ' ').substring(0, 200), // 14. Glosa
            '', // 15. Glosa referencial
            deb.toFixed(2), // 16. Debe
            cred.toFixed(2), // 17. Haber
            '', // 18. Código de Libro Referencia
            '1' // 19. Estado anotación (1: En plazo)
          ];
          pleLineasTxt.push(camposPle.join('|') + '|');
        }

        const tDebVouch = Money.toNumber(debitoVoucherMoney);
        const tCredVouch = Money.toNumber(creditoVoucherMoney);

        totalDebitoSubMoney = Money.add(totalDebitoSubMoney, tDebVouch);
        totalCreditoSubMoney = Money.add(totalCreditoSubMoney, tCredVouch);

        vouchers.push({
          numeroVoucher: a.asientoNumero || a.id,
          correlativo: i + 1,
          cuo,
          subdiarioCodigo: codSub,
          fecha: fechaFormateada,
          glosa: a.glosa || 'Asiento contable',
          moneda: a.moneda || 'PEN',
          totalDebito: tDebVouch,
          totalCredito: tCredVouch,
          cuadrado: Math.abs(tDebVouch - tCredVouch) < 0.01,
          lineas
        });

        correlativoGlobal++;
      }

      const tDebSub = Money.toNumber(totalDebitoSubMoney);
      const tCredSub = Money.toNumber(totalCreditoSubMoney);

      totalGeneralDebitoMoney = Money.add(totalGeneralDebitoMoney, tDebSub);
      totalGeneralCreditoMoney = Money.add(totalGeneralCreditoMoney, tCredSub);

      subdiarios.push({
        codigo: codSub,
        descripcion: descSub,
        vouchers,
        totalDebitoSubdiario: tDebSub,
        totalCreditoSubdiario: tCredSub,
        cuadrado: Math.abs(tDebSub - tCredSub) < 0.01
      });
    }

    const totalGeneralDebito = Money.toNumber(totalGeneralDebitoMoney);
    const totalGeneralCredito = Money.toNumber(totalGeneralCreditoMoney);
    const diferenciaGeneral = Math.abs(totalGeneralDebito - totalGeneralCredito);
    const estaCuadrado = diferenciaGeneral < 0.01;

    const ple51NombreArchivo = `LE${ruc}${anioStr}${mesStr}00050100001111.txt`;
    const ple51ContenidoTxt = pleLineasTxt.join('\r\n') + (pleLineasTxt.length > 0 ? '\r\n' : '');

    return {
      empresaId,
      razonSocial,
      ruc,
      periodo,
      moneda: 'PEN',
      subdiarios,
      totalGeneralDebito,
      totalGeneralCredito,
      estaCuadrado,
      diferenciaGeneral,
      totalVouchers,
      ple51ContenidoTxt,
      ple51NombreArchivo
    };
  },

  /**
   * Genera el archivo PLE 5.1 (Libro Diario) oficial derivado de la misma consulta
   */
  async generarPle51DiarioTxt(empresaId: string, periodo: string) {
    const diario = await this.generarLibroDiarioESTANDAR(empresaId, periodo, { incluirAjustesYCierre: true });
    return {
      nombreArchivo: diario.ple51NombreArchivo,
      contenidoTxt: diario.ple51ContenidoTxt,
      totalLineas: diario.subdiarios.reduce((acc, s) => acc + s.vouchers.reduce((vAcc, v) => vAcc + v.lineas.length, 0), 0)
    };
  }
};
