import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AsientoContable, EmpresaCliente } from '../types';
import { buscarCuentaPCGE } from '../data/pcgeAccounts';

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

export interface OpcionesExportacionImpresion {
  incluirFechaImpresion?: boolean;
  incluirUsuario?: boolean;
  incluirNumeroPagina?: boolean;
  usuarioNombre?: string;
  saltoPaginaPorSubdiario?: boolean;
}

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

/**
 * Motor de cálculo en cliente para la Hoja de Trabajo 10 Columnas en formato estándar
 */
export function calcularHojaTrabajo10Columnas(
  asientos: AsientoContable[],
  empresa: EmpresaCliente,
  periodo: string,
  opciones?: OpcionesHojaTrabajo10Col
): HojaTrabajo10ColumnasReporte {
  const anioStr = periodo ? periodo.substring(0, 4) : '2026';
  const mesStr = periodo && periodo.length >= 7 ? periodo.substring(5, 7) : '09';
  const anio = parseInt(anioStr, 10) || 2026;
  const mesNum = parseInt(mesStr, 10) || 9;
  const mesNombre = MESES[mesNum - 1] || 'SETIEMBRE';
  const titulo = `HOJA DE TRABAJO 10 COLUMNAS AL MES DE ${mesNombre} DEL ${anio}`;

  const acumuladoAlMes = opciones?.acumuladoAlMes ?? true;
  const correctorasActivoEnNegativo = opciones?.correctorasActivoEnNegativo ?? false;
  const incluirCierreYAjustes = opciones?.incluirCierreYAjustes ?? true;
  const mapeoPers = opciones?.mapeoFuncionPersonalizado || {};

  // Filtrado de asientos
  const asientosFiltrados = asientos.filter(a => {
    // Solo asientos CONTABILIZADOS
    if (a.estado && a.estado !== 'CONTABILIZADO') return false;

    // Filtro subdiarios de cierre/apertura
    const sub = (a.subdiario || (a as any).subdiarioId || '01').padStart(2, '0');
    if (!incluirCierreYAjustes && (sub === '00' || sub === '09')) return false;

    const per = a.periodo || (a.fecha ? a.fecha.substring(0, 7) : '');
    if (periodo) {
      if (acumuladoAlMes) {
        return per.startsWith(anioStr) && per <= periodo;
      } else {
        return per === periodo || (a.fecha && a.fecha.startsWith(periodo));
      }
    }
    return true;
  });

  // Sumas acumuladas por cuenta PCGE
  const sumasMap = new Map<string, { debe: number; haber: number }>();
  for (const a of asientosFiltrados) {
    for (const it of a.items) {
      const cta = (it.codigoCuenta || '').trim();
      if (!cta) continue;
      const cur = sumasMap.get(cta) || { debe: 0, haber: 0 };
      cur.debe = Number((cur.debe + (it.debe || 0)).toFixed(2));
      cur.haber = Number((cur.haber + (it.haber || 0)).toFixed(2));
      sumasMap.set(cta, cur);
    }
  }

  // Filtrar solo cuentas con movimiento (> 0) y ordenar numéricamente
  const cuentasConMov = Array.from(sumasMap.entries())
    .filter(([_, s]) => s.debe > 0 || s.haber > 0)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

  const filas: FilaHojaTrabajo10Col[] = [];

  let totMontoDebe = 0;
  let totMontoHaber = 0;
  let totSaldoDeu = 0;
  let totSaldoAcr = 0;
  let totInvAct = 0;
  let totInvPas = 0;
  let totNatPer = 0;
  let totNatGan = 0;
  let totFunPer = 0;
  let totFunGan = 0;

  for (const [cta, sumas] of cuentasConMov) {
    const pcgeInfo = buscarCuentaPCGE(cta);
    const nombreCuenta = pcgeInfo?.nombre || `Cuenta ${cta}`;
    const elemento = parseInt(cta.charAt(0), 10) || 1;

    const mDebe = Number(sumas.debe.toFixed(2));
    const mHaber = Number(sumas.haber.toFixed(2));
    const diff = Number((mDebe - mHaber).toFixed(2));

    const sDeudor = diff > 0 ? diff : 0;
    const sAcreedor = diff < 0 ? Math.abs(diff) : 0;

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
      invAct = sDeudor;
    }

    // 2. RESULTADOS POR NATURALEZA (Elementos 6 y 7)
    if (elemento === 6) {
      if (cta.startsWith('61')) {
        if (sAcreedor > 0) natGan = sAcreedor;
        else natPer = sDeudor;
      } else {
        natPer = sDeudor;
        if (sAcreedor > 0) natGan = sAcreedor;
      }
    } else if (elemento === 7) {
      // 79 neutralizada en naturaleza
      if (!cta.startsWith('79')) {
        natGan = sAcreedor;
        if (sDeudor > 0) natPer = sDeudor;
      }
    }

    // 3. RESULTADOS POR FUNCIÓN
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
      if (cta.startsWith('69')) {
        funPer = sDeudor;
        if (sAcreedor > 0) funGan = sAcreedor;
      } else if (elemento === 9) {
        funPer = sDeudor;
        if (sAcreedor > 0) funGan = sAcreedor;
      } else if (elemento === 7 && !cta.startsWith('79')) {
        funGan = sAcreedor;
        if (sDeudor > 0) funPer = sDeudor;
      } else if (cta.startsWith('67')) {
        const hay97 = cuentasConMov.some(([c]) => c.startsWith('97'));
        if (!hay97) {
          funPer = sDeudor;
        }
      }
    }

    totMontoDebe = Number((totMontoDebe + mDebe).toFixed(2));
    totMontoHaber = Number((totMontoHaber + mHaber).toFixed(2));
    totSaldoDeu = Number((totSaldoDeu + sDeudor).toFixed(2));
    totSaldoAcr = Number((totSaldoAcr + sAcreedor).toFixed(2));
    totInvAct = Number((totInvAct + invAct).toFixed(2));
    totInvPas = Number((totInvPas + invPas).toFixed(2));
    totNatPer = Number((totNatPer + natPer).toFixed(2));
    totNatGan = Number((totNatGan + natGan).toFixed(2));
    totFunPer = Number((totFunPer + funPer).toFixed(2));
    totFunGan = Number((totFunGan + funGan).toFixed(2));

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

  // Resultados
  const resultadoInventario = Number((totInvAct - totInvPas).toFixed(2));
  const resultadoNaturaleza = Number((totNatGan - totNatPer).toFixed(2));
  const resultadoFuncion = Number((totFunGan - totFunPer).toFixed(2));

  let tipoResultado: 'UTILIDAD' | 'PERDIDA' | 'EQUILIBRIO' = 'EQUILIBRIO';
  const ref = resultadoNaturaleza !== 0 ? resultadoNaturaleza : resultadoInventario;
  if (ref > 0.001) tipoResultado = 'UTILIDAD';
  else if (ref < -0.001) tipoResultado = 'PERDIDA';

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

  if (resultadoInventario > 0) filaResultado.inventarioPasivo = resultadoInventario;
  else if (resultadoInventario < 0) filaResultado.inventarioActivo = Math.abs(resultadoInventario);

  if (resultadoNaturaleza > 0) filaResultado.naturalezaPerdida = resultadoNaturaleza;
  else if (resultadoNaturaleza < 0) filaResultado.naturalezaGanancia = Math.abs(resultadoNaturaleza);

  if (resultadoFuncion > 0) filaResultado.funcionPerdida = resultadoFuncion;
  else if (resultadoFuncion < 0) filaResultado.funcionGanancia = Math.abs(resultadoFuncion);

  const sumasIguales = {
    montosDebe: totMontoDebe,
    montosHaber: totMontoHaber,
    saldoDeudor: totSaldoDeu,
    saldoAcreedor: totSaldoAcr,
    inventarioActivo: Number((totInvAct + filaResultado.inventarioActivo).toFixed(2)),
    inventarioPasivo: Number((totInvPas + filaResultado.inventarioPasivo).toFixed(2)),
    naturalezaPerdida: Number((totNatPer + filaResultado.naturalezaPerdida).toFixed(2)),
    naturalezaGanancia: Number((totNatGan + filaResultado.naturalezaGanancia).toFixed(2)),
    funcionPerdida: Number((totFunPer + filaResultado.funcionPerdida).toFixed(2)),
    funcionGanancia: Number((totFunGan + filaResultado.funcionGanancia).toFixed(2))
  };

  const diferenciaMontos = Math.abs(totMontoDebe - totMontoHaber);
  const diferenciaSaldos = Math.abs(totSaldoDeu - totSaldoAcr);
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
    alertas.push(`DESCUADRE EN MONTOS: Débito S/ ${totMontoDebe.toFixed(2)} != Crédito S/ ${totMontoHaber.toFixed(2)} (Dif: S/ ${diferenciaMontos.toFixed(2)})`);
  }
  if (!saldosCuadrados) {
    alertas.push(`DESCUADRE EN SALDOS: Deudor S/ ${totSaldoDeu.toFixed(2)} != Acreedor S/ ${totSaldoAcr.toFixed(2)} (Dif: S/ ${diferenciaSaldos.toFixed(2)})`);
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
    empresaId: empresa.id,
    razonSocial: empresa.razonSocial,
    ruc: empresa.ruc,
    direccion: empresa.direccionFiscal || 'LIMA, PERÚ',
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
      montosDebe: totMontoDebe,
      montosHaber: totMontoHaber,
      saldoDeudor: totSaldoDeu,
      saldoAcreedor: totSaldoAcr,
      inventarioActivo: totInvAct,
      inventarioPasivo: totInvPas,
      naturalezaPerdida: totNatPer,
      naturalezaGanancia: totNatGan,
      funcionPerdida: totFunPer,
      funcionGanancia: totFunGan
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
}

