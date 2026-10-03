import Decimal from 'decimal.js';

// Política de Redondeo Contable Peruana Oficial (SUNAT):
// 2 decimales para importes en moneda nacional (PEN) y extranjera (USD).
// Método de redondeo: ROUND_HALF_UP (redondeo simétrico al más próximo hacia arriba a partir de 0.005).
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP
});

export const Money = {
  create(value: number | string | Decimal): Decimal {
    try {
      return new Decimal(value || 0);
    } catch {
      return new Decimal(0);
    }
  },

  round(value: number | string | Decimal): Decimal {
    return this.create(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  },

  add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.round(this.create(a).plus(this.create(b)));
  },

  sub(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.round(this.create(a).minus(this.create(b)));
  },

  mul(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.round(this.create(a).times(this.create(b)));
  },

  times(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.mul(a, b);
  },

  div(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const divisor = this.create(b);
    if (divisor.isZero()) {
      return new Decimal(0);
    }
    return this.round(this.create(a).dividedBy(divisor));
  },

  isEqual(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.round(a).equals(this.round(b));
  },

  toNumber(value: number | string | Decimal): number {
    return this.round(value).toNumber();
  },

  format(value: number | string | Decimal): string {
    return this.round(value).toFixed(2);
  }
};
