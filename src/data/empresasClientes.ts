import { EmpresaCliente, MovimientoCajaBanco, TrabajadorPlanilla, ReciboHonorario, EmpresaDataState } from '../types';
import { COMPROBANTES_INICIALES_COMPRAS, COMPROBANTES_INICIALES_VENTAS } from '../services/sunatScraperAndSync';
import { generarAsientoCompra, generarAsientoVenta, generarAsientoPlanilla, generarAsientoHonorario } from '../services/accountingEngine';

export const EMPRESAS_CLIENTES_DEMO: EmpresaCliente[] = [
  {
    id: 'emp-01',
    codigoEmpresa: 'CA 2026',
    ruc: '20601234567',
    razonSocial: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    nombreComercial: 'LOGISTICA PERU PRO',
    direccionFiscal: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    contactoNombre: 'Ing. Carlos Mendoza',
    contactoTelefono: '+51 987 654 321',
    contactoEmail: 'gerencia@logisticaperu.com.pe',
    regimenTributario: 'MYPE_TRIBUTARIO',
    tasaRentaMensual: 0.01,
    usuarioSol: 'MODDATOS',
    claveSol: 'moddatos123',
    clientIdSire: '68c85fa6-7c98-4c31-92da-1901df934a38',
    clientSecretSire: '689f9e12-b13c-41ad-a0bc-9801fa4e32d1',
    ambienteSunat: 'PRODUCCION',
    ultimoDigitoRuc: '7',
    vencimientoPdt621: '2026-10-23',
    vencimientoSire: '2026-10-23',
    vencimientoPlame: '2026-10-23',
    estadoDeclaracion: 'POR_VENCER',
    preliquidacionNotificada: true,
    montoPreliquidacionIgv: 1480.00,
    montoPreliquidacionRenta: 226.00,
    trabajadoresPlanilla: 6
  },
  {
    id: 'emp-02',
    codigoEmpresa: 'TRANSSUR',
    ruc: '20556789123',
    razonSocial: 'TRANSPORTES & CARGA PESADA DEL SUR S.A.C.',
    nombreComercial: 'TRANSSUR CARGA',
    direccionFiscal: 'AV. MATERIALES 2350, CALLAO, LIMA',
    contactoNombre: 'Dra. María Elena Quispe',
    contactoTelefono: '+51 976 543 210',
    contactoEmail: 'contabilidad@transsur.pe',
    regimenTributario: 'REGIMEN_GENERAL',
    tasaRentaMensual: 0.015,
    usuarioSol: 'TRANSSOL',
    claveSol: 'pass9982',
    clientIdSire: 'c8273612-4412-4211-b021-987162534120',
    clientSecretSire: 'f9182390-1283-4912-a102-120938475612',
    ambienteSunat: 'PRODUCCION',
    ultimoDigitoRuc: '3',
    vencimientoPdt621: '2026-10-19',
    vencimientoSire: '2026-10-19',
    vencimientoPlame: '2026-10-19',
    estadoDeclaracion: 'PRELIQUIDADO',
    preliquidacionNotificada: false,
    montoPreliquidacionIgv: 3250.00,
    montoPreliquidacionRenta: 680.00,
    trabajadoresPlanilla: 14
  },
  {
    id: 'emp-03',
    codigoEmpresa: 'DIFERRO',
    ruc: '20100035392',
    razonSocial: 'DISTRIBUIDORA INDUSTRIAL FERRETERA S.A.C.',
    nombreComercial: 'DIFERRO MAYORISTA',
    direccionFiscal: 'AV. ARGENTINA 1840, CERCADO DE LIMA',
    contactoNombre: 'Sr. Roberto Wong',
    contactoTelefono: '+51 945 123 789',
    contactoEmail: 'rwong@diferro.com.pe',
    regimenTributario: 'REGIMEN_GENERAL',
    tasaRentaMensual: 0.015,
    usuarioSol: 'FERRESOL',
    claveSol: 'diferro2026',
    clientIdSire: 'd8172635-1283-4819-9182-129384756120',
    clientSecretSire: 'a9182736-4512-4918-b019-238475619283',
    ambienteSunat: 'PRODUCCION',
    ultimoDigitoRuc: '2',
    vencimientoPdt621: '2026-10-18',
    vencimientoSire: '2026-10-18',
    vencimientoPlame: '2026-10-18',
    estadoDeclaracion: 'AL_DIA',
    preliquidacionNotificada: true,
    montoPreliquidacionIgv: 890.00,
    montoPreliquidacionRenta: 450.00,
    trabajadoresPlanilla: 9
  },
  {
    id: 'emp-04',
    codigoEmpresa: 'FOGON',
    ruc: '20491827364',
    razonSocial: 'INVERSIONES GASTRONOMICAS DEL VALLE S.A.C.',
    nombreComercial: 'RESTAURANTE EL FOGON',
    direccionFiscal: 'CALLE CANTUARIAS 140, MIRAFLORES, LIMA',
    contactoNombre: 'Chef Patricia Alarcón',
    contactoTelefono: '+51 999 888 777',
    contactoEmail: 'administracion@elfogon.pe',
    regimenTributario: 'MYPE_TRIBUTARIO',
    tasaRentaMensual: 0.01,
    usuarioSol: 'FOGONSOL',
    claveSol: 'fogon2026*',
    clientIdSire: 'b7182930-1829-4819-a918-283940192837',
    clientSecretSire: 'c8192830-1928-4819-b019-384910293847',
    ambienteSunat: 'PRODUCCION',
    ultimoDigitoRuc: '4',
    vencimientoPdt621: '2026-10-20',
    vencimientoSire: '2026-10-20',
    vencimientoPlame: '2026-10-20',
    estadoDeclaracion: 'POR_VENCER',
    preliquidacionNotificada: false,
    montoPreliquidacionIgv: 2150.00,
    montoPreliquidacionRenta: 310.00,
    trabajadoresPlanilla: 11
  }
];

