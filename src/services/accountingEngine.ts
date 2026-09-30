import { Comprobante, AsientoContable, LiquidacionPDT621, BalanceComprobacionFila } from '../types';
import { buscarCuentaPCGE, PLAN_CONTABLE_PCGE } from '../data/pcgeAccounts';

export function generarAsientoCompra(comprobante: Comprobante, index: number): AsientoContable {
  const anioMes = comprobante.fechaEmision.substring(0, 7);
  const numeroAsiento = `AST-${anioMes.replace('-', '')}-${String(index).padStart(4, '0')}`;
  
  const ctaGasto = comprobante.cuentaContableAsignada || comprobante.categoriaGasto || '6011';
  const infoCtaGasto = buscarCuentaPCGE(ctaGasto) || { nombre: 'Gasto / Compra General' };
  
  const baseImponible = comprobante.baseImponibleGravada;
  const igv = comprobante.igv;
  const noGravadas = comprobante.adquisicionesNoGravadas || 0;
  const total = comprobante.total;

  const items = [
    // 1. Cuenta de Gasto o Compra (Debe)
    {
      id: `${numeroAsiento}-1`,
      codigoCuenta: ctaGasto,
      denominacionCuenta: infoCtaGasto.nombre,
      debe: Number((baseImponible + noGravadas).toFixed(2)),
      haber: 0,
      glosa: `Por la compra según ${comprobante.tipoDoc === '01' ? 'Factura' : 'Comprobante'} ${comprobante.serie}-${comprobante.numero}`
    },
    // 2. IGV Crédito Fiscal 40111 (Debe)
    ...(igv > 0 ? [{
      id: `${numeroAsiento}-2`,
      codigoCuenta: '40111',
      denominacionCuenta: 'IGV - Cuenta propia (Crédito Fiscal)',
      debe: Number(igv.toFixed(2)),
      haber: 0,
      glosa: `IGV de compra ${comprobante.serie}-${comprobante.numero}`
    }] : []),
    // 3. Proveedores Cuentas por Pagar Comerciales 4212 (Haber)
    {
      id: `${numeroAsiento}-3`,
      codigoCuenta: '4212',
      denominacionCuenta: 'Emitidas en cartera - ' + comprobante.razonSocialEmisor.substring(0, 30),
      debe: 0,
      haber: Number(total.toFixed(2)),
      glosa: `Obligación con proveedor RUC ${comprobante.rucEmisor}`
    }
  ];

  // Asiento de Destino (Si es cuenta de elemento 6)
  if (ctaGasto.startsWith('60')) {
    // Destino de Mercaderías: 20111 Almacén contra 6111 Variación de Inventarios
    items.push(
      {
        id: `${numeroAsiento}-4`,
        codigoCuenta: '20111',
        denominacionCuenta: 'Mercaderías manufacturadas - Costo (Almacén)',
        debe: Number((baseImponible + noGravadas).toFixed(2)),
        haber: 0,
        glosa: `Ingreso al almacén por compra ${comprobante.serie}-${comprobante.numero}`
      },
      {
        id: `${numeroAsiento}-5`,
        codigoCuenta: '6111',
        denominacionCuenta: 'Variación de inventarios - Mercaderías',
        debe: 0,
        haber: Number((baseImponible + noGravadas).toFixed(2)),
        glosa: `Por el destino de las existencias compradas`
      }
    );
  } else if (ctaGasto.startsWith('63') || ctaGasto.startsWith('65')) {
    // Destino de Gastos: 60% Administración (941) y 40% Ventas (951) contra 791
    const montoGasto = baseImponible + noGravadas;
    const gastoAdmin = Number((montoGasto * 0.6).toFixed(2));
    const gastoVentas = Number((montoGasto - gastoAdmin).toFixed(2));

    items.push(
      {
        id: `${numeroAsiento}-4`,
        codigoCuenta: '941',
        denominacionCuenta: 'Gastos de Administración (60%)',
        debe: gastoAdmin,
        haber: 0,
        glosa: `Destino administrativo del gasto ${comprobante.serie}-${comprobante.numero}`
      },
      {
        id: `${numeroAsiento}-5`,
        codigoCuenta: '951',
        denominacionCuenta: 'Gastos de Ventas (40%)',
        debe: gastoVentas,
        haber: 0,
        glosa: `Destino comercial del gasto ${comprobante.serie}-${comprobante.numero}`
      },
      {
        id: `${numeroAsiento}-6`,
        codigoCuenta: '791',
        denominacionCuenta: 'Cargas imputables a cuentas de costos y gastos',
        debe: 0,
        haber: Number(montoGasto.toFixed(2)),
        glosa: `Por la imputación a cuentas de función (94/95)`
      }
    );
  }

  const totalDebe = Number(items.reduce((acc, it) => acc + it.debe, 0).toFixed(2));
  const totalHaber = Number(items.reduce((acc, it) => acc + it.haber, 0).toFixed(2));

  return {
    id: numeroAsiento,
    subdiario: '01',
    numeroAsiento,
    periodo: anioMes,
    fecha: comprobante.fechaEmision,
    moneda: comprobante.moneda || 'PEN',
    tipoCambio: comprobante.tipoCambio || 1.000,
    tipoOperacion: 'COMPRA',
    glosaGeneral: `COMPRA: ${comprobante.razonSocialEmisor} | Doc: ${comprobante.serie}-${comprobante.numero}`,
    comprobanteReferencia: `${comprobante.serie}-${comprobante.numero}`,
    items,
    totalDebe,
    totalHaber,
    cuadrado: Math.abs(totalDebe - totalHaber) < 0.05,
    origenAutomatico: true
  };
}

