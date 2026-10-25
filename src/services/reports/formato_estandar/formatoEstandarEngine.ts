import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaCliente, Comprobante } from '../../../types';

export interface ColumnaReporteEstandar {
  id: string;
  label: string;
  subLabel?: string;
  align?: 'left' | 'center' | 'right';
  cellWidthPdf?: number;
  isNumeric?: boolean;
  sumar?: boolean;
}

export interface SuperHeaderColumna {
  label: string;
  colSpan: number;
}

export interface FilaGrupoReporteEstandar {
  grupoId: string;
  tituloGrupo: string; // ej: "Tipo Doc.: 01  FACTURA"
  filas: Array<Record<string, any>>;
  totalesGrupo: Record<string, number>;
}

export interface EstandarReportDefinition {
  titulo: string;
  orientacion: 'landscape' | 'portrait';
  empresa: {
    razonSocial: string;
    ruc: string;
    direccion: string;
    periodo: string;
  };
  moneda: string; // "SOLES"
  superHeaders?: SuperHeaderColumna[];
  columnas: ColumnaReporteEstandar[];
  grupos: FilaGrupoReporteEstandar[];
  totalesGenerales: Record<string, number>;
  mostrarFechaHoraImpresion?: boolean;
}

/**
 * Formatea importes en formato estándar:
 * - Coma para miles, punto para decimales (2 decimales fijos)
 * - Muestra 0.00 cuando es cero
 * - Negativos con signo menos (-150.00)
 */
export function formatearImporteEstandar(num: number | undefined | null): string {
  const val = typeof num === 'number' && !isNaN(num) ? num : 0;
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formatea fechas a formato d/mm/aaaa (día sin cero inicial)
 */
export function formatearFechaEstandar(fechaStr: string | undefined | null): string {
  if (!fechaStr) return '';
  const clean = fechaStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const anio = parts[0];
    const mes = parts[1];
    const dia = String(parseInt(parts[2], 10)); // sin cero a la izquierda
    return `${dia}/${mes}/${anio}`;
  }
  return fechaStr;
}

const DESCRIPCION_TIPO_COMPROBANTE: Record<string, string> = {
  '01': 'FACTURA',
  '02': 'RECIBO POR HONORARIOS',
  '03': 'BOLETA DE VENTA',
  '07': 'NOTA DE CRÉDITO',
  '08': 'NOTA DE DÉBITO',
  '12': 'TICKET O CINTA EMITIDO POR MÁQUINA REGISTRADORA',
  '14': 'RECIBO POR SERVICIOS PÚBLICOS',
  '50': 'DECLARACIÓN ÚNICA DE ADUANAS (DUA)',
  '52': 'DESPACHO SIMPLIFICADO DE IMPORTACIÓN',
  '00': 'OTROS DOCUMENTOS'
};

/**
 * Convierte el periodo YYYY-MM en nombre del mes en mayúsculas
 */
function obtenerNombreMesPeriodo(periodo: string): string {
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  if (periodo && periodo.includes('-')) {
    const mesNum = parseInt(periodo.split('-')[1], 10);
    if (mesNum >= 1 && mesNum <= 12) {
      return meses[mesNum - 1];
    }
  }
  return 'DEL EJERCICIO';
}

/**
 * Construye la definición tabular de 22 columnas para el REGISTRO DE COMPRAS
 */
