import React from 'react';
import { 
  FolderOpen, 
  Plus, 
  Upload, 
  FileSpreadsheet, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export interface ChecklistItem {
  titulo: string;
  cumplido: boolean;
  descripcion?: string;
}

export interface EmptyStateInstructivoProps {
  titulo: string;
  descripcion: string;
  moduloNombre: string;
  checklist?: ChecklistItem[];
  onRegistrarNuevo?: () => void;
  textoRegistrar?: string;
  onImportarCsv?: () => void;
  textoImportar?: string;
  onCargarPlantilla?: () => void;
  textoPlantilla?: string;
  onVerGuia?: () => void;
  icono?: React.ReactNode;
}

export const EmptyStateInstructivo: React.FC<EmptyStateInstructivoProps> = ({
  titulo,
  descripcion,
  moduloNombre,
  checklist = [],
  onRegistrarNuevo,
  textoRegistrar = 'Registrar Primera Operación',
  onImportarCsv,
  textoImportar = 'Importar desde Excel / CSV',
  onCargarPlantilla,
  textoPlantilla = 'Cargar desde Plantilla Oficial',
  onVerGuia,
  icono
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-8 text-center max-w-2xl mx-auto my-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
        {icono || <FolderOpen className="w-8 h-8" />}
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-2">
        <span>Módulo: {moduloNombre}</span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {titulo}
      </h3>
      <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
        {descripcion}
      </p>

      {/* Checklist de requisitos previos si existe */}
      {checklist.length > 0 && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-lg text-left">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Checklist de requisitos previos para {moduloNombre}
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    item.cumplido ? 'text-emerald-500' : 'text-slate-300'
                  }`} 
                />
                <div>
                  <span className={`font-medium ${item.cumplido ? 'text-slate-800 line-through' : 'text-slate-700'}`}>
                    {item.titulo}
                  </span>
                  {item.descripcion && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.descripcion}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botones de acción directa */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRegistrarNuevo && (
          <button
            type="button"
            onClick={onRegistrarNuevo}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{textoRegistrar}</span>
          </button>
        )}

        {onImportarCsv && (
          <button
            type="button"
            onClick={onImportarCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>{textoImportar}</span>
          </button>
        )}

        {onCargarPlantilla && (
          <button
            type="button"
            onClick={onCargarPlantilla}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>{textoPlantilla}</span>
          </button>
        )}

        {onVerGuia && (
          <button
            type="button"
            onClick={onVerGuia}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guía Rápida</span>
          </button>
        )}
      </div>
    </div>
  );
};
