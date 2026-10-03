import { Money } from '../utils/decimal';
import { COMPRAS_MEMORIA } from './compraService';
import { VENTAS_MEMORIA } from './ventaService';
import { empresaRepository } from '../repositories/empresaRepository';

export interface RegistroTerceroDaot {
  tipoDocIdentidad: '6' | '1' | '4' | '7'; // 6=RUC, 1=DNI, 4=Carnet Extranjería, 7=Pasaporte
  numeroDocIdentidad: string;
  razonSocialONombres: string;
  totalCompras: number;
  totalVentas: number;
  totalOperaciones: number;
  superaUmbral2Uit: boolean;
  umbral2UitAplicable: number;
  condicion: 'DECLARABLE' | 'EXCEPTUADO';
}

export interface ResumenDaotEjecucion {
  empresaId: string;
  anio: number;
  uitAnual: number;
  umbral2Uit: number;
  totalTercerosEvaluados: number;
  totalTercerosDeclarables: number;
  montoTotalDeclarable: number;
  totalComprasDeclarables: number;
  totalVentasDeclarables: number;
  registros: RegistroTerceroDaot[];
  txtGenerado?: string;
  nombreArchivoTxt: string;
}

export const daotService = {
  /**
   * Obtiene la UIT según el año del ejercicio (UIT 2026 = 5350, 2025 = 5150, 2024 = 5150)
   */
  obtenerUitPorAnio(anio: number): number {
    switch (anio) {
      case 2026: return 5350;
      case 2025: return 5150;
      case 2024: return 5150;
      default: return 5350;
    }
  },

  /**
   * Procesa las operaciones con terceros y genera el consolidado DAOT.
   */
  async procesarDaot(empresaId: string, anio: number = 2026): Promise<ResumenDaotEjecucion> {
    const compras = COMPRAS_MEMORIA.filter(c => c.empresaId === empresaId);
    const ventas = VENTAS_MEMORIA.filter(v => v.empresaId === empresaId);
    const empresa = await empresaRepository.obtenerPorId(empresaId);

    const rucEmpresa = empresa?.ruc || '20100000001';
    const uitAnual = this.obtenerUitPorAnio(anio);
    const umbral2Uit = uitAnual * 2; // S/ 10,700 en 2026

    // Filtrar por año
    const comprasAnio = compras.filter(c => (c.fechaEmision || '').startsWith(String(anio)) || (c.periodoId || '').startsWith(String(anio)));
    const ventasAnio = ventas.filter(v => (v.fechaEmision || '').startsWith(String(anio)) || (v.periodoId || '').startsWith(String(anio)));

    const mapaTerceros = new Map<string, {
      tipoDoc: '6' | '1' | '4' | '7';
      numeroDoc: string;
      nombre: string;
      compras: number;
      ventas: number;
    }>();

    // Procesar Compras
    for (const c of comprasAnio) {
      if (c.estado === 'ANULADO') continue;
      const doc = ((c as any).proveedorRuc || (c as any).emisorRuc || c.proveedorId || '').trim();
      if (!doc) continue;

      const tipoDoc: '6' | '1' | '4' | '7' = doc.length === 11 ? '6' : doc.length === 8 ? '1' : '4';
      const nombre = ((c as any).proveedorRazonSocial || (c as any).emisorRazonSocial || 'PROVEEDOR VARIOS').trim();
      const total = Number(c.total) || 0;

      const actual = mapaTerceros.get(doc) || {
        tipoDoc,
        numeroDoc: doc,
        nombre,
        compras: 0,
        ventas: 0
      };

      actual.compras = Money.toNumber(Money.add(actual.compras, total));
      mapaTerceros.set(doc, actual);
    }

    // Procesar Ventas
    for (const v of ventasAnio) {
      if (v.estado === 'ANULADO') continue;
      const doc = ((v as any).clienteRuc || (v as any).emisorRuc || v.clienteId || '').trim();
      if (!doc) continue;

      const tipoDoc: '6' | '1' | '4' | '7' = doc.length === 11 ? '6' : doc.length === 8 ? '1' : '4';
      const nombre = ((v as any).clienteRazonSocial || 'CLIENTE VARIOS').trim();
      const total = Number(v.total) || 0;

      const actual = mapaTerceros.get(doc) || {
        tipoDoc,
        numeroDoc: doc,
        nombre,
        compras: 0,
        ventas: 0
      };

      actual.ventas = Money.toNumber(Money.add(actual.ventas, total));
      mapaTerceros.set(doc, actual);
    }

    const registros: RegistroTerceroDaot[] = [];
    let montoTotalDeclarable = Money.create(0);
    let totalComprasDeclarables = Money.create(0);
    let totalVentasDeclarables = Money.create(0);

    for (const t of mapaTerceros.values()) {
      const totalOps = Money.toNumber(Money.add(t.compras, t.ventas));
      const supera = totalOps >= umbral2Uit;

      if (supera) {
        montoTotalDeclarable = Money.add(montoTotalDeclarable, totalOps);
        totalComprasDeclarables = Money.add(totalComprasDeclarables, t.compras);
        totalVentasDeclarables = Money.add(totalVentasDeclarables, t.ventas);
      }

      registros.push({
        tipoDocIdentidad: t.tipoDoc,
        numeroDocIdentidad: t.numeroDoc,
        razonSocialONombres: t.nombre,
        totalCompras: t.compras,
        totalVentas: t.ventas,
        totalOperaciones: totalOps,
        superaUmbral2Uit: supera,
        umbral2UitAplicable: umbral2Uit,
        condicion: supera ? 'DECLARABLE' : 'EXCEPTUADO'
      });
    }

    // Ordenar de mayor a menor monto de operaciones
    registros.sort((a, b) => b.totalOperaciones - a.totalOperaciones);

    // Generar formato TXT oficial DAOT Formulario 3500
    // Formato delimitado por plecas (|):
    // TipoDoc(1) | NumDoc(11) | TipoPersona(01=Jurídica/02=Natural) | RazónSocial | TotalOperacionesCostos(0.00) | TotalOperacionesIngresos(0.00)
    const declarables = registros.filter(r => r.superaUmbral2Uit);
    const lineasTxt = declarables.map(d => {
      const tipoPersona = d.numeroDocIdentidad.startsWith('20') ? '01' : '02';
      return [
        d.tipoDocIdentidad,
        d.numeroDocIdentidad,
        tipoPersona,
        d.razonSocialONombres.replace(/\|/g, ' ').slice(0, 100),
        d.totalCompras.toFixed(2),
        d.totalVentas.toFixed(2)
      ].join('|') + '|';
    });

    const txtGenerado = lineasTxt.join('\r\n');
    const nombreArchivoTxt = `DAOT_3500_${rucEmpresa}_${anio}.txt`;

    return {
      empresaId,
      anio,
      uitAnual,
      umbral2Uit,
      totalTercerosEvaluados: registros.length,
      totalTercerosDeclarables: declarables.length,
      montoTotalDeclarable: Money.toNumber(montoTotalDeclarable),
      totalComprasDeclarables: Money.toNumber(totalComprasDeclarables),
      totalVentasDeclarables: Money.toNumber(totalVentasDeclarables),
      registros,
      txtGenerado,
      nombreArchivoTxt
    };
  }
};