export function generarAsientoVenta(comprobante: Comprobante, index: number): AsientoContable {
  const anioMes = comprobante.fechaEmision.substring(0, 7);
  const numeroAsiento = `AST-${anioMes.replace('-', '')}-V${String(index).padStart(3, '0')}`;
  
  const baseImponible = comprobante.baseImponibleGravada;
  const igv = comprobante.igv;
  const total = comprobante.total;

  const items = [
    // 1. Cuentas por Cobrar Comerciales 1212 (Debe)
    {
      id: `${numeroAsiento}-1`,
      codigoCuenta: '1212',
      denominacionCuenta: 'Facturas por cobrar - ' + comprobante.razonSocialReceptor.substring(0, 30),
      debe: Number(total.toFixed(2)),
      haber: 0,
      glosa: `Por la venta efectuada a ${comprobante.razonSocialReceptor}`
    },
    // 2. IGV Débito Fiscal 40111 (Haber)
    {
      id: `${numeroAsiento}-2`,
      codigoCuenta: '40111',
      denominacionCuenta: 'IGV - Cuenta propia (Débito Fiscal)',
      debe: 0,
      haber: Number(igv.toFixed(2)),
      glosa: `IGV generado por venta ${comprobante.serie}-${comprobante.numero}`
    },
    // 3. Ventas de mercaderías 70111 (Haber)
    {
      id: `${numeroAsiento}-3`,
      codigoCuenta: '70111',
      denominacionCuenta: 'Ventas de mercaderías - Mercado local',
      debe: 0,
      haber: Number(baseImponible.toFixed(2)),
      glosa: `Ingreso por venta según ${comprobante.serie}-${comprobante.numero}`
    }
  ];

  const totalDebe = Number(items.reduce((acc, it) => acc + it.debe, 0).toFixed(2));
  const totalHaber = Number(items.reduce((acc, it) => acc + it.haber, 0).toFixed(2));

  return {
    id: numeroAsiento,
    subdiario: '02',
    numeroAsiento,
    periodo: anioMes,
    fecha: comprobante.fechaEmision,
    moneda: comprobante.moneda || 'PEN',
    tipoCambio: comprobante.tipoCambio || 1.000,
    tipoOperacion: 'VENTA',
    glosaGeneral: `VENTA: ${comprobante.razonSocialReceptor} | Doc: ${comprobante.serie}-${comprobante.numero}`,
    comprobanteReferencia: `${comprobante.serie}-${comprobante.numero}`,
    items,
    totalDebe,
    totalHaber,
    cuadrado: Math.abs(totalDebe - totalHaber) < 0.05,
    origenAutomatico: true
  };
}

