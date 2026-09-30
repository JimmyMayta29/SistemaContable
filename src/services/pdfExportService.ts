import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaCliente, Comprobante, AsientoContable } from '../types';

export interface PdfExportOptions {
  tituloLibro: string;
  subtitulo?: string;
  codigoLibroSunat?: string;
  periodo: string;
  orientacion?: 'portrait' | 'landscape';
  incluirFirmas?: boolean;
  incluirLogo?: boolean;
  filtroAplicado?: string;
}

/**
 * Dibuja el membrete legal oficial en el PDF con logo corporativo
 */
function dibujarMembreteLegal(
  doc: jsPDF, 
  empresa: EmpresaCliente, 
  options: PdfExportOptions,
  pageNumber: number,
  totalPages: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  
  // 1. Logo Corporativo / Isotipo Vectorial
  if (options.incluirLogo !== false) {
    // Fondo del logo
    doc.setFillColor(30, 58, 138); // Blue 900
    doc.roundedRect(margin, 10, 16, 16, 2, 2, 'F');
    
    // Inicial de la empresa
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const inicial = empresa.razonSocial ? empresa.razonSocial.charAt(0) : 'S';
    doc.text(inicial, margin + 5.5, 21);
  }

  // 2. Datos de la Empresa (Razón Social, RUC, Dirección)
  const textLeft = options.incluirLogo !== false ? margin + 20 : margin;
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(empresa.razonSocial.toUpperCase(), textLeft, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(`RUC: ${empresa.ruc}  |  Régimen: ${empresa.regimenTributario.replace('_', ' ')}`, textLeft, 19);
  doc.text(`Dirección: ${empresa.direccionFiscal || 'LIMA, PERÚ'}  |  Tel: ${empresa.contactoTelefono || '-' }`, textLeft, 23.5);

  // 3. Cuadro Resumen a la derecha (Periodo y Fecha)
  const boxWidth = 65;
  const boxX = pageWidth - margin - boxWidth;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(boxX, 10, boxWidth, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138); // Blue 800
  doc.text(`PERIODO TRIBUTARIO: ${options.periodo}`, boxX + 4, 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Emisión: ${fechaStr} ${horaStr}`, boxX + 4, 19.5);
  doc.text(`Página ${pageNumber} de ${totalPages}`, boxX + 4, 23.5);

  // 4. Línea separadora decorativa
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 29, pageWidth - margin, 29);

  // 5. Título Principal del Libro Contable Oficial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(options.tituloLibro.toUpperCase(), margin, 35);

  if (options.codigoLibroSunat) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(217, 119, 6); // Amber 600
    doc.text(`[${options.codigoLibroSunat}]`, margin + doc.getTextWidth(options.tituloLibro.toUpperCase()) + 3, 35);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Expresado en Moneda Nacional (PEN - Soles)  •  Formato Oficial SUNAT`, margin, 39);
}

/**
 * Dibuja el pie de página legal con recuadro de firmas del contador y representante
 */
function dibujarPieDePaginaLegal(doc: jsPDF, empresa: EmpresaCliente) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const footerY = pageHeight - 22;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  // Recuadro de Firmas
  const anchoFirma = 55;
  const xFirma1 = margin + 15;
  const xFirma2 = pageWidth - margin - anchoFirma - 15;

  // Firma Contador
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(xFirma1, footerY + 8, xFirma1 + anchoFirma, footerY + 8);
  doc.setLineDashPattern([], 0); // reset
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('CONTADOR PÚBLICO COLEGIADO', xFirma1 + (anchoFirma / 2), footerY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Matrícula C.P.C. N° 48192', xFirma1 + (anchoFirma / 2), footerY + 14.5, { align: 'center' });

  // Firma Gerente / Representante
  doc.setLineDashPattern([1, 1], 0);
  doc.line(xFirma2, footerY + 8, xFirma2 + anchoFirma, footerY + 8);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.contactoNombre ? empresa.contactoNombre.toUpperCase() : 'REPRESENTANTE LEGAL', xFirma2 + (anchoFirma / 2), footerY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`RUC ${empresa.ruc}`, xFirma2 + (anchoFirma / 2), footerY + 14.5, { align: 'center' });

  // Nota Legal
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento contable oficial emitido por SUNAConta PRO ERP Cloud bajo normativa tributaria SUNAT vigente.', pageWidth / 2, pageHeight - 3, { align: 'center' });
}

