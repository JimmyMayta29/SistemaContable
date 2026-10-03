import React, { useState } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  DollarSign,
  Calendar,
  Layers,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';
import { 
  useCuentasPorPagar, 
  useCuentasPorCobrar, 
  useAntiguedadSaldos, 
  useEstadoCuenta, 
  useAplicarPago, 
  useAplicarCobranza 
} from '../../hooks/useOperaciones';
import { operacionesApi } from '../../api/operacionesApi';
import { useToast } from '../../context/ToastContext';

interface CarteraSaldosViewProps {
  empresaId: string;
}

export const CarteraSaldosView: React.FC<CarteraSaldosViewProps> = ({ empresaId }) => {
  const { success, error } = useToast();
  const [tabTipo, setTabTipo] = useState<'CXP' | 'CXC'>('CXP');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaCorte, setFechaCorte] = useState(() => new Date().toISOString().substring(0, 10));

  // Modal Nota de Crédito / Débito
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [docSeleccionado, setDocSeleccionado] = useState<any | null>(null);
  const [tipoNota, setTipoNota] = useState<'07' | '08'>('07');
  const [serieNota, setSerieNota] = useState('FC01');
  const [numeroNota, setNumeroNota] = useState('0001');
  const [montoNota, setMontoNota] = useState<number>(0);
  const [motivoCodigo, setMotivoCodigo] = useState('01');
  const [motivoDesc, setMotivoDesc] = useState('Anulación o descuento sobre comprobante');

  // Modal Estado de Cuenta por Anexo
  const [anexoSeleccionadoId, setAnexoSeleccionadoId] = useState<string | null>(null);
  const [modalEstadoCuentaOpen, setModalEstadoCuentaOpen] = useState(false);

  // Modal Aplicar Cobro / Pago
  const [modalAplicarOpen, setModalAplicarOpen] = useState(false);
  const [docParaAplicar, setDocParaAplicar] = useState<any | null>(null);
  const [montoAplicar, setMontoAplicar] = useState<number>(0);
  const [fechaAplicacion, setFechaAplicacion] = useState(() => new Date().toISOString().substring(0, 10));
  const [referenciaBanco, setReferenciaBanco] = useState('TR-009281');

  // React Query hooks
  const { data: cxp = [], isLoading: loadCxp, refetch: refetchCxp } = useCuentasPorPagar(empresaId);
  const { data: cxc = [], isLoading: loadCxc, refetch: refetchCxc } = useCuentasPorCobrar(empresaId);
  const { data: antiguedad, refetch: refetchAnt } = useAntiguedadSaldos(empresaId, tabTipo, fechaCorte);
  const { data: estadoCuentaData, isLoading: loadingEstadoCuenta } = useEstadoCuenta(
    empresaId, 
    anexoSeleccionadoId || '', 
    tabTipo === 'CXP' ? 'PROVEEDOR' : 'CLIENTE'
  );

  const aplicarPagoMutation = useAplicarPago(empresaId);
  const aplicarCobranzaMutation = useAplicarCobranza(empresaId);

  const listado = tabTipo === 'CXP' ? cxp : cxc;
  const isLoading = tabTipo === 'CXP' ? loadCxp : loadCxc;

  const filtrados = listado.filter((d: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.serie.toLowerCase().includes(term) ||
      d.numero.toLowerCase().includes(term) ||
      (d.anexoNombre && d.anexoNombre.toLowerCase().includes(term)) ||
      (d.anexoRuc && d.anexoRuc.includes(term))
    );
  });

  const handleAplicarNota = async () => {
    if (!docSeleccionado || montoNota <= 0) return;
    try {
      const base = Number((montoNota / 1.18).toFixed(2));
      const igv = Number((montoNota - base).toFixed(2));

      await operacionesApi.aplicarNotaCredito(docSeleccionado.comprobanteId, {
        esVenta: tabTipo === 'CXC',
        tipoNota,
        serie: serieNota,
        numero: numeroNota,
        fechaEmision: new Date().toISOString().substring(0, 10),
        fechaContable: new Date().toISOString().substring(0, 10),
        motivoCodigo,
        motivoDescripcion: motivoDesc,
        baseGravada: base,
        igv,
        total: montoNota
      });

      success(`${tipoNota === '07' ? 'Nota de Crédito' : 'Nota de Débito'} aplicada correctamente.`, 'Comprobante Vinculado');
      setIsNotaModalOpen(false);
      refetchCxp();
      refetchCxc();
      refetchAnt();
    } catch (err: any) {
      error('Error aplicando nota: ' + (err?.response?.data?.message || err.message), 'Fallo al Aplicar');
    }
  };

  const handleEjecutarAplicacion = async () => {
    if (!docParaAplicar || montoAplicar <= 0) return;
    try {
      if (tabTipo === 'CXP') {
        await aplicarPagoMutation.mutateAsync({
          fechaPago: fechaAplicacion,
          referenciaBanco,
          aplicaciones: [
            { cuentaPorPagarId: docParaAplicar.id, importe: montoAplicar }
          ]
        });
      } else {
        await aplicarCobranzaMutation.mutateAsync({
          fechaCobranza: fechaAplicacion,
          referenciaBanco,
          aplicaciones: [
            { cuentaPorCobrarId: docParaAplicar.id, importe: montoAplicar }
          ]
        });
      }
      setModalAplicarOpen(false);
      refetchCxp();
      refetchCxc();
      refetchAnt();
      success('Aplicación contable registrada exitosamente.', 'Operación Exitosa');
    } catch (err: any) {
      error('Error en aplicación: ' + (err?.response?.data?.message || err.message), 'Fallo en Aplicación');
    }
  };

  const getSemaforoColor = (diasVencido: number) => {
    if (diasVencido <= 0) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (diasVencido <= 7) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Cartera de Clientes & Proveedores (CxC / CxP)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de cuentas pendientes, semáforo de vencimientos, clasificación de saldos por tramos y estados de cuenta oficiales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="font-semibold">Fecha de Corte:</span>
            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
              className="font-mono text-xs font-bold border-none outline-none bg-transparent"
            />
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setTabTipo('CXP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                tabTipo === 'CXP' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
              Por Pagar (Proveedores)
            </button>
            <button
              onClick={() => setTabTipo('CXC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                tabTipo === 'CXC' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              Por Cobrar (Clientes)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Antigüedad de Saldos en Tramos */}
      {antiguedad && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pendiente</div>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              S/ {antiguedad.resumen.totalSaldo.toFixed(2)}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Corriente (Al día)
            </div>
            <div className="text-lg font-black text-emerald-950 font-mono mt-1">
              S/ {antiguedad.resumen.corriente.toFixed(2)}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              1 a 30 días
            </div>
            <div className="text-lg font-black text-amber-950 font-mono mt-1">
              S/ {antiguedad.resumen.de1a30.toFixed(2)}
            </div>
          </div>

          <div className="p-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              31 a 60 días
            </div>
            <div className="text-lg font-black text-orange-950 font-mono mt-1">
              S/ {antiguedad.resumen.de31a60.toFixed(2)}
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              61 a 90 días
            </div>
            <div className="text-lg font-black text-rose-950 font-mono mt-1">
              S/ {antiguedad.resumen.de61a90.toFixed(2)}
            </div>
          </div>

          <div className="p-3.5 bg-red-100/50 border border-red-300 rounded-2xl shadow-xs">
            <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              Más de 90 días
            </div>
            <div className="text-lg font-black text-red-950 font-mono mt-1">
              S/ {antiguedad.resumen.mas90.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar en cartera por documento, RUC o razón social de ${tabTipo === 'CXP' ? 'proveedor' : 'cliente'}...`}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <button
            onClick={() => { refetchCxp(); refetchCxc(); refetchAnt(); }}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Actualizar saldos de cartera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-3">Semáforo</th>
                <th className="p-3">Comprobante</th>
                <th className="p-3">RUC</th>
                <th className="p-3">Razón Social</th>
                <th className="p-3">Emisión</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3 text-right">Importe Orig.</th>
                <th className="p-3 text-right">Saldo Actual</th>
                <th className="p-3 text-center">Tramo</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans">
                    Cargando cartera de documentos...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans">
                    No hay saldos pendientes en esta cartera.
                  </td>
                </tr>
              ) : (
                filtrados.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSemaforoColor(doc.diasVencido)}`}>
                        {doc.diasVencido <= 0 ? 'Al Día' : `${doc.diasVencido} d vencido`}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {doc.tipoComprobante} {doc.serie}-{doc.numero}
                    </td>
                    <td className="p-3 text-slate-600">{doc.anexoRuc}</td>
                    <td className="p-3 font-sans truncate max-w-[180px] font-semibold text-slate-800" title={doc.anexoNombre}>
                      {doc.anexoNombre}
                    </td>
                    <td className="p-3 whitespace-nowrap">{doc.fechaEmision}</td>
                    <td className="p-3 whitespace-nowrap">{doc.fechaVencimiento}</td>
                    <td className="p-3 text-right text-slate-500">{doc.importeOriginal.toFixed(2)}</td>
                    <td className="p-3 text-right font-black text-slate-900">{doc.saldo.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {doc.tramoAntiguedad.replace('_', ' a ')}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setDocParaAplicar(doc);
                            setMontoAplicar(doc.saldo);
                            setModalAplicarOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 transition cursor-pointer"
                          title="Aplicar pago o cobranza parcial/total"
                        >
                          {tabTipo === 'CXP' ? 'Pagar' : 'Cobrar'}
                        </button>

                        <button
                          onClick={() => {
                            setDocSeleccionado(doc);
                            setMontoNota(doc.saldo);
                            setIsNotaModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] border border-purple-200 transition cursor-pointer"
                          title="Aplicar Nota de Crédito / Débito"
                        >
                          NC/ND
                        </button>

                        <button
                          onClick={() => {
                            setAnexoSeleccionadoId(doc.anexoId);
                            setModalEstadoCuentaOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          title="Ver estado de cuenta completo del cliente/proveedor"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: APLICAR PAGO / COBRANZA */}
      {modalAplicarOpen && docParaAplicar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              {tabTipo === 'CXP' ? 'Registrar Aplicación de Pago' : 'Registrar Aplicación de Cobranza'}
            </h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-900">
                {docParaAplicar.tipoComprobante} {docParaAplicar.serie}-{docParaAplicar.numero}
              </div>
              <div className="text-slate-600">{docParaAplicar.anexoNombre}</div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-mono">
                <span>Saldo pendiente:</span>
                <strong className="text-rose-700">S/ {docParaAplicar.saldo.toFixed(2)}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Importe a Aplicar (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  max={docParaAplicar.saldo}
                  value={montoAplicar}
                  onChange={(e) => setMontoAplicar(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-mono font-bold p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Operación</label>
                <input
                  type="date"
                  value={fechaAplicacion}
                  onChange={(e) => setFechaAplicacion(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Referencia Bancaria / Operación</label>
                <input
                  type="text"
                  value={referenciaBanco}
                  onChange={(e) => setReferenciaBanco(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setModalAplicarOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleEjecutarAplicacion}
                disabled={montoAplicar <= 0 || montoAplicar > docParaAplicar.saldo}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl disabled:opacity-50"
              >
                Confirmar Aplicación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESTADO DE CUENTA POR ANEXO */}
      {modalEstadoCuentaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Estado de Cuenta — {estadoCuentaData?.anexo?.razonSocial || 'Cargando...'}
              </h3>
              <button
                onClick={() => setModalEstadoCuentaOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {loadingEstadoCuenta ? (
              <div className="p-8 text-center text-slate-400 text-xs">Cargando estado de cuenta...</div>
            ) : estadoCuentaData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Facturado</div>
                    <strong className="text-slate-900">S/ {estadoCuentaData.totalFacturado.toFixed(2)}</strong>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Pagado/Cobrado</div>
                    <strong className="text-emerald-700">S/ {estadoCuentaData.totalPagado.toFixed(2)}</strong>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Saldo Pendiente</div>
                    <strong className="text-rose-700">S/ {estadoCuentaData.totalSaldoPendiente.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">Documento</th>
                        <th className="p-2.5">Emisión</th>
                        <th className="p-2.5">Vencimiento</th>
                        <th className="p-2.5 text-right">Original</th>
                        <th className="p-2.5 text-right">Saldo</th>
                        <th className="p-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {estadoCuentaData.documentos.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-2.5 font-bold">{d.tipoComprobante} {d.serie}-{d.numero}</td>
                          <td className="p-2.5">{d.fechaEmision}</td>
                          <td className="p-2.5">{d.fechaVencimiento}</td>
                          <td className="p-2.5 text-right">{d.importeOriginal.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{d.saldo.toFixed(2)}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.estado === 'CANCELADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {d.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: NOTA DE CRÉDITO / DÉBITO */}
      {isNotaModalOpen && docSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Emitir Nota de Crédito / Débito</h3>
            <p className="text-xs text-slate-500">
              Aplicando sobre {docSeleccionado.tipoComprobante} {docSeleccionado.serie}-{docSeleccionado.numero} (Saldo: S/ {docSeleccionado.saldo.toFixed(2)})
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Nota</label>
                  <select
                    value={tipoNota}
                    onChange={(e) => setTipoNota(e.target.value as any)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                  >
                    <option value="07">07 - Nota de Crédito</option>
                    <option value="08">08 - Nota de Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Serie - Número</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={serieNota}
                      onChange={(e) => setSerieNota(e.target.value)}
                      className="w-16 p-2 text-xs font-mono font-bold border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      value={numeroNota}
                      onChange={(e) => setNumeroNota(e.target.value)}
                      className="flex-1 p-2 text-xs font-mono font-bold border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Importe de la Nota (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  max={docSeleccionado.saldo}
                  value={montoNota}
                  onChange={(e) => setMontoNota(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-mono font-bold p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo SUNAT</label>
                <select
                  value={motivoCodigo}
                  onChange={(e) => {
                    setMotivoCodigo(e.target.value);
                    setMotivoDesc(e.target.options[e.target.selectedIndex].text);
                  }}
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                >
                  <option value="01">01 - Anulación de la operación</option>
                  <option value="04">04 - Descuento global</option>
                  <option value="06">06 - Devolución total</option>
                  <option value="07">07 - Devolución por ítem</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsNotaModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleAplicarNota}
                className="px-4 py-2 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-xl"
              >
                Aplicar Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