export function generarAsientoPlanilla(
  sueldosBrutos: number,
  essaludMonto: number,
  retencionPension: number,
  netoPagar: number,
  periodo: string,
  index: number
): AsientoContable {
  const [anio, mes] = periodo.split('-');
  const numeroAsiento = `07${mes}${String(index).padStart(4, '0')}`;
  const gastoTotal = Number((sueldosBrutos + essaludMonto).toFixed(2));
  const gastoAdmin = Number((gastoTotal * 0.6).toFixed(2));
  const gastoVentas = Number((gastoTotal - gastoAdmin).toFixed(2));

  const items = [
    {
      id: `${numeroAsiento}-1`,
      codigoCuenta: '6211',
      denominacionCuenta: 'Sueldos y Salarios',
      debe: Number(sueldosBrutos.toFixed(2)),
      haber: 0,
      glosa: `Planilla de remuneraciones mes ${mes}/${anio}`
    },
    {
      id: `${numeroAsiento}-2`,
      codigoCuenta: '6271',
      denominacionCuenta: 'Régimen de prestaciones de salud (EsSalud 9%)',
      debe: Number(essaludMonto.toFixed(2)),
      haber: 0,
      glosa: `Aporte patronal EsSalud 9% planilla ${mes}/${anio}`
    },
    {
      id: `${numeroAsiento}-3`,
      codigoCuenta: '4031',
      denominacionCuenta: 'EsSalud por pagar',
      debe: 0,
      haber: Number(essaludMonto.toFixed(2)),
      glosa: `Obligación tributaria EsSalud mes ${mes}`
    },
    {
      id: `${numeroAsiento}-4`,
      codigoCuenta: '4032',
      denominacionCuenta: 'ONP / AFP Administradoras de Fondos de Pensiones',
      debe: 0,
      haber: Number(retencionPension.toFixed(2)),
      glosa: `Retención aporte pensionario del trabajador`
    },
    {
      id: `${numeroAsiento}-5`,
      codigoCuenta: '4111',
      denominacionCuenta: 'Remuneraciones por pagar',
      debe: 0,
      haber: Number(netoPagar.toFixed(2)),
      glosa: `Neto a pagar a trabajadores del mes`
    },
    // Destino
    {
      id: `${numeroAsiento}-6`,
      codigoCuenta: '941',
      denominacionCuenta: 'Gastos de Administración (Planilla 60%)',
      debe: gastoAdmin,
      haber: 0,
      glosa: `Destino administrativo planilla ${mes}`
    },
    {
      id: `${numeroAsiento}-7`,
      codigoCuenta: '951',
      denominacionCuenta: 'Gastos de Ventas (Planilla 40%)',
      debe: gastoVentas,
      haber: 0,
      glosa: `Destino comercial planilla ${mes}`
    },
    {
      id: `${numeroAsiento}-8`,
      codigoCuenta: '791',
      denominacionCuenta: 'Cargas imputables a cuenta de costos y gastos',
      debe: 0,
      haber: gastoTotal,
      glosa: `Por el destino de las cargas de personal`
    }
  ];

  const totalDebe = Number(items.reduce((acc, it) => acc + it.debe, 0).toFixed(2));
  const totalHaber = Number(items.reduce((acc, it) => acc + it.haber, 0).toFixed(2));

  return {
    id: numeroAsiento,
    subdiario: '07',
    numeroAsiento,
    periodo,
    fecha: `${periodo}-28`,
    moneda: 'PEN',
    tipoCambio: 1.000,
    tipoOperacion: 'PLANILLA',
    glosaGeneral: `PLANILLA: Planilla de sueldos y aportes EsSalud/ONP mes ${mes}/${anio}`,
    comprobanteReferencia: `PLAME-${mes}${anio}`,
    items,
    totalDebe,
    totalHaber,
    cuadrado: Math.abs(totalDebe - totalHaber) < 0.05,
    origenAutomatico: true
  };
}

