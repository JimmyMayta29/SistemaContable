import { Money } from '../utils/decimal';
import { LineaAsientoPropuesta } from './contabilizacionService';

export const aperturaCierreService = {
  /**
   * Genera el asiento de Apertura (Subdiario 00) a partir de los saldos iniciales del balance.
   */
  generarApertura(
    saldos: Array<{ codigoCuenta: string; denominacion: string; debe: number; haber: number }>
  ): { lineas: LineaAsientoPropuesta[]; cuadrado: boolean; totalDebe: number; totalHaber: number } {
    let sumDebe = Money.create(0);
    let sumHaber = Money.create(0);
    const lineas: LineaAsientoPropuesta[] = [];

    saldos.forEach((s, idx) => {
      sumDebe = Money.add(sumDebe, s.debe);
      sumHaber = Money.add(sumHaber, s.haber);

      lineas.push({
        linea: idx + 1,
        codigoCuenta: s.codigoCuenta,
        denominacionCuenta: s.denominacion,
        debe: Money.toNumber(s.debe),
        haber: Money.toNumber(s.haber),
        glosaLinea: 'Por el inventario inicial y asiento de apertura del ejercicio'
      });
    });

    return {
      lineas,
      cuadrado: Money.isEqual(sumDebe, sumHaber),
      totalDebe: Money.toNumber(sumDebe),
      totalHaber: Money.toNumber(sumHaber)
    };
  },

  /**
   * Genera el asiento de Cierre de Resultados (Subdiario 09) cancelando ingresos y gastos contra Cta 891.
   */
  generarCierreResultados(
    totalIngresos70: number,
    totalGastos6x: number
  ): { lineas: LineaAsientoPropuesta[]; cuadrado: boolean; resultado: number } {
    const ingresos = Money.create(totalIngresos70);
    const gastos = Money.create(totalGastos6x);
    const resultado = Money.sub(ingresos, gastos); // Positivo = Utilidad, Negativo = Pérdida

    const lineas: LineaAsientoPropuesta[] = [
      {
        linea: 1,
        codigoCuenta: '70111',
        denominacionCuenta: 'Mercaderías manufacturadas - Cancelación de ventas',
        debe: Money.toNumber(ingresos),
        haber: 0.00,
        glosaLinea: 'Cierre anual de cuentas de ingresos'
      },
      {
        linea: 2,
        codigoCuenta: '891',
        denominacionCuenta: 'Utilidad del ejercicio (Resultados del ejercicio)',
        debe: resultado.isNegative() ? Money.toNumber(resultado.abs()) : 0.00,
        haber: resultado.isPositive() ? Money.toNumber(resultado) : 0.00,
        glosaLinea: 'Determinación del resultado neto antes de participaciones e impuestos'
      },
      {
        linea: 3,
        codigoCuenta: '69111',
        denominacionCuenta: 'Costo de ventas y cuentas de gastos acumuladas',
        debe: 0.00,
        haber: Money.toNumber(gastos),
        glosaLinea: 'Cierre anual de cuentas de gastos acumulados'
      }
    ];

    let sumDebe = Money.create(0);
    let sumHaber = Money.create(0);
    lineas.forEach(l => {
      sumDebe = Money.add(sumDebe, l.debe);
      sumHaber = Money.add(sumHaber, l.haber);
    });

    return {
      lineas,
      cuadrado: Money.isEqual(sumDebe, sumHaber),
      resultado: Money.toNumber(resultado)
    };
  },

  /**
   * Calcula el ajuste por diferencia de cambio al cierre mensual/anual.
   * Cuentas activas en USD (104, 121) se valorizan al tipo de cambio de compra; pasivos (421) al de venta.
   */
  calcularDiferenciaCambio(
    saldoUsd: number,
    tipoCambioOrigen: number,
    tipoCambioCierre: number,
    esActivo: boolean
  ): { ajusteSoles: number; esGanancia: boolean; lineas: LineaAsientoPropuesta[] } {
    const usd = Money.create(saldoUsd);
    const valorOriginal = Money.round(usd.times(tipoCambioOrigen));
    const valorCierre = Money.round(usd.times(tipoCambioCierre));
    const diferencia = Money.sub(valorCierre, valorOriginal);

    // Si es Activo: si sube TC es Ganancia (776), si baja es Pérdida (676)
    // Si es Pasivo: si sube TC es Pérdida (676), si baja es Ganancia (776)
    let esGanancia = false;
    if (esActivo) {
      esGanancia = diferencia.isPositive();
    } else {
      esGanancia = diferencia.isNegative();
    }

    const montoAjuste = diferencia.abs();
    const lineas: LineaAsientoPropuesta[] = [];

    if (esActivo) {
      if (esGanancia) {
        lineas.push({
          linea: 1,
          codigoCuenta: '1041',
          denominacionCuenta: 'Cuentas corrientes en moneda extranjera',
          debe: Money.toNumber(montoAjuste),
          haber: 0.00,
          glosaLinea: 'Ajuste positivo por fluctuación de tipo de cambio al cierre'
        });
        lineas.push({
          linea: 2,
          codigoCuenta: '776',
          denominacionCuenta: 'Diferencia de cambio - Ganancia',
          debe: 0.00,
          haber: Money.toNumber(montoAjuste),
          glosaLinea: 'Ganancia por diferencia de cambio según cotización SBS/SUNAT'
        });
      } else {
        lineas.push({
          linea: 1,
          codigoCuenta: '676',
          denominacionCuenta: 'Diferencia de cambio - Pérdida',
          debe: Money.toNumber(montoAjuste),
          haber: 0.00,
          glosaLinea: 'Pérdida por diferencia de cambio al cierre'
        });
        lineas.push({
          linea: 2,
          codigoCuenta: '1041',
          denominacionCuenta: 'Cuentas corrientes en moneda extranjera',
          debe: 0.00,
          haber: Money.toNumber(montoAjuste),
          glosaLinea: 'Ajuste negativo por fluctuación de tipo de cambio'
        });
      }
    }

    return {
      ajusteSoles: Money.toNumber(montoAjuste),
      esGanancia,
      lineas
    };
  }
};
