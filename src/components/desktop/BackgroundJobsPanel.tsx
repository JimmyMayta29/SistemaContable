import React from 'react';
import { Layers, CheckCircle2, Clock, AlertCircle, X, RefreshCw } from 'lucide-react';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';

interface BackgroundJobsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackgroundJobsPanel: React.FC<BackgroundJobsPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { trabajosSegundoPlano, eliminarTrabajoSegundoPlano } = useEmpresaPeriodo();

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-16 z-50 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-xs text-slate-800">
            Trabajos en Segundo Plano ({trabajosSegundoPlano.length})
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {trabajosSegundoPlano.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No hay procesos en ejecución en este momento.
          </div>
        ) : (
          trabajosSegundoPlano.map((job) => (
            <div key={job.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition text-xs space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    {job.descripcion}
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-100 inline-block mt-0.5">
                    {job.empresaNombre}
                  </span>
                </div>
                <button
                  onClick={() => eliminarTrabajoSegundoPlano(job.id)}
                  className="text-slate-300 hover:text-slate-500 cursor-pointer"
                  title="Eliminar de la lista"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      job.estado === 'COMPLETADO'
                        ? 'bg-emerald-500'
                        : job.estado === 'ERROR'
                        ? 'bg-red-500'
                        : 'bg-blue-600 animate-pulse'
                    }`}
                    style={{ width: `${job.progreso}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    {job.estado === 'COMPLETADO' && (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Completado
                      </span>
                    )}
                    {job.estado === 'EN_PROCESO' && (
                      <span className="text-blue-600 flex items-center gap-0.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Procesando ({job.progreso}%)
                      </span>
                    )}
                    {job.estado === 'ERROR' && (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </span>
                  <span>{job.iniciadoEn}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
        Los procesos continúan aunque cambie de empresa en el estudio
      </div>
    </div>
  );
};