/**
 * Motor de cálculo en cliente para el Libro Diario en formato estándar
 */
export function calcularLibroDiarioESTANDAR(
  asientos: AsientoContable[],
  empresa: EmpresaCliente,
  periodo: string,
  opciones?: OpcionesLibroDiarioESTANDAR
): LibroDiarioESTANDARReporte {
  const formatoFecha = opciones?.formatoFecha || 'DD/MM/AAAA';
  const incluirAjustesYCierre = opciones?.incluirAjustesYCierre ?? true;

  const asientosFiltrados = asientos.filter(a => {
    if (a.estado && a.estado !== 'CONTABILIZADO') return false;

    const sub = (a.subdiario || (a as any).subdiarioId || '01').padStart(2, '0');
    if (!incluirAjustesYCierre && (sub === '00' || sub === '09')) return false;

    const per = a.periodo || (a.fecha ? a.fecha.substring(0, 7) : '');
    const coincidePeriodo = per === periodo || (a.fecha && a.fecha.startsWith(periodo));
    if (!coincidePeriodo) return false;

    const vNum = a.numeroAsiento || a.id;
    if (opciones?.voucherDesde && vNum < opciones.voucherDesde) return false;
    if (opciones?.voucherHasta && vNum > opciones.voucherHasta) return false;

    return true;
  });

  const subdiariosMap = new Map<string, AsientoContable[]>();
  for (const a of asientosFiltrados) {
    const sub = (a.subdiario || (a as any).subdiarioId || '01').padStart(2, '0');
    if (!subdiariosMap.has(sub)) subdiariosMap.set(sub, []);
    subdiariosMap.get(sub)!.push(a);
  }

  const codigosSubdiarios = Array.from(subdiariosMap.keys()).sort();

  const anioStr = periodo ? periodo.substring(0, 4) : '2026';
  const mesStr = periodo && periodo.length >= 7 ? periodo.substring(5, 7) : '09';
  const plePeriodo = `${anioStr}${mesStr}00`;

  const subdiarios: BloqueSubdiarioESTANDAR[] = [];
  let totalGeneralDebito = 0;
  let totalGeneralCredito = 0;
  let totalVouchers = 0;
  const pleLineasTxt: string[] = [];

  for (const codSub of codigosSubdiarios) {
    const asientosSub = subdiariosMap.get(codSub)!;
    const descSub = NOMBRES_SUBDIARIOS[codSub] || `SUBDIARIO ${codSub}`;

    let totalDebitoSub = 0;
    let totalCreditoSub = 0;
    const vouchers: VoucherDiarioESTANDAR[] = [];

    for (let i = 0; i < asientosSub.length; i++) {
      const a = asientosSub[i];
      totalVouchers++;

      const cuo = a.cuo || `${codSub}${String(i + 1).padStart(4, '0')}`;
      const rawFecha = a.fecha || `${periodo}-01`;
      let fechaFormateada = rawFecha;
      if (formatoFecha === 'DD/MM/AAAA' && rawFecha.includes('-')) {
        fechaFormateada = rawFecha.split('T')[0].split('-').reverse().join('/');
      }

      const lineas: LineaDiarioESTANDAR[] = [];
      let debitoVoucher = 0;
      let creditoVoucher = 0;

      for (let j = 0; j < (a.items || []).length; j++) {
        const it = a.items[j];
        const lineaNum = j + 1;
        const deb = Number((it.debe || 0).toFixed(2));
        const cred = Number((it.haber || 0).toFixed(2));

        debitoVoucher = Number((debitoVoucher + deb).toFixed(2));
        creditoVoucher = Number((creditoVoucher + cred).toFixed(2));

        const conceptoLinea = it.glosa || a.glosaGeneral || 'Movimiento contable';

        lineas.push({
          linea: lineaNum,
          fechaEmision: fechaFormateada,
          codigoCuenta: it.codigoCuenta,
          nombreCuenta: it.denominacionCuenta,
          concepto: conceptoLinea,
          debito: deb,
          credito: cred
        });

        // PLE 5.1
        const pleFechaContable = rawFecha.includes('-') ? rawFecha.split('T')[0].split('-').reverse().join('/') : rawFecha;
        const camposPle = [
          plePeriodo,
          cuo,
          `M${lineaNum}`,
          it.codigoCuenta,
          '',
          '',
          a.moneda || 'PEN',
          '00',
          '',
          '',
          pleFechaContable,
          pleFechaContable,
          pleFechaContable,
          conceptoLinea.replace(/[|\r\n]/g, ' ').substring(0, 200),
          '',
          deb.toFixed(2),
          cred.toFixed(2),
          '',
          '1'
        ];
        pleLineasTxt.push(camposPle.join('|') + '|');
      }

      totalDebitoSub = Number((totalDebitoSub + debitoVoucher).toFixed(2));
      totalCreditoSub = Number((totalCreditoSub + creditoVoucher).toFixed(2));

      vouchers.push({
        numeroVoucher: a.numeroAsiento || a.id,
        correlativo: i + 1,
        cuo,
        subdiarioCodigo: codSub,
        fecha: fechaFormateada,
        glosa: a.glosaGeneral || 'Asiento contable',
        moneda: a.moneda || 'PEN',
        totalDebito: debitoVoucher,
        totalCredito: creditoVoucher,
        cuadrado: Math.abs(debitoVoucher - creditoVoucher) < 0.01,
        lineas
      });
    }

    totalGeneralDebito = Number((totalGeneralDebito + totalDebitoSub).toFixed(2));
    totalGeneralCredito = Number((totalGeneralCredito + totalCreditoSub).toFixed(2));

    subdiarios.push({
      codigo: codSub,
      descripcion: descSub,
      vouchers,
      totalDebitoSubdiario: totalDebitoSub,
      totalCreditoSubdiario: totalCreditoSub,
      cuadrado: Math.abs(totalDebitoSub - totalCreditoSub) < 0.01
    });
  }

  const diferenciaGeneral = Math.abs(totalGeneralDebito - totalGeneralCredito);
  const estaCuadrado = diferenciaGeneral < 0.01;

  const ple51NombreArchivo = `LE${empresa.ruc}${anioStr}${mesStr}00050100001111.txt`;
  const ple51ContenidoTxt = pleLineasTxt.join('\r\n') + (pleLineasTxt.length > 0 ? '\r\n' : '');

  return {
    empresaId: empresa.id,
    razonSocial: empresa.razonSocial,
    ruc: empresa.ruc,
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
}

/**
 * Exporta la Hoja de Trabajo 10 Columnas a hoja de cálculo (formato CSV/TSV profesional estructurado)
 */
export function exportarHojaTrabajoHojaCalculo(
  reporte: HojaTrabajo10ColumnasReporte,
  opciones?: OpcionesExportacionImpresion
) {
  const lineas: string[] = [];

  // Encabezado
  lineas.push(`RAZÓN SOCIAL:\t${reporte.razonSocial}`);
  lineas.push(`RUC:\t${reporte.ruc}`);
  lineas.push(`DIRECCIÓN:\t${reporte.direccion}`);
  lineas.push(`TÍTULO:\t${reporte.titulo}`);
  lineas.push(`PERIODO:\t${reporte.periodo} (${reporte.acumuladoAlMes ? 'Acumulado al mes' : 'Solo el mes'})`);
  lineas.push(`MONEDA:\tSOLES (PEN)`);
  if (opciones?.incluirFechaImpresion) {
    lineas.push(`FECHA DE IMPRESIÓN:\t${new Date().toLocaleString('es-PE')}`);
  }
  if (opciones?.incluirUsuario) {
    lineas.push(`USUARIO:\t${opciones.usuarioNombre || 'Administrador'}`);
  }
  lineas.push('');

  // Cabecera de 10 columnas
  lineas.push('CUENTA\tNOMBRE\tMONTOS DÉBITO\tMONTOS CRÉDITO\tSALDO DEUDOR\tSALDO ACREEDOR\tINVENTARIO ACTIVO\tINVENTARIO PASIVO\tNATURALEZA PÉRDIDA\tNATURALEZA GANANCIA\tFUNCIÓN PÉRDIDA\tFUNCIÓN GANANCIA');

  for (const f of reporte.filas) {
    lineas.push([
      f.codigoCuenta,
      `"${f.nombreCuenta.replace(/"/g, '""')}"`,
      f.montosDebe.toFixed(2),
      f.montosHaber.toFixed(2),
      f.saldoDeudor.toFixed(2),
      f.saldoAcreedor.toFixed(2),
      f.inventarioActivo.toFixed(2),
      f.inventarioPasivo.toFixed(2),
      f.naturalezaPerdida.toFixed(2),
      f.naturalezaGanancia.toFixed(2),
      f.funcionPerdida.toFixed(2),
      f.funcionGanancia.toFixed(2)
    ].join('\t'));
  }

  // Fila TOTALES
  lineas.push([
    'TOTALES',
    '',
    reporte.totales.montosDebe.toFixed(2),
    reporte.totales.montosHaber.toFixed(2),
    reporte.totales.saldoDeudor.toFixed(2),
    reporte.totales.saldoAcreedor.toFixed(2),
    reporte.totales.inventarioActivo.toFixed(2),
    reporte.totales.inventarioPasivo.toFixed(2),
    reporte.totales.naturalezaPerdida.toFixed(2),
    reporte.totales.naturalezaGanancia.toFixed(2),
    reporte.totales.funcionPerdida.toFixed(2),
    reporte.totales.funcionGanancia.toFixed(2)
  ].join('\t'));

  // Fila RESULTADO DEL EJERCICIO
  lineas.push([
    reporte.filaResultado.etiqueta,
    '',
    '',
    '',
    '',
    '',
    reporte.filaResultado.inventarioActivo > 0 ? reporte.filaResultado.inventarioActivo.toFixed(2) : '',
    reporte.filaResultado.inventarioPasivo > 0 ? reporte.filaResultado.inventarioPasivo.toFixed(2) : '',
    reporte.filaResultado.naturalezaPerdida > 0 ? reporte.filaResultado.naturalezaPerdida.toFixed(2) : '',
    reporte.filaResultado.naturalezaGanancia > 0 ? reporte.filaResultado.naturalezaGanancia.toFixed(2) : '',
    reporte.filaResultado.funcionPerdida > 0 ? reporte.filaResultado.funcionPerdida.toFixed(2) : '',
    reporte.filaResultado.funcionGanancia > 0 ? reporte.filaResultado.funcionGanancia.toFixed(2) : ''
  ].join('\t'));

  // Fila SUMAS IGUALES
  lineas.push([
    'SUMAS IGUALES',
    '',
    reporte.sumasIguales.montosDebe.toFixed(2),
    reporte.sumasIguales.montosHaber.toFixed(2),
    reporte.sumasIguales.saldoDeudor.toFixed(2),
    reporte.sumasIguales.saldoAcreedor.toFixed(2),
    reporte.sumasIguales.inventarioActivo.toFixed(2),
    reporte.sumasIguales.inventarioPasivo.toFixed(2),
    reporte.sumasIguales.naturalezaPerdida.toFixed(2),
    reporte.sumasIguales.naturalezaGanancia.toFixed(2),
    reporte.sumasIguales.funcionPerdida.toFixed(2),
    reporte.sumasIguales.funcionGanancia.toFixed(2)
  ].join('\t'));

  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HOJA_TRABAJO_10COL_${reporte.ruc}_${reporte.periodo.replace('-', '')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta el Libro Diario a hoja de cálculo con estructura jerárquica
 */
export function exportarLibroDiarioHojaCalculo(
  reporte: LibroDiarioESTANDARReporte,
  opciones?: OpcionesExportacionImpresion
) {
  const lineas: string[] = [];

  lineas.push(`RAZÓN SOCIAL:\t${reporte.razonSocial}`);
  lineas.push(`RUC:\t${reporte.ruc}`);
  lineas.push(`LIBRO:\tLIBRO DIARIO (FORMATO 5.1)`);
  lineas.push(`PERIODO:\t${reporte.periodo}`);
  lineas.push(`MONEDA:\tSOLES (PEN)`);
  if (opciones?.incluirFechaImpresion) {
    lineas.push(`FECHA DE IMPRESIÓN:\t${new Date().toLocaleString('es-PE')}`);
  }
  if (opciones?.incluirUsuario) {
    lineas.push(`USUARIO:\t${opciones.usuarioNombre || 'Administrador'}`);
  }
  lineas.push('');

  lineas.push('FECHA\tCÓDIGO\tNOMBRE CUENTA\tCONCEPTO (GLOSA)\tDÉBITO\tCRÉDITO\tCUO');

  for (const sub of reporte.subdiarios) {
    lineas.push(`>>> SUBDIARIO ${sub.codigo}: ${sub.descripcion}\t\t\t\t\t\t`);
    for (const v of sub.vouchers) {
      lineas.push(`[VOUCHER ${v.numeroVoucher}]\tCUO: ${v.cuo}\tFecha: ${v.fecha}\tGlosa: ${v.glosa}\t\t\t`);
      for (const lin of v.lineas) {
        lineas.push([
          lin.fechaEmision,
          lin.codigoCuenta,
          `"${lin.nombreCuenta.replace(/"/g, '""')}"`,
          `"${lin.concepto.replace(/"/g, '""')}"`,
          lin.debito > 0 ? lin.debito.toFixed(2) : '0.00',
          lin.credito > 0 ? lin.credito.toFixed(2) : '0.00',
          v.cuo
        ].join('\t'));
      }
      lineas.push(`TOTAL COMPROBANTE ${v.numeroVoucher}:\t\t\t\t${v.totalDebito.toFixed(2)}\t${v.totalCredito.toFixed(2)}\t`);
    }
    lineas.push(`TOTAL SUBDIARIO ${sub.codigo}:\t\t\t\t${sub.totalDebitoSubdiario.toFixed(2)}\t${sub.totalCreditoSubdiario.toFixed(2)}\t`);
    lineas.push('');
  }

  lineas.push(`TOTAL GENERAL DEL MES:\t\t\t\t${reporte.totalGeneralDebito.toFixed(2)}\t${reporte.totalGeneralCredito.toFixed(2)}\t`);

  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LIBRO_DIARIO_${reporte.ruc}_${reporte.periodo.replace('-', '')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta la Hoja de Trabajo 10 Columnas a PDF formal (Landscape A4)
 */
export function exportarHojaTrabajoPdf(
  reporte: HojaTrabajo10ColumnasReporte,
  opciones?: OpcionesExportacionImpresion
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const headers = [
    [
      { content: 'CUENTA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NOMBRE DE LA CUENTA', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
      { content: 'MONTOS', colSpan: 2, styles: { halign: 'center' } },
      { content: 'SALDO', colSpan: 2, styles: { halign: 'center' } },
      { content: 'INVENTARIO', colSpan: 2, styles: { halign: 'center' } },
      { content: 'NATURALEZA', colSpan: 2, styles: { halign: 'center' } },
      { content: 'FUNCIÓN', colSpan: 2, styles: { halign: 'center' } }
    ],
    [
      'Débito', 'Crédito',
      'Deudor', 'Acreedor',
      'Activo', 'Pasivo',
      'Pérdida', 'Ganancia',
      'Pérdida', 'Ganancia'
    ]
  ];

  const rows = reporte.filas.map(f => [
    f.codigoCuenta,
    f.nombreCuenta.substring(0, 32),
    f.montosDebe > 0 ? f.montosDebe.toFixed(2) : '-',
    f.montosHaber > 0 ? f.montosHaber.toFixed(2) : '-',
    f.saldoDeudor > 0 ? f.saldoDeudor.toFixed(2) : '-',
    f.saldoAcreedor > 0 ? f.saldoAcreedor.toFixed(2) : '-',
    f.inventarioActivo !== 0 ? f.inventarioActivo.toFixed(2) : '-',
    f.inventarioPasivo > 0 ? f.inventarioPasivo.toFixed(2) : '-',
    f.naturalezaPerdida > 0 ? f.naturalezaPerdida.toFixed(2) : '-',
    f.naturalezaGanancia > 0 ? f.naturalezaGanancia.toFixed(2) : '-',
    f.funcionPerdida > 0 ? f.funcionPerdida.toFixed(2) : '-',
    f.funcionGanancia > 0 ? f.funcionGanancia.toFixed(2) : '-'
  ]);

  const foot = [
    [
      { content: 'TOTALES', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      reporte.totales.montosDebe.toFixed(2),
      reporte.totales.montosHaber.toFixed(2),
      reporte.totales.saldoDeudor.toFixed(2),
      reporte.totales.saldoAcreedor.toFixed(2),
      reporte.totales.inventarioActivo.toFixed(2),
      reporte.totales.inventarioPasivo.toFixed(2),
      reporte.totales.naturalezaPerdida.toFixed(2),
      reporte.totales.naturalezaGanancia.toFixed(2),
      reporte.totales.funcionPerdida.toFixed(2),
      reporte.totales.funcionGanancia.toFixed(2)
    ],
    [
      { content: reporte.filaResultado.etiqueta, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] } },
      '', '', '', '',
      reporte.filaResultado.inventarioActivo > 0 ? reporte.filaResultado.inventarioActivo.toFixed(2) : '',
      reporte.filaResultado.inventarioPasivo > 0 ? reporte.filaResultado.inventarioPasivo.toFixed(2) : '',
      reporte.filaResultado.naturalezaPerdida > 0 ? reporte.filaResultado.naturalezaPerdida.toFixed(2) : '',
      reporte.filaResultado.naturalezaGanancia > 0 ? reporte.filaResultado.naturalezaGanancia.toFixed(2) : '',
      reporte.filaResultado.funcionPerdida > 0 ? reporte.filaResultado.funcionPerdida.toFixed(2) : '',
      reporte.filaResultado.funcionGanancia > 0 ? reporte.filaResultado.funcionGanancia.toFixed(2) : ''
    ],
    [
      { content: 'SUMAS IGUALES', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240] } },
      reporte.sumasIguales.montosDebe.toFixed(2),
      reporte.sumasIguales.montosHaber.toFixed(2),
      reporte.sumasIguales.saldoDeudor.toFixed(2),
      reporte.sumasIguales.saldoAcreedor.toFixed(2),
      reporte.sumasIguales.inventarioActivo.toFixed(2),
      reporte.sumasIguales.inventarioPasivo.toFixed(2),
      reporte.sumasIguales.naturalezaPerdida.toFixed(2),
      reporte.sumasIguales.naturalezaGanancia.toFixed(2),
      reporte.sumasIguales.funcionPerdida.toFixed(2),
      reporte.sumasIguales.funcionGanancia.toFixed(2)
    ]
  ];

  autoTable(doc, {
    head: headers as any,
    body: rows,
    foot: foot as any,
    startY: 38,
    margin: { top: 38, bottom: 20, left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 20 },
      11: { halign: 'right', cellWidth: 20 }
    },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const totalPages = (doc as any).internal.getNumberOfPages();

      // Membrete Superior
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(reporte.razonSocial.toUpperCase(), 10, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`RUC: ${reporte.ruc}  |  DIRECCIÓN: ${reporte.direccion}  |  MONEDA: SOLES (PEN)`, 10, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(reporte.titulo, 10, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Modalidad: ${reporte.acumuladoAlMes ? 'Acumulado al mes' : 'Solo el mes'}  |  Correctoras: ${reporte.correctorasActivoEnNegativo ? 'Activo negativo' : 'En Pasivo'}`, 10, 26);

      // Bloque de fecha y usuario si aplican
      let xOffset = pageWidth - 10;
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      if (opciones?.incluirFechaImpresion) {
        const fechaTxt = `Impreso: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;
        doc.text(fechaTxt, xOffset, 12, { align: 'right' });
      }
      if (opciones?.incluirUsuario) {
        const usrTxt = `Usuario: ${opciones.usuarioNombre || 'Administrador'}`;
        doc.text(usrTxt, xOffset, 16.5, { align: 'right' });
      }

      // Pie de página con número de página
      if (opciones?.incluirNumeroPagina !== false) {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${data.pageNumber} de ${totalPages}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
      }
      doc.text('SunaConta Cloud - Hoja de Trabajo 10 Columnas Oficial (Reglamento PCGE / SUNAT)', 10, pageHeight - 8);
    }
  });

  const nombreArchivo = `HOJA_TRABAJO_10COL_${reporte.ruc}_${reporte.periodo.replace('-', '')}.pdf`;
  doc.save(nombreArchivo);
}

/**
 * Exporta el Libro Diario a PDF oficial con bloques jerárquicos
 */
export function exportarLibroDiarioESTANDARPdf(
  reporte: LibroDiarioESTANDARReporte,
  opciones?: OpcionesExportacionImpresion
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const headers = [
    [
      'Fecha',
      'Código',
      'Denominación de la Cuenta / Glosa',
      'Débito (S/)',
      'Crédito (S/)'
    ]
  ];

  const rows: any[] = [];

  for (const sub of reporte.subdiarios) {
    // Encabezado de subdiario
    rows.push([
      {
        content: `SUBDIARIO ${sub.codigo}: ${sub.descripcion}`,
        colSpan: 5,
        styles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5
        }
      }
    ]);

    for (const v of sub.vouchers) {
      // Encabezado de voucher
      rows.push([
        {
          content: `VOUCHER N° ${v.numeroVoucher}  |  CUO: ${v.cuo}  |  Fecha: ${v.fecha}  |  Glosa: ${v.glosa}`,
          colSpan: 5,
          styles: {
            fillColor: [241, 245, 249],
            textColor: [30, 58, 138],
            fontStyle: 'bold',
            fontSize: 7
          }
        }
      ]);

      for (const lin of v.lineas) {
        rows.push([
          lin.fechaEmision,
          lin.codigoCuenta,
          `${lin.nombreCuenta}\n   ↳ ${lin.concepto}`,
          lin.debito > 0 ? lin.debito.toFixed(2) : '-',
          lin.credito > 0 ? lin.credito.toFixed(2) : '-'
        ]);
      }

      // Fila TOTAL COMPROBANTE
      rows.push([
        {
          content: `TOTAL COMPROBANTE ${v.numeroVoucher}:`,
          colSpan: 3,
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 6.5, textColor: [71, 85, 105] }
        },
        { content: v.totalDebito.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 6.5 } },
        { content: v.totalCredito.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 6.5 } }
      ]);
    }

    // Fila TOTAL SUBDIARIO
    rows.push([
      {
        content: `TOTAL SUBDIARIO ${sub.codigo} - ${sub.descripcion}:`,
        colSpan: 3,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240], fontSize: 7 }
      },
      { content: sub.totalDebitoSubdiario.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240], fontSize: 7 } },
      { content: sub.totalCreditoSubdiario.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240], fontSize: 7 } }
    ]);
  }

  const foot = [
    [
      { content: 'TOTAL GENERAL DEL MES:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
      reporte.totalGeneralDebito.toFixed(2),
      reporte.totalGeneralCredito.toFixed(2)
    ]
  ];

  autoTable(doc, {
    head: headers as any,
    body: rows,
    foot: foot as any,
    startY: 38,
    margin: { top: 38, bottom: 20, left: 12, right: 12 },
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [30, 58, 138] },
      2: { halign: 'left' },
      3: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 24, fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const totalPages = (doc as any).internal.getNumberOfPages();

      // Membrete Superior
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(reporte.razonSocial.toUpperCase(), 12, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`RUC: ${reporte.ruc}  |  LIBRO DIARIO (FORMATO 5.1 SUNAT)`, 12, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(`PERIODO: ${reporte.periodo}  |  MONEDA: SOLES (PEN)`, 12, 22);

      // Switches de impresión
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      if (opciones?.incluirFechaImpresion) {
        const fechaTxt = `Impreso: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;
        doc.text(fechaTxt, pageWidth - 12, 12, { align: 'right' });
      }
      if (opciones?.incluirUsuario) {
        const usrTxt = `Usuario: ${opciones.usuarioNombre || 'Administrador'}`;
        doc.text(usrTxt, pageWidth - 12, 16.5, { align: 'right' });
      }

      // Pie de página
      if (opciones?.incluirNumeroPagina !== false) {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${data.pageNumber} de ${totalPages}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
      }
      doc.text('SunaConta Cloud - Libro Diario (Consistente con PLE 5.1)', 12, pageHeight - 8);
    }
  });

  const nombreArchivo = `LIBRO_DIARIO_${reporte.ruc}_${reporte.periodo.replace('-', '')}.pdf`;
  doc.save(nombreArchivo);
}
