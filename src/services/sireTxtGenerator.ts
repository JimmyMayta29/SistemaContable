import { Comprobante } from '../types';

/**
 * Genera el archivo plano oficial de Registro de Compras Electrónico (RCE) - Formato SUNAT SIRE 8.4
 * Nomenclatura oficial: LE + RUC (11) + AÑO (4) + MES (2) + '00080400001111.txt'
 */
export function generarSireRceTxt(ruc: string, periodo: string, comprobantes: Comprobante[]): { nombreArchivo: string; contenido: string } {
  // Periodo viene como '2026-09'
  const [anio, mes] = periodo.split('-');
  const nombreArchivo = `LE${ruc}${anio}${mes}00080400001111.txt`;

  const lineas: string[] = [];

  comprobantes.forEach((c) => {
    // Campos según Resolución de Superintendencia N° 000112-2021/SUNAT y anexos SIRE RCE
    const fechaEmisionArr = c.fechaEmision.split('-'); // YYYY-MM-DD
    const fechaEmisionFmt = `${fechaEmisionArr[2]}/${fechaEmisionArr[1]}/${fechaEmisionArr[0]}`;
    
    const fechaVencArr = (c.fechaVencimiento || c.fechaEmision).split('-');
    const fechaVencFmt = `${fechaVencArr[2]}/${fechaVencArr[1]}/${fechaVencArr[0]}`;

    const campos = [
      c.rucReceptor, // 1. RUC del adquiriente
      c.razonSocialReceptor, // 2. Apellidos y nombres o razón social
      `${anio}${mes}00`, // 3. Periodo
      c.car, // 4. CAR SUNAT
      fechaEmisionFmt, // 5. Fecha de emisión
      fechaVencFmt, // 6. Fecha de vencimiento
      c.tipoDoc, // 7. Tipo de Comprobante de Pago (01, 03, etc.)
      c.serie, // 8. Serie del comprobante
      c.numero, // 9. Número del comprobante
      '', // 10. Número final (rango)
      '6', // 11. Tipo de documento de identidad del proveedor (6 = RUC)
      c.rucEmisor, // 12. RUC del proveedor
      c.razonSocialEmisor, // 13. Razón social del proveedor
      c.baseImponibleGravada.toFixed(2), // 14. Base imponible adquisiciones gravadas (destinadas a oper. gravadas)
      c.igv.toFixed(2), // 15. IGV / IPM
      '0.00', // 16. Base imponible adq. gravadas destinadas a oper. gravadas y no gravadas
      '0.00', // 17. IGV
      '0.00', // 18. Base imponible adq. gravadas destinadas a oper. no gravadas
      '0.00', // 19. IGV
      (c.adquisicionesNoGravadas || 0).toFixed(2), // 20. Valor de adquisiciones no gravadas
      (c.isc || 0).toFixed(2), // 21. ISC
      (c.icbper || 0).toFixed(2), // 22. Impuesto bolsas de plástico ICBPER
      (c.otrosTributos || 0).toFixed(2), // 23. Otros conceptos / tributos
      c.total.toFixed(2), // 24. Importe Total
      c.moneda, // 25. Código de moneda (PEN, USD)
      c.tipoCambio.toFixed(3), // 26. Tipo de cambio SBS
      // Información de Comprobante que se modifica (Para Notas de Crédito / Débito)
      '', '', '', '', 
      // Información del SPOT (Detracciones)
      c.constanciaDetraccion ? (c.fechaPagoDetraccion || '') : '',
      c.constanciaDetraccion || '',
      c.sujetoARetencion ? '1' : '',
      c.clasificacionBienServicio,
      '1' // Estado de la anotación (1: Dentro del plazo)
    ];

    lineas.push(campos.join('|') + '|');
  });

  return {
    nombreArchivo,
    contenido: lineas.join('\r\n')
  };
}

/**
 * Genera el archivo plano oficial de Registro de Ventas e Ingresos Electrónico (RVIE) - Formato SUNAT SIRE 14.4
 */
