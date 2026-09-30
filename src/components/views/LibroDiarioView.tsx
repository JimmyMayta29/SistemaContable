import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Printer, 
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { AsientoContable, EmpresaCliente } from '../../types';
import { exportarLibroDiarioPdf } from '../../services/pdfExportService';

interface LibroDiarioViewProps {
  asientos: AsientoContable[];
  empresa: EmpresaCliente;
  periodo: string;
  onGenerarAsientosMasivos: () => void;
}

export const LibroDiarioView: React.FC<LibroDiarioViewProps> = ({
  asientos,
  empresa,
  periodo,
  onGenerarAsientosMasivos
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'COMPRA' | 'VENTA' | 'DESTINO'>('TODOS');

  const filtered = asientos.filter(a => {
    const matchesSearch = 
      a.glosaGeneral.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.numeroAsiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.comprobanteReferencia && a.comprobanteReferencia.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (tipoFiltro !== 'TODOS' && a.tipoOperacion !== tipoFiltro) return false;
    return true;
  });

  const totalDebeGeneral = asientos.reduce((acc, a) => acc + a.totalDebe, 0);
  const totalHaberGeneral = asientos.reduce((acc, a) => acc + a.totalHaber, 0);
  const estaBalanceado = Math.abs(totalDebeGeneral - totalHaberGeneral) < 0.1;

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Libro Diario (Contabilidad Interna PCGE)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generación automática de asientos de compra, provisión de gastos, destinos a almacén/función y ventas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarLibroDiarioPdf(empresa, filtered, periodo)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Exportar Libro Diario a PDF con membrete legal de la empresa"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Exportar PDF (5.1)
          </button>
          <button
            onClick={onGenerarAsientosMasivos}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Regenerar Asientos
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimir Diario
          </button>
        </div>
      </div>

      {/* Balance Indicator Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-xs ${
        estaBalanceado 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-center gap-2">
          {estaBalanceado ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span className="font-bold text-sm font-sans">
            {estaBalanceado ? 'Partida Doble Cuadrada (Debe = Haber)' : 'Advertencia: Descuadre en el Libro Diario'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span>Total Debe: <strong>S/ {totalDebeGeneral.toFixed(2)}</strong></span>
          <span>Total Haber: <strong>S/ {totalHaberGeneral.toFixed(2)}</strong></span>
          <span className="font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-900">
            Diferencia: S/ {(totalDebeGeneral - totalHaberGeneral).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por glosa, nro asiento o comprobante..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-pointer"
          >
            <option value="TODOS">Todos los tipos de asiento</option>
            <option value="COMPRA">Solo Compras (60 / 63 / 65)</option>
            <option value="VENTA">Solo Ventas (70)</option>
          </select>
          <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
            {filtered.length} asientos
          </span>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filtered.map((asiento) => (
          <div 
            key={asiento.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Header of Entry */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-blue-700 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  {asiento.numeroAsiento}
                </span>
                <span className="font-mono text-slate-500">Fecha: {asiento.fecha}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-900 font-bold">{asiento.glosaGeneral}</span>
              </div>

              <div className="flex items-center gap-3">
                {asiento.comprobanteReferencia && (
                  <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Doc: {asiento.comprobanteReferencia}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  {asiento.tipoOperacion}
                </span>
              </div>
            </div>

            {/* Table of Accounts */}
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-white text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 w-28">Cuenta PCGE</th>
                  <th className="py-2.5 px-4">Denominación de la Cuenta</th>
                  <th className="py-2.5 px-4">Glosa Específica</th>
                  <th className="py-2.5 px-4 text-right w-28">Debe (S/)</th>
                  <th className="py-2.5 px-4 text-right w-28">Haber (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {asiento.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 font-mono font-bold text-blue-700">
                      {item.codigoCuenta}
                    </td>
                    <td className="py-2 px-4 font-semibold text-slate-900">
                      {item.denominacionCuenta}
                    </td>
                    <td className="py-2 px-4 text-slate-500 text-[11px]">
                      {item.glosa}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {item.debe > 0 ? item.debe.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {item.haber > 0 ? item.haber.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-mono font-bold text-xs border-t border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={3} className="py-2.5 px-4 text-right uppercase text-slate-500 text-[10px] font-sans">
                    Totales del Asiento:
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    S/ {asiento.totalDebe.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    S/ {asiento.totalHaber.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};
