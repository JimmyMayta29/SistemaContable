export type TipoComprobante = '01' | '03' | '07' | '08' | 'R01' | '09' | '02';

// Subdiarios estándar al estilo SISCONT SMART / CODEPLEX
export type CodigoSubdiario = '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09';

export interface SubdiarioConfig {
  codigo: CodigoSubdiario;
  descripcion: string;
  tipo: 'APERTURA' | 'COMPRAS' | 'VENTAS' | 'CAJA_ING' | 'CAJA_EGR' | 'BANCOS' | 'HONORARIOS' | 'PLANILLA' | 'DESTINO' | 'CIERRE';
}

export const SUBDIARIOS_SISCONT: SubdiarioConfig[] = [
  { codigo: '00', descripcion: '00 - Asiento de Apertura / Inventario Inicial', tipo: 'APERTURA' },
  { codigo: '01', descripcion: '01 - Registro de Compras (RCE)', tipo: 'COMPRAS' },
  { codigo: '02', descripcion: '02 - Registro de Ventas (RVIE)', tipo: 'VENTAS' },
  { codigo: '03', descripcion: '03 - Ingreso de Caja / Cobranzas a Clientes', tipo: 'CAJA_ING' },
  { codigo: '04', descripcion: '04 - Egreso de Caja / Pagos Efectivo', tipo: 'CAJA_EGR' },
  { codigo: '05', descripcion: '05 - Movimientos de Bancos / Transferencias y Detracciones', tipo: 'BANCOS' },
  { codigo: '06', descripcion: '06 - Recibos por Honorarios (4ta Categoría)', tipo: 'HONORARIOS' },
  { codigo: '07', descripcion: '07 - Planilla de Remuneraciones / PLAME', tipo: 'PLANILLA' },
  { codigo: '08', descripcion: '08 - Asientos de Destino y Transferencia Automática', tipo: 'DESTINO' },
  { codigo: '09', descripcion: '09 - Ajuste por Diferencia de Cambio y Cierre', tipo: 'CIERRE' },
];

export interface TipoCambioSbs {
  fecha: string;
  compra: number;
  venta: number;
  fuente: 'SBS' | 'SUNAT';
}

export interface EntidadCatalogo {
  id: string;
  tipoDocumento: '6' | '1' | '4' | '7'; // 6: RUC, 1: DNI, 4: Carnet Extranjería
  numeroDocumento: string;
  razonSocial: string;
  direccion: string;
  tipoEntidad: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';
  estadoSunat: 'ACTIVO' | 'BAJA';
  condicionSunat: 'HABIDO' | 'NO_HABIDO';
  telefono?: string;
  email?: string;
}

export interface ComprobanteItem {
  id: string;
  cantidad: number;
  unidadMedida: string;
  descripcion: string;
  valorUnitario: number;
  precioUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface CdrSunatInfo {
  codigoRespuesta: string; // '0' = Aceptado, '99' = Rechazado
  descripcionRespuesta: string; // 'La Factura número F001-0023451 ha sido ACEPTADA'
  fechaRecepcion: string;
  horaRecepcion: string;
  hashCpe: string;
  firmaDigital: string;
  ticketSunat?: string;
  estadoCdr: 'ACEPTADO' | 'RECHAZADO' | 'CON_OBSERVACIONES';
}

export interface Comprobante {
  id: string;
  car: string; // Código de Anotación de Registro (SUNAT SIRE)
  subdiario?: CodigoSubdiario; // Ej: 01 Compras, 02 Ventas
  numeroVoucher?: string; // Ej: 01090001
  tipoDoc: TipoComprobante; // 01: Factura, 03: Boleta, 07: NC, 08: ND, R01/02: Honorarios
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  
  // Proveedor o Cliente
  rucEmisor: string;
  razonSocialEmisor: string;
  direccionEmisor?: string;
  rucReceptor: string;
  razonSocialReceptor: string;
  direccionReceptor?: string;

  // Items
  items?: ComprobanteItem[];

  // Importes
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  baseImponibleGravada: number;
  igv: number;
  adquisicionesNoGravadas: number; // Inafectas / Exoneradas
  isc: number;
  icbper: number; // Impuesto a las bolsas plásticas
  otrosTributos: number;
  total: number;

  // Tributario Peruano
  sujetoADetraccion: boolean;
  codigoDetraccion?: string;
  tasaDetraccion?: number;
  montoDetraccion?: number;
  constanciaDetraccion?: string;
  fechaPagoDetraccion?: string;
  
  sujetoARetencion?: boolean;
  montoRetencion?: number;

  // Clasificación contable
  clasificacionBienServicio: 'MERCADERIA' | 'GASTO_SERVICIOS' | 'ACTIVO_FIJO' | 'SERVICIOS_BASICOS' | 'HONORARIOS' | 'GASTO_DIVERSO';
  categoriaGasto: string; // Cuenta PCGE sugerida (ej. 6011, 6311, 6361)
  cuentaContableAsignada?: string;
  centroCosto?: string;
  asientoGenerado: boolean;
  asientoId?: string;

  // Estado SUNAT y Archivos
  estadoSunat: 'ACEPTADO' | 'ANULADO' | 'RECHAZADO' | 'PENDIENTE';
  origen: 'SUNAT_SIRE_SYNC' | 'XML_UBL_UPLOAD' | 'MANUAL';
  hashCpe?: string;
  xmlData?: string;
  pdfData?: string;
  cdrData?: CdrSunatInfo;
  observaciones?: string;