export const RECIBOS_HONORARIOS_DEMO: ReciboHonorario[] = [
  {
    id: 'rh-01',
    subdiario: '06',
    numeroRecibo: 'E001-0000142',
    fechaEmision: '2026-09-12',
    fechaPago: '2026-09-18',
    rucEmisor: '10458923412',
    razonSocialEmisor: 'DR. FERNANDO SALAZAR TORRES',
    profesionOcupacion: 'Asesoría Jurídica y Laboral',
    montoTotalHonorario: 2400.00,
    sujetoARetencionRenta: true,
    retencionMonto: 192.00, // 8% de S/ 2,400
    netoCobrado: 2208.00,
    moneda: 'PEN',
    cuentaGasto: '6322',
    glosa: 'Servicios de defensa y asesoría laboral según contrato',
    asientoGenerado: true
  },
  {
    id: 'rh-02',
    subdiario: '06',
    numeroRecibo: 'E001-0000219',
    fechaEmision: '2026-09-19',
    fechaPago: '2026-09-25',
    rucEmisor: '10712938419',
    razonSocialEmisor: 'ING. MARÍA GÓMEZ BENÍTEZ',
    profesionOcupacion: 'Mantenimiento de Sistemas e Infraestructura Cloud',
    montoTotalHonorario: 1800.00,
    sujetoARetencionRenta: true,
    retencionMonto: 144.00, // 8% de S/ 1,800
    netoCobrado: 1656.00,
    moneda: 'PEN',
    cuentaGasto: '6329',
    glosa: 'Optimización de servidores y backup de bases de datos',
    asientoGenerado: true
  }
];