export function generarAsientoHonorario(
  honorario: {
    numeroRecibo: string;
    fechaEmision: string;
    rucEmisor: string;
    razonSocialEmisor: string;
    montoTotal: number;
    retencion8: number;
    netoPagar: number;
    cuentaGasto?: string;
  },
  periodo: string,
  index: number
): AsientoContable {
  const [anio, mes] = periodo.split('-');
  const numeroAsiento = `06${mes}${String(index).padStart(4, '0')}`;
  const ctaGasto = honorario.cuentaGasto || '6321';
  const ctaInfo = buscarCuentaPCGE(ctaGasto) || { nombre: 'Asesoría y Consultoría Profesional' };

  const gastoAdmin = Number((honorario.montoTotal * 0.6).toFixed(2));
  const gastoVentas = Number((honorario.montoTotal - gastoAdmin).toFixed(2));

  const items = [
    {
      id: `${numeroAsiento}-1`,
      codigoCuenta: ctaGasto,
      denominacionCuenta: ctaInfo.nombre,
      debe: Number(honorario.montoTotal.toFixed(2)),
      haber: 0,
      glosa: `Honorarios según recibo ${honorario.numeroRecibo}`
    },
    ...(honorario.retencion8 > 0 ? [{
      id: `${numeroAsiento}-2`,
      codigoCuenta: '40172',
      denominacionCuenta: 'Renta de 4ta categoría - Retenciones por pagar (8%)',
      debe: 0,
      haber: Number(honorario.retencion8.toFixed(2)),
      glosa: `Retención 8% I.R. 4ta categoría SUNAT`
    }] : []),
    {
      id: `${numeroAsiento}-3`,
      codigoCuenta: '424',
      denominacionCuenta: 'Honorarios por pagar - ' + honorario.razonSocialEmisor.substring(0, 30),
      debe: 0,
      haber: Number(honorario.netoPagar.toFixed(2)),
      glosa: `Obligación neta con profesional RUC ${honorario.rucEmisor}`
    },
    // Destino
    {
      id: `${numeroAsiento}-4`,
      codigoCuenta: '941',
      denominacionCuenta: 'Gastos de Administración (60%)',
      debe: gastoAdmin,
      haber: 0,
      glosa: `Destino administrativo honorario ${honorario.numeroRecibo}`
    },
    {
      id: `${numeroAsiento}-5`,
      codigoCuenta: '951',
      denominacionCuenta: 'Gastos de Ventas (40%)',
      debe: gastoVentas,
      haber: 0,
      glosa: `Destino comercial honorario ${honorario.numeroRecibo}`
    },
    {
      id: `${numeroAsiento}-6`,
      codigoCuenta: '791',
      denominacionCuenta: 'Cargas imputables a cuenta de costos y gastos',
      debe: 0,
      haber: Number(honorario.montoTotal.toFixed(2)),
      glosa: `Por el destino del gasto de 4ta categoría`
    }
  ];

  const totalDebe = Number(items.reduce((acc, it) => acc + it.debe, 0).toFixed(2));
  const totalHaber = Number(items.reduce((acc, it) => acc + it.haber, 0).toFixed(2));

  return {
    id: numeroAsiento,
    subdiario: '06',
    numeroAsiento,
    periodo,
    fecha: honorario.fechaEmision,
    moneda: 'PEN',
    tipoCambio: 1.000,
    tipoOperacion: 'COMPRA',
    glosaGeneral: `HONORARIOS: ${honorario.razonSocialEmisor} | Recibo: ${honorario.numeroRecibo}`,
    comprobanteReferencia: honorario.numeroRecibo,
    items,
    totalDebe,
    totalHaber,
    cuadrado: Math.abs(totalDebe - totalHaber) < 0.05,
    origenAutomatico: true
  };
}