export function construirDefinicionRegistroComprasEstandar(
  empresa: EmpresaCliente,
  compras: any[],
  periodo: string,
  opciones?: { mostrarFechaHora?: boolean }
): EstandarReportDefinition {
  const mesNombre = obtenerNombreMesPeriodo(periodo);
  const anio = periodo ? periodo.split('-')[0] : '2026';

  // 22 columnas del reporte
  const columnas: ColumnaReporteEstandar[] = [
    { id: 'orden', label: 'O', align: 'center', cellWidthPdf: 6 },
    { id: 'voucher', label: 'N° VOU', align: 'center', cellWidthPdf: 14 },
    { id: 'fechaEmision', label: 'F. Emisión', align: 'center', cellWidthPdf: 14 },
    { id: 'fechaVenc', label: 'F. Venc.', align: 'center', cellWidthPdf: 14 },
    // Documento
    { id: 'docTipo', label: 'T/D', subLabel: 'Doc', align: 'center', cellWidthPdf: 7 },
    { id: 'docSerie', label: 'Serie', subLabel: 'Doc', align: 'center', cellWidthPdf: 10 },
    { id: 'docNumero', label: 'Número', subLabel: 'Doc', align: 'left', cellWidthPdf: 16 },
    // Referencia
    { id: 'refFecha', label: 'Fecha', subLabel: 'Ref', align: 'center', cellWidthPdf: 12 },
    { id: 'refTipo', label: 'T/D', subLabel: 'Ref', align: 'center', cellWidthPdf: 7 },
    { id: 'refSerie', label: 'Serie', subLabel: 'Ref', align: 'center', cellWidthPdf: 9 },
    { id: 'refNumero', label: 'Número', subLabel: 'Ref', align: 'left', cellWidthPdf: 14 },
    // Proveedor
    { id: 'provTipoDoc', label: 'Doc', subLabel: 'Prov', align: 'center', cellWidthPdf: 6 },
    { id: 'provNumero', label: 'Número', subLabel: 'Prov', align: 'left', cellWidthPdf: 19 },
    { id: 'provRazon', label: 'Razón Social', subLabel: 'Prov', align: 'left', cellWidthPdf: 40 },
    // Bases e Impuestos
    { id: 'baseA', label: 'Base Imp. A (18%)', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 18 },
    { id: 'baseB', label: 'Base B (Prorrata)', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 15 },
    { id: 'baseC', label: 'Base C (Sin Créd)', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 15 },
    { id: 'adqNoGrav', label: 'Adq. no Grav.', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 15 },
    { id: 'isc', label: 'I.S.C.', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 12 },
    { id: 'igvA', label: 'I.G.V. A 18%', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 16 },
    { id: 'igv10', label: 'I.G.V. 10%', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 14 },
    { id: 'igvB', label: 'I.G.V. B', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 14 },
    { id: 'igvC', label: 'I.G.V. C', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 14 },
    { id: 'icbper', label: 'ICBPER', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 11 },
    { id: 'otrosTrib', label: 'Otros Trib.', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 12 },
    { id: 'total', label: 'Total', align: 'right', isNumeric: true, sumar: true, cellWidthPdf: 18 },
    { id: 'tipoCambio', label: 'T/C', align: 'right', isNumeric: true, cellWidthPdf: 10 },
    // Spot
    { id: 'spotFecha', label: 'Fecha', subLabel: 'Spot', align: 'center', cellWidthPdf: 13 },
    { id: 'spotNumero', label: 'Número', subLabel: 'Spot', align: 'left', cellWidthPdf: 14 }
  ];

  // Super-headers agrupados
  const superHeaders: SuperHeaderColumna[] = [
    { label: '', colSpan: 4 },
    { label: 'Documento', colSpan: 3 },
    { label: 'Referencia del Documento', colSpan: 4 },
    { label: 'Datos del Proveedor', colSpan: 3 },
    { label: 'Base Imponible y Crédito Fiscal', colSpan: 4 },
    { label: 'Tributos y Gravámenes', colSpan: 7 },
    { label: '', colSpan: 2 },
    { label: 'Constancia Detracción SPOT', colSpan: 2 }
  ];

  // Agrupar compras por tipo de comprobante
  const gruposMap = new Map<string, any[]>();
  compras.forEach((c) => {
    const tipo = c.tipoComprobante || c.tipoDoc || '01';
    if (!gruposMap.has(tipo)) {
      gruposMap.set(tipo, []);
    }
    gruposMap.get(tipo)!.push(c);
  });

  const tiposOrdenados = Array.from(gruposMap.keys()).sort();

  let correlativoGlobal = 0;
  const totalesGenerales: Record<string, number> = {
    baseA: 0,
    baseB: 0,
    baseC: 0,
    adqNoGrav: 0,
    isc: 0,
    igvA: 0,
    igv10: 0,
    igvB: 0,
    igvC: 0,
    icbper: 0,
    otrosTrib: 0,
    total: 0
  };

  const grupos: FilaGrupoReporteEstandar[] = tiposOrdenados.map((tipo) => {
    const comprasTipo = gruposMap.get(tipo)!;
    const descTipo = DESCRIPCION_TIPO_COMPROBANTE[tipo] || `TIPO ${tipo}`;
    const tituloGrupo = `Tipo Doc.: ${tipo}  ${descTipo}`;

    const totalesGrupo: Record<string, number> = {
      baseA: 0,
      baseB: 0,
      baseC: 0,
      adqNoGrav: 0,
      isc: 0,
      igvA: 0,
      igv10: 0,
      igvB: 0,
      igvC: 0,
      icbper: 0,
      otrosTrib: 0,
      total: 0
    };

    const filas = comprasTipo.map((c) => {
      correlativoGlobal++;

      // Extraer campos normalizados compatibles tanto con Comprobante (legacy) como CompraModel (API)
      const baseA = Number(c.baseGravada ?? c.baseImponibleGravada ?? 0);
      const baseB = Number(c.baseMixta ?? 0);
      const baseC = Number(c.baseSinCredito ?? 0);
      const adqNoGrav = Number(c.baseNoGravada ?? c.adquisicionesNoGravadas ?? c.exonerado ?? 0);
      const isc = Number(c.isc ?? 0);
      const igvA = Number(c.igv ?? 0);
      const igv10 = Number(c.igv10 ?? 0);
      const igvB = Number(c.igvB ?? 0);
      const igvC = Number(c.igvC ?? 0);
      const icbper = Number(c.icbper ?? 0);
      const otrosTrib = Number(c.otrosTributos ?? 0);
      const total = Number(c.total ?? 0);

      // Acumular en grupo
      totalesGrupo.baseA += baseA;
      totalesGrupo.baseB += baseB;
      totalesGrupo.baseC += baseC;
      totalesGrupo.adqNoGrav += adqNoGrav;
      totalesGrupo.isc += isc;
      totalesGrupo.igvA += igvA;
      totalesGrupo.igv10 += igv10;
      totalesGrupo.igvB += igvB;
      totalesGrupo.igvC += igvC;
      totalesGrupo.icbper += icbper;
      totalesGrupo.otrosTrib += otrosTrib;
      totalesGrupo.total += total;

      // Acumular en totales generales
      totalesGenerales.baseA += baseA;
      totalesGenerales.baseB += baseB;
      totalesGenerales.baseC += baseC;
      totalesGenerales.adqNoGrav += adqNoGrav;
      totalesGenerales.isc += isc;
      totalesGenerales.igvA += igvA;
      totalesGenerales.igv10 += igv10;
      totalesGenerales.igvB += igvB;
      totalesGenerales.igvC += igvC;
      totalesGenerales.icbper += icbper;
      totalesGenerales.otrosTrib += otrosTrib;
      totalesGenerales.total += total;

      const tc = Number(c.tipoCambio || 1.0);
      const voucherStr = c.asientoNumero || c.asientoGeneradoNumero || (c.asientoId ? c.asientoId.slice(-6) : `01${String(correlativoGlobal).padStart(4, '0')}`);

      return {
        orden: String(correlativoGlobal),
        voucher: voucherStr,
        fechaEmision: formatearFechaEstandar(c.fechaEmision),
        fechaVenc: formatearFechaEstandar(c.fechaVencimiento || c.fechaVenc),
        docTipo: c.tipoComprobante || c.tipoDoc || '01',
        docSerie: c.serie || '',
        docNumero: c.numero || '',
        refFecha: formatearFechaEstandar(c.docModificaFecha),
        refTipo: c.docModificaTipo || '',
        refSerie: c.docModificaSerie || '',
        refNumero: c.docModificaNumero || '',
        provTipoDoc: c.proveedorTipoDoc || '6',
        provNumero: c.proveedorRuc || c.rucEmisor || '',
        provRazon: (c.proveedorNombre || c.razonSocialEmisor || '').trim(),
        baseA,
        baseB,
        baseC,
        adqNoGrav,
        isc,
        igvA,
        igv10,
        igvB,
        igvC,
        icbper,
        otrosTrib,
        total,
        tipoCambio: tc > 1 ? tc.toFixed(3) : '',
        spotFecha: formatearFechaEstandar(c.detraccionFecha || c.spotFecha),
        spotNumero: c.detraccionNumero || c.spotNumero || ''
      };
    });

    return {
      grupoId: tipo,
      tituloGrupo,
      filas,
      totalesGrupo
    };
  });

  return {
    titulo: `REGISTRO DE COMPRAS DEL MES DE ${mesNombre}`,
    orientacion: 'landscape',
    empresa: {
      razonSocial: empresa.razonSocial || 'EMPRESA CONTABLE',
      ruc: empresa.ruc || '20000000001',
      direccion: empresa.direccionFiscal || 'LIMA - PERÚ',
      periodo: `${anio} - ${mesNombre}`
    },
    moneda: 'SOLES',
    superHeaders,
    columnas,
    grupos,
    totalesGenerales,
    mostrarFechaHoraImpresion: !!opciones?.mostrarFechaHora
  };
}