export const MOVIMIENTOS_BANCARIOS_DEMO: MovimientoCajaBanco[] = [
  {
    id: 'mov-001',
    fecha: '2026-09-05',
    tipo: 'INGRESO',
    medioPago: 'TRANSFERENCIA',
    banco: 'BCP',
    cuentaNumero: '193-4819283-0-21 (Cta Cte Soles)',
    glosa: 'Cobranza Factura F001-0001045 Minera Los Andes',
    monto: 14160.00,
    moneda: 'PEN',
    referenciaComprobante: 'F001-0001045',
    beneficiario: 'MINERA LOS ANDES DEL CENTRO S.A.A.'
  },
  {
    id: 'mov-002',
    fecha: '2026-09-12',
    tipo: 'INGRESO',
    medioPago: 'TRANSFERENCIA',
    banco: 'BBVA',
    cuentaNumero: '0011-0182-0100049182 (Cta Cte Soles)',
    glosa: 'Cobranza Factura F001-0001046 Agroexportadora del Valle',
    monto: 10502.00,
    moneda: 'PEN',
    referenciaComprobante: 'F001-0001046',
    beneficiario: 'AGROEXPORTADORA DEL VALLE S.A.C.'
  },
  {
    id: 'mov-003',
    fecha: '2026-09-15',
    tipo: 'EGRESO',
    medioPago: 'DETRACCION_BN',
    banco: 'BANCO_DE_LA_NACION',
    cuentaNumero: '00-068-192830 (Cta Detracciones)',
    glosa: 'Pago SPOT Detracción 4% Factura F005-0001289 Flete',
    monto: 165.20,
    moneda: 'PEN',
    referenciaComprobante: 'F005-0001289',
    beneficiario: 'TRANSPORTES & CARGA PESADA DEL SUR S.A.C.'
  },
  {
    id: 'mov-004',
    fecha: '2026-09-18',
    tipo: 'EGRESO',
    medioPago: 'TRANSFERENCIA',
    banco: 'BCP',
    cuentaNumero: '193-4819283-0-21 (Cta Cte Soles)',
    glosa: 'Pago SPOT Detracción 12% Asesoría Tributaria',
    monto: 354.00,
    moneda: 'PEN',
    referenciaComprobante: 'F001-0000782',
    beneficiario: 'ASESORES TRIBUTARIOS & AUDITORES ASOCIADOS S.C.R.L.'
  }
];

export const TRABAJADORES_PLANILLA_DEMO: TrabajadorPlanilla[] = [
  {
    id: 'trab-01',
    dni: '45891234',
    nombres: 'Jorge Luis',
    apellidos: 'Ramírez Soto',
    cargo: 'Contador General',
    sueldoBruto: 4500.00,
    afpOnp: 'INTEGRA',
    aporteTrabajador: 535.50,
    essaludEmpleador: 405.00,
    netoAPagar: 3964.50
  },
  {
    id: 'trab-02',
    dni: '71293841',
    nombres: 'Ana Lucía',
    apellidos: 'Vargas Mendoza',
    cargo: 'Asistente Contable / Facturación',
    sueldoBruto: 2200.00,
    afpOnp: 'ONP',
    aporteTrabajador: 286.00,
    essaludEmpleador: 198.00,
    netoAPagar: 1914.00
  },
  {
    id: 'trab-03',
    dni: '48192039',
    nombres: 'Miguel Ángel',
    apellidos: 'Huamán Castro',
    cargo: 'Coordinador de Operaciones Logísticas',
    sueldoBruto: 3200.00,
    afpOnp: 'PRIMA',
    aporteTrabajador: 380.80,
    essaludEmpleador: 288.00,
    netoAPagar: 2819.20
  }
];

