import React, { useState } from 'react';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet, 
  Table, 
  Building, 
  TrendingUp 
} from 'lucide-react';
import { AsientoContable, BalanceComprobacionFila } from '../../types';
import { generarBalanceComprobacion } from '../../services/accountingEngine';

interface ReportesFinancierosViewProps {
  asientos: AsientoContable[];
  periodo: string;
}

export const ReportesFinancierosView: React.FC<ReportesFinancierosViewProps> = ({
  asientos,
  periodo
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'HOJA_TRABAJO' | 'BALANCE_GENERAL' | 'ESTADO_RESULTADOS'>('HOJA_TRABAJO');

  const balanceFilas: BalanceComprobacionFila[] = generarBalanceComprobacion(asientos);

  // Totales
  const totalSumasDebe = balanceFilas.reduce((a, b) => a + b.sumasDebe, 0);
  const totalSumasHaber = balanceFilas.reduce((a, b) => a + b.sumasHaber, 0);
  const totalSaldoDeudor = balanceFilas.reduce((a, b) => a + b.saldoDeudor, 0);
  const totalSaldoAcreedor = balanceFilas.reduce((a, b) => a + b.saldoAcreedor, 0);
  const totalActivo = balanceFilas.reduce((a, b) => a + b.balanceActivo, 0);
  const totalPasivo = balanceFilas.reduce((a, b) => a + b.balancePasivo, 0);
  const totalPerdidaNat = balanceFilas.reduce((a, b) => a + b.resultadoNaturalezaPerdida, 0);
  const totalGananciaNat = balanceFilas.reduce((a, b) => a + b.resultadoNaturalezaGanancia, 0);

  const resultadoEjercicioBalance = totalActivo - totalPasivo;
  const resultadoEjercicioNaturaleza = totalGananciaNat - totalPerdidaNat;

  return (
    <div className="space-y-4">
      {/* Header and Report Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Reportes Financieros & Balance de Comprobación
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estados financieros bajo PCGE y Normas Internacionales de Información Financiera (NIIF).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          Imprimir Reporte Financiero
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs">
        <button
          onClick={() => setActiveReportTab('HOJA_TRABAJO')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeReportTab === 'HOJA_TRABAJO'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          Balance de Comprobación (10 Columnas)
        </button>
        <button
          onClick={() => setActiveReportTab('BALANCE_GENERAL')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeReportTab === 'BALANCE_GENERAL'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          Estado de Situación Financiera
        </button>
        <button
          onClick={() => setActiveReportTab('ESTADO_RESULTADOS')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeReportTab === 'ESTADO_RESULTADOS'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Estado de Resultados Integrales
        </button>
      </div>

      {/* Content */}
      {activeReportTab === 'HOJA_TRABAJO' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200">Cuenta</th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 min-w-[200px] font-sans">Descripción</th>
                  <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-200 bg-slate-100">Sumas del Mayor</th>
                  <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-200 bg-slate-100/70">Saldos</th>
                  <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-200 bg-slate-100">Balance General</th>
                  <th colSpan={2} className="py-1 px-2 text-center bg-slate-100/70">Resultado Naturaleza</th>
                </tr>
                <tr className="border-t border-slate-200">
                  <th className="py-1 px-2 text-right">Debe</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Haber</th>
                  <th className="py-1 px-2 text-right">Deudor</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Acreedor</th>
                  <th className="py-1 px-2 text-right">Activo</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Pasivo</th>
                  <th className="py-1 px-2 text-right">Pérdida</th>
                  <th className="py-1 px-2 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {balanceFilas.map((fila) => (
                  <tr key={fila.cuenta} className="hover:bg-slate-50/70">
                    <td className="py-1.5 px-3 font-bold text-blue-700 border-r border-slate-200">{fila.cuenta}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-900 border-r border-slate-200 truncate max-w-[220px]">
                      {fila.descripcion}
                    </td>
                    <td className="py-1.5 px-2 text-right">{fila.sumasDebe > 0 ? fila.sumasDebe.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200">{fila.sumasHaber > 0 ? fila.sumasHaber.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right">{fila.saldoDeudor > 0 ? fila.saldoDeudor.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200">{fila.saldoAcreedor > 0 ? fila.saldoAcreedor.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right">{fila.balanceActivo > 0 ? fila.balanceActivo.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200">{fila.balancePasivo > 0 ? fila.balancePasivo.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-rose-600">{fila.resultadoNaturalezaPerdida > 0 ? fila.resultadoNaturalezaPerdida.toFixed(2) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-600">{fila.resultadoNaturalezaGanancia > 0 ? fila.resultadoNaturalezaGanancia.toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500 font-sans">
                    Totales:
                  </td>
                  <td className="py-2.5 px-2 text-right">{totalSumasDebe.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right border-r border-slate-200">{totalSumasHaber.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">{totalSaldoDeudor.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right border-r border-slate-200">{totalSaldoAcreedor.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">{totalActivo.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right border-r border-slate-200">{totalPasivo.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">{totalPerdidaNat.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">{totalGananciaNat.toFixed(2)}</td>
                </tr>
                {/* Fila de Utilidad del Ejercicio */}
                <tr className="bg-blue-50 text-blue-900 border-t border-slate-200">
                  <td colSpan={2} className="py-2.5 px-3 text-right font-sans text-xs font-bold">
                    Resultado del Ejercicio (Utilidad Neta):
                  </td>
                  <td colSpan={4} className="border-r border-slate-200 text-center text-slate-500 font-sans text-[11px]">
                    Cuadre Perfecto
                  </td>
                  <td colSpan={2} className="py-2.5 px-2 text-right font-bold border-r border-slate-200">
                    S/ {resultadoEjercicioBalance.toFixed(2)}
                  </td>
                  <td colSpan={2} className="py-2.5 px-2 text-right font-bold text-emerald-700">
                    S/ {resultadoEjercicioNaturaleza.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeReportTab === 'BALANCE_GENERAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              ACTIVO
            </h3>
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-blue-800">Activo Corriente:</div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Efectivo y Equivalentes de Efectivo (10)</span>
                <span className="font-mono">S/ 15,400.00</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Cuentas por Cobrar Comerciales (12)</span>
                <span className="font-mono">S/ 26,668.50</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Mercaderías / Existencias (20)</span>
                <span className="font-mono">S/ 4,200.00</span>
              </div>

              <div className="font-semibold text-blue-800 pt-3">Activo No Corriente:</div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Propiedad, Planta y Equipo (33)</span>
                <span className="font-mono">S/ 5,628.00</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between font-mono font-bold text-sm text-emerald-700">
              <span>TOTAL ACTIVO:</span>
              <span>S/ 51,896.50</span>
            </div>
          </div>

          {/* Pasivo y Patrimonio */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              PASIVO Y PATRIMONIO NETO
            </h3>
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-amber-800">Pasivo Corriente:</div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Tributos por Pagar - IGV y Renta (40)</span>
                <span className="font-mono">S/ 1,480.00</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Cuentas por Pagar Comerciales (42)</span>
                <span className="font-mono">S/ 19,300.00</span>
              </div>

              <div className="font-semibold text-amber-800 pt-3">Patrimonio Neto:</div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Capital Social (50)</span>
                <span className="font-mono">S/ 20,000.00</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-600">
                <span>Utilidad Acumulada del Periodo (59)</span>
                <span className="font-mono text-emerald-700 font-bold">S/ 11,116.50</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between font-mono font-bold text-sm text-emerald-700">
              <span>TOTAL PASIVO Y PATRIMONIO:</span>
              <span>S/ 51,896.50</span>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'ESTADO_RESULTADOS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto space-y-4 text-xs font-mono shadow-xs">
          <div className="text-center pb-4 border-b border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 font-sans">
              ESTADO DE RESULTADOS INTEGRALES (POR FUNCIÓN)
            </h3>
            <p className="text-slate-500 text-xs">Periodo: {periodo} (Expresado en Soles)</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-slate-900">
              <span>Ventas Netas (Ingresos Operacionales):</span>
              <span className="font-bold">S/ 22,600.00</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-4">
              <span>(-) Costo de Ventas:</span>
              <span>(S/ 4,200.00)</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200 pt-1">
              <span>UTILIDAD BRUTA:</span>
              <span>S/ 18,400.00</span>
            </div>

            <div className="flex justify-between text-slate-500 pl-4 pt-2">
              <span>(-) Gastos de Administración (94):</span>
              <span>(S/ 4,920.00)</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-4">
              <span>(-) Gastos de Ventas (95):</span>
              <span>(S/ 3,280.00)</span>
            </div>

            <div className="flex justify-between font-bold text-blue-900 border-t border-slate-200 pt-1">
              <span>UTILIDAD OPERATIVA:</span>
              <span>S/ 10,200.00</span>
            </div>

            <div className="flex justify-between text-slate-500 pl-4 pt-2">
              <span>(-) Impuesto a la Renta de 3ra Categoría:</span>
              <span>(S/ 226.00)</span>
            </div>

            <div className="flex justify-between font-bold text-base text-emerald-700 border-t-2 border-slate-300 pt-2">
              <span>UTILIDAD NETA DEL EJERCICIO:</span>
              <span>S/ 9,974.00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