/**
 * Exporta el reporte a PDF cumpliendo con la especificación visual del formato estándar:
 * - Negro sobre blanco puro (#000000 sobre #FFFFFF)
 * - Sin colores de fondo, sin sombreado, sin degradados
 * - Tipografía fina (peso 300)
 * - Membrete legal formal a la izquierda y título centrado entre asteriscos
 * - Cabecera enmarcada repetida en cada página
 * - Filas sin bordes intermedios
 * - Cada grupo con subtítulo, línea fina y TOTALES:
 * - TOTAL GENERAL con línea superior y doble subrayado contable
 * - Pie de página centrado "Pag. N"
 */
export function exportarReporteEstandarPdf(def: EstandarReportDefinition): void {
  const doc = new jsPDF({
    orientation: def.orientacion,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 8;
  const marginTop = 30;
  const marginBottom = 14;

  // Encabezados para autoTable
  const headRows: any[] = [];

  // Fila de Super-Headers si existe
  if (def.superHeaders && def.superHeaders.length > 0) {
    headRows.push(
      def.superHeaders.map((sh) => ({
        content: sh.label,
        colSpan: sh.colSpan,
        styles: {
          halign: 'center',
          fontStyle: 'normal',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.15,
          lineColor: [0, 0, 0]
        }
      }))
    );
  }

  // Fila de Columnas Principales
  headRows.push(
    def.columnas.map((col) => ({
      content: col.label,
      styles: {
        halign: col.align || 'left',
        fontStyle: 'normal',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.15,
        lineColor: [0, 0, 0]
      }
    }))
  );

  // Construir filas del cuerpo agrupadas
  const bodyRows: any[] = [];

  def.grupos.forEach((grupo) => {
    // 1. Fila de Subtítulo de Grupo (ej. "Tipo Doc.: 01  FACTURA")
    bodyRows.push([
      {
        content: grupo.tituloGrupo,
        colSpan: def.columnas.length,
        styles: {
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          halign: 'left',
          cellPadding: { top: 2, bottom: 1, left: 1, right: 1 }
        }
      }
    ]);

    // 2. Filas de datos del grupo (sin bordes intermedios)
    grupo.filas.forEach((fila) => {
      const rowData = def.columnas.map((col) => {
        const raw = fila[col.id];
        if (col.isNumeric) {
          return formatearImporteEstandar(raw);
        }
        return raw !== undefined && raw !== null ? String(raw) : '';
      });
      bodyRows.push(rowData);
    });

    // 3. Fila de TOTALES del grupo
    const totalRow = def.columnas.map((col, idx) => {
      if (idx === 0) {
        return 'TOTALES:';
      }
      if (col.isNumeric && col.sumar) {
        return formatearImporteEstandar(grupo.totalesGrupo[col.id]);
      }
      return '';
    });

    bodyRows.push(
      totalRow.map((cellText, idx) => ({
        content: cellText,
        styles: {
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          halign: def.columnas[idx].align || 'right',
          lineWidth: { top: 0.2, bottom: 0.2, left: 0, right: 0 },
          lineColor: [0, 0, 0],
          cellPadding: { top: 1.5, bottom: 2, left: 1, right: 1 }
        }
      }))
    );
  });

  // Fila TOTAL GENERAL final
  const finalTotalRow = def.columnas.map((col, idx) => {
    if (idx === 0) {
      return 'TOTAL GENERAL:';
    }
    if (col.isNumeric && col.sumar) {
      return formatearImporteEstandar(def.totalesGenerales[col.id]);
    }
    return '';
  });

  bodyRows.push(
    finalTotalRow.map((cellText, idx) => ({
      content: cellText,
      styles: {
        fontStyle: 'bold',
        textColor: [0, 0, 0],
        halign: def.columnas[idx].align || 'right',
        lineWidth: { top: 0.3, bottom: 0.6, left: 0, right: 0 },
        lineColor: [0, 0, 0],
        cellPadding: { top: 2, bottom: 2.5, left: 1, right: 1 }
      }
    }))
  );

  // Configuración de anchos y alineación por columna
  const columnStyles: Record<number, any> = {};
  def.columnas.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || 'left',
      cellWidth: col.cellWidthPdf || 'auto'
    };
  });

  autoTable(doc, {
    head: headRows,
    body: bodyRows,
    startY: marginTop,
    margin: { top: marginTop, bottom: marginBottom, left: marginX, right: marginX },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 5.5,
      cellPadding: 0.7,
      textColor: [0, 0, 0],
      overflow: 'ellipsize',
      valign: 'middle'
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 5.5,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineWidth: 0.15,
      lineColor: [0, 0, 0]
    },
    columnStyles,
    didDrawPage: (data) => {
      // 1. Membrete Superior Izquierdo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(def.empresa.razonSocial.toUpperCase(), marginX, 8);

      doc.setFontSize(6.5);
      doc.text(`PERIODO ${def.empresa.periodo}`, marginX, 12);
      doc.text(def.empresa.direccion, marginX, 15.5);
      doc.text(`R.U.C.: ${def.empresa.ruc}`, marginX, 19);

      // 2. Título Central entre asteriscos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const tituloAsteriscos = `*** ${def.titulo.toUpperCase()} ***`;
      doc.text(tituloAsteriscos, pageWidth / 2, 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`(${def.moneda.toUpperCase()})`, pageWidth / 2, 16.5, { align: 'center' });

      // 3. Fecha y Hora de Impresión a la derecha (solo si está activada)
      if (def.mostrarFechaHoraImpresion) {
        const fechaHora = `Emitido: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;
        doc.setFontSize(6);
        doc.text(fechaHora, pageWidth - marginX, 8, { align: 'right' });
      }

      // 4. Pie de Página Centrado: "Pag. N"
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Pag. ${data.pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  });

  const nombreArchivo = `${def.titulo.replace(/\s+/g, '_')}_${def.empresa.ruc}_${def.empresa.periodo.replace(/[^0-9]/g, '')}.pdf`;
  doc.save(nombreArchivo);
}

/**
 * Exporta el reporte a hoja de cálculo en formato Tab-Separated Values (TSV / .xls) con UTF-8 BOM:
 * - Conserva exactamente las mismas columnas, agrupaciones y filas de totales
 * - Sin colores de fondo ni estilos invasivos
 * - Se abre en una hoja de cálculo con columnas y cifras numéricas intactas
 */
export function exportarReporteEstandarHojaCalculo(def: EstandarReportDefinition): void {
  const lineas: string[] = [];

  // Encabezado Superior
  lineas.push(`${def.empresa.razonSocial.toUpperCase()}\t\t\t*** ${def.titulo.toUpperCase()} ***`);
  lineas.push(`PERIODO ${def.empresa.periodo}\t\t\t(${def.moneda.toUpperCase()})`);
  lineas.push(`${def.empresa.direccion}`);
  lineas.push(`R.U.C.: ${def.empresa.ruc}`);
  if (def.mostrarFechaHoraImpresion) {
    lineas.push(`FECHA EMISIÓN: ${new Date().toLocaleString('es-PE')}`);
  }
  lineas.push(''); // Línea en blanco separadora

  // Super-headers si existen
  if (def.superHeaders && def.superHeaders.length > 0) {
    const shRow: string[] = [];
    def.superHeaders.forEach((sh) => {
      shRow.push(sh.label);
      for (let i = 1; i < sh.colSpan; i++) {
        shRow.push('');
      }
    });
    lineas.push(shRow.join('\t'));
  }

  // Fila de Columnas
  lineas.push(def.columnas.map((c) => c.label).join('\t'));

  // Grupos y Filas
  def.grupos.forEach((grupo) => {
    lineas.push(`>>> ${grupo.tituloGrupo}`);

    grupo.filas.forEach((fila) => {
      const row = def.columnas.map((col) => {
        const val = fila[col.id];
        if (col.isNumeric) {
          const num = typeof val === 'number' ? val : parseFloat(val) || 0;
          return num.toFixed(2);
        }
        return val !== undefined && val !== null ? String(val).replace(/\t/g, ' ') : '';
      });
      lineas.push(row.join('\t'));
    });

    // Fila TOTALES del grupo
    const totalRow = def.columnas.map((col, idx) => {
      if (idx === 0) return 'TOTALES:';
      if (col.isNumeric && col.sumar) {
        return (grupo.totalesGrupo[col.id] || 0).toFixed(2);
      }
      return '';
    });
    lineas.push(totalRow.join('\t'));
    lineas.push(''); // Separador visual de grupo
  });

  // TOTAL GENERAL final
  const finalRow = def.columnas.map((col, idx) => {
    if (idx === 0) return 'TOTAL GENERAL:';
    if (col.isNumeric && col.sumar) {
      return (def.totalesGenerales[col.id] || 0).toFixed(2);
    }
    return '';
  });
  lineas.push(finalRow.join('\t'));

  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${def.titulo.replace(/\s+/g, '_')}_${def.empresa.ruc}_${def.empresa.periodo.replace(/[^0-9]/g, '')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
