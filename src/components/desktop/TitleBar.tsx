import React from 'react';
import { 
  Building2, 
  Calendar, 
  Database, 
  ShieldCheck, 
  ChevronDown, 
  Bell, 
  Sparkles,
  Search,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { EmpresaCliente } from '../../types';

interface TitleBarProps {
  empresaActiva: EmpresaCliente;
  empresas: EmpresaCliente[];
  periodo: string;
  onSelectEmpresa: (id: string) => void;
  onOpenConfig: () => void;
  onOpenCartera: () => void;
  onOpenPdfExport?: () => void;
  onOpenExeBuilder?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  empresaActiva,
  empresas,
  periodo,
  onSelectEmpresa,
  onOpenConfig,
  onOpenCartera,
  onOpenPdfExport
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 select-none z-40 text-xs shadow-xs">
      {/* Brand & Client Company Quick Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-sm">
            S
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 text-sm">
              SUNAConta <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">ERP CLOUD</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium -mt-0.5">
              Sistema Contable & Tributario SUNAT
            </div>
          </div>
        </div>

        {/* Company Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs hidden md:inline">Empresa Activa:</span>
          <div className="relative">
            <select
              value={empresaActiva.id}
              onChange={(e) => onSelectEmpresa(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer max-w-[280px] truncate"
            >
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razonSocial} ({emp.ruc})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenCartera}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] border border-blue-200 transition cursor-pointer"
            title="Ver cartera completa de empresas y calendario de vencimientos"
          >
            <Building2 className="w-3.5 h-3.5" />
            Cartera ({empresas.length})
          </button>
        </div>
      </div>

      {/* Center: Fiscal Period & SUNAT Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>Periodo: {periodo}</span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>SUNAT: MODO SIMULADO</span>
        </div>
      </div>

      {/* Right: Actions and PDF Export */}
      <div className="flex items-center gap-2">
        {onOpenPdfExport && (
          <button
            onClick={onOpenPdfExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer"
            title="Exportar reporte contable a PDF oficial con membrete y logo"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Exportar PDF</span>
          </button>
        )}
      </div>
    </header>
  );
};
