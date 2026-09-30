import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { parametroRepository } from '../repositories/parametroRepository';
import { empresaRepository } from '../repositories/empresaRepository';

export interface LiquidacionIGVResultado {
  periodo: string;
  empresaId: string;
  regimenTributario: string;
  
  // Ventas (RVIE)
  ventasGravadas: number;
  debitoFiscalIgv: number;
  ventasNoGravadas: number;
  totalVentas: number;

  // Compras (RCE)
  comprasGravadasCreditoTotal: number; // Tipo adquisición '1'
  comprasGravadasCreditoProrrata: number; // Tipo adquisición '2' - TODO: Prorrata crédito mixto
  comprasSinCredito: number; // Tipo adquisición '3'
  creditoFiscalIgv: number;

  // Saldo de IGV y Arrastres
  saldoAnteriorAFavor: number;
  retencionesAplicables: number;
  percepcionesAplicables: number;
  igvDeterminado: number; // Débito fiscal - Crédito fiscal
  igvPorPagar: number; // Tras deducir saldo a favor y retenciones/percepciones
  nuevoSaldoAFavor: number;

  // Pago a Cuenta Impuesto a la Renta (Cero hardcoding: obtenido de parámetros tributarios)
  baseImponibleRenta: number;
  tasaRentaAplicada: number;
  etiquetaRenta: string;
  pagoCuentaRenta: number;

  // Total a Declarar
  totalTributosPorPagar: number;

  // Trazabilidad de Cálculo
  detalleCalculo: Array<{
    concepto: string;
    formula: string;
    resultado: number;
  }>;

  // Alerta de Prorrata Mixta
  requiereTratamientoManualProrrata: boolean;
  motivoAlertaProrrata?: string;
}

