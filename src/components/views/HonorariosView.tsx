import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sparkles,
  Calculator,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { ReciboHonorario, EmpresaCliente } from '../../types';
import { 
  useHonorarios, 
  useRegistrarHonorario, 
  useAnularHonorario 
} from '../../hooks/useTesoreriaPlanilla';
import { useAnexosList } from '../../hooks/useOperaciones';

interface HonorariosViewProps {
  honorarios?: ReciboHonorario[];
  empresa?: EmpresaCliente;
  periodo?: string;
  onAddHonorario?: (honorario: ReciboHonorario) => void;
  onGenerarAsientoHonorario?: (honorario: ReciboHonorario) => void;
}

export const HonorariosView: React.FC<HonorariosViewProps> = ({
  empresa = { id: '00000000-0000-0000-0000-000000000001', razonSocial: 'Empresa Principal' } as any,
  periodo = '2026-09',
  honorarios: legacyHonorarios = [],
  onAddHonorario,
  onGenerarAsientoHonorario
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const { data: apiHonorarios = [], isLoading } = useHonorarios(empresa.id);
  const { data: anexos = [] } = useAnexosList(empresa.id);

  // Mutations
  const regHonorarioMutation = useRegistrarHonorario(empresa.id);
  const anularMutation = useAnularHonorario(empresa.id);

  // Form states
  const [serie, setSerie] = useState('E001');
  const [numero, setNumero] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [profesionOcupacion, setProfesionOcupacion] = useState('');
  const [fechaEmision, setFechaEmision] = useState(`${periodo}-15`);
  const [fechaPago, setFechaPago] = useState(`${periodo}-20`);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [cuentaGasto, setCuentaGasto] = useState('6321');
  const [glosa, setGlosa] = useState('');

  // Suspensión de 4ta
  const [suspensionCuarta, setSuspensionCuarta] = useState(false);
  const [numResolucion, setNumResolucion] = useState('');

  // Parámetro vigente para cálculo en vivo
  const tasaRetencionParam = 0.08;
  const topeRetencionParam = 1500.00;

  // Cálculo en vivo
  const retencionCalculada = !suspensionCuarta && montoTotal > topeRetencionParam
    ? Number((montoTotal * tasaRetencionParam).toFixed(2))
    : 0;
  const netoPagar = Number((montoTotal - retencionCalculada).toFixed(2));

  const items = apiHonorarios.length > 0 ? apiHonorarios : legacyHonorarios.map(h => ({
    id: h.id,
    serie: h.numeroRecibo.split('-')[0] || 'E001',
    numero: h.numeroRecibo.split('-')[1] || '01',
    proveedorId: 'prv-legacy',
    proveedorNombre: h.razonSocialEmisor,
    proveedorRuc: h.rucEmisor,
    fechaEmision: h.fechaEmision,
    fechaPago: h.fechaPago,
    moneda: 'PEN' as const,
    tipoCambio: 1.0,
    importeBruto: h.montoTotalHonorario,
    aplicaRetencion: h.sujetoARetencionRenta,
    tasaRetencion: 8.00,
    retencion: h.retencionMonto,
    netoPagar: h.netoCobrado,
    suspensionCuarta: false,
    cuentaGasto: h.cuentaGasto,
    glosa: h.glosa,
    estado: 'REGISTRADO' as const,
    version: 1,
    origenParametroTasa: 'Parámetro vigente: 8% (Tope S/ 1,500.00)'
  }));

  const filtered = items.filter(h => 
    (h.proveedorNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.proveedorRuc || '').includes(searchTerm) ||
    `${h.serie}-${h.numero}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBruto = filtered.reduce((a, b) => a + (b.estado !== 'ANULADO' ? b.importeBruto : 0), 0);
  const totalRetenciones = filtered.reduce((a, b) => a + (b.estado !== 'ANULADO' ? b.retencion : 0), 0);
  const totalNeto = filtered.reduce((a, b) => a + (b.estado !== 'ANULADO' ? b.netoPagar : 0), 0);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serie || !numero || !proveedorId || montoTotal <= 0) return;

    const proveedor = anexos.find((a: any) => a.id === proveedorId);

    try {
      await regHonorarioMutation.mutateAsync({
        periodoId: `per-${periodo}`,
        proveedorId,
        proveedorNombre: proveedor?.razonSocial || 'Profesional Independiente',
        proveedorRuc: proveedor?.numeroDocumento || '10000000001',
        serie,
        numero,
        fechaEmision,
        fechaPago,
        moneda: 'PEN',
        tipoCambio: 1.0,
        importeBruto: montoTotal,
        cuentaGasto,
        glosa: glosa || `Honorario profesional según ${serie}-${numero}`,
        suspensionCuarta,
        numeroResolucionSuspension: suspensionCuarta ? numResolucion : undefined,
        vigenciaSuspensionDesde: suspensionCuarta ? `${periodo.substring(0, 4)}-01-01` : undefined,
        vigenciaSuspensionHasta: suspensionCuarta ? `${periodo.substring(0, 4)}-12-31` : undefined
      });

      setIsModalOpen(false);
      setNumero('');
      setMontoTotal(0);
      setGlosa('');
      setSuspensionCuarta(false);
      setNumResolucion('');
    } catch (err: any) {
      alert('Error registrando recibo: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleAnular = async (id: string) => {
    const motivo = prompt('Ingrese el motivo de anulación del recibo por honorarios:');
    if (!motivo) return;
    try {
      await anularMutation.mutateAsync({ id, motivo });
    } catch (err: any) {
      alert('Error anulando recibo: ' + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Recibos por Honorarios Electrónicos (Rentas de 4ta Categoría)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro con retención calculada paramétricamente y control de suspensión de retenciones SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-amber-600" />
            Parámetro vigente: <strong>8% (Tope S/ 1,500.00)</strong>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Recibo por Honorarios
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total Honorarios Brutos</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            S/ {totalBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">{filtered.length} comprobantes</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Retención 4ta Categoría (8%)</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            S/ {totalRetenciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Cuenta contable 40172</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total Neto por Pagar</span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            S/ {totalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Genera CxP en cartera</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por RUC, prestador o serie-número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Período: <strong className="text-slate-800">{periodo}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Recibo</th>
                <th className="p-3">Emisión</th>
                <th className="p-3">RUC</th>
                <th className="p-3">Prestador / Glosa</th>
                <th className="p-3">Suspensión</th>
                <th className="p-3 text-right">Total Bruto</th>
                <th className="p-3 text-right">Retención (8%)</th>
                <th className="p-3 text-right">Neto a Pagar</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No hay recibos por honorarios registrados para este período.
                  </td>
                </tr>
              ) : (
                filtered.map(h => {
                  const isAnulado = h.estado === 'ANULADO';
                  return (
                    <tr key={h.id} className={isAnulado ? 'bg-rose-50/40 text-slate-400 line-through' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono font-bold text-blue-900">{h.serie}-{h.numero}</td>
                      <td className="p-3 font-mono">{h.fechaEmision}</td>
                      <td className="p-3 font-mono">{h.proveedorRuc || '-'}</td>
                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{h.proveedorNombre}</div>
                        <div className="text-[11px] text-slate-500 truncate">{h.glosa}</div>
                      </td>
                      <td className="p-3">
                        {h.suspensionCuarta ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" /> Acreditada
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        S/ {h.importeBruto.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-600 font-bold">
                        {h.retencion > 0 ? `S/ ${h.retencion.toFixed(2)}` : 'S/ 0.00'}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-black">
                        S/ {h.netoPagar.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.estado === 'REGISTRADO' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {h.estado}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!isAnulado && (
                          <button
                            onClick={() => handleAnular(h.id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] underline cursor-pointer"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR RECIBO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Nuevo Recibo por Honorarios (4ta Categoría)
            </h3>

            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Serie</label>
                  <input
                    type="text"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono uppercase text-slate-800"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Número Correlativo</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ej: 145"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Prestador del Servicio (Anexo)</label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                  required
                >
                  <option value="">Seleccione al profesional...</option>
                  {anexos.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.numeroDocumento} - {a.razonSocial}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Fecha Emisión</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Fecha Pago Prevista</label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Importe Total Bruto (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoTotal || ''}
                  onChange={(e) => setMontoTotal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono font-bold text-slate-800 text-base"
                  required
                />
              </div>

              {/* Toggle Suspensión de 4ta */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suspensionCuarta}
                    onChange={(e) => setSuspensionCuarta(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Acredita Resolución de Suspensión de Retenciones SUNAT
                  </span>
                </label>

                {suspensionCuarta && (
                  <div>
                    <label className="text-[11px] text-slate-600 block">N° Resolución de Intendencia / Autorización</label>
                    <input
                      type="text"
                      value={numResolucion}
                      onChange={(e) => setNumResolucion(e.target.value)}
                      placeholder="Ej: 0091827361"
                      className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-0.5 font-mono text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Panel de Liquidación en Vivo */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Importe Bruto:</span>
                  <span className="font-bold">S/ {montoTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Retención 4ta (8% si &gt; S/ 1,500):</span>
                  <span className="font-bold">- S/ {retencionCalculada.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-black border-t border-blue-200 pt-1">
                  <span>Neto por Pagar:</span>
                  <span>S/ {netoPagar.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Glosa / Descripción del Servicio</label>
                <input
                  type="text"
                  value={glosa}
                  onChange={(e) => setGlosa(e.target.value)}
                  placeholder="Ej: Asesoría contable y tributaria del mes"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={regHonorarioMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {regHonorarioMutation.isPending ? 'Contabilizando...' : 'Registrar y Contabilizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
