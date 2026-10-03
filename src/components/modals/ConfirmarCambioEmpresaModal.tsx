import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';

export const ConfirmarCambioEmpresaModal: React.FC = () => {
  const { 
    empresaPendienteCambio, 
    setEmpresaPendienteCambio, 
    entrarAEmpresa, 
    setIsFormDirty, 
    empresaActiva 
  } = useEmpresaPeriodo();

  if (!empresaPendienteCambio) return null;

  const handleConfirmarDescarte = () => {
    setIsFormDirty(false);
    const destino = empresaPendienteCambio;
    setEmpresaPendienteCambio(null);
    entrarAEmpresa(destino, true);
  };

  const handleCancelar = () => {
    setEmpresaPendienteCambio(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                ¿Cambiar de Empresa?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tiene cambios no guardados en el formulario actual
              </p>
            </div>
          </div>
          <button 
            onClick={handleCancelar}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1.5">
          <p>
            Está a punto de salir de <strong>{empresaActiva?.razonSocial || 'la empresa actual'}</strong> para ingresar a <strong>{empresaPendienteCambio.razonSocial}</strong>.
          </p>
          <p className="text-amber-800 font-medium">
            Si continúa, cualquier información sin guardar en los comprobantes, asientos o formularios se perderá irreversiblemente debido al aislamiento estricto de caché.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={handleCancelar}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
          >
            Permanecer en {empresaActiva?.razonSocial.split(' ')[0] || 'Empresa'}
          </button>
          <button
            onClick={handleConfirmarDescarte}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            Descartar Cambios y Cambiar
          </button>
        </div>
      </div>
    </div>
  );
};