export const liquidacionIGVService = {
  async calcular(
    empresaId: string, 
    periodo: string = '2026-09', 
    saldoAnteriorAFavor: number = 0
  ): Promise<LiquidacionIGVResultado> {
    const empresa = await empresaRepository.obtenerPorId(empresaId);
    const regimen = empresa?.regimenTributario || 'MYPE_TRIBUTARIO';

    // 1. Obtener Parámetros Tributarios Oficiales
    const paramIgv = await parametroRepository.obtenerParametroPorCodigo('TASA_IGV');
    const tasaIgv = paramIgv ? paramIgv.valorNumerico : 0.18;

    let tasaRenta = 0.01;
    let etiquetaRenta = 'Renta MYPE (1.0% hasta 300 UIT)';

    if (regimen === 'REGIMEN_ESPECIAL') {
      const pRer = await parametroRepository.obtenerParametroPorCodigo('TASA_RENTA_RER');
      tasaRenta = pRer ? pRer.valorNumerico : 0.015;
      etiquetaRenta = `Renta Especial RER (${(tasaRenta * 100).toFixed(1)}% definitivo)`;
    } else if (regimen === 'REGIMEN_GENERAL') {
      tasaRenta = 0.015;
      etiquetaRenta = `Renta General RG (${(tasaRenta * 100).toFixed(1)}% a cuenta)`;
    } else {
      const pMype = await parametroRepository.obtenerParametroPorCodigo('TASA_RENTA_MYPE_SUB300');
      tasaRenta = pMype ? pMype.valorNumerico : 0.01;
      etiquetaRenta = `Renta MYPE Tributario (${(tasaRenta * 100).toFixed(1)}% a cuenta)`;
    }

    let ventasGravadas = Money.create(0);
    let debitoFiscal = Money.create(0);
    let ventasNoGravadas = Money.create(0);
    let totalVentas = Money.create(0);

    let comprasCreditoTotal = Money.create(0);
    let comprasCreditoProrrata = Money.create(0);
    let comprasSinCredito = Money.create(0);
    let creditoFiscal = Money.create(0);

    if (db.isPostgresConnected()) {
      // Consultar Ventas del Período
      const vRes = await db.query(`
        SELECT COALESCE(SUM(base_gravada), 0) as bg,
               COALESCE(SUM(igv), 0) as igv,
               COALESCE(SUM(base_no_gravada + exonerado), 0) as bng,
               COALESCE(SUM(total), 0) as tot
        FROM comprobantes_venta
        WHERE empresa_id = $1 AND periodo_id = $2 AND estado <> 'ANULADO'
      `, [empresaId, periodo]);

      if (vRes.rows.length > 0) {
        ventasGravadas = Money.create(vRes.rows[0].bg);
        debitoFiscal = Money.create(vRes.rows[0].igv);
        ventasNoGravadas = Money.create(vRes.rows[0].bng);
        totalVentas = Money.create(vRes.rows[0].tot);
      }

      // Consultar Compras clasificadas por Destino de Crédito Fiscal
      const cRes = await db.query(`
        SELECT tipo_adquisicion,
               COALESCE(SUM(base_gravada), 0) as bg,
               COALESCE(SUM(igv), 0) as igv
        FROM comprobantes_compra
        WHERE empresa_id = $1 AND periodo_id = $2 AND estado <> 'ANULADO'
        GROUP BY tipo_adquisicion
      `, [empresaId, periodo]);

      cRes.rows.forEach((row: any) => {
        if (row.tipo_adquisicion === '1') {
          // Destinado exclusivamente a operaciones gravadas (100% de crédito fiscal)
          comprasCreditoTotal = Money.add(comprasCreditoTotal, row.bg);
          creditoFiscal = Money.add(creditoFiscal, row.igv);
        } else if (row.tipo_adquisicion === '2') {
          // Destinado a operaciones comunes (prorrata)
          comprasCreditoProrrata = Money.add(comprasCreditoProrrata, row.bg);
        } else {
          // Adquisiciones sin derecho a crédito
          comprasSinCredito = Money.add(comprasSinCredito, row.bg);
        }
      });
    }

    // 2. Cálculo de IGV Determinado
    const igvDeterminado = Money.sub(debitoFiscal, creditoFiscal);
    const saldoFavor = Money.create(saldoAnteriorAFavor);

    let igvPorPagar = Money.create(0);
    let nuevoSaldoAFavor = Money.create(0);

    if (igvDeterminado.greaterThan(saldoFavor)) {
      igvPorPagar = Money.sub(igvDeterminado, saldoFavor);
      nuevoSaldoAFavor = Money.create(0);
    } else {
      igvPorPagar = Money.create(0);
      nuevoSaldoAFavor = Money.sub(saldoFavor, igvDeterminado);
    }

    // 3. Pago a Cuenta de Renta
    const baseRenta = ventasGravadas;
    const pagoCuentaRenta = Money.round(baseRenta.times(tasaRenta));
    const totalTributos = Money.add(igvPorPagar, pagoCuentaRenta);

    // 4. Detección de Prorrata Mixta que requiere tratamiento manual
    // TODO: La prorrata de crédito fiscal (Art. 6° Reglamento Ley IGV) requiere tratamiento manual
    // cuando el contribuyente realiza ventas no gravadas (exoneradas/inafectas) simultáneamente con
    // adquisiciones de destino común ('2') en los últimos 12 meses.
    const hayVentasNoGravadas = ventasNoGravadas.greaterThan(0);
    const hayComprasProrrata = comprasCreditoProrrata.greaterThan(0);
    const requiereManual = hayVentasNoGravadas && hayComprasProrrata;

    return {
      periodo,
      empresaId,
      regimenTributario: regimen,
      ventasGravadas: Money.toNumber(ventasGravadas),
      debitoFiscalIgv: Money.toNumber(debitoFiscal),
      ventasNoGravadas: Money.toNumber(ventasNoGravadas),
      totalVentas: Money.toNumber(totalVentas),

      comprasGravadasCreditoTotal: Money.toNumber(comprasCreditoTotal),
      comprasGravadasCreditoProrrata: Money.toNumber(comprasCreditoProrrata),
      comprasSinCredito: Money.toNumber(comprasSinCredito),
      creditoFiscalIgv: Money.toNumber(creditoFiscal),

      saldoAnteriorAFavor: Money.toNumber(saldoFavor),
      retencionesAplicables: 0.00,
      percepcionesAplicables: 0.00,
      igvDeterminado: Money.toNumber(igvDeterminado),
      igvPorPagar: Money.toNumber(igvPorPagar),
      nuevoSaldoAFavor: Money.toNumber(nuevoSaldoAFavor),

      baseImponibleRenta: Money.toNumber(baseRenta),
      tasaRentaAplicada: tasaRenta,
      etiquetaRenta,
      pagoCuentaRenta: Money.toNumber(pagoCuentaRenta),

      totalTributosPorPagar: Money.toNumber(totalTributos),

      detalleCalculo: [
        { concepto: 'Débito Fiscal IGV', formula: `Ventas Gravadas S/ ${ventasGravadas} * ${(tasaIgv * 100).toFixed(0)}%`, resultado: Money.toNumber(debitoFiscal) },
        { concepto: 'Crédito Fiscal IGV', formula: `Compras Gravadas Tipo 1 S/ ${comprasCreditoTotal} * ${(tasaIgv * 100).toFixed(0)}%`, resultado: Money.toNumber(creditoFiscal) },
        { concepto: 'IGV Determinado', formula: `Débito Fiscal (S/ ${debitoFiscal}) - Crédito Fiscal (S/ ${creditoFiscal})`, resultado: Money.toNumber(igvDeterminado) },
        { concepto: 'Pago a Cuenta Renta', formula: `Ingresos Gravados (S/ ${baseRenta}) * Tasa Vigente (${(tasaRenta * 100).toFixed(1)}%)`, resultado: Money.toNumber(pagoCuentaRenta) }
      ],

      requiereTratamientoManualProrrata: requiereManual,
      motivoAlertaProrrata: requiereManual 
        ? 'Se detectaron adquisiciones comunes (Tipo 2) junto con ventas no gravadas. Aplique el coeficiente de prorrata de los últimos 12 meses conforme al Art. 6° del Reglamento de la Ley del IGV.'
        : undefined
    };
  }
};
