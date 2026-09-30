import React, { useState } from 'react';
import { 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  CreditCard,
  Building,
  DollarSign,
  Upload,
  RefreshCw,
  AlertCircle,
  FileText,
  Lock,
  XCircle,
  ArrowRightLeft
} from 'lucide-react';
import { MovimientoCajaBanco } from '../../types';
import { 
  useCuentasFinancieras, 
  useMovimientosTesoreria, 
  useRegistrarMovimientoTesoreria,
  useAnularMovimientoTesoreria,
  useConciliacionBancaria,
  useImportarExtracto,
  useConciliarPartida,
  useDesconciliarPartida,
  useCerrarConciliacion
} from '../../hooks/useTesoreriaPlanilla';
import { useCuentasPorCobrar, useCuentasPorPagar, useAnexosList } from '../../hooks/useOperaciones';

interface CajaBancosViewProps {
  empresaId?: string;
  periodo?: string;
  movimientos?: MovimientoCajaBanco[];
  onAddMovimiento?: (mov: MovimientoCajaBanco) => void;
}

export const CajaBancosView: React.FC<CajaBancosViewProps> = ({
  empresaId = '00000000-0000-0000-0000-000000000001',
  periodo = '2026-09',
  movimientos = [],
  onAddMovimiento
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'movimientos' | 'conciliacion'>('movimientos');
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalExtractoOpen, setIsModalExtractoOpen] = useState(false);

  // Queries
  const { data: cuentas = [], isLoading: loadingCuentas } = useCuentasFinancieras(empresaId);
  const ctaActiva = cuentas.find(c => c.id === cuentaSeleccionadaId) || cuentas[0];

  const { data: movsData, isLoading: loadingMovs } = useMovimientosTesoreria(empresaId, {
    cuentaFinancieraId: ctaActiva?.id,
    tipo: filtroTipo !== 'TODOS' ? filtroTipo : undefined
  });

  const { data: cxcList = [] } = useCuentasPorCobrar(empresaId);
  const { data: cxpList = [] } = useCuentasPorPagar(empresaId);
  const { data: anexos = [] } = useAnexosList(empresaId);

  // Mutations
  const regMovMutation = useRegistrarMovimientoTesoreria(empresaId);
  const anularMovMutation = useAnularMovimientoTesoreria(empresaId);
  const importarExtractoMutation = useImportarExtracto(empresaId);
  const conciliarMutation = useConciliarPartida(empresaId);
  const desconciliarMutation = useDesconciliarPartida(empresaId);
  const cerrarConcilMutation = useCerrarConciliacion(empresaId);

  // Conciliación Query
  const { data: conciliacionData, refetch: refetchConciliacion } = useConciliacionBancaria(
    empresaId,
    ctaActiva?.id || '',
    `per-${periodo}`,
    `${periodo}-30`
  );

  // Form Movimiento State
  const [formTipo, setFormTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [formFecha, setFormFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMonto, setFormMonto] = useState<number>(0);
  const [formGlosa, setFormGlosa] = useState<string>('');
  const [formOperacion, setFormOperacion] = useState<string>('');
  const [formAnexoId, setFormAnexoId] = useState<string>('');
  const [docSeleccionadoId, setDocSeleccionadoId] = useState<string>('');
  const [montoAplicar, setMontoAplicar] = useState<number>(0);

  // Form Extracto State
  const [extractoCsvTexto, setExtractoCsvTexto] = useState<string>('');
  const [nombreArchivoExtracto, setNombreArchivoExtracto] = useState<string>('extracto_banco.csv');

  // Documentos pendientes filtrados por anexo seleccionado
  const docsDisponibles = formTipo === 'INGRESO'
    ? cxcList.filter((d: any) => d.estado !== 'CANCELADO' && (!formAnexoId || d.clienteId === formAnexoId))
    : cxpList.filter((d: any) => d.estado !== 'CANCELADO' && (!formAnexoId || d.proveedorId === formAnexoId));

  const itemsMovimientos = movsData?.items || [];

  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctaActiva || formMonto <= 0 || !formGlosa) return;

    try {
      const aplicaciones = docSeleccionadoId && montoAplicar > 0
        ? [{ documentoId: docSeleccionadoId, importeAplicado: Math.min(montoAplicar, formMonto) }]
        : undefined;

      await regMovMutation.mutateAsync({
        periodoId: `per-${periodo}`,
        cuentaFinancieraId: ctaActiva.id,
        fecha: formFecha,
        tipo: formTipo,
        medioPago: '003',
        numeroOperacion: formOperacion || `OP-${Date.now().toString().slice(-6)}`,
        anexoId: formAnexoId || undefined,
        importe: formMonto,
        glosa: formGlosa,
        aplicaciones
      });

      setIsModalOpen(false);
      setFormMonto(0);
      setFormGlosa('');
      setFormOperacion('');
      setDocSeleccionadoId('');
      setMontoAplicar(0);
    } catch (err: any) {
      alert('Error registrando movimiento: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleAnular = async (id: string) => {
    const motivo = prompt('Ingrese el motivo de anulación del movimiento de tesorería:');
    if (!motivo) return;
    try {
      await anularMovMutation.mutateAsync({ id, motivo });
    } catch (err: any) {
      alert('Error anulando movimiento: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleImportarExtracto = async () => {
    if (!ctaActiva) return;
    try {
      // Parsear líneas CSV de ejemplo o pegadas (Fecha, Descripción, Referencia, Monto, Saldo)
      const filas = extractoCsvTexto.trim().split('\n');
      const lineas: any[] = [];

      for (const fila of filas) {
        const partes = fila.split(',').map(s => s.trim());
        if (partes.length >= 4) {
          lineas.push({
            fecha: partes[0],
            descripcion: partes[1],
            referencia: partes[2],
            monto: parseFloat(partes[3]),
            saldo: partes[4] ? parseFloat(partes[4]) : undefined
          });
        }
      }

      if (lineas.length === 0) {
        // Cargar lote demostrativo si el campo estaba vacío
        lineas.push(
          { fecha: `${periodo}-05`, descripcion: 'TRANSF BANCARIA COBRO', referencia: 'OP-10291', monto: 3500.00, saldo: 53500.00 },
          { fecha: `${periodo}-12`, descripcion: 'PAGO PROVEEDOR SERVICIOS', referencia: 'TRANS-8891', monto: -1200.00, saldo: 52300.00 },
          { fecha: `${periodo}-18`, descripcion: 'ABONO CLIENTE MAYORISTA', referencia: 'DEP-9988', monto: 4500.00, saldo: 56800.00 },
          { fecha: `${periodo}-25`, descripcion: 'CARGO MANTENIMIENTO CTA', referencia: 'COM-001', monto: -45.00, saldo: 56755.00 }
        );
      }

      await importarExtractoMutation.mutateAsync({
        cuentaFinancieraId: ctaActiva.id,
        nombreArchivo: nombreArchivoExtracto,
        lineas
      });

      setIsModalExtractoOpen(false);
      setExtractoCsvTexto('');
      refetchConciliacion();
      alert('Extracto bancario importado exitosamente.');
    } catch (err: any) {
      alert('Error importando extracto: ' + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Account Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Tesorería, Caja y Bancos (Libro 1.1 y 1.2)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de cuentas financieras, movimientos bancarizados, conciliación y flujo de efectivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tabs switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveSubTab('movimientos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'movimientos' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Movimientos en Libros
            </button>
            <button
              onClick={() => setActiveSubTab('conciliacion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeSubTab === 'conciliacion' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Conciliación Bancaria
            </button>
          </div>

          {activeSubTab === 'movimientos' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Movimiento
            </button>
          )}

          {activeSubTab === 'conciliacion' && (
            <button
              onClick={() => setIsModalExtractoOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar Extracto Bancario
            </button>
          )}
        </div>
      </div>

      {/* Account Cards Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cuentas.map(c => {
          const isSelected = ctaActiva?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setCuentaSeleccionadaId(c.id)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  {c.banco} ({c.moneda})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  Cta {c.cuentaContableCodigo}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-2 font-mono">
                {c.moneda === 'USD' ? '$' : 'S/'} {c.saldoActual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate font-mono">
                N° {c.numero}
              </div>
            </div>
          );
        })}
      </div>

      {/* SUB-TAB 1: MOVIMIENTOS */}
      {activeSubTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filtro de Tipo:</span>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white text-slate-800"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="INGRESO">Ingresos (+)</option>
                <option value="EGRESO">Egresos (-)</option>
                <option value="DEPOSITO_DETRACCION">Depósito Detracción SPOT</option>
                <option value="COMISION">Comisiones Bancarias</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Cuenta activa: <strong className="text-slate-800">{ctaActiva?.banco} - {ctaActiva?.numero}</strong>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">N° Operación</th>
                  <th className="p-3">Glosa / Concepto</th>
                  <th className="p-3 text-right">Importe</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Conciliado</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                {itemsMovimientos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No hay movimientos registrados para esta cuenta financiera en el período.
                    </td>
                  </tr>
                ) : (
                  itemsMovimientos.map(m => {
                    const isIngreso = m.tipo === 'INGRESO';
                    const isAnulado = m.estado === 'ANULADO';
                    return (
                      <tr key={m.id} className={isAnulado ? 'bg-rose-50/40 text-slate-400 line-through' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono">{m.fecha}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIngreso ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{m.numeroOperacion || '-'}</td>
                        <td className="p-3 max-w-xs truncate">{m.glosa}</td>
                        <td className={`p-3 text-right font-mono font-bold ${isIngreso ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isIngreso ? '+' : '-'} {m.moneda === 'USD' ? '$' : 'S/'} {m.importe.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.estado === 'REGISTRADO' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {m.estado}
                          </span>
                        </td>
                        <td className="p-3">
                          {m.conciliado ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Conciliado
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px]">En tránsito</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isAnulado && (
                            <button
                              onClick={() => handleAnular(m.id)}
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
      )}

      {/* SUB-TAB 2: CONCILIACIÓN BANCARIA */}
      {activeSubTab === 'conciliacion' && (
        <div className="space-y-6">
          {/* Summary Box */}
          {conciliacionData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">1. Saldo Según Libros</span>
                <div className="text-lg font-black text-slate-900 font-mono mt-1">
                  S/ {conciliacionData.resumen.saldoSegunLibros.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">2. Saldo Según Banco</span>
                <div className="text-lg font-black text-blue-700 font-mono mt-1">
                  S/ {conciliacionData.resumen.saldoSegunBanco.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">3. Partidas en Tránsito</span>
                <div className="text-lg font-black text-amber-600 font-mono mt-1">
                  S/ {conciliacionData.resumen.partidasEnTransito.toFixed(2)}
                </div>
              </div>
              <div className={`p-4 rounded-2xl border shadow-xs ${
                conciliacionData.resumen.cuadrado ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <span className="text-xs font-semibold text-slate-600">Diferencia de Cuadre</span>
                <div className={`text-lg font-black font-mono mt-1 ${
                  conciliacionData.resumen.cuadrado ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  S/ {conciliacionData.resumen.diferencia.toFixed(2)}
                </div>
                <div className="text-[10px] font-bold mt-0.5">
                  {conciliacionData.resumen.cuadrado ? '✅ CONCILIACIÓN CUADRADA' : '⚠️ EXISTE DIFERENCIA'}
                </div>
              </div>
            </div>
          )}

          {/* Coincidencias Sugeridas */}
          {conciliacionData?.coincidenciasSugeridas && conciliacionData.coincidenciasSugeridas.length > 0 && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                Coincidencias Automáticas Sugeridas ({conciliacionData.coincidenciasSugeridas.length})
              </h3>
              <div className="space-y-2">
                {conciliacionData.coincidenciasSugeridas.map((cs, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-purple-100 text-xs">
                    <span className="text-purple-900 font-medium">{cs.motivo}</span>
                    <button
                      onClick={async () => {
                        await conciliarMutation.mutateAsync({ extractoLineaId: cs.lineaExtractoId, movimientoId: cs.movimientoId });
                        refetchConciliacion();
                      }}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer"
                    >
                      Aceptar y Conciliar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Comparison View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extracto Bancario */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-100 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>Extracto Bancario (Importado)</span>
                <span className="text-[10px] text-slate-500">
                  {conciliacionData?.extractoLineas?.length || 0} líneas
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {conciliacionData?.extractoLineas?.map(l => (
                  <div key={l.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-mono text-[11px] text-slate-500">{l.fecha} | Ref: {l.referencia || '-'}</div>
                      <div className="font-medium text-slate-800">{l.descripcion}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${l.monto >= 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                        S/ {l.monto.toFixed(2)}
                      </div>
                      <span className={`text-[10px] font-bold ${l.conciliada ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {l.conciliada ? 'Conciliada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Libros de la Empresa */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-100 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>Libros de Tesorería (Registrados)</span>
                <span className="text-[10px] text-slate-500">
                  {conciliacionData?.movimientosLibros?.length || 0} movimientos
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {conciliacionData?.movimientosLibros?.map(m => (
                  <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-mono text-[11px] text-slate-500">{m.fecha} | Op: {m.numeroOperacion || '-'}</div>
                      <div className="font-medium text-slate-800 truncate max-w-xs">{m.glosa}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {m.tipo === 'INGRESO' ? '+' : '-'} S/ {m.importe.toFixed(2)}
                      </div>
                      <span className={`text-[10px] font-bold ${m.conciliado ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {m.conciliado ? 'Conciliado' : 'En tránsito'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO MOVIMIENTO CON APLICACIÓN A CARTERA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Registrar Movimiento de Tesorería
            </h3>

            <form onSubmit={handleCrearMovimiento} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Tipo de Movimiento</label>
                  <select
                    value={formTipo}
                    onChange={(e: any) => setFormTipo(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                  >
                    <option value="INGRESO">INGRESO (Cobro a Clientes)</option>
                    <option value="EGRESO">EGRESO (Pago a Proveedores)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Fecha Operación</label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Importe Total ({ctaActiva?.moneda})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">N° de Operación / Voucher</label>
                  <input
                    type="text"
                    value={formOperacion}
                    onChange={(e) => setFormOperacion(e.target.value)}
                    placeholder="Ej: OP-982182"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Selector de Anexo */}
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {formTipo === 'INGRESO' ? 'Cliente' : 'Proveedor'} (Anexo)
                </label>
                <select
                  value={formAnexoId}
                  onChange={(e) => {
                    setFormAnexoId(e.target.value);
                    setDocSeleccionadoId('');
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                >
                  <option value="">Seleccione o deje general...</option>
                  {anexos.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.numeroDocumento} - {a.razonSocial}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Documento de Cartera */}
              {docsDisponibles.length > 0 && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block">
                    Aplicar directamente a factura pendiente en cartera:
                  </span>
                  <select
                    value={docSeleccionadoId}
                    onChange={(e) => {
                      setDocSeleccionadoId(e.target.value);
                      const d = docsDisponibles.find((x: any) => x.id === e.target.value);
                      if (d) setMontoAplicar(Math.min(d.saldo, formMonto || d.saldo));
                    }}
                    className="w-full text-xs border border-blue-300 rounded-lg p-1.5 bg-white text-slate-800"
                  >
                    <option value="">-- No aplicar a documento (dejar como anticipo) --</option>
                    {docsDisponibles.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.serieNumero} (Saldo: S/ {d.saldo.toFixed(2)}) - Vence: {d.fechaVencimiento}
                      </option>
                    ))}
                  </select>

                  {docSeleccionadoId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-900 font-medium">Monto a aplicar:</span>
                      <input
                        type="number"
                        step="0.01"
                        max={formMonto}
                        value={montoAplicar || ''}
                        onChange={(e) => setMontoAplicar(parseFloat(e.target.value) || 0)}
                        className="w-32 text-xs border border-blue-300 rounded-lg p-1 font-mono font-bold bg-white text-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700">Glosa / Concepto Contable</label>
                <input
                  type="text"
                  value={formGlosa}
                  onChange={(e) => setFormGlosa(e.target.value)}
                  placeholder="Ej: Cobranza factura F001-209 en BCP Soles"
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
                  disabled={regMovMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {regMovMutation.isPending ? 'Contabilizando...' : 'Registrar y Contabilizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR EXTRACTO */}
      {isModalExtractoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Importar Extracto Bancario CSV
            </h3>
            <p className="text-xs text-slate-500">
              Pegue las líneas del extracto emitido por su banco (Fecha, Descripción, Referencia, Monto, Saldo) o use las filas de prueba por defecto.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700">Nombre del Archivo</label>
              <input
                type="text"
                value={nombreArchivoExtracto}
                onChange={(e) => setNombreArchivoExtracto(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Líneas CSV (opcional, deje vacío para demo)</label>
              <textarea
                value={extractoCsvTexto}
                onChange={(e) => setExtractoCsvTexto(e.target.value)}
                placeholder="2026-09-10, PAGO SERVICIOS, OP-99182, -450.00, 49550.00"
                rows={5}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalExtractoOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportarExtracto}
                disabled={importarExtractoMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {importarExtractoMutation.isPending ? 'Importando...' : 'Importar Extracto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
