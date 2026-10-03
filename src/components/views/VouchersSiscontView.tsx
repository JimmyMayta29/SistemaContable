import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  FileSpreadsheet,
  Layers,
  Calculator,
  Calendar,
  Sparkles,
  BookOpen,
  Copy,
  Ban,
  Clock,
  RefreshCw,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { CodigoSubdiario, SUBDIARIOS_SISCONT } from '../../types';
import { PLAN_CONTABLE_PCGE } from '../../data/pcgeAccounts';
import { 
  useAsientosList, 
  useCrearAsiento, 
  useContabilizarAsiento, 
  useAnularAsiento, 
  useDuplicarAsiento 
} from '../../hooks/useAsientos';
import { apiClient } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface VouchersSiscontViewProps {
  empresaId: string;
  periodo: string;
  isPeriodoCerrado?: boolean;
}

export const VouchersSiscontView: React.FC<VouchersSiscontViewProps> = ({
  empresaId,
  periodo,
  isPeriodoCerrado = false
}) => {
  const { success, error, warning } = useToast();
  const [subdiarioFiltro, setSubdiarioFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [asientoAAnularId, setAsientoAAnularId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [mensajeConflictoVersion, setMensajeConflictoVersion] = useState<string | null>(null);

  // Queries y Mutaciones del Backend
  const { data: asientosResponse, isLoading, refetch } = useAsientosList(empresaId, {
    subdiarioId: subdiarioFiltro !== 'TODOS' ? subdiarioFiltro : undefined,
    estado: estadoFiltro !== 'TODOS' ? estadoFiltro : undefined,
    search: searchTerm || undefined
  });

  const crearMutation = useCrearAsiento(empresaId);
  const contabilizarMutation = useContabilizarAsiento(empresaId);
  const anularMutation = useAnularAsiento(empresaId);
  const duplicarMutation = useDuplicarAsiento(empresaId);

  const asientos = asientosResponse?.data || [];

  // Form State para Nuevo / Editar Voucher
  const [modalSubdiario, setModalSubdiario] = useState<CodigoSubdiario>('01');
  const [glosaGeneral, setGlosaGeneral] = useState('Por las operaciones del ejercicio');
  const [fechaVoucher, setFechaVoucher] = useState('2026-09-15');
  const [monedaVoucher, setMonedaVoucher] = useState<'PEN' | 'USD'>('PEN');
  const [tipoCambioVoucher, setTipoCambioVoucher] = useState<number>(3.75);

  const [itemsVoucher, setItemsVoucher] = useState<Array<{
    linea: number;
    codigo: string;
    denominacion: string;
    cuentaId: string;
    anexoId?: string;
    anexoNumero?: string;
    debe: number;
    haber: number;
    glosa: string;
    docSerie?: string;
    docNumero?: string;
  }>>([
    { linea: 1, codigo: '6011', denominacion: 'Mercaderías manufacturadas', cuentaId: 'cta-6011', debe: 1000, haber: 0, glosa: 'Compra de mercadería' },
    { linea: 2, codigo: '40111', denominacion: 'IGV - Cuenta propia', cuentaId: 'cta-40111', debe: 180, haber: 0, glosa: 'IGV crédito fiscal 18%' },
    { linea: 3, codigo: '4212', denominacion: 'Facturas por pagar emitidas', cuentaId: 'cta-4212', debe: 0, haber: 1180, glosa: 'Comprobante de pago proveedor' },
    { linea: 4, codigo: '20111', denominacion: 'Mercaderías manufacturadas - Costo', cuentaId: 'cta-20111', debe: 1000, haber: 0, glosa: 'Destino al almacén' },
    { linea: 5, codigo: '6111', denominacion: 'Mercaderías', cuentaId: 'cta-6111', debe: 0, haber: 1000, glosa: 'Variación de existencias' }
  ]);

  // Búsqueda asistida de Cuentas (F2)
  const [showF2Search, setShowF2Search] = useState(false);
  const [activeRowIdx, setActiveRowIdx] = useState<number>(0);
  const [f2SearchTerm, setF2SearchTerm] = useState('');

  // Cuadre en tiempo real
  const totalDebe = Number(itemsVoucher.reduce((acc, it) => acc + (Number(it.debe) || 0), 0).toFixed(2));
  const totalHaber = Number(itemsVoucher.reduce((acc, it) => acc + (Number(it.haber) || 0), 0).toFixed(2));
  const diferencia = Number(Math.abs(totalDebe - totalHaber).toFixed(2));
  const estaCuadradoModal = diferencia < 0.01 && totalDebe > 0;

  // Atajos de teclado en el formulario del modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      // F2: Buscar Cuenta
      if (e.key === 'F2') {
        e.preventDefault();
        setShowF2Search(true);
      }

      // Ctrl + Enter: Guardar borrador / Contabilizar rápido
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleGuardarBorrador();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, itemsVoucher, glosaGeneral, fechaVoucher]);

  // Aplicar plantillas automáticas invocando al motor en el Backend
  const aplicarPlantillaBackend = async (tipo: string, total = 1180) => {
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/contabilizacion/previsualizar`, {
        tipoOperacion: tipo,
        total,
        glosa: `Registro contable automático ${tipo}`
      });

      if (res.data?.lineas) {
        setGlosaGeneral(res.data.glosaGeneral);
        setItemsVoucher(res.data.lineas.map((l: any, idx: number) => ({
          linea: idx + 1,
          codigo: l.codigoCuenta,
          denominacion: l.denominacionCuenta,
          cuentaId: `cta-${l.codigoCuenta}`,
          debe: l.debe,
          haber: l.haber,
          glosa: l.glosaLinea,
          docSerie: l.docSerie || '',
          docNumero: l.docNumero || ''
        })));
      }
    } catch (err: any) {
      console.warn('Error llamando previsualización:', err);
    }
  };

  const handleAgregarLinea = () => {
    setItemsVoucher(prev => [
      ...prev,
      {
        linea: prev.length + 1,
        codigo: '1212',
        denominacion: 'Facturas por cobrar',
        cuentaId: 'cta-1212',
        debe: 0,
        haber: 0,
        glosa: glosaGeneral
      }
    ]);
  };

  const handleQuitarLinea = (index: number) => {
    if (itemsVoucher.length <= 2) {
      warning('Un asiento contable debe tener al menos 2 líneas para cumplir la partida doble.', 'Partida Doble');
      return;
    }
    setItemsVoucher(prev => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, linea: idx + 1 })));
  };

  const handleGuardarBorrador = async () => {
    if (isPeriodoCerrado) {
      error('Operación bloqueada: El período contable seleccionado se encuentra CERRADO.', 'Período Cerrado');
      return;
    }

    try {
      await crearMutation.mutateAsync({
        periodoId: 'per-2026-09',
        subdiarioId: modalSubdiario,
        fecha: fechaVoucher,
        glosa: glosaGeneral,
        moneda: monedaVoucher,
        tipoCambio: tipoCambioVoucher,
        detalles: itemsVoucher.map(it => ({
          linea: it.linea,
          cuentaId: it.cuentaId || `cta-${it.codigo}`,
          anexoId: it.anexoId || null,
          debe: Number(it.debe) || 0,
          haber: Number(it.haber) || 0,
          glosaLinea: it.glosa
        }))
      });

      setIsModalOpen(false);
      refetch();
      success('Asiento contable guardado exitosamente.', 'Asiento Guardado');
    } catch (err: any) {
      error(`Error al guardar asiento: ${err.message}`, 'Fallo al Guardar');
    }
  };

  const handleContabilizarAsiento = async (id: string) => {
    if (isPeriodoCerrado) {
      error('No se puede contabilizar: El período se encuentra CERRADO.', 'Período Cerrado');
      return;
    }
    try {
      await contabilizarMutation.mutateAsync(id);
      refetch();
      success('Asiento contabilizado formalmente en el Libro Diario.', 'Asiento Contabilizado');
    } catch (err: any) {
      error(`Error al contabilizar: ${err.message}`, 'Fallo al Contabilizar');
    }
  };

  const handleConfirmarAnulacion = async () => {
    if (!asientoAAnularId) return;
    try {
      await anularMutation.mutateAsync({
        id: asientoAAnularId,
        motivo: motivoAnulacion
      });
      setIsAnularModalOpen(false);
      setAsientoAAnularId(null);
      setMotivoAnulacion('');
      refetch();
      success('Asiento contable anulado con registro en auditoría.', 'Asiento Anulado');
    } catch (err: any) {
      error(`Error al anular: ${err.message}`, 'Fallo al Anular');
    }
  };

  const handleDuplicar = async (id: string) => {
    try {
      await duplicarMutation.mutateAsync(id);
      refetch();
      success('Asiento duplicado en estado borrador listo para edición.', 'Asiento Duplicado');
    } catch (err: any) {
      error(`Error al duplicar: ${err.message}`, 'Fallo al Duplicar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Período Cerrado */}
      {isPeriodoCerrado && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-rose-600" />
            <div>
              <h4 className="font-extrabold text-rose-950 text-sm">Período Contable {periodo} CERRADO</h4>
              <p className="text-xs text-rose-800">
                Las operaciones de creación, edición, contabilización y anulación están bloqueadas para garantizar la inmutabilidad de los libros oficiales.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-200 text-rose-900 font-bold text-xs">
            Modo Solo Lectura
          </span>
        </div>
      )}

      {/* Top Banner with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Gestión de Vouchers & Asientos Contables
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro con partida doble en tiempo real, asignación atómica de correlativos, bloqueo de período y asientos de extorno.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Refrescar datos del servidor"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isPeriodoCerrado}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition ${
              isPeriodoCerrado 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nuevo Voucher (F10)
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por correlativo o glosa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Subdiario Selector */}
          <select
            value={subdiarioFiltro}
            onChange={(e) => setSubdiarioFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="TODOS">Todos los Subdiarios (00 - 09)</option>
            {SUBDIARIOS_SISCONT.map(s => (
              <option key={s.codigo} value={s.codigo}>{s.descripcion}</option>
            ))}
          </select>

          {/* Estado Selector */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="CONTABILIZADO">Solo Contabilizados</option>
            <option value="BORRADOR">Solo Borradores</option>
            <option value="ANULADO">Solo Anulados</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Vouchers: <strong className="text-slate-900">{asientos.length}</strong>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Correlativo</th>
                <th className="py-3 px-3">Subdiario</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-4">Glosa Principal</th>
                <th className="py-3 px-3 text-right">Total Debe</th>
                <th className="py-3 px-3 text-right">Total Haber</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Cargando vouchers desde la base de datos...</span>
                    </div>
                  </td>
                </tr>
              ) : asientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron vouchers registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                asientos.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {a.numero || <span className="text-amber-600 font-sans italic font-normal">[Borrador sin número]</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-semibold text-slate-700">
                        {a.subdiarioCodigo || a.subdiarioId || '01'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {a.fecha}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" title={a.glosa}>
                      {a.glosa}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">
                      S/ {Number(a.totalDebe || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">
                      S/ {Number(a.totalHaber || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {a.estado === 'CONTABILIZADO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Contabilizado
                        </span>
                      )}
                      {a.estado === 'BORRADOR' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Borrador
                        </span>
                      )}
                      {a.estado === 'ANULADO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={`Extorno: ${a.asientoExtornoId}`}>
                          Anulado (Extorno)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {a.estado === 'BORRADOR' && !isPeriodoCerrado && (
                          <button
                            onClick={() => handleContabilizarAsiento(a.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                            title="Contabilizar asiento y asignar correlativo atómico"
                          >
                            Contabilizar
                          </button>
                        )}

                        {a.estado === 'CONTABILIZADO' && !isPeriodoCerrado && (
                          <button
                            onClick={() => {
                              setAsientoAAnularId(a.id);
                              setIsAnularModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Anular asiento mediante asiento de extorno"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDuplicar(a.id)}
                          className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          title="Duplicar asiento como nuevo borrador"
                        >
                          <Copy className="w-4 h-4" />
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

      {/* Modal de Ingreso de Voucher Ergonómico */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    Ingreso de Voucher Contable (Partida Doble)
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                      Subdiario {modalSubdiario}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atajos: [Tab/Enter] avanzar celda, [F2] catálogo PCGE, [Ctrl+Enter] guardar borrador.
                  </p>
                </div>
              </div>

              {/* Botones de Plantillas Rápidas */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Plantilla:</span>
                <button
                  type="button"
                  onClick={() => aplicarPlantillaBackend('COMPRA_MERCADERIA')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition"
                >
                  Compra Mercadería
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPlantillaBackend('COMPRA_SERVICIO')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition"
                >
                  Servicio (94/95)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPlantillaBackend('VENTA')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition"
                >
                  Venta (12/40/70)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPlantillaBackend('HONORARIO')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition"
                >
                  Honorarios 4ta
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Cabecera del Voucher */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subdiario</label>
                  <select
                    value={modalSubdiario}
                    onChange={(e) => setModalSubdiario(e.target.value as CodigoSubdiario)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    {SUBDIARIOS_SISCONT.map(s => (
                      <option key={s.codigo} value={s.codigo}>{s.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fecha Contable</label>
                  <input
                    type="date"
                    value={fechaVoucher}
                    onChange={(e) => setFechaVoucher(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Moneda & Tipo Cambio</label>
                  <div className="flex gap-2">
                    <select
                      value={monedaVoucher}
                      onChange={(e) => setMonedaVoucher(e.target.value as any)}
                      className="w-1/2 p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="PEN">PEN (Soles)</option>
                      <option value="USD">USD (Dólares)</option>
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={tipoCambioVoucher}
                      onChange={(e) => setTipoCambioVoucher(parseFloat(e.target.value))}
                      className="w-1/2 p-2 bg-white border border-slate-200 rounded-xl font-mono text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Glosa Principal</label>
                  <input
                    type="text"
                    value={glosaGeneral}
                    onChange={(e) => setGlosaGeneral(e.target.value)}
                    placeholder="Glosa general del voucher..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Grilla Detalle de Cuentas */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-28">Cuenta PCGE</th>
                      <th className="py-2.5 px-3">Denominación</th>
                      <th className="py-2.5 px-3 w-32 text-right">Debe (S/)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Haber (S/)</th>
                      <th className="py-2.5 px-3">Glosa Línea</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsVoucher.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition">
                        <td className="py-2 px-3 font-mono text-center text-slate-400">{it.linea}</td>
                        <td className="py-1 px-3">
                          <input
                            type="text"
                            value={it.codigo}
                            onFocus={() => setActiveRowIdx(idx)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsVoucher(prev => prev.map((item, i) => i === idx ? { ...item, codigo: val } : item));
                            }}
                            className="w-full p-1.5 font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                          />
                        </td>
                        <td className="py-1 px-3 font-medium text-slate-700 truncate max-w-[200px]">
                          {it.denominacion || 'Cuenta analítica PCGE'}
                        </td>
                        <td className="py-1 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={it.debe || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setItemsVoucher(prev => prev.map((item, i) => i === idx ? { ...item, debe: val, haber: val > 0 ? 0 : item.haber } : item));
                            }}
                            className="w-full p-1.5 font-mono text-right bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={it.haber || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setItemsVoucher(prev => prev.map((item, i) => i === idx ? { ...item, haber: val, debe: val > 0 ? 0 : item.debe } : item));
                            }}
                            className="w-full p-1.5 font-mono text-right bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input
                            type="text"
                            value={it.glosa}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsVoucher(prev => prev.map((item, i) => i === idx ? { ...item, glosa: val } : item));
                            }}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuitarLinea(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAgregarLinea}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Línea
                </button>

                {/* Semáforo de Cuadre */}
                <div className="flex items-center gap-6 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 mr-2">TOTAL DEBE:</span>
                    <strong className="text-slate-900 text-sm">S/ {totalDebe.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">TOTAL HABER:</span>
                    <strong className="text-slate-900 text-sm">S/ {totalHaber.toFixed(2)}</strong>
                  </div>
                  <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                    {estaCuadradoModal ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-4 h-4" /> CUADRADO
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded">
                        <AlertCircle className="w-4 h-4" /> DESCUADRE: S/ {diferencia.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-400">
                Presiona <strong>Ctrl + Enter</strong> para guardar el borrador.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGuardarBorrador}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  Guardar Borrador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anulación y Extorno */}
      {isAnularModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Anular Asiento Contable</h3>
            </div>
            <p className="text-xs text-slate-600">
              Los asientos contabilizados son inmutables. La anulación generará automáticamente un <strong>Asiento de Extorno</strong> que invierte las cuentas y dejará ambos registros auditados.
            </p>
            <div>
              <label className="font-semibold text-slate-700 text-xs block mb-1">Motivo de Anulación (Obligatorio)</label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Detalle el motivo del error o anulación..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAnularModalOpen(false);
                  setAsientoAAnularId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacion}
                disabled={!motivoAnulacion.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold transition"
              >
                Confirmar Anulación & Extorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
