/**
 * Catálogo Oficial PCGE (Plan Contable General Empresarial 2019/2020)
 * Base normativa estructurada para todas las empresas de la plataforma.
 */

export interface CuentaCatalogo {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'GESTION_GASTO' | 'GESTION_INGRESO' | 'COSTOS' | 'SALDOS_INTERMEDIARIOS';
  permiteMovimiento: boolean;
  naturaleza: 'DEUDORA' | 'ACREEDORA';
}

export const CATALOGO_PCGE_BASE: CuentaCatalogo[] = [
  // ELEMENTO 1: ACTIVO DISPONIBLE Y EXIGIBLE
  { codigo: '10', nombre: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '101', nombre: 'Caja', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1011', nombre: 'Caja central', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '102', nombre: 'Fondos fijos', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1021', nombre: 'Caja chica moneda nacional', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '104', nombre: 'Cuentas corrientes en instituciones financieras', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1041', nombre: 'Cuentas corrientes operativas - Moneda nacional', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '1042', nombre: 'Cuentas corrientes operativas - Moneda extranjera', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '12', nombre: 'CUENTAS POR COBRAR COMERCIALES – TERCEROS', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1211', nombre: 'No emitidas', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '1212', nombre: 'Emitidas en cartera', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '1213', nombre: 'En cobranza', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '122', nombre: 'Anticipos de clientes', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '14', nombre: 'CUENTAS POR COBRAR AL PERSONAL, A LOS ACCIONISTAS Y DIRECTORES', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '141', nombre: 'Personal', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1411', nombre: 'Préstamos al personal', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '1412', nombre: 'Adelanto de remuneraciones', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '16', nombre: 'CUENTAS POR COBRAR DIVERSAS – TERCEROS', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '167', nombre: 'Tributos por acreditar', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '1671', nombre: 'Pagos a cuenta del impuesto a la renta', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '1673', nombre: 'IGV por acreditar en compras', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 2: ACTIVO REALIZABLE
  { codigo: '20', nombre: 'MERCADERÍAS', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '201', nombre: 'Mercaderías', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '2011', nombre: 'Mercaderías manufacturadas', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '20111', nombre: 'Costo de mercaderías generales', nivel: 5, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 3: ACTIVO INMOVILIZADO
  { codigo: '33', nombre: 'PROPIEDAD, PLANTA Y EQUIPO', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '335', nombre: 'Muebles y enseres', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '3351', nombre: 'Muebles de oficina', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '336', nombre: 'Equipos de procesamiento de información', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '3361', nombre: 'Equipos de cómputo', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '39', nombre: 'DEPRECIACIÓN Y AMORTIZACIÓN ACUMULADOS', nivel: 2, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '395', nombre: 'Depreciación acumulada de propiedad, planta y equipo', nivel: 3, tipo: 'ACTIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '3952', nombre: 'Depreciación acumulada - Costo', nivel: 4, tipo: 'ACTIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },

  // ELEMENTO 4: PASIVO
  { codigo: '40', nombre: 'TRIBUTOS, CONTRAPRESTACIONES Y APORTES AL SISTEMA PÚBLICO DE PENSIONES Y DE SALUD POR PAGAR', nivel: 2, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '401', nombre: 'Gobierno nacional', nivel: 3, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '4011', nombre: 'Impuesto general a las ventas', nivel: 4, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '40111', nombre: 'IGV – Cuenta propia', nivel: 5, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '4017', nombre: 'Impuesto a la renta', nivel: 4, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '40171', nombre: 'Renta de tercera categoría', nivel: 5, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '40172', nombre: 'Renta de cuarta categoría (Honorarios)', nivel: 5, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '40173', nombre: 'Renta de quinta categoría (Planilla)', nivel: 5, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '403', nombre: 'Instituciones públicas', nivel: 3, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '4031', nombre: 'EsSalud (9%)', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '4032', nombre: 'ONP (13%)', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '41', nombre: 'REMUNERACIONES Y PARTICIPACIONES POR PAGAR', nivel: 2, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '411', nombre: 'Remuneraciones por pagar', nivel: 3, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '4111', nombre: 'Sueldos y salarios por pagar', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '415', nombre: 'Beneficios sociales de los trabajadores por pagar', nivel: 3, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '4151', nombre: 'Compensación por tiempo de servicios (CTS)', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '4152', nombre: 'Gratificaciones por pagar', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '4153', nombre: 'Vacaciones por pagar', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '42', nombre: 'CUENTAS POR PAGAR COMERCIALES – TERCEROS', nivel: 2, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '421', nombre: 'Facturas, boletas y otros comprobantes por pagar', nivel: 3, tipo: 'PASIVO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '4212', nombre: 'Emitidas en cartera', nivel: 4, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '422', nombre: 'Anticipos a proveedores', nivel: 3, tipo: 'PASIVO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 5: PATRIMONIO NETO
  { codigo: '50', nombre: 'CAPITAL', nivel: 2, tipo: 'PATRIMONIO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '501', nombre: 'Capital social', nivel: 3, tipo: 'PATRIMONIO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '5011', nombre: 'Acciones', nivel: 4, tipo: 'PATRIMONIO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '59', nombre: 'RESULTADOS ACUMULADOS', nivel: 2, tipo: 'PATRIMONIO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '591', nombre: 'Utilidades no distribuidas', nivel: 3, tipo: 'PATRIMONIO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '5911', nombre: 'Utilidades acumuladas', nivel: 4, tipo: 'PATRIMONIO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '592', nombre: 'Pérdidas acumuladas', nivel: 3, tipo: 'PATRIMONIO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '5921', nombre: 'Pérdidas acumuladas de ejercicios anteriores', nivel: 4, tipo: 'PATRIMONIO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 6: GASTOS POR NATURALEZA
  { codigo: '60', nombre: 'COMPRAS', nivel: 2, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '601', nombre: 'Mercaderías', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6011', nombre: 'Mercaderías manufacturadas', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '61', nombre: 'VARIACIÓN DE INVENTARIOS', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '611', nombre: 'Mercaderías', nivel: 3, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '6111', nombre: 'Mercaderías manufacturadas', nivel: 4, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '62', nombre: 'GASTOS DE PERSONAL Y DIRECTORES', nivel: 2, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '621', nombre: 'Remuneraciones', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6211', nombre: 'Sueldos y salarios', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '622', nombre: 'Otras remuneraciones (Asignación familiar)', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '627', nombre: 'Seguridad, previsión social y otras contribuciones', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6271', nombre: 'Régimen de prestaciones de salud (EsSalud)', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '63', nombre: 'GASTOS DE SERVICIOS PRESTADOS POR TERCEROS', nivel: 2, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '632', nombre: 'Asesoría y consultoría', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6321', nombre: 'Honorarios profesionales contables y legales', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '636', nombre: 'Servicios básicos (Luz, agua, telefonía, internet)', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6361', nombre: 'Energía eléctrica', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '6363', nombre: 'Agua potable', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '6364', nombre: 'Telefonía e internet', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '68', nombre: 'VALUACIÓN Y DETERIORO DE ACTIVOS Y PROVISIONES', nivel: 2, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '684', nombre: 'Depreciación de propiedad, planta y equipo', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '6841', nombre: 'Depreciación de PPE - Costo', nivel: 4, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 7: INGRESOS POR NATURALEZA
  { codigo: '70', nombre: 'VENTAS', nivel: 2, tipo: 'GESTION_INGRESO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '701', nombre: 'Mercaderías', nivel: 3, tipo: 'GESTION_INGRESO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '7011', nombre: 'Mercaderías manufacturadas - Mercado local', nivel: 4, tipo: 'GESTION_INGRESO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '704', nombre: 'Prestación de servicios', nivel: 3, tipo: 'GESTION_INGRESO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '7041', nombre: 'Servicios locales gravados', nivel: 4, tipo: 'GESTION_INGRESO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '77', nombre: 'INGRESOS FINANCIEROS', nivel: 2, tipo: 'GESTION_INGRESO', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '776', nombre: 'Diferencia en cambio ganada', nivel: 3, tipo: 'GESTION_INGRESO', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '67', nombre: 'GASTOS FINANCIEROS', nivel: 2, tipo: 'GESTION_GASTO', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '676', nombre: 'Diferencia en cambio perdida', nivel: 3, tipo: 'GESTION_GASTO', permiteMovimiento: true, naturaleza: 'DEUDORA' },

  // ELEMENTO 8: SALDOS INTERMEDIARIOS DE GESTIÓN Y DETERMINACIÓN DEL RESULTADO
  { codigo: '80', nombre: 'MARGEN COMERCIAL', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '81', nombre: 'PRODUCCIÓN DEL EJERCICIO', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '82', nombre: 'VALOR AGREGADO', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '83', nombre: 'EXCEDENTE BRUTO DE EXPLOTACIÓN', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '84', nombre: 'RESULTADO DE EXPLOTACIÓN', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '85', nombre: 'RESULTADO ANTES DE PARTICIPACIONES E IMPUESTOS', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },
  { codigo: '87', nombre: 'PARTICIPACIONES DE LOS TRABAJADORES', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '88', nombre: 'IMPUESTO A LA RENTA', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '89', nombre: 'DETERMINACIÓN DEL RESULTADO DEL EJERCICIO', nivel: 2, tipo: 'SALDOS_INTERMEDIARIOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' },

  // ELEMENTO 9: CONTABILIDAD ANALÍTICA DE EXPLOTACIÓN (COSTOS Y DESTINOS)
  { codigo: '94', nombre: 'GASTOS DE ADMINISTRACIÓN', nivel: 2, tipo: 'COSTOS', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '941', nombre: 'Gastos administrativos generales', nivel: 3, tipo: 'COSTOS', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '95', nombre: 'GASTOS DE VENTAS', nivel: 2, tipo: 'COSTOS', permiteMovimiento: false, naturaleza: 'DEUDORA' },
  { codigo: '951', nombre: 'Gastos de comercialización y ventas', nivel: 3, tipo: 'COSTOS', permiteMovimiento: true, naturaleza: 'DEUDORA' },
  { codigo: '79', nombre: 'CARGAS IMPUTABLES A CUENTAS DE COSTOS Y GASTOS', nivel: 2, tipo: 'COSTOS', permiteMovimiento: false, naturaleza: 'ACREEDORA' },
  { codigo: '791', nombre: 'Cargas imputables a cuentas de costos y gastos', nivel: 3, tipo: 'COSTOS', permiteMovimiento: true, naturaleza: 'ACREEDORA' }
];