  // Siscont Smart Conciliación con Propuesta SUNAT
  estadoComparacionSire?: 'COINCIDE' | 'SOLO_EN_SISTEMA' | 'SOLO_EN_SUNAT' | 'DIFERENCIA_MONTO';
}

export interface AsientoContableItem {
  id: string;
  codigoCuenta: string;
  denominacionCuenta: string;
  debe: number;
  haber: number;
  glosa: string;
  documentoReferencia?: string;
  rucAnalisis?: string;
  centroCosto?: string;
}

export interface AsientoContable {
  id: string;
  subdiario: CodigoSubdiario; // Estilo SISCONT: 01, 02, 05, etc.
  numeroAsiento: string; // Ej: 01090001 (Subdiario 01, Mes 09, Correlativo 0001)
  periodo: string; // YYYY-MM
  fecha: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  tipoOperacion: 'COMPRA' | 'VENTA' | 'DESTINO' | 'PAGO' | 'DETRACCION' | 'APERTURA' | 'AJUSTE' | 'PLANILLA';
  glosaGeneral: string;
  comprobanteReferencia?: string;
  items: AsientoContableItem[];
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
  origenAutomatico: boolean;
  estado?: 'CONTABILIZADO' | 'BORRADOR' | 'ANULADO' | string;
  cuo?: string;
  empresaId?: string;
}

export interface EmpresaCliente {
  id: string;
  codigoEmpresa?: string; // Código al estilo Siscont (ej. EMP01)
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
  regimenTributario: 'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL' | 'NRUS';
  tasaRentaMensual: number;
  
  // Credenciales SUNAT Clave SOL
  usuarioSol: string;
  claveSol: string;
  clientIdSire: string;
  clientSecretSire: string;
  ambienteSunat: 'PRODUCCION' | 'BETA_TEST';

  // Fechas y Vencimientos
  ultimoDigitoRuc: string;
  vencimientoPdt621: string;
  vencimientoSire: string;
  vencimientoPlame: string;
  
  // Estado actual del mes
  estadoDeclaracion: 'AL_DIA' | 'POR_VENCER' | 'PRELIQUIDADO' | 'VENCIDO';
  preliquidacionNotificada: boolean;
  montoPreliquidacionIgv?: number;
  montoPreliquidacionRenta?: number;
  trabajadoresPlanilla?: number;
}

export type EmpresaConfig = EmpresaCliente & {
  sqlEngine?: 'SQLITE_EMBEDDED' | 'POSTGRESQL' | 'MYSQL' | 'SQL_SERVER';
  sqlHost?: string;
  sqlPort?: number;
  sqlDatabase?: string;
  sqlUser?: string;
  sqlPassword?: string;
  sqlSsl?: boolean;
  coeficienteRenta?: number;
};

export interface MovimientoCajaBanco {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  medioPago: 'TRANSFERENCIA' | 'DEPOSITO' | 'EFECTIVO' | 'DETRACCION_BN';
  banco: 'BCP' | 'BBVA' | 'INTERBANK' | 'BANCO_DE_LA_NACION' | 'CAJA_CHICA';
  cuentaNumero: string;
  glosa: string;
  monto: number;
  moneda: 'PEN' | 'USD';
  referenciaComprobante?: string;
  beneficiario: string;
}

export interface TrabajadorPlanilla {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  sueldoBruto: number;
  afpOnp: 'ONP' | 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';
  aporteTrabajador: number;
  essaludEmpleador: number;
  netoAPagar: number;
}

export interface ReciboHonorario {
  id: string;
  subdiario: '06';
  numeroRecibo: string; // Ej: E001-145
  fechaEmision: string;
  fechaPago: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  profesionOcupacion: string;
  montoTotalHonorario: number;
  sujetoARetencionRenta: boolean; // Retención 4ta Categoría 8% si > S/ 1500
  retencionMonto: number;
  netoCobrado: number;
  moneda: 'PEN' | 'USD';
  cuentaGasto: string; // Ej: 6321, 6322
  glosa: string;
  asientoGenerado: boolean;
}

export interface EmpresaDataState {
  compras: Comprobante[];
  ventas: Comprobante[];
  asientos: AsientoContable[];
  movimientosBancarios: MovimientoCajaBanco[];
  trabajadoresPlanilla: TrabajadorPlanilla[];
  honorarios: ReciboHonorario[];
  saldoAnteriorIgv: number;
}

export interface LiquidacionPDT621 {
  periodo: string;
  ventasNetasGravadas: number;
  debitoFiscalIgv: number;
  comprasNetasGravadas: number;
  creditoFiscalIgv: number;
  saldoFavorPeriodoAnterior: number;
  igvDeterminado: number;
  retencionesEfectuadas: number;
  detraccionesAplicadas: number;
  igvPorPagar: number;
  
  baseCalculoRenta: number;
  tasaRenta: number;
  pagoCuentaRenta: number;
  saldoFavorRentaAnterior: number;
  rentaPorPagar: number;

  totalTributosPorPagar: number;
}

export interface BalanceComprobacionFila {
  cuenta: string;
  descripcion: string;
  sumasDebe: number;
  sumasHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
  balanceActivo: number;
  balancePasivo: number;
  resultadoNaturalezaPerdida: number;
  resultadoNaturalezaGanancia: number;
  resultadoFuncionPerdida: number;
  resultadoFuncionGanancia: number;
}