export function calcularLiquidacionPDT621(
  compras: Comprobante[],
  ventas: Comprobante[],
  periodo: string,
  tasaRenta: number = 0.01, // 1% para MYPE Tributario
  saldoAnteriorIgv: number = 0
): LiquidacionPDT621 {
  const ventasNetasGravadas = ventas
    .filter(v => v.estadoSunat === 'ACEPTADO')
    .reduce((acc, v) => acc + v.baseImponibleGravada, 0);

  const debitoFiscalIgv = ventas
    .filter(v => v.estadoSunat === 'ACEPTADO')
    .reduce((acc, v) => acc + v.igv, 0);

  const comprasNetasGravadas = compras
    .filter(c => c.estadoSunat === 'ACEPTADO')
    .reduce((acc, c) => acc + c.baseImponibleGravada, 0);

  const creditoFiscalIgv = compras
    .filter(c => c.estadoSunat === 'ACEPTADO')
    .reduce((acc, c) => acc + c.igv, 0);

  const igvDeterminadoBruto = debitoFiscalIgv - creditoFiscalIgv;
  const igvDeterminado = igvDeterminadoBruto - saldoAnteriorIgv;
  const igvPorPagar = Math.max(0, igvDeterminado);

  // Pago a cuenta de Renta 3ra
  const baseCalculoRenta = ventasNetasGravadas;
  const pagoCuentaRenta = Number((baseCalculoRenta * tasaRenta).toFixed(2));
  const rentaPorPagar = pagoCuentaRenta;

  const totalTributosPorPagar = Number((igvPorPagar + rentaPorPagar).toFixed(2));

  return {
    periodo,
    ventasNetasGravadas: Number(ventasNetasGravadas.toFixed(2)),
    debitoFiscalIgv: Number(debitoFiscalIgv.toFixed(2)),
    comprasNetasGravadas: Number(comprasNetasGravadas.toFixed(2)),
    creditoFiscalIgv: Number(creditoFiscalIgv.toFixed(2)),
    saldoFavorPeriodoAnterior: saldoAnteriorIgv,
    igvDeterminado: Number(igvDeterminadoBruto.toFixed(2)),
    retencionesEfectuadas: 0,
    detraccionesAplicadas: 0,
    igvPorPagar: Number(igvPorPagar.toFixed(2)),
    baseCalculoRenta: Number(baseCalculoRenta.toFixed(2)),
    tasaRenta,
    pagoCuentaRenta,
    saldoFavorRentaAnterior: 0,
    rentaPorPagar,
    totalTributosPorPagar
  };
}

export function generarBalanceComprobacion(asientos: AsientoContable[]): BalanceComprobacionFila[] {
  const sumasPorCuenta: Record<string, { debe: number; haber: number }> = {};

  asientos.forEach(asiento => {
    asiento.items.forEach(item => {
      const cta = item.codigoCuenta;
      if (!sumasPorCuenta[cta]) {
        sumasPorCuenta[cta] = { debe: 0, haber: 0 };
      }
      sumasPorCuenta[cta].debe += item.debe;
      sumasPorCuenta[cta].haber += item.haber;
    });
  });

  const filas: BalanceComprobacionFila[] = [];

  Object.entries(sumasPorCuenta).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cta, sumas]) => {
    const cuentaInfo = buscarCuentaPCGE(cta);
    const descripcion = cuentaInfo ? cuentaInfo.nombre : 'Cuenta ' + cta;
    const elemento = parseInt(cta.charAt(0));

    const diff = sumas.debe - sumas.haber;
    const saldoDeudor = diff > 0 ? Number(diff.toFixed(2)) : 0;
    const saldoAcreedor = diff < 0 ? Number(Math.abs(diff).toFixed(2)) : 0;

    let balanceActivo = 0;
    let balancePasivo = 0;
    let resNatPerdida = 0;
    let resNatGanancia = 0;
    let resFuncPerdida = 0;
    let resFuncGanancia = 0;

    // Clasificación de Cuentas de Balance (Elementos 1, 2, 3, 4, 5)
    if (elemento >= 1 && elemento <= 3) {
      balanceActivo = saldoDeudor;
    } else if (elemento >= 4 && elemento <= 5) {
      balancePasivo = saldoAcreedor;
    }

    // Elemento 6: Naturaleza
    if (elemento === 6 && !cta.startsWith('61')) {
      resNatPerdida = saldoDeudor;
    }
    if (cta.startsWith('61')) {
      if (saldoAcreedor > 0) resNatGanancia = saldoAcreedor;
      else resNatPerdida = saldoDeudor;
    }

    // Elemento 7: Ganancias
    if (elemento === 7 && !cta.startsWith('79')) {
      resNatGanancia = saldoAcreedor;
      resFuncGanancia = saldoAcreedor;
    }

    // Elemento 9: Función
    if (elemento === 9) {
      resFuncPerdida = saldoDeudor;
    }

    filas.push({
      cuenta: cta,
      descripcion,
      sumasDebe: Number(sumas.debe.toFixed(2)),
      sumasHaber: Number(sumas.haber.toFixed(2)),
      saldoDeudor,
      saldoAcreedor,
      balanceActivo,
      balancePasivo,
      resultadoNaturalezaPerdida: resNatPerdida,
      resultadoNaturalezaGanancia: resNatGanancia,
      resultadoFuncionPerdida: resFuncPerdida,
      resultadoFuncionGanancia: resFuncGanancia
    });
  });

  return filas;
}
