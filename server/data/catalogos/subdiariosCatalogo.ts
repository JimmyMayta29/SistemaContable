/**
 * Catálogo Oficial de Subdiarios SISCONT
 */

export interface SubdiarioCatalogo {
  codigo: string;
  descripcion: string;
  tipoOperacion: string;
}

export const CATALOGO_SUBDIARIOS_BASE: SubdiarioCatalogo[] = [
  { codigo: '00', descripcion: 'ASIENTO DE APERTURA', tipoOperacion: 'APERTURA' },
  { codigo: '01', descripcion: 'REGISTRO DE COMPRAS', tipoOperacion: 'COMPRAS' },
  { codigo: '02', descripcion: 'REGISTRO DE VENTAS', tipoOperacion: 'VENTAS' },
  { codigo: '03', descripcion: 'COBRANZAS / INGRESOS DE CAJA Y BANCOS', tipoOperacion: 'COBRANZAS' },
  { codigo: '04', descripcion: 'PLANILLA DE REMUNERACIONES', tipoOperacion: 'PLANILLA' },
  { codigo: '05', descripcion: 'PAGOS / EGRESOS DE CAJA Y BANCOS', tipoOperacion: 'PAGOS' },
  { codigo: '06', descripcion: 'LIBRO DIARIO VARIOS (CANJES Y PROVISIONES)', tipoOperacion: 'DIARIO' },
  { codigo: '07', descripcion: 'CAJA CHICA (FONDOS FIJOS Y RENDICIONES)', tipoOperacion: 'CAJA_CHICA' },
  { codigo: '08', descripcion: 'DEPRECIACIÓN Y ACTIVOS FIJOS', tipoOperacion: 'ACTIVOS' },
  { codigo: '09', descripcion: 'ASIENTOS DE CIERRE DEL EJERCICIO', tipoOperacion: 'CIERRE' }
];