/**
 * 1. Exporta el REGISTRO DE COMPRAS (Formato 8.1 / SIRE 8.4) a PDF
 */
export function exportarRegistroComprasPdf(
  empresa: EmpresaCliente,
  compras: Comprobante[],
  periodo: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const headers = [
    [
      'N°',
      'Fecha Emis.',
      'Tipo',
      'Serie',
      'Número',
      'RUC Prov.',
      'Razón Social Proveedor',
      'Base Grav. (S/)',
      'IGV (S/)',
      'No Grav. (S/)',
      'Total (S/)',
      'Cta PCGE',
      'SPOT'
    ]
  ];

  const totalBase = compras.reduce((acc, c) => acc + c.baseImponibleGravada, 0);
  const totalIgv = compras.reduce((acc, c) => acc + c.igv, 0);
  const totalNoGrav = compras.reduce((acc, c) => acc + (c.adquisicionesNoGravadas || 0), 0);
  const totalGeneral = compras.reduce((acc, c) => acc + c.total, 0);

  const rows = compras.map((c, index) => [
    String(index + 1),
    c.fechaEmision,
    c.tipoDoc,
    c.serie,
    c.numero,
    c.rucEmisor,
    c.razonSocialEmisor.substring(0, 32),
    c.baseImponibleGravada.toFixed(2),
    c.igv.toFixed(2),
    (c.adquisicionesNoGravadas || 0).toFixed(2),
    c.total.toFixed(2),
    c.cuentaContableAsignada || c.categoriaGasto || '6011',
    c.sujetoADetraccion ? `SI (${c.tasaDetraccion || 0}%)` : '-'
  ]);

  const foot = [
    [
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      `Total Comprobantes: ${compras.length}`,
      totalBase.toFixed(2),
      totalIgv.toFixed(2),
      totalNoGrav.toFixed(2),
      totalGeneral.toFixed(2),
      '',
      ''
    ]
  ];

  autoTable(doc, {
    head: headers,
    body: rows,
    foot: foot,
    startY: 42,
    margin: { top: 42, bottom: 25, left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 58, 138], // Blue 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate 100
      textColor: [15, 23, 42],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'left' },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'right', cellWidth: 18 },
      10: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      11: { halign: 'center', cellWidth: 14 },
      12: { halign: 'center', cellWidth: 14 }
    },
    didDrawPage: (data) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      dibujarMembreteLegal(doc, empresa, {
        tituloLibro: 'Registro de Compras Electrónico',
        codigoLibroSunat: 'FORMATO SUNAT SIRE 8.4',
        periodo
      }, data.pageNumber, totalPages);
    }
  });

  dibujarPieDePaginaLegal(doc, empresa);

  const nombreArchivo = `REG_COMPRAS_${empresa.ruc}_${periodo.replace('-', '')}.pdf`;
  doc.save(nombreArchivo);
}

/**
 * 2. Exporta el REGISTRO DE VENTAS E INGRESOS (Formato 14.1 / SIRE 14.4) a PDF
 */