export function generarSireRvieTxt(ruc: string, periodo: string, comprobantes: Comprobante[]): { nombreArchivo: string; contenido: string } {
  const [anio, mes] = periodo.split('-');
  const nombreArchivo = `LE${ruc}${anio}${mes}00140400001111.txt`;

  const lineas: string[] = [];

  comprobantes.forEach((c) => {
    const fechaEmisionArr = c.fechaEmision.split('-');
    const fechaEmisionFmt = `${fechaEmisionArr[2]}/${fechaEmisionArr[1]}/${fechaEmisionArr[0]}`;

    const tipoDocIdentidad = c.rucReceptor.length === 11 ? '6' : '1'; // 6: RUC, 1: DNI

    const campos = [
      c.rucEmisor,
      c.razonSocialEmisor,
      `${anio}${mes}00`,
      c.car,
      fechaEmisionFmt,
      fechaEmisionFmt,
      c.tipoDoc,
      c.serie,
      c.numero,
      '',
      tipoDocIdentidad,
      c.rucReceptor,
      c.razonSocialReceptor,
      '0.00', // Valor exportación
      c.baseImponibleGravada.toFixed(2),
      '0.00', // Descuento de base imponible
      c.igv.toFixed(2),
      '0.00', // Descuento de IGV
      '0.00', // Exonerado
      '0.00', // Inafecto
      (c.isc || 0).toFixed(2),
      '0.00', // Base arroz pilado
      '0.00', // Impuesto arroz pilado
      (c.icbper || 0).toFixed(2),
      (c.otrosTributos || 0).toFixed(2),
      c.total.toFixed(2),
      c.moneda,
      c.tipoCambio.toFixed(3),
      '', '', '', '', // Referencia modificación
      '1'
    ];

    lineas.push(campos.join('|') + '|');
  });

  return {
    nombreArchivo,
    contenido: lineas.join('\r\n')
  };
}

/**
 * Exporta a CSV descargable para abrir inmediatamente en una hoja de cálculo
 */
export function exportarComprobantesCsv(comprobantes: Comprobante[], tipo: 'COMPRAS' | 'VENTAS'): string {
  const encabezados = [
    'CAR_SUNAT',
    'TIPO_COMPROBANTE',
    'SERIE',
    'NUMERO',
    'FECHA_EMISION',
    'FECHA_VENCIMIENTO',
    'RUC_EMISOR',
    'RAZON_SOCIAL_EMISOR',
    'RUC_RECEPTOR',
    'RAZON_SOCIAL_RECEPTOR',
    'MONEDA',
    'TIPO_CAMBIO',
    'BASE_IMPONIBLE_GRAVADA',
    'IGV_18_PORCIENTO',
    'TOTAL',
    'DETRACCION_SPOT',
    'MONTO_DETRACCION',
    'CUENTA_PCGE',
    'ESTADO_SUNAT'
  ];

  const filas = comprobantes.map(c => [
    `"${c.car}"`,
    `"${c.tipoDoc}"`,
    `"${c.serie}"`,
    `"${c.numero}"`,
    `"${c.fechaEmision}"`,
    `"${c.fechaVencimiento || c.fechaEmision}"`,
    `"${c.rucEmisor}"`,
    `"${c.razonSocialEmisor.replace(/"/g, '""')}"`,
    `"${c.rucReceptor}"`,
    `"${c.razonSocialReceptor.replace(/"/g, '""')}"`,
    `"${c.moneda}"`,
    c.tipoCambio.toFixed(3),
    c.baseImponibleGravada.toFixed(2),
    c.igv.toFixed(2),
    c.total.toFixed(2),
    c.sujetoADetraccion ? `"SI (${c.tasaDetraccion}%)"` : '"NO"',
    c.montoDetraccion ? c.montoDetraccion.toFixed(2) : '0.00',
    `"${c.cuentaContableAsignada || '6011'}"`,
    `"${c.estadoSunat}"`
  ].join(';'));

  return [encabezados.join(';'), ...filas].join('\r\n');
}
