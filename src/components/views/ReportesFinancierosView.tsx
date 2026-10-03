import React, { useState } from 'react';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet, 
  Table, 
  Building, 
  TrendingUp 
} from 'lucide-react';
import { AsientoContable, EmpresaCliente } from '../../types';
import { HojaTrabajo10ColumnasView } from './HojaTrabajo10ColumnasView';

interface ReportesFinancierosViewProps {
  asientos: AsientoContable[];
  empresa: EmpresaCliente;
  periodo: string;
  onAbrirMayor?: (codigoCuenta: string) => void;
}

export const ReportesFinancierosView: React.FC<ReportesFinancierosViewProps> = ({
  asientos,
  empresa,
  periodo,
  onAbrirMayor
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'HOJA_TRABAJO' | 'BALANCE_GENERAL' | 'ESTADO_RESULTADOS'>('HOJA_TRABAJO');

  return (
    <div className="space-y-4">
      {/* Selector de Pestañas de Reportes */}
      <div className="flex border-b border-slate-200 gap-2 text-xs">
        <button
          onClick={() => setActiveReportTab('HOJA_TRABAJO')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
            activeReportTab === 'HOJA_TRABAJO'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          Hoja de Trabajo 10 Columnas (SISCONT)
        </button>
        <button
          onClick={() => setActiveReportTab('BALANCE_GENERAL')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
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
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
            activeReportTab === 'ESTADO_RESULTADOS'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Estado de Resultados Integrales
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeReportTab === 'HOJA_TRABAJO' && (
        <HojaTrabajo10ColumnasView
          asientos={asientos}
          empresa={empresa}
          periodo={periodo}
          onAbrirMayor={onAbrirMayor}
        />
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
