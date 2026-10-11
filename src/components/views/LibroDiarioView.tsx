import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Printer, 
  Sparkles,
  Layers,
  FileText,
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  Hash,
  ExternalLink
} from 'lucide-react';
import { AsientoContable, EmpresaCliente } from '../../types';
import { 
  calcularLibroDiarioSISCONT,
  exportarLibroDiarioExcel, 
  exportarLibroDiarioSISCONTPdf,
  LibroDiarioSISCONTReporte,
  OpcionesLibroDiarioSISCONT
} from '../../services/siscontReportsEngine';
import { useToast } from '../../context/ToastContext';
import { EmptyStateInstructivo } from '../common/EmptyStateInstructivo';

interface LibroDiarioViewProps {
  asientos: AsientoContable[];
  empresa: EmpresaCliente;
  periodo: string;
  onGenerarAsientosMasivos: () => void;
  onAbrirAsiento?: (asientoId: string) => void;
}

export const LibroDiarioView: React.FC<LibroDiarioViewProps> = ({
  asientos,
  empresa,
  periodo,
  onGenerarAsientosMasivos,
  onAbrirAsiento
}) => {
  const { info, success } = useToast();

  // Filtros y opciones
  const [searchTerm, setSearchTerm] = useState('');
  const [subdiarioFiltro, setSubdiarioFiltro] = useState<string>('TODOS');
  const [incluirCierre, setIncluirCierre] = useState<boolean>(true);
  const [ocultarGlosa, setOcultarGlosa] = useState<boolean>(false);
  const [formatoFecha, setFormatoFecha] = useState<'DD/MM/AAAA' | 'AAAA-MM-DD'>('DD/MM/AAAA');
  const [voucherDesde, setVoucherDesde] = useState<string>('');
  const [voucherHasta, setVoucherHasta] = useState<string>('');
  
  // Interruptores de exportación / impresión
  const [incluirFechaImpresion, setIncluirFechaImpresion] = useState<boolean>(true);
  const [incluirUsuario, setIncluirUsuario] = useState<boolean>(true);
  const [incluirNumeroPagina, setIncluirNumeroPagina] = useState<boolean>(true);
  const [saltoPaginaPorSubdiario, setSaltoPaginaPorSubdiario] = useState<boolean>(false);

  // Cálculo del reporte oficial SISCONT
  const reporte: LibroDiarioSISCONTReporte = useMemo(() => {
    return calcularLibroDiarioSISCONT(asientos, empresa, periodo, {
      incluirAjustesYCierre: incluirCierre,
      formatoFecha,
      voucherDesde: voucherDesde.trim() || undefined,
      voucherHasta: voucherHasta.trim() || undefined,
      ocultarGlosa,
      saltoPaginaSubdiario: saltoPaginaPorSubdiario
    });
  }, [asientos, empresa, periodo, incluirCierre, formatoFecha, voucherDesde, voucherHasta, ocultarGlosa, saltoPaginaPorSubdiario]);

  // Filtrado reactivo en pantalla por búsqueda o subdiario
  const subdiariosVisibles = useMemo(() => {
    let subs = reporte.subdiarios;
    if (subdiarioFiltro !== 'TODOS') {
      subs = subs.filter(s => s.codigo === subdiarioFiltro);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      subs = subs.map(s => ({
        ...s,
        vouchers: s.vouchers.filter(v => 
          v.numeroVoucher.toLowerCase().includes(q) ||
          v.cuo.toLowerCase().includes(q) ||
          v.glosa.toLowerCase().includes(q) ||
          v.lineas.some(l => l.codigoCuenta.includes(q) || l.nombreCuenta.toLowerCase().includes(q) || l.concepto.toLowerCase().includes(q))
        )
      })).filter(s => s.vouchers.length > 0);
    }
    return subs;
  }, [reporte, subdiarioFiltro, searchTerm]);

  const handleDescargarPle = () => {
    const blob = new Blob([reporte.ple51ContenidoTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = reporte.ple51NombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
    success(`Archivo oficial PLE 5.1 descargado: ${reporte.ple51NombreArchivo}`, 'PLE 5.1 Diario');
  };

  const handleExportPdf = () => {
    exportarLibroDiarioSISCONTPdf(reporte, {
      incluirFechaImpresion,
      incluirUsuario,
      incluirNumeroPagina,
      saltoPaginaPorSubdiario,
      usuarioNombre: 'Contador General'
    });
  };

  const handleExportExcel = () => {
    exportarLibroDiarioExcel(reporte, {
      incluirFechaImpresion,
      incluirUsuario,
      usuarioNombre: 'Contador General'
    });
  };

  const handleVoucherDoubleClick = (voucherNumero: string) => {
    if (onAbrirAsiento) {
      onAbrirAsiento(voucherNumero);
    } else {
      info(`Abriendo detalle del voucher/asiento ${voucherNumero}...`, 'Asiento Contable');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Encabezado Oficial Formato SISCONT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                FORMATO OFICIAL SISCONT (5.1)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                SUBDIARIO → N° VOUCHER → CUO → COMPROBANTE
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Libro Diario Oficial (Periodo {periodo})
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-mono">
              <span><strong>Empresa:</strong> {empresa.razonSocial}</span>
              <span>•</span>
              <span><strong>RUC:</strong> {empresa.ruc}</span>
              <span>•</span>
              <span><strong>Moneda:</strong> PEN (Soles)</span>
            </div>
          </div>

          {/* Botones de Acción Oficiales */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDescargarPle}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar archivo oficial TXT para el PLE 5.1 (Libro Diario)"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              PLE 5.1 (TXT)
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Exportar Libro Diario estructurado a Excel con totales"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel SISCONT
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Exportar a PDF oficial 5.1 con membrete legal"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF (5.1)
            </button>
            <button
              onClick={onGenerarAsientosMasivos}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Regenerar asientos automáticos de compras y ventas"
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              Regenerar
            </button>
          </div>
        </div>

        {/* 2. Barra de Filtros y Configuración de Presentación */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por glosa, CUO o voucher..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 placeholder-slate-400 text-xs"
            />
          </div>

          {/* Filtro Subdiario */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Subdiario:</span>
            <select
              value={subdiarioFiltro}
              onChange={(e) => setSubdiarioFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer font-mono text-xs"
            >
              <option value="TODOS">Todos los Subdiarios</option>
              {reporte.subdiarios.map(s => (
                <option key={s.codigo} value={s.codigo}>
                  {s.codigo}: {s.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Vouchers */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Vouchers:</span>
            <input
              type="text"
              value={voucherDesde}
              onChange={(e) => setVoucherDesde(e.target.value)}
              placeholder="Desde"
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-mono text-xs"
            />
            <span className="text-slate-400">-</span>
            <input
              type="text"
              value={voucherHasta}
              onChange={(e) => setVoucherHasta(e.target.value)}
              placeholder="Hasta"
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-mono text-xs"
            />
          </div>

          {/* Formato de Fecha */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Fecha:</span>
            <select
              value={formatoFecha}
              onChange={(e) => setFormatoFecha(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-mono text-xs"
            >
              <option value="DD/MM/AAAA">DD/MM/AAAA</option>
              <option value="AAAA-MM-DD">AAAA-MM-DD</option>
            </select>
          </div>

          {/* Opciones booleanas */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={incluirCierre}
                onChange={(e) => setIncluirCierre(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Incluir ajustes/cierre (00/09)</span>
            </label>

            <button
              onClick={() => setOcultarGlosa(!ocultarGlosa)}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              {ocultarGlosa ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{ocultarGlosa ? 'Mostrar glosa' : 'Ocultar glosa'}</span>
            </button>
          </div>
        </div>

        {/* Interruptores de Impresión */}
        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-600">Opciones de Impresión / PDF:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirFechaImpresion}
                onChange={(e) => setIncluirFechaImpresion(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Fecha y hora</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirUsuario}
                onChange={(e) => setIncluirUsuario(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Usuario</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirNumeroPagina}
                onChange={(e) => setIncluirNumeroPagina(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>N° de página</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saltoPaginaPorSubdiario}
                onChange={(e) => setSaltoPaginaPorSubdiario(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Salto de pág. por subdiario</span>
            </label>
          </div>

          <span className="font-mono text-slate-400">
            {reporte.totalVouchers} vouchers contabilizados
          </span>
        </div>
      </div>

      {/* 3. Banner de Cuadre General y Consistencia con Hoja de Trabajo */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-xs ${
        reporte.estaCuadrado
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-rose-50 border-rose-300 text-rose-900'
      }`}>
        <div className="flex items-center gap-2">
          {reporte.estaCuadrado ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-bold text-sm font-sans">
            {reporte.estaCuadrado 
              ? 'Libro Diario Cuadrado (Total Débito = Total Crédito) — Consistente con Hoja de Trabajo' 
              : 'Advertencia: Descuadre en el Libro Diario'}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span>Total Débito: <strong>S/ {reporte.totalGeneralDebito.toFixed(2)}</strong></span>
          <span>Total Crédito: <strong>S/ {reporte.totalGeneralCredito.toFixed(2)}</strong></span>
          <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
            Diferencia: S/ {reporte.diferenciaGeneral.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 4. Estructura Jerárquica del Libro Diario SISCONT */}
      {subdiariosVisibles.length === 0 && (
        <EmptyStateInstructivo
          moduloNombre="Libro Diario (Formato 5.1)"
          titulo="No existen asientos contabilizados en el Libro Diario"
          descripcion="El Libro Diario registra cronológicamente los asientos clasificados por subdiario (Apertura, Compras, Ventas, Cobranzas, Pagos, Planilla, Honorarios y Ajustes) cumpliendo partida doble estricta."
          checklist={[
            { titulo: 'Generación de Asiento de Apertura', cumplido: false, descripcion: 'Subdiario 00 con los saldos iniciales del balance de apertura' },
            { titulo: 'Contabilización de Compras y Ventas', cumplido: false, descripcion: 'Subdiarios 01 y 02 con destino automático de gasto y existencias' },
            { titulo: 'Verificación de Partida Doble', cumplido: true, descripcion: 'Total Débito debe ser igual al Total Crédito al céntimo' }
          ]}
          onRegistrarNuevo={onGenerarAsientosMasivos}
          textoRegistrar="Regenerar Asientos Automáticos"
        />
      )}

      <div className="space-y-6">
        {subdiariosVisibles.map((sub) => (
          <div 
            key={sub.codigo}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Encabezado del Subdiario */}
            <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md bg-blue-500 font-mono font-bold text-white text-[11px]">
                  SUBDIARIO {sub.codigo}
                </span>
                <span className="font-bold text-sm tracking-wide">
                  {sub.descripcion}
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  ({sub.vouchers.length} vouchers)
                </span>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <span>Débito: S/ {sub.totalDebitoSubdiario.toFixed(2)}</span>
                <span>Crédito: S/ {sub.totalCreditoSubdiario.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.cuadrado ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {sub.cuadrado ? 'CUADRADO' : 'DESCUADRADO'}
                </span>
              </div>
            </div>

            {/* Lista de Vouchers del Subdiario */}
            <div className="divide-y divide-slate-200">
              {sub.vouchers.map((voucher) => (
                <div 
                  key={voucher.numeroVoucher} 
                  className="p-4 space-y-2 hover:bg-slate-50/50 transition cursor-default"
                  onDoubleClick={() => handleVoucherDoubleClick(voucher.numeroVoucher)}
                  title="Doble clic para ver/editar asiento"
                >
                  {/* Encabezado del Voucher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        VOUCHER: {voucher.numeroVoucher}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        CUO: <strong>{voucher.cuo}</strong> (PLE 5.1)
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600 font-sans font-medium">
                        {voucher.glosa}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">Fecha: {voucher.fecha}</span>
                      <span className="text-slate-400 font-sans text-[10px]">
                        (Doble clic para abrir)
                      </span>
                    </div>
                  </div>

                  {/* Tabla de Líneas del Asiento */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead className="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 bg-white">
                        <tr>
                          <th className="py-1.5 px-3 w-24">Fecha</th>
                          <th className="py-1.5 px-3 w-28">Código PCGE</th>
                          <th className="py-1.5 px-3">Denominación de la Cuenta</th>
                          {!ocultarGlosa && <th className="py-1.5 px-3">Concepto (Glosa)</th>}
                          <th className="py-1.5 px-3 text-right w-28">Débito (S/)</th>
                          <th className="py-1.5 px-3 text-right w-28">Crédito (S/)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {voucher.lineas.map((linea) => (
                          <tr key={linea.linea} className="hover:bg-blue-50/30">
                            <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                              {linea.fechaEmision}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-blue-700">
                              {linea.codigoCuenta}
                            </td>
                            <td className="py-1.5 px-3 font-sans text-slate-900 font-medium">
                              {linea.nombreCuenta}
                            </td>
                            {!ocultarGlosa && (
                              <td className="py-1.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                                {linea.concepto}
                              </td>
                            )}
                            <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                              {linea.debito > 0 ? linea.debito.toFixed(2) : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                              {linea.credito > 0 ? linea.credito.toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Fila TOTAL COMPROBANTE */}
                      <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                        <tr>
                          <td colSpan={ocultarGlosa ? 3 : 4} className="py-1.5 px-3 text-right uppercase text-[10px] text-slate-500 font-sans">
                            TOTAL COMPROBANTE ({voucher.numeroVoucher}):
                          </td>
                          <td className="py-1.5 px-3 text-right text-emerald-800">
                            S/ {voucher.totalDebito.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-emerald-800">
                            S/ {voucher.totalCredito.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Fila TOTAL SUBDIARIO */}
            <div className="bg-slate-100 px-5 py-3 border-t-2 border-slate-300 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
              <span className="uppercase font-sans">
                TOTAL SUBDIARIO {sub.codigo} — {sub.descripcion}:
              </span>
              <div className="flex items-center gap-6">
                <span>Débito: <strong className="text-blue-900">S/ {sub.totalDebitoSubdiario.toFixed(2)}</strong></span>
                <span>Crédito: <strong className="text-blue-900">S/ {sub.totalCreditoSubdiario.toFixed(2)}</strong></span>
              </div>
            </div>
          </div>
        ))}

        {/* Fila TOTAL GENERAL DEL MES */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>
            <span className="text-xs text-slate-400 font-sans uppercase font-bold tracking-wider block">
              Cierre de Movimientos del Período {periodo}
            </span>
            <span className="text-base font-bold font-sans">
              TOTAL GENERAL DEL LIBRO DIARIO
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-sans">Total Débito:</span>
              <span className="text-emerald-400 font-bold text-base">S/ {reporte.totalGeneralDebito.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-sans">Total Crédito:</span>
              <span className="text-emerald-400 font-bold text-base">S/ {reporte.totalGeneralCredito.toFixed(2)}</span>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <span className="text-xs text-slate-400 block font-sans">Estado Cuadre:</span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${reporte.estaCuadrado ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {reporte.estaCuadrado ? 'PARTIDA DOBLE EXACTA' : 'DESCUADRADO'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
