import { TipoCambioSbs, EntidadCatalogo } from '../types';

export const TIPOS_CAMBIO_SBS_DEMO: TipoCambioSbs[] = [
  { fecha: '2026-09-01', compra: 3.748, venta: 3.754, fuente: 'SBS' },
  { fecha: '2026-09-02', compra: 3.750, venta: 3.755, fuente: 'SBS' },
  { fecha: '2026-09-04', compra: 3.751, venta: 3.757, fuente: 'SBS' },
  { fecha: '2026-09-07', compra: 3.749, venta: 3.753, fuente: 'SBS' },
  { fecha: '2026-09-10', compra: 3.752, venta: 3.758, fuente: 'SBS' },
  { fecha: '2026-09-14', compra: 3.750, venta: 3.756, fuente: 'SBS' },
  { fecha: '2026-09-18', compra: 3.752, venta: 3.759, fuente: 'SBS' },
  { fecha: '2026-09-22', compra: 3.754, venta: 3.760, fuente: 'SBS' },
  { fecha: '2026-09-26', compra: 3.751, venta: 3.757, fuente: 'SBS' },
  { fecha: '2026-09-29', compra: 3.753, venta: 3.759, fuente: 'SBS' },
];

export const CENTROS_DE_COSTOS_DEMO = [
  { codigo: '100', descripcion: '100 - ADMINISTRACION GENERAL' },
  { codigo: '200', descripcion: '200 - VENTAS Y MARKETING' },
  { codigo: '300', descripcion: '300 - OPERACIONES Y LOGISTICA' },
  { codigo: '400', descripcion: '400 - PLANTA Y ALMACEN' }
];

export const CATALOGO_ENTIDADES_DEMO: EntidadCatalogo[] = [
  {
    id: 'ent-01',
    tipoDocumento: '6',
    numeroDocumento: '20100035392',
    razonSocial: 'DISTRIBUIDORA INDUSTRIAL FERRETERA S.A.C.',
    direccion: 'AV. ARGENTINA 1840, CERCADO DE LIMA',
    tipoEntidad: 'PROVEEDOR',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '(01) 456-7890',
    email: 'ventas@diferro.com.pe'
  },
  {
    id: 'ent-02',
    tipoDocumento: '6',
    numeroDocumento: '20253456789',
    razonSocial: 'LUZ DEL SUR S.A.A.',
    direccion: 'AV. ANGAMOS ESTE 240, SURQUILLO, LIMA',
    tipoEntidad: 'PROVEEDOR',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '(01) 617-5000',
    email: 'empresas@luzdelsur.com.pe'
  },
  {
    id: 'ent-03',
    tipoDocumento: '6',
    numeroDocumento: '20100017491',
    razonSocial: 'TELEFONICA DEL PERU S.A.A.',
    direccion: 'AV. EL DERBY 055, SANTIAGO DE SURCO, LIMA',
    tipoEntidad: 'PROVEEDOR',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '(01) 210-0000',
    email: 'corporativo@telefonica.com.pe'
  },
  {
    id: 'ent-04',
    tipoDocumento: '6',
    numeroDocumento: '20556789123',
    razonSocial: 'TRANSPORTES & CARGA PESADA DEL SUR S.A.C.',
    direccion: 'AV. MATERIALES 2350, CALLAO, LIMA',
    tipoEntidad: 'PROVEEDOR',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '+51 976 543 210',
    email: 'operaciones@transsur.pe'
  },
  {
    id: 'ent-05',
    tipoDocumento: '6',
    numeroDocumento: '20512398741',
    razonSocial: 'MINERA LOS ANDES DEL CENTRO S.A.A.',
    direccion: 'AV. JAVIER PRADO ESTE 4200, SANTIAGO DE SURCO, LIMA',
    tipoEntidad: 'CLIENTE',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '(01) 315-9000',
    email: 'logistica@mineraandes.pe'
  },
  {
    id: 'ent-06',
    tipoDocumento: '6',
    numeroDocumento: '20456123789',
    razonSocial: 'AGROEXPORTADORA DEL VALLE S.A.C.',
    direccion: 'CARRETERA PANAMERICANA SUR KM 290, ICA',
    tipoEntidad: 'CLIENTE',
    estadoSunat: 'ACTIVO',
    condicionSunat: 'HABIDO',
    telefono: '+51 956 789 123',
    email: 'compras@agrovalle.com.pe'
  }
];