export function exportarRegistroVentasPdf(
  empresa: EmpresaCliente,
  ventas: Comprobante[],
  periodo: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const headers = [
    [
      'N°',
      'Fecha Emis.',
      'Tipo',
      'Serie',
      'Número',
      'RUC/DNI',
      'Razón Social / Cliente Receptor',
      'Base Gravada (S/)',
      'IGV Débito (S/)',
      'Exonerado (S/)',
      'Total Venta (S/)',
      'Estado SUNAT'
    ]
  ];

  const totalBase = ventas.reduce((acc, v) => acc + v.baseImponibleGravada, 0);
  const totalIgv = ventas.reduce((acc, v) => acc + v.igv, 0);
  const totalGeneral = ventas.reduce((acc, v) => acc + v.total, 0);

  const rows = ventas.map((v, index) => [
    String(index + 1),
    v.fechaEmision,
    v.tipoDoc,
    v.serie,
    v.numero,
    v.rucReceptor,
    v.razonSocialReceptor.substring(0, 36),
    v.baseImponibleGravada.toFixed(2),
    v.igv.toFixed(2),
    (v.adquisicionesNoGravadas || 0).toFixed(2),
    v.total.toFixed(2),
    v.estadoSunat
  ]);

  const foot = [
    [
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      `Total Facturado (${ventas.length} comprobantes)`,
      totalBase.toFixed(2),
      totalIgv.toFixed(2),
      '0.00',
      totalGeneral.toFixed(2),
      ''
    ]
  ];

  autoTable(doc, {
    head: headers,
    body: rows,
    foot: foot,
    startY: 42,
    margin: { top: 42, bottom: 25, left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [5, 150, 105], // Emerald 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'left' },
      7: { halign: 'right', cellWidth: 24 },
      8: { halign: 'right', cellWidth: 22 },
      9: { halign: 'right', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      11: { halign: 'center', cellWidth: 20 }
    },
    didDrawPage: (data) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      dibujarMembreteLegal(doc, empresa, {
        tituloLibro: 'Registro de Ventas e Ingresos Electrónico',
        codigoLibroSunat: 'FORMATO SUNAT SIRE 14.4',
        periodo
      }, data.pageNumber, totalPages);
    }
  });

  dibujarPieDePaginaLegal(doc, empresa);

  const nombreArchivo = `REG_VENTAS_${empresa.ruc}_${periodo.replace('-', '')}.pdf`;
  doc.save(nombreArchivo);
}

/**
 * 3. Exporta el LIBRO DIARIO (Formato Oficial 5.1 SUNAT) a PDF
 */
export function exportarLibroDiarioPdf(
  empresa: EmpresaCliente,
  asientos: AsientoContable[],
  periodo: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const headers = [
    [
      'N° Asiento',
      'Fecha',
      'Cuenta PCGE',
      'Denominación de la Cuenta / Glosa',
      'Debe (S/)',
      'Haber (S/)'
    ]
  ];

  // Aplanar los items de cada asiento en filas estructuradas
  const rows: any[] = [];
  let sumaDebeTotal = 0;
  let sumaHaberTotal = 0;

  asientos.forEach((asiento) => {
    // Encabezado de asiento
    rows.push([
      {
        content: `VOUCHER N° ${asiento.numeroAsiento}  |  Subdiario ${asiento.subdiario}  |  Glosa: ${asiento.glosaGeneral} ${asiento.comprobanteReferencia ? `(Doc: ${asiento.comprobanteReferencia})` : ''}`,
        colSpan: 6,
        styles: {
          fillColor: [241, 245, 249],
          fontStyle: 'bold',
          textColor: [30, 58, 138],
          fontSize: 7
        }
      }
    ]);

    asiento.items.forEach((it) => {
      rows.push([
        '',
        asiento.fecha,
        it.codigoCuenta,
        `${it.denominacionCuenta}\n   ↳ ${it.glosa}`,
        it.debe > 0 ? it.debe.toFixed(2) : '-',
        it.haber > 0 ? it.haber.toFixed(2) : '-'
      ]);
      sumaDebeTotal += it.debe;
      sumaHaberTotal += it.haber;
    });
  });

  const foot = [
    [
      'TOTALES GENERALES',
      '',
      '',
      `Total Asientos Contables: ${asientos.length} | Balance: CUADRADO`,
      sumaDebeTotal.toFixed(2),
      sumaHaberTotal.toFixed(2)
    ]
  ];

  autoTable(doc, {
    head: headers,
    body: rows,
    foot: foot,
    startY: 42,
    margin: { top: 42, bottom: 25, left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [67, 56, 202], // Indigo 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [30, 58, 138] },
      3: { halign: 'left' },
      4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      5: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      dibujarMembreteLegal(doc, empresa, {
        tituloLibro: 'Libro Diario Oficial',
        codigoLibroSunat: 'FORMATO SUNAT 5.1',
        periodo
      }, data.pageNumber, totalPages);
    }
  });

  dibujarPieDePaginaLegal(doc, empresa);

  const nombreArchivo = `LIBRO_DIARIO_${empresa.ruc}_${periodo.replace('-', '')}.pdf`;
  doc.save(nombreArchivo);
}
