import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Globe, 
  Eye, 
  Database,
  FileCode2
} from 'lucide-react';
import { useAuditoriaList } from '../../hooks/useAsientos';

interface AuditoriaViewProps {
  empresaId: string;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({ empresaId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const { data: registros = [], isLoading, refetch } = useAuditoriaList(empresaId);

  const filtrados = registros.filter((r: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.tablaAfectada.toLowerCase().includes(term) ||
      r.accion.toLowerCase().includes(term) ||
      (r.usuarioEmail && r.usuarioEmail.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Libro de Auditoría Inmutable & Seguridad
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trazabilidad rigurosa: registro de quién, cuándo, qué tabla, registro, acción, IP y comparación de datos previos y nuevos.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar Eventos
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por tabla, acción o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="text-xs text-slate-500">
          Registros mostrados: <strong className="text-slate-900">{filtrados.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Tabla Afectada</th>
              <th className="py-3 px-3 text-center">Acción</th>
              <th className="py-3 px-3 font-mono">IP Origen</th>
              <th className="py-3 px-4 text-center">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Cargando eventos de auditoría...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No hay registros de auditoría que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filtrados.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {r.createdAt ? r.createdAt.replace('T', ' ').substring(0, 19) : '—'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {r.usuarioEmail || 'admin@sunaconta.pe'}
                  </td>
                  <td className="py-3 px-4 font-mono text-blue-900 font-bold">
                    {r.tablaAfectada}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.accion === 'INSERT' ? 'bg-emerald-100 text-emerald-800' :
                      r.accion === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      r.accion === 'ANULAR' ? 'bg-rose-100 text-rose-800' :
                      r.accion === 'CIERRE_PERIODO' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {r.accion}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {r.direccionIp || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedRecord(r)}
                      className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      title="Ver comparación de datos"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detalle JSON */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-blue-600" />
                Auditoría: {selectedRecord.tablaAfectada} ({selectedRecord.accion})
              </h3>
              <span className="font-mono text-xs text-slate-500">{selectedRecord.createdAt}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Datos Previos:</span>
                <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] overflow-auto max-h-56">
                  {selectedRecord.datosAnteriores ? JSON.stringify(selectedRecord.datosAnteriores, null, 2) : '(Ninguno)'}
                </pre>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-1">Datos Nuevos:</span>
                <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] overflow-auto max-h-56">
                  {selectedRecord.datosNuevos ? JSON.stringify(selectedRecord.datosNuevos, null, 2) : '(Ninguno)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