// Generador de datos iniciales aislados para cada empresa
export function crearDatosInicialesEmpresa(empresaId: string, ruc: string, razon: string): EmpresaDataState {
  if (empresaId === 'emp-01') {
    const asientosCompras = COMPROBANTES_INICIALES_COMPRAS.map((c, idx) => ({
      ...generarAsientoCompra(c, idx + 1),
      subdiario: '01' as const,
      numeroAsiento: `0109${String(idx + 1).padStart(4, '0')}`,
      moneda: 'PEN' as const,
      tipoCambio: 3.752
    }));
    const asientosVentas = COMPROBANTES_INICIALES_VENTAS.map((v, idx) => ({
      ...generarAsientoVenta(v, idx + 1),
      subdiario: '02' as const,
      numeroAsiento: `0209${String(idx + 1).padStart(4, '0')}`,
      moneda: 'PEN' as const,
      tipoCambio: 3.752
    }));
    const asientoPlanilla = generarAsientoPlanilla(9900.00, 891.00, 1202.30, 8697.70, '2026-09', 1);
    const asientoHonorario1 = generarAsientoHonorario({
      numeroRecibo: 'E001-0000142',
      fechaEmision: '2026-09-12',
      rucEmisor: '10458923412',
      razonSocialEmisor: 'DR. FERNANDO SALAZAR TORRES',
      montoTotal: 2400.00,
      retencion8: 192.00,
      netoPagar: 2208.00,
      cuentaGasto: '6322'
    }, '2026-09', 1);

    return {
      compras: COMPROBANTES_INICIALES_COMPRAS.map((c, idx) => ({
        ...c,
        subdiario: '01',
        numeroVoucher: `0109${String(idx + 1).padStart(4, '0')}`
      })),
      ventas: COMPROBANTES_INICIALES_VENTAS.map((v, idx) => ({
        ...v,
        subdiario: '02',
        numeroVoucher: `0209${String(idx + 1).padStart(4, '0')}`
      })),
      asientos: [...asientosCompras, ...asientosVentas, asientoPlanilla, asientoHonorario1],
      movimientosBancarios: MOVIMIENTOS_BANCARIOS_DEMO,
      trabajadoresPlanilla: TRABAJADORES_PLANILLA_DEMO,
      honorarios: RECIBOS_HONORARIOS_DEMO,
      saldoAnteriorIgv: 0
    };
  }

  // Empresa 2 (Transportes del Sur)
  if (empresaId === 'emp-02') {
    const comprasT = [
      {
        id: 'cmp-trans-01',
        car: '2010005432101F001000981220260902',
        subdiario: '01' as const,
        numeroVoucher: '01090001',
        tipoDoc: '01' as const,
        serie: 'F001',
        numero: '0009812',
        fechaEmision: '2026-09-02',
        fechaVencimiento: '2026-09-17',
        rucEmisor: '20100054321',
        razonSocialEmisor: 'REPSOL COMERCIALIZADORA DE COMBUSTIBLE S.A.',
        rucReceptor: ruc,
        razonSocialReceptor: razon,
        moneda: 'PEN' as const,
        tipoCambio: 1.000,
        baseImponibleGravada: 14500.00,
        igv: 2610.00,
        adquisicionesNoGravadas: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        total: 17110.00,
        sujetoADetraccion: false,
        clasificacionBienServicio: 'GASTO_SERVICIOS' as const,
        categoriaGasto: '659',
        cuentaContableAsignada: '659',
        asientoGenerado: true,
        estadoSunat: 'ACEPTADO' as const,
        origen: 'SUNAT_SIRE_SYNC' as const,
        observaciones: 'Abastecimiento de combustible Diesel B5 para flota'
      },
      {
        id: 'cmp-trans-02',
        car: '2034567891201F002000412320260908',
        subdiario: '01' as const,
        numeroVoucher: '01090002',
        tipoDoc: '01' as const,
        serie: 'F002',
        numero: '0004123',
        fechaEmision: '2026-09-08',
        fechaVencimiento: '2026-09-23',
        rucEmisor: '20345678912',
        razonSocialEmisor: 'LLANTAS & NEUMATICOS INDUSTRIALES DEL PERU S.A.C.',
        rucReceptor: ruc,
        razonSocialReceptor: razon,
        moneda: 'PEN' as const,
        tipoCambio: 1.000,
        baseImponibleGravada: 6200.00,
        igv: 1116.00,
        adquisicionesNoGravadas: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        total: 7316.00,
        sujetoADetraccion: false,
        clasificacionBienServicio: 'MERCADERIA' as const,
        categoriaGasto: '6032',
        cuentaContableAsignada: '6032',
        asientoGenerado: true,
        estadoSunat: 'ACEPTADO' as const,
        origen: 'SUNAT_SIRE_SYNC' as const,
        observaciones: 'Repuestos y neumáticos para tractocamiones Volvo'
      }
    ];

    const ventasT = [
      {
        id: 'vnt-trans-01',
        car: `${ruc}01F001000084520260906`,
        subdiario: '02' as const,
        numeroVoucher: '02090001',
        tipoDoc: '01' as const,
        serie: 'F001',
        numero: '0000845',
        fechaEmision: '2026-09-06',
        fechaVencimiento: '2026-09-21',
        rucEmisor: ruc,
        razonSocialEmisor: razon,
        rucReceptor: '20100035392',
        razonSocialReceptor: 'DISTRIBUIDORA INDUSTRIAL FERRETERA S.A.C.',
        moneda: 'PEN' as const,
        tipoCambio: 1.000,
        baseImponibleGravada: 28000.00,
        igv: 5040.00,
        adquisicionesNoGravadas: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        total: 33040.00,
        sujetoADetraccion: true,
        codigoDetraccion: '027',
        tasaDetraccion: 4,
        montoDetraccion: 1321.60,
        clasificacionBienServicio: 'GASTO_SERVICIOS' as const,
        categoriaGasto: '70411',
        cuentaContableAsignada: '70411',
        asientoGenerado: true,
        estadoSunat: 'ACEPTADO' as const,
        origen: 'SUNAT_SIRE_SYNC' as const,
        observaciones: 'Servicio de transporte de carga pesada Lima - Arequipa'
      }
    ];

    const asientosT = [
      {
        ...generarAsientoCompra(comprasT[0], 1),
        subdiario: '01' as const,
        numeroAsiento: '01090001',
        moneda: 'PEN' as const,
        tipoCambio: 1.000
      },
      {
        ...generarAsientoCompra(comprasT[1], 2),
        subdiario: '01' as const,
        numeroAsiento: '01090002',
        moneda: 'PEN' as const,
        tipoCambio: 1.000
      },
      {
        ...generarAsientoVenta(ventasT[0], 1),
        subdiario: '02' as const,
        numeroAsiento: '02090001',
        moneda: 'PEN' as const,
        tipoCambio: 1.000
      }
    ];

    return {
      compras: comprasT,
      ventas: ventasT,
      asientos: asientosT,
      movimientosBancarios: [
        {
          id: 'mov-t-1',
          fecha: '2026-09-08',
          tipo: 'INGRESO',
          medioPago: 'TRANSFERENCIA',
          banco: 'BCP',
          cuentaNumero: '193-9827361-0-45 (Soles)',
          glosa: 'Cobranza Flete Factura F001-0000845',
          monto: 31718.40,
          moneda: 'PEN',
          referenciaComprobante: 'F001-0000845',
          beneficiario: 'DISTRIBUIDORA INDUSTRIAL FERRETERA S.A.C.'
        }
      ],
      trabajadoresPlanilla: [
        {
          id: 'trab-t-1',
          dni: '10928374',
          nombres: 'Manuel',
          apellidos: 'Condori Ramos',
          cargo: 'Conductor Profesional de Carga Pesada',
          sueldoBruto: 3800.00,
          afpOnp: 'INTEGRA',
          aporteTrabajador: 452.20,
          essaludEmpleador: 342.00,
          netoAPagar: 3347.80
        }
      ],
      honorarios: [],
      saldoAnteriorIgv: 0
    };
  }

  // Fallback genérico para nuevas empresas
  return {
    compras: [],
    ventas: [],
    asientos: [],
    movimientosBancarios: [],
    trabajadoresPlanilla: [],
    honorarios: [],
    saldoAnteriorIgv: 0
  };
}
