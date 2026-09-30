import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Settings, 
  Eye,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { EmpresaCliente, Comprobante, AsientoContable, ReciboHonorario } from '../../types';
import { 
  exportarRegistroComprasPdf, 
  exportarRegistroVentasPdf, 
  exportarLibroDiarioPdf 
} from '../../services/pdfExportService';

export type TipoReportePdf = 'COMPRAS' | 'VENTAS' | 'DIARIO' | 'HONORARIOS';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaCliente;
  periodo: string;
  tipoReporteInicial?: TipoReportePdf;
  compras: Comprobante[];
  ventas: Comprobante[];
  asientos: AsientoContable[];
  honorarios?: ReciboHonorario[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  empresa,
  periodo,
  tipoReporteInicial = 'COMPRAS',
  compras,
  ventas,
  asientos,
  honorarios = []
}) => {
  const [tipoReporte, setTipoReporte] = useState<TipoReportePdf>(tipoReporteInicial);
  const [incluirLogo, setIncluirLogo] = useState(true);
  const [incluirFirmas, setIncluirFirmas] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDescargarPdf = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        if (tipoReporte === 'COMPRAS') {
          exportarRegistroComprasPdf(empresa, compras, periodo);
        } else if (tipoReporte === 'VENTAS') {
          exportarRegistroVentasPdf(empresa, ventas, periodo);
        } else if (tipoReporte === 'DIARIO') {
          exportarLibroDiarioPdf(empresa, asientos, periodo);
        } else if (tipoReporte === 'HONORARIOS') {
          // Si es honorarios, exportar como libro diario filtrado o vista
          exportarLibroDiarioPdf(
            empresa, 
            asientos.filter(a => a.subdiario === '06'), 
            periodo
          );
        }
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } catch (err) {
        console.error('Error generando PDF:', err);
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  };

  const getTituloReporte = () => {
    switch (tipoReporte) {
      case 'COMPRAS':
        return 'REGISTRO DE COMPRAS ELECTRÓNICO (RCE SIRE 8.4)';
      case 'VENTAS':
        return 'REGISTRO DE VENTAS E INGRESOS (RVIE SIRE 14.4)';
      case 'DIARIO':
        return 'LIBRO DIARIO OFICIAL (FORMATO SUNAT 5.1)';
      case 'HONORARIOS':
        return 'REGISTRO DE HONORARIOS PROFESIONALES (4TA CATEGORÍA)';
    }
  };

  const getConteoItems = () => {
    switch (tipoReporte) {
      case 'COMPRAS': return `${compras.length} comprobantes de compras`;
      case 'VENTAS': return `${ventas.length} comprobantes de ventas`;
      case 'DIARIO': return `${asientos.length} asientos contables registrados`;
      case 'HONORARIOS': return `${honorarios.length} recibos por honorarios`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug">
                Exportador Oficial de Reportes a PDF con Membrete Legal
              </h3>
              <p className="text-xs text-slate-300">
                Genera archivos PDF con estándares oficiales de SUNAT, logotipo corporativo y cuadro de firmas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Controls & Live Preview */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Options & Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Reporte Contable a Exportar:
              </label>
              <select
                value={tipoReporte}
                onChange={(e) => setTipoReporte(e.target.value as TipoReportePdf)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold cursor-pointer"
              >
                <option value="COMPRAS">Registro de Compras (RCE 8.4)</option>
                <option value="VENTAS">Registro de Ventas (RVIE 14.4)</option>
                <option value="DIARIO">Libro Diario Oficial (5.1)</option>
                <option value="HONORARIOS">Honorarios Profesionales (4ta)</option>
              </select>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">{getConteoItems()}</div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Configuración del Membrete:
              </label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={incluirLogo}
                    onChange={(e) => setIncluirLogo(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Incluir Logo / Isotipo Corporativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={incluirFirmas}
                    onChange={(e) => setIncluirFirmas(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Incluir Recuadro de Firmas Oficiales</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Datos de la Empresa Emisora:
              </label>
              <div className="bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
                <div className="font-bold text-slate-900 truncate">{empresa.razonSocial}</div>
                <div className="text-slate-500 font-mono">RUC: {empresa.ruc}</div>
                <div className="text-slate-500 font-mono">Periodo: {periodo}</div>
              </div>
            </div>
          </div>

          {/* Document Preview Box (Simulación exacta de la hoja A4) */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm font-sans text-xs">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Previsualización del Membrete Legal & Documento A4:
              </span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                {tipoReporte === 'DIARIO' ? 'Orientación Vertical (Portrait)' : 'Orientación Horizontal (Landscape)'}
              </span>
            </div>

            {/* Document Header with Logo and Letterhead */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                {incluirLogo && (
                  <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {empresa.razonSocial.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 uppercase">
                    {empresa.razonSocial}
                  </h4>
                  <div className="text-slate-600 text-xs mt-0.5">
                    <strong>RUC:</strong> {empresa.ruc} &nbsp;|&nbsp; <strong>Régimen:</strong> {empresa.regimenTributario.replace('_', ' ')}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    <strong>Dirección Fiscal:</strong> {empresa.direccionFiscal || 'LIMA, PERÚ'}
                  </div>
                </div>
              </div>

              {/* Top Right Box */}
              <div className="text-right font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                <div className="text-blue-900 font-bold">PERIODO: {periodo}</div>
                <div className="text-slate-500 text-[10px]">MONEDA: SOLES (PEN)</div>
                <div className="text-slate-400 text-[10px]">EMISIÓN: {new Date().toLocaleDateString('es-PE')}</div>
              </div>
            </div>

            {/* Book Title Banner */}
            <div className="py-3 text-center">
              <h3 className="font-black text-slate-900 tracking-wide text-sm uppercase">
                {getTituloReporte()}
              </h3>
              <p className="text-[11px] text-slate-500">
                Libro Oficial de Contabilidad Electrónica validado según Resoluciones de SUNAT
              </p>
            </div>

            {/* Table Mock Sample */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-1 text-[11px]">
              <div className="bg-slate-900 text-white p-2 font-bold grid grid-cols-6 text-center text-[10px]">
                <span>FECHA</span>
                <span>TIPO / SERIE</span>
                <span className="col-span-2 text-left">DESCRIPCIÓN / GLOSA</span>
                <span className="text-right">BASE IMP.</span>
                <span className="text-right">TOTAL</span>
              </div>
              <div className="p-3 text-center text-slate-500 bg-slate-50/50 italic text-xs">
                Se incluirán los registros completos ({getConteoItems()}) con numeración correlativa y sumas del Debe/Haber o Totales de Facturación con doble línea contable al pie de la tabla.
              </div>
            </div>

            {/* Legal Signatures Preview */}
            {incluirFirmas && (
              <div className="grid grid-cols-2 gap-12 pt-8 mt-6 border-t border-dashed border-slate-200 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-bold text-slate-800 text-[11px]">
                    CONTADOR PÚBLICO
                  </div>
                  <div className="text-slate-500 text-[10px]">Matrícula C.P.C. N° 48192</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-bold text-slate-800 text-[11px]">
                    REPRESENTANTE LEGAL
                  </div>
                  <div className="text-slate-500 text-[10px]">RUC N° {empresa.ruc}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {exportSuccess && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ¡Archivo PDF generado y descargado con éxito!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={handleDescargarPdf}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              {isExporting ? (
                <>Generando PDF...</>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Descargar Documento PDF Oficial
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
