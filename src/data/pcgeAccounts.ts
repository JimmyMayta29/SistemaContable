export interface CuentaPCGE {
  codigo: string;
  nombre: string;
  elemento: number;
  naturaleza: 'DEUDORA' | 'ACREEDORA';
  tipo: 'BALANCE' | 'RESULTADOS' | 'COSTOS';
}

export const PLAN_CONTABLE_PCGE: CuentaPCGE[] = [
  // Elemento 1: Activo Disponible y Exigible
  { codigo: '101', nombre: 'Caja', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '1041', nombre: 'Cuentas corrientes operativas', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '1042', nombre: 'Cuentas corrientes para fines específicos (Detracciones Banco de la Nación)', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '1212', nombre: 'Facturas, boletas y otros comprobantes por cobrar - Emitidas en cartera', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '1213', nombre: 'Facturas, boletas y otros comprobantes por cobrar - En cobranza', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '141', nombre: 'Cuentas por cobrar al personal - Préstamos', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '1673', nombre: 'IGV por acreditar en compras', elemento: 1, naturaleza: 'DEUDORA', tipo: 'BALANCE' },

  // Elemento 2: Activo Realizable (Existencias)
  { codigo: '20111', nombre: 'Mercaderías manufacturadas - Costo', elemento: 2, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '2524', nombre: 'Suministros diversos', elemento: 2, naturaleza: 'DEUDORA', tipo: 'BALANCE' },

  // Elemento 3: Activo Inmovilizado
  { codigo: '33311', nombre: 'Maquinarias y equipos de explotación - Costo', elemento: 3, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '33511', nombre: 'Muebles y enseres - Costo', elemento: 3, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '33611', nombre: 'Equipos para procesamiento de información (Cómputo)', elemento: 3, naturaleza: 'DEUDORA', tipo: 'BALANCE' },
  { codigo: '3913', nombre: 'Depreciación acumulada de propiedad, planta y equipo', elemento: 3, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },

  // Elemento 4: Pasivo
  { codigo: '40111', nombre: 'Gobierno nacional - IGV - Cuenta propia', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '40171', nombre: 'Renta de tercera categoría - Pagos a cuenta', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '40172', nombre: 'Renta de cuarta categoría (Retención Honorarios)', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '4031', nombre: 'EsSalud', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '4032', nombre: 'ONP', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '4212', nombre: 'Cuentas por pagar comerciales - Emitidas en cartera', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '4213', nombre: 'Cuentas por pagar comerciales - Detracciones por pagar', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '424', nombre: 'Honorarios por pagar', elemento: 4, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },

  // Elemento 5: Patrimonio Neto
  { codigo: '5011', nombre: 'Capital social - Acciones comunes', elemento: 5, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '582', nombre: 'Reserva legal', elemento: 5, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },
  { codigo: '5911', nombre: 'Utilidades acumuladas', elemento: 5, naturaleza: 'ACREEDORA', tipo: 'BALANCE' },

  // Elemento 6: Gastos por Naturaleza
  { codigo: '6011', nombre: 'Mercaderías manufacturadas', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6032', nombre: 'Suministros para oficina', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6111', nombre: 'Variación de inventarios - Mercaderías', elemento: 6, naturaleza: 'ACREEDORA', tipo: 'RESULTADOS' },
  { codigo: '6311', nombre: 'Transporte de carga y encomiendas', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6321', nombre: 'Asesoría contable, jurídica y auditoría', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6341', nombre: 'Mantenimiento y reparaciones', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6351', nombre: 'Alquiler de locales comerciales u oficinas', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6361', nombre: 'Servicios básicos - Energía eléctrica (Luz)', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6362', nombre: 'Servicios básicos - Gas', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6363', nombre: 'Servicios básicos - Agua potable', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6364', nombre: 'Servicios básicos - Telefonía, Internet y Telecomunicaciones', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6371', nombre: 'Publicidad y marketing digital', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '6391', nombre: 'Otros servicios prestados por terceros', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '651', nombre: 'Seguros contra siniestros', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },
  { codigo: '659', nombre: 'Otros gastos de gestión diversos', elemento: 6, naturaleza: 'DEUDORA', tipo: 'RESULTADOS' },

  // Elemento 7: Ingresos
  { codigo: '70111', nombre: 'Ventas de mercaderías - Mercado local terceros', elemento: 7, naturaleza: 'ACREEDORA', tipo: 'RESULTADOS' },
  { codigo: '70411', nombre: 'Prestación de servicios - Mercado local', elemento: 7, naturaleza: 'ACREEDORA', tipo: 'RESULTADOS' },
  { codigo: '772', nombre: 'Rendimientos ganados / Intereses financieros', elemento: 7, naturaleza: 'ACREEDORA', tipo: 'RESULTADOS' },

  // Elemento 9: Cuentas de Destino (Costos y Gastos por Función)
  { codigo: '941', nombre: 'Gastos de Administración', elemento: 9, naturaleza: 'DEUDORA', tipo: 'COSTOS' },
  { codigo: '951', nombre: 'Gastos de Ventas', elemento: 9, naturaleza: 'DEUDORA', tipo: 'COSTOS' },
  { codigo: '791', nombre: 'Cargas imputables a cuentas de costos y gastos', elemento: 7, naturaleza: 'ACREEDORA', tipo: 'COSTOS' }
];

export function buscarCuentaPCGE(codigo: string): CuentaPCGE | undefined {
  return PLAN_CONTABLE_PCGE.find(c => c.codigo === codigo) || 
         PLAN_CONTABLE_PCGE.find(c => codigo.startsWith(c.codigo));
}
