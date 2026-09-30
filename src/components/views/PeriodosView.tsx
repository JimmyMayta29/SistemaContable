import React, { useState } from 'react';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { usePeriodosList, useCerrarPeriodo, useReabrirPeriodo } from '../../hooks/useAsientos';

interface PeriodosViewProps {
  empresaId: string;
}

export const PeriodosView: React.FC<PeriodosViewProps> = ({ empresaId }) => {
  const [anio, setAnio] = useState<number>(2026);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [periodoAReabrirId, setPeriodoAReabrirId] = useState<string | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState('');

  const { data: periodos = [], isLoading, refetch } = usePeriodosList(empresaId, anio);
  const cerrarMutation = useCerrarPeriodo(empresaId);
  const reabrirMutation = useReabrirPeriodo(empresaId);

  const handleCerrar = async (periodoId: string) => {
    if (!confirm('¿Está seguro de cerrar este período contable? Se validará que no existan borradores pendientes y que el balance cuadre.')) {
      return;
    }
    try {
      await cerrarMutation.mutateAsync(periodoId);
      refetch();
    } catch (err: any) {
      alert(`Error al cerrar período: ${err.message}`);
    }
  };

  const handleConfirmarReabrir = async () => {
    if (!periodoAReabrirId) return;
    try {
      await reabrirMutation.mutateAsync({
        periodoId: periodoAReabrirId,
        motivo: motivoReapertura
      });
      setIsReabrirModalOpen(false);
      setPeriodoAReabrirId(null);
      setMotivoReapertura('');
      refetch();
    } catch (err: any) {
      alert(`Error al reabrir período: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Control de Períodos Contables & Cierres Mensuales
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de estados de período (Abierto / Cerrado). Un período cerrado bloquea modificaciones, compras, ventas y asientos para resguardar la fe pública.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700"
          >
            <option value={2026}>Ejercicio Fiscal 2026</option>
            <option value={2025}>Ejercicio Fiscal 2025</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notice Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong>Regla de Integridad Fiscal:</strong> Al cerrar un período mensual, el sistema valida automáticamente que no queden asientos en estado <em>BORRADOR</em> y que las sumas del mayor cuadren exactamente. La reapertura está restringida al Administrador del Estudio y queda registrada en auditoría inmutable.
        </div>
      </div>

      {/* Period Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Período</th>
              <th className="py-3 px-4">Mes / Denominación</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4">Fecha de Cierre</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {periodos.map((p: any) => {
              const nombresMeses = ['Apertura', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Cierre'];
              const nombreMes = nombresMeses[p.mes] || `Mes ${p.mes}`;
              const isCerrado = p.estado === 'CERRADO';

              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {p.codigoPeriodo}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {nombreMes}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isCerrado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <Lock className="w-3 h-3" /> Cerrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <Unlock className="w-3 h-3" /> Abierto
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {p.fechaCierre ? p.fechaCierre.split('T')[0] : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isCerrado ? (
                      <button
                        onClick={() => {
                          setPeriodoAReabrirId(p.id);
                          setIsReabrirModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] transition cursor-pointer"
                      >
                        Reabrir Período
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCerrar(p.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                      >
                        Cerrar Período
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Reapertura de Período */}
      {isReabrirModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <Unlock className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Reapertura de Período Contable</h3>
            </div>
            <p className="text-xs text-slate-600">
              Esta acción requiere permisos de Administrador y será registrada en el libro de auditoría inmutable indicando usuario, fecha, IP y motivo.
            </p>
            <div>
              <label className="font-semibold text-slate-700 text-xs block mb-1">
                Justificación / Motivo de Reapertura (Mínimo 10 caracteres)
              </label>
              <textarea
                value={motivoReapertura}
                onChange={(e) => setMotivoReapertura(e.target.value)}
                placeholder="Indique detalladamente por qué se reabre el período..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReabrirModalOpen(false);
                  setPeriodoAReabrirId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReabrir}
                disabled={motivoReapertura.trim().length < 10}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold transition"
              >
                Autorizar Reapertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
