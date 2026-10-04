/**
 * Catálogos Maestros Oficiales SUNAT
 */

export interface ItemCatalogoSunat {
  codigo: string;
  descripcion: string;
  abreviatura?: string;
}

export const CATALOGO_01_TIPO_COMPROBANTE: ItemCatalogoSunat[] = [
  { codigo: '01', descripcion: 'Factura Electrónica', abreviatura: 'FT' },
  { codigo: '02', descripcion: 'Recibo por Honorarios Electrónico', abreviatura: 'RH' },
  { codigo: '03', descripcion: 'Boleta de Venta Electrónica', abreviatura: 'BV' },
  { codigo: '07', descripcion: 'Nota de Crédito Electrónica', abreviatura: 'NC' },
  { codigo: '08', descripcion: 'Nota de Débito Electrónica', abreviatura: 'ND' },
  { codigo: '12', descripcion: 'Ticket o Cinta emitido por máquina registradora', abreviatura: 'TK' },
  { codigo: '14', descripcion: 'Recibo por Servicios Públicos', abreviatura: 'SP' }
];

export const CATALOGO_03_MEDIO_PAGO: ItemCatalogoSunat[] = [
  { codigo: '001', descripcion: 'Depósito en cuenta', abreviatura: 'DEP' },
  { codigo: '003', descripcion: 'Transferencia de fondos', abreviatura: 'TRANSF' },
  { codigo: '005', descripcion: 'Tarjeta de débito', abreviatura: 'T.DEB' },
  { codigo: '006', descripcion: 'Tarjeta de crédito', abreviatura: 'T.CRED' },
  { codigo: '007', descripcion: 'Cheque con la cláusula de "no negociable"', abreviatura: 'CHQ' },
  { codigo: '008', descripcion: 'Efectivo (en operaciones donde no se exige bancarización)', abreviatura: 'EFE' },
  { codigo: '009', descripcion: 'Efectivo (en los demás casos)', abreviatura: 'EFE' }
];

export const CATALOGO_06_TIPO_DOC_IDENTIDAD: ItemCatalogoSunat[] = [
  { codigo: '0', descripcion: 'Doc. Trib. No Domiciliado (Sin RUC)', abreviatura: 'SIN_RUC' },
  { codigo: '1', descripcion: 'Documento Nacional de Identidad', abreviatura: 'DNI' },
  { codigo: '4', descripcion: 'Carnet de Extranjería', abreviatura: 'CE' },
  { codigo: '6', descripcion: 'Registro Único de Contribuyentes', abreviatura: 'RUC' },
  { codigo: '7', descripcion: 'Pasaporte', abreviatura: 'PAS' }
];

export const CATALOGO_SPOT_DETRACCIONES = [
  { codigo: '022', descripcion: 'Otros servicios empresariales', tasa: 0.12, umbralSoles: 700.00 },
  { codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', tasa: 0.12, umbralSoles: 700.00 },
  { codigo: '021', descripcion: 'Movimiento de carga', tasa: 0.10, umbralSoles: 700.00 },
  { codigo: '027', descripcion: 'Transporte de carga por vía terrestre', tasa: 0.04, umbralSoles: 400.00 },
  { codigo: '025', descripcion: 'Fabricación de bienes por encargo', tasa: 0.10, umbralSoles: 700.00 },
  { codigo: '030', descripcion: 'Contratos de construcción', tasa: 0.04, umbralSoles: 700.00 },
  { codigo: '019', descripcion: 'Arrendamiento de bienes muebles', tasa: 0.10, umbralSoles: 700.00 }
];
