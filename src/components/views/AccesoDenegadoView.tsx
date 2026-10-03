import React from 'react';
import { ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';

export const AccesoDenegadoView: React.FC = () => {
  const { salirAEmpresas, accesoDenegadoEmpresaId, despejarAccesoDenegado, usuario } = useEmpresaPeriodo();

  const handleVolver = () => {
    despejarAccesoDenegado();
    salirAEmpresas(true);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-lg w-full text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200 inline-block font-mono">
            HTTP 403 FORBIDDEN — ACCESO DENEGADO
          </span>
          <h2 className="text-xl font-extrabold text-slate-900">
            No tiene permisos para esta empresa
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Su usuario (<strong>{usuario.email}</strong>) no cuenta con una membresía activa asignada en la tabla <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">usuario_empresa</code> para el identificador <code className="font-mono text-red-700 font-bold">{accesoDenegadoEmpresaId}</code>.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-1.5 text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            Políticas de Aislamiento Multiempresa (Fase 7B):
          </div>
          <p className="text-[11px]">
            El servidor valida en cada petición y navegación que el usuario pertenezca a la empresa activa. Cualquier acceso forzado por URL es bloqueado de inmediato.
          </p>
        </div>

        <button
          onClick={handleVolver}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mis Empresas (Cartera)</span>
        </button>
      </div>
    </div>
  );
};
