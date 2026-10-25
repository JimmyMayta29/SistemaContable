import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  Eye, 
  Sliders,
  Check,
  RotateCcw
} from 'lucide-react';
import { 
  SiscontReportDefinition, 
  exportarReporteSiscontPdf, 
  exportarReporteSiscontExcel,
  formatearImporteSiscont 
} from '../../services/reports/siscontFormatEngine';
import { useReportStyle } from '../../context/ReportStyleContext';

interface VisorReporteSiscontModalProps {
  isOpen: boolean;
  onClose: () => void;
  definicion: SiscontReportDefinition;
  onExportarLegacyPdf?: () => void;
}

export const VisorReporteSiscontModal: React.FC<VisorReporteSiscontModalProps> = ({
  isOpen,
  onClose,
  definicion,
  onExportarLegacyPdf
}) => {
  const { 
    reportStyle, 
    setReportStyle, 
    mostrarFechaHoraImpresion, 
    setMostrarFechaHoraImpresion 
  } = useReportStyle();

  const [formatoDescarga, setFormatoDescarga] = useState<'PDF' | 'EXCEL'>('PDF');
  const [dropdownDescargaOpen, setDropdownDescargaOpen] = useState(false);

  if (!isOpen) return null;

  const handleDescargar = () => {
    const defActualizada: SiscontReportDefinition = {
      ...definicion,
      mostrarFechaHoraImpresion
    };

    if (reportStyle === 'actual' && onExportarLegacyPdf) {
      onExportarLegacyPdf();
      return;
    }

    if (formatoDescarga === 'PDF') {
      exportarReporteSiscontPdf(defActualizada);
    } else {
      exportarReporteSiscontExcel(defActualizada);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] max-h-[96vh] flex flex-col border border-slate-300 overflow-hidden">
        {/* Barra Superior de Control (No imprimible) */}
        <div className="print:hidden flex flex-wrap items-center justify-between p-3.5 bg-slate-100 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-black text-white px-2 py-0.5 rounded">
              SISCONT FORMAT
            </span>
            <span className="text-xs font-bold text-slate-800 truncate max-w-md">
              {definicion.titulo} — {definicion.empresa.razonSocial}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Conmutador REPORT_STYLE */}
            <div className="flex items-center bg-white rounded-xl border border-slate-300 p-0.5 text-xs font-semibold shadow-xs">
              <span className="px-2 text-[11px] text-slate-500 font-bold uppercase">Formato:</span>
              <button
                onClick={() => setReportStyle('siscont')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-bold ${
                  reportStyle === 'siscont'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SISCONT (B/N)
              </button>
              <button
                onClick={() => setReportStyle('actual')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-bold ${
                  reportStyle === 'actual'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Actual (Color)
              </button>
            </div>

            {/* Checkbox Fecha y Hora */}
            <label className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarFechaHoraImpresion}
                onChange={(e) => setMostrarFechaHoraImpresion(e.target.checked)}
                className="rounded text-black focus:ring-black"
              />
              <span className="text-[11px]">Fecha/Hora</span>
            </label>

            {/* Botón Imprimir Nativo */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Imprimir (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            {/* Botón Único de Descarga con Selector de Formato */}
            <div className="relative inline-block text-left">
              <div className="inline-flex rounded-xl shadow-xs">
                <button
                  onClick={handleDescargar}
                  className="px-3.5 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-l-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar {formatoDescarga}</span>
                </button>
                <button
                  onClick={() => setDropdownDescargaOpen(!dropdownDescargaOpen)}
                  className="px-2 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-r-xl border-l border-slate-700 transition cursor-pointer"
                  title="Cambiar formato de descarga"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {dropdownDescargaOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 text-xs">
                  <button
                    onClick={() => {
                      setFormatoDescarga('PDF');
                      setDropdownDescargaOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      formatoDescarga === 'PDF' ? 'font-bold text-black' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-600" /> Documento PDF (.pdf)
                    </span>
                    {formatoDescarga === 'PDF' && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>

                  <button
                    onClick={() => {
                      setFormatoDescarga('EXCEL');
                      setDropdownDescargaOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      formatoDescarga === 'EXCEL' ? 'font-bold text-black' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Hoja Excel (.xls)
                    </span>
                    {formatoDescarga === 'EXCEL' && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                </div>
              )}
            </div>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja Imprimible en Formato SISCONT Estricto (A4 Landscape / #000 sobre blanco) */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-200 print:bg-white print:p-0 print:m-0 flex justify-center">
          <div className="bg-white text-black w-full shadow-lg print:shadow-none p-6 sm:p-8 border border-slate-300 print:border-none font-sans font-light text-[10px] leading-tight select-text">
            
            {/* 1. Encabezado Oficial SISCONT */}
            <div className="flex justify-between items-start mb-3 pb-2 border-b border-black">
              {/* Izquierda */}
              <div className="space-y-0.5 text-left">
                <div className="font-normal text-xs text-black tracking-tight">
                  {definicion.empresa.razonSocial.toUpperCase()}
                </div>
                <div className="text-[10px]">
                  PERIODO {definicion.empresa.periodo}
                </div>
                <div className="text-[9px] text-slate-700">
                  {definicion.empresa.direccion}
                </div>
                <div className="text-[10px]">
                  R.U.C.: <span className="font-mono">{definicion.empresa.ruc}</span>
                </div>
              </div>

              {/* Centro */}
              <div className="text-center space-y-0.5">
                <h1 className="font-bold text-xs tracking-wider text-black">
                  *** {definicion.titulo.toUpperCase()} ***
                </h1>
                <div className="text-[10px] font-normal">
                  ({definicion.moneda.toUpperCase()})
                </div>
              </div>

              {/* Derecha (Fecha y hora opcional) */}
              <div className="text-right text-[9px] text-slate-600 space-y-0.5 min-w-[120px]">
                {mostrarFechaHoraImpresion && (
                  <div>
                    Emitido: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE')}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Tabla Tabular SISCONT */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse font-light text-[9px] font-sans">
                {/* Cabecera enmarcada repetible en cada página física */}
                <thead className="border-t-2 border-b-2 border-black">
                  {/* Super Headers */}
                  {definicion.superHeaders && definicion.superHeaders.length > 0 && (
                    <tr className="border-b border-black font-normal text-center">
                      {definicion.superHeaders.map((sh, idx) => (
                        <th
                          key={idx}
                          colSpan={sh.colSpan}
                          className="p-1 border-r border-black last:border-r-0 font-normal"
                        >
                          {sh.label}
                        </th>
                      ))}
                    </tr>
                  )}

                  {/* Fila de Columnas */}
                  <tr className="font-normal">
                    {definicion.columnas.map((col) => (
                      <th
                        key={col.id}
                        className={`p-1 border-r border-black last:border-r-0 font-normal ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Cuerpo de la tabla */}
                <tbody>
                  {definicion.grupos.map((grupo) => (
                    <React.Fragment key={grupo.grupoId}>
                      {/* Subtítulo de Grupo */}
                      <tr className="border-t border-black/40">
                        <td
                          colSpan={definicion.columnas.length}
                          className="pt-2 pb-1 font-bold text-black text-left"
                        >
                          {grupo.tituloGrupo}
                        </td>
                      </tr>

                      {/* Filas de datos del grupo (sin bordes entre filas) */}
                      {grupo.filas.map((fila, fIdx) => (
                        <tr key={fIdx} className="hover:bg-slate-50 print:hover:bg-white transition">
                          {definicion.columnas.map((col) => {
                            const val = fila[col.id];
                            return (
                              <td
                                key={col.id}
                                className={`px-1 py-0.5 whitespace-nowrap ${
                                  col.align === 'right'
                                    ? 'text-right font-mono'
                                    : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                                }`}
                              >
                                {col.isNumeric ? formatearImporteSiscont(val) : (val ?? '')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Fila TOTALES del grupo con línea fina */}
                      <tr className="border-t border-b border-black font-bold">
                        {definicion.columnas.map((col, cIdx) => {
                          if (cIdx === 0) {
                            return (
                              <td key={col.id} className="px-1 py-1 text-left font-bold">
                                TOTALES:
                              </td>
                            );
                          }
                          if (col.isNumeric && col.sumar) {
                            return (
                              <td key={col.id} className="px-1 py-1 text-right font-mono font-bold">
                                {formatearImporteSiscont(grupo.totalesGrupo[col.id])}
                              </td>
                            );
                          }
                          return <td key={col.id} className="px-1 py-1" />;
                        })}
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* Fila TOTAL GENERAL final con doble subrayado */}
                  <tr className="border-t border-black border-b-4 border-double border-black font-bold text-[9.5px]">
                    {definicion.columnas.map((col, cIdx) => {
                      if (cIdx === 0) {
                        return (
                          <td key={col.id} className="px-1 py-1.5 text-left font-bold">
                            TOTAL GENERAL:
                          </td>
                        );
                      }
                      if (col.isNumeric && col.sumar) {
                        return (
                          <td key={col.id} className="px-1 py-1.5 text-right font-mono font-bold">
                            {formatearImporteSiscont(definicion.totalesGenerales[col.id])}
                          </td>
                        );
                      }
                      return <td key={col.id} className="px-1 py-1.5" />;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Pie de Página Centrado SISCONT */}
            <div className="mt-6 text-center text-[9px] text-black">
              Pag. 1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
