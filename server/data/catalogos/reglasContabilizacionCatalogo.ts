/**
 * Plantillas de Reglas Contables Automáticas (PCGE)
 */

export interface PlantillaReglaContable {
  codigo: string;
  nombre: string;
  descripcion: string;
  cuentaOrigenPatron: string; // ej. 60* o 63*
  asientosGenerados: Array<{
    tipo: 'VARIACION_EXISTENCIAS' | 'DESTINO_GASTO';
    cuentaDebe: string;
    cuentaHaber: string;
    porcentaje: number;
  }>;
}

export const PLANTILLAS_REGLAS_BASE: PlantillaReglaContable[] = [
  {
    codigo: 'RGL-COMPRA-MERCADERIA',
    nombre: 'Compra de Mercaderías con Ingreso a Almacén',
    descripcion: 'Genera el asiento de destino automático de existencias (20111 vs 6111) al 100%',
    cuentaOrigenPatron: '6011',
    asientosGenerados: [
      { tipo: 'VARIACION_EXISTENCIAS', cuentaDebe: '20111', cuentaHaber: '6111', porcentaje: 100 }
    ]
  },
  {
    codigo: 'RGL-GASTO-ADMIN-VENTAS-60-40',
    nombre: 'Distribución de Gastos Administrativos (60%) y Ventas (40%)',
    descripcion: 'Genera el destino del elemento 9 (941 al 60% y 951 al 40% vs 791 al 100%)',
    cuentaOrigenPatron: '63*',
    asientosGenerados: [
      { tipo: 'DESTINO_GASTO', cuentaDebe: '941', cuentaHaber: '791', porcentaje: 60 },
      { tipo: 'DESTINO_GASTO', cuentaDebe: '951', cuentaHaber: '791', porcentaje: 40 }
    ]
  },
  {
    codigo: 'RGL-GASTO-ADMIN-100',
    nombre: 'Gastos de Administración al 100%',
    descripcion: 'Destino directo a Administración 941 vs 791',
    cuentaOrigenPatron: '62*',
    asientosGenerados: [
      { tipo: 'DESTINO_GASTO', cuentaDebe: '941', cuentaHaber: '791', porcentaje: 100 }
    ]
  }
];
