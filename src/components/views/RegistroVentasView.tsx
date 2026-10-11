import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Plus,
  Copy,
  Ban,
  Keyboard,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Comprobante, EmpresaCliente } from '../../types';
import { useVentasList, useRegistroVentasLibro, useCrearVenta, useAnularVenta, useDuplicarVenta, useAnexosList, useCrearAnexo } from '../../hooks/useOperaciones';
import { operacionesApi } from '../../api/operacionesApi';
import { generarSireRvieTxt, exportarComprobantesCsv } from '../../services/sireTxtGenerator';
import { exportarRegistroVentasPdf } from '../../services/pdfExportService';
import { useToast } from '../../context/ToastContext';
import { EmptyStateInstructivo } from '../common/EmptyStateInstructivo';

interface RegistroVentasViewProps {
  ventas: Comprobante[];
  empresa: EmpresaCliente;
  periodo: string;
}

export const RegistroVentasView: React.FC<RegistroVentasViewProps> = ({
  ventas: legacyVentas,
  empresa,
  periodo
}) => {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'LIBRO' | 'DIGITACION'>('LIBRO');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Modal confirmación anular
  const [modalAnular, setModalAnular] = useState<{ isOpen: boolean; id: string; serieNumero: string; motivo: string }>({
    isOpen: false,
    id: '',
    serieNumero: '',
    motivo: 'Anulación de venta por error de digitación'
  });

  // Modal Alta Rápida de Cliente
  const [modalAltaCliente, setModalAltaCliente] = useState(false);
  const [nuevoCliRuc, setNuevoCliRuc] = useState('');
  const [nuevoCliRazon, setNuevoCliRazon] = useState('');
  const [nuevoCliDireccion, setNuevoCliDireccion] = useState('');

  // Hooks API
  const { data: ventasApiData, refetch: refetchVentas } = useVentasList(empresa.id, {
    periodoId: periodo
  });
  const { data: libroReporte, refetch: refetchLibro } = useRegistroVentasLibro(empresa.id, periodo);
  const { data: anexosList = [] } = useAnexosList(empresa.id, undefined, 'CLIENTE');

  const crearVentaMutation = useCrearVenta(empresa.id);
  const anularVentaMutation = useAnularVenta(empresa.id);
  const duplicarVentaMutation = useDuplicarVenta(empresa.id);
  const crearAnexoMutation = useCrearAnexo(empresa.id);

  // Formulario Digitación Rápida
  const [formTipo, setFormTipo] = useState<'01' | '03' | '07' | '08'>('01');
  const [formSerie, setFormSerie] = useState('F001');
  const [formNumero, setFormNumero] = useState('');
  const [formFechaEmision, setFormFechaEmision] = useState(() => new Date().toISOString().substring(0, 10));
  const [formFechaContable, setFormFechaContable] = useState(() => new Date().toISOString().substring(0, 10));
  const [formClienteId, setFormClienteId] = useState('');
  const [formBase, setFormBase] = useState<number>(0);
  const [formIgv, setFormIgv] = useState<number>(0);
  const [formTotal, setFormTotal] = useState<number>(0);
  const [formMoneda, setFormMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [formTipoCambio, setFormTipoCambio] = useState<number>(1.0);
  const [formFormaPago, setFormFormaPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [formDiasCredito, setFormDiasCredito] = useState<number>(30);
  const [formTieneDetraccion, setFormTieneDetraccion] = useState(false);
  const [formPctDetraccion, setFormPctDetraccion] = useState<number>(12);

  // Previsualización de Asiento
  const [previewAsiento, setPreviewAsiento] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const clienteSeleccionado = anexosList.find((a: any) => a.id === formClienteId);

  const handleBaseChange = (valor: number) => {
    setFormBase(valor);
    const calcIgv = Number((valor * 0.18).toFixed(2));
    setFormIgv(calcIgv);
    setFormTotal(Number((valor + calcIgv).toFixed(2)));
  };

  const handleTotalChange = (valor: number) => {
    setFormTotal(valor);
    const calcBase = Number((valor / 1.18).toFixed(2));
    const calcIgv = Number((valor - calcBase).toFixed(2));
    setFormBase(calcBase);
    setFormIgv(calcIgv);
  };

  useEffect(() => {
    if (formTotal > 0) {
      setLoadingPreview(true);
      const timer = setTimeout(async () => {
        try {
          const res = await operacionesApi.previsualizarAsiento(empresa.id, 'VENTA', {
            total: formTotal,
            baseImponible: formBase,
            igv: formIgv,
            docTipo: formTipo,
            docSerie: formSerie,
            docNumero: formNumero || '00000001',
            anexoId: formClienteId || 'anx-01'
          });
          setPreviewAsiento(res);
        } catch {
          // ignore
        } finally {
          setLoadingPreview(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPreviewAsiento(null);
    }
  }, [formTotal, formBase, formIgv, formTipo, formSerie, formNumero, formClienteId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRegistrar();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        limpiarFormulario();
        setActiveTab('DIGITACION');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formTipo, formSerie, formNumero, formClienteId, formTotal, formBase, formIgv, formFormaPago]);

  const limpiarFormulario = () => {
    setFormNumero('');
    setFormBase(0);
    setFormIgv(0);
    setFormTotal(0);
    setBannerError(null);
  };

  const handleRegistrar = async (comoBorrador = false) => {
    setBannerError(null);
    if (!formSerie || !formNumero) {
      setBannerError('Debe ingresar la serie y el número correlativo.');
      return;
    }
    if (!formClienteId) {
      setBannerError('Debe seleccionar o registrar un cliente.');
      return;
    }
    if (formTotal <= 0) {
      setBannerError('El total debe ser mayor a cero.');
      return;
    }

    try {
      await crearVentaMutation.mutateAsync({
        periodoId: periodo,
        fechaEmision: formFechaEmision,
        fechaVencimiento: formFormaPago === 'CREDITO' ? new Date(Date.now() + formDiasCredito * 86400000).toISOString().substring(0, 10) : formFechaEmision,
        fechaContable: formFechaContable,
        tipoComprobante: formTipo,
        serie: formSerie.toUpperCase(),
        numero: formNumero,
        clienteId: formClienteId,
        moneda: formMoneda,
        tipoCambio: formTipoCambio,
        baseGravada: formBase,
        igv: formIgv,
        total: formTotal,
        tipoOperacion: 'VENTA_INTERNA',
        formaPago: formFormaPago,
        diasCredito: formDiasCredito,
        tieneDetraccion: formTieneDetraccion,
        porcentajeDetraccion: formPctDetraccion,
        estado: comoBorrador ? 'BORRADOR' : 'REGISTRADO'
      });

      limpiarFormulario();
      refetchVentas();
      refetchLibro();
      setActiveTab('LIBRO');
    } catch (err: any) {
      setBannerError(err?.response?.data?.message || err.message);
    }
  };

  const handleCrearClienteRapido = async () => {
    if (!nuevoCliRuc || !nuevoCliRazon) return;
    try {
      const nuevo = await crearAnexoMutation.mutateAsync({
        tipoDocumento: '6',
        numeroDocumento: nuevoCliRuc,
        razonSocial: nuevoCliRazon,
        direccion: nuevoCliDireccion,
        tipoEntidad: 'CLIENTE',
        condicionSunat: 'HABIDO',
        estadoSunat: 'ACTIVO'
      });
      setFormClienteId(nuevo.id);
      setModalAltaCliente(false);
      setNuevoCliRuc('');
      setNuevoCliRazon('');
      setNuevoCliDireccion('');
      success('Cliente registrado exitosamente en el catálogo de anexos.', 'Cliente Guardado');
    } catch (err: any) {
      error('Error registrando cliente: ' + (err?.response?.data?.message || err.message), 'Fallo al Guardar');
    }
  };

  const handleConfirmarAnular = async () => {
    if (!modalAnular.id || !modalAnular.motivo) return;
    try {
      await anularVentaMutation.mutateAsync({ id: modalAnular.id, motivo: modalAnular.motivo });
      setModalAnular({ isOpen: false, id: '', serieNumero: '', motivo: '' });
      refetchVentas();
      refetchLibro();
      success('Comprobante de venta anulado conforme a normativa SUNAT.', 'Venta Anulada');
    } catch (err: any) {
      error('Error anulando venta: ' + (err?.response?.data?.message || err.message), 'Fallo de Anulación');
    }
  };

  const itemsVentas = ventasApiData?.items && ventasApiData.items.length > 0
    ? ventasApiData.items
    : legacyVentas.map(v => ({
        id: v.id,
        tipoComprobante: (v as any).tipoComprobante || v.tipoDoc,
        serie: v.serie,
        numero: v.numero,
        fechaEmision: v.fechaEmision,
        clienteNombre: v.razonSocialReceptor,
        clienteRuc: v.rucReceptor,
        baseGravada: v.baseImponibleGravada,
        igv: v.igv,
        total: v.total,
        estado: 'REGISTRADO',
        asientoNumero: '02090001'
      }));

  const filtrados = itemsVentas.filter((v: any) => {
    if (filtroTipo !== 'TODOS' && v.tipoComprobante !== filtroTipo) return false;
    if (filtroEstado !== 'TODOS' && v.estado !== filtroEstado) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (v.clienteNombre && v.clienteNombre.toLowerCase().includes(q)) ||
      (v.clienteRuc && v.clienteRuc.includes(q)) ||
      `${v.serie}-${v.numero}`.toLowerCase().includes(q)
    );
  });

  const cuadre = libroReporte?.cuadreLibroDiario;

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Registro de Ventas e Ingresos Electrónicos (RVIE) — Formato SIRE 14.4
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Emisión y registro de comprobantes de ventas, débito fiscal del IGV, cuadre contable con cuentas 70/40111 y generación de cartera CxC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('LIBRO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'LIBRO' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Consulta Libro (14.4)
            </button>
            <button
              onClick={() => setActiveTab('DIGITACION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DIGITACION' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Digitación Rápida
              <span className="text-[10px] opacity-75 font-mono">(Ctrl+N)</span>
            </button>
          </div>

          <button
            onClick={() => exportarRegistroVentasPdf(empresa, legacyVentas, periodo)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            PDF (14.4)
          </button>
        </div>
      </div>

      {/* Indicador de Cuadre con Libro Diario */}
      <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${
        cuadre?.estaCuadrado !== false
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{cuadre?.estaCuadrado !== false ? 'Ventas Cuadradas con Libro Diario' : 'Descuadre Detectado con Cuentas 70 y 40111'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/70">
                Periodo {periodo}
              </span>
            </div>
            <div className="text-[11px] opacity-90">
              {cuadre?.mensaje || 'Las ventas y el débito fiscal coinciden exactamente con las cuentas 70 y 40111 al Haber.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
          <span>Base Ventas: <strong>S/ {libroReporte?.totales?.totalBaseGravada?.toFixed(2) || '0.00'}</strong></span>
          <span>|</span>
          <span>Débito Fiscal (40111): <strong>S/ {libroReporte?.totales?.totalIgv?.toFixed(2) || '0.00'}</strong></span>
        </div>
      </div>

      {/* DIGITACIÓN RÁPIDA DE VENTAS */}
      {activeTab === 'DIGITACION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Digitación Rápida de Venta</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Ctrl+Enter: Registrar</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Ctrl+N: Nuevo</span>
              </div>
            </div>

            {bannerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bannerError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo Comprobante</label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="01">01 - Factura Electrónica</option>
                  <option value="03">03 - Boleta de Venta</option>
                  <option value="07">07 - Nota de Crédito</option>
                  <option value="08">08 - Nota de Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Serie</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formSerie}
                  onChange={(e) => setFormSerie(e.target.value.toUpperCase())}
                  placeholder="F001"
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Número Correlativo</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  placeholder="00000123"
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  value={formFechaEmision}
                  onChange={(e) => setFormFechaEmision(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Contable</label>
                <input
                  type="date"
                  value={formFechaContable}
                  onChange={(e) => setFormFechaContable(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            {/* Cliente con Alta Rápida */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">Cliente (RUC / DNI / Razón Social)</label>
                <button
                  type="button"
                  onClick={() => setModalAltaCliente(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Alta Rápida Cliente
                </button>
              </div>

              <select
                value={formClienteId}
                onChange={(e) => setFormClienteId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="">-- Seleccione un cliente registrado --</option>
                {anexosList.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.numeroDocumento} - {a.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            {/* Importes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Base Imponible (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formBase || ''}
                  onChange={(e) => handleBaseChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-sm font-mono font-bold p-2.5 border border-emerald-200 rounded-xl bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">IGV 18% (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formIgv || ''}
                  onChange={(e) => setFormIgv(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-sm font-mono font-bold p-2.5 border border-emerald-200 rounded-xl bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">Total Venta (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formTotal || ''}
                  onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-base font-mono font-black text-emerald-950 p-2.5 border border-emerald-300 rounded-xl bg-white outline-none"
                />
              </div>
            </div>

            {/* Forma de Pago */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-slate-700">Forma de Pago</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="formaPagoVenta"
                    checked={formFormaPago === 'CONTADO'}
                    onChange={() => setFormFormaPago('CONTADO')}
                  />
                  Contado
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="formaPagoVenta"
                    checked={formFormaPago === 'CREDITO'}
                    onChange={() => setFormFormaPago('CREDITO')}
                  />
                  Crédito (Genera CxC en Cartera)
                </label>
              </div>
              {formFormaPago === 'CREDITO' && (
                <div className="pt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Plazo en días:</span>
                  <input
                    type="number"
                    value={formDiasCredito}
                    onChange={(e) => setFormDiasCredito(parseInt(e.target.value, 10) || 30)}
                    className="w-20 p-1 font-mono font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={limpiarFormulario}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Limpiar (Ctrl+N)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegistrar(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={() => handleRegistrar(false)}
                  disabled={crearVentaMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Registrar y Contabilizar (Ctrl+Enter)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Previsualización Asiento */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Previsualización de Asiento PCGE
              </h3>
              {loadingPreview && <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />}
            </div>

            <p className="text-[11px] text-slate-500">
              Cuentas 1212 (Cliente), 40111 (Débito Fiscal) y 70111 (Venta Mercadería).
            </p>

            {previewAsiento ? (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Glosa Automática</div>
                  <div className="font-semibold text-slate-800 truncate">{previewAsiento.glosaGeneral}</div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left">Cuenta</th>
                        <th className="p-2 text-right">Debe</th>
                        <th className="p-2 text-right">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewAsiento.lineas.map((l: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{l.codigoCuenta}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{l.glosaLinea}</div>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {l.debe > 0 ? l.debe.toFixed(2) : '-'}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {l.haber > 0 ? l.haber.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <tr>
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right">{previewAsiento.totalDebe.toFixed(2)}</td>
                        <td className="p-2 text-right">{previewAsiento.totalHaber.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                  <span>Partida Doble:</span>
                  <span>CUADRADO (Dif: S/ {previewAsiento.diferenciaCuadre.toFixed(2)})</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Ingrese un importe mayor a cero para previsualizar el asiento de ventas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA LIBRO 14.4 */}
      {activeTab === 'LIBRO' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por RUC cliente, razón social o serie-número..."
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="01">Factura (01)</option>
                <option value="03">Boleta (03)</option>
                <option value="07">Nota de Crédito (07)</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="REGISTRADO">Registrados</option>
                <option value="BORRADOR">Borradores</option>
                <option value="ANULADO">Anulados</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Serie-Número</th>
                    <th className="p-3">RUC / DNI</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-right">Base Gravada</th>
                    <th className="p-3 text-right">IGV Débito</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Asiento</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center font-sans">
                        <EmptyStateInstructivo
                          moduloNombre="Registro de Ventas (RVIE)"
                          titulo="No hay comprobantes de venta en este periodo"
                          descripcion="El Registro de Ventas e Ingresos Electrónico (RVIE) consolida la emisión de facturas y boletas con cálculo automático del débito fiscal IGV 18% y cuentas por cobrar (1212)."
                          checklist={[
                            { titulo: 'Identificación de Cliente', cumplido: false, descripcion: 'RUC para Facturas o DNI para Boletas de venta' },
                            { titulo: 'Definición de Serie y Correlativo', cumplido: false, descripcion: 'Serie F001 / B001 con correlativo numérico de 8 dígitos' },
                            { titulo: 'Asignación de Cuenta de Ingreso (70)', cumplido: false, descripcion: 'Cuenta 7012 (Mercaderías) o 7041 (Servicios prestados)' }
                          ]}
                          onRegistrarNuevo={() => setActiveTab('DIGITACION')}
                          textoRegistrar="Emitir Primera Venta"
                        />
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((v: any) => (
                      <tr key={v.id} className={`hover:bg-slate-50 ${v.estado === 'ANULADO' ? 'opacity-50 line-through' : ''}`}>
                        <td className="p-3 whitespace-nowrap">{v.fechaEmision}</td>
                        <td className="p-3 font-bold text-emerald-700">{v.tipoComprobante}</td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{v.serie}-{v.numero}</td>
                        <td className="p-3 text-slate-600">{v.clienteRuc}</td>
                        <td className="p-3 font-sans truncate max-w-[180px] font-medium text-slate-800" title={v.clienteNombre}>
                          {v.clienteNombre}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">{Number(v.baseGravada).toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{Number(v.igv).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-slate-900">{Number(v.total).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.estado === 'REGISTRADO' ? 'bg-emerald-100 text-emerald-800' :
                            v.estado === 'BORRADOR' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-indigo-600">{v.asientoNumero || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setFormTipo(v.tipoComprobante);
                                setFormSerie(v.serie);
                                setFormNumero(`${parseInt(v.numero, 10) + 1 || 1}`);
                                setFormBase(v.baseGravada);
                                setFormIgv(v.igv);
                                setFormTotal(v.total);
                                setActiveTab('DIGITACION');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Duplicar datos para nueva venta (Ctrl+D)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {v.estado === 'REGISTRADO' && (
                              <button
                                onClick={() => setModalAnular({
                                  isOpen: true,
                                  id: v.id,
                                  serieNumero: `${v.serie}-${v.numero}`,
                                  motivo: 'Anulación de venta'
                                })}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Anular comprobante de venta"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs text-slate-900 sticky bottom-0">
                  <tr>
                    <td colSpan={5} className="p-3">Totales ({filtrados.length} ventas)</td>
                    <td className="p-3 text-right font-mono">
                      S/ {filtrados.reduce((acc: number, v: any) => acc + (v.estado !== 'ANULADO' ? Number(v.baseGravada) : 0), 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      S/ {filtrados.reduce((acc: number, v: any) => acc + (v.estado !== 'ANULADO' ? Number(v.igv) : 0), 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-950 font-black">
                      S/ {filtrados.reduce((acc: number, v: any) => acc + (v.estado !== 'ANULADO' ? Number(v.total) : 0), 0).toFixed(2)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alta Rápida de Cliente */}
      {modalAltaCliente && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Alta Rápida de Cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">RUC o DNI</label>
                <input
                  type="text"
                  maxLength={11}
                  value={nuevoCliRuc}
                  onChange={(e) => setNuevoCliRuc(e.target.value.replace(/\D/g, ''))}
                  placeholder="20XXXXXXXXX o DNI"
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Razón Social o Nombre Completo</label>
                <input
                  type="text"
                  value={nuevoCliRazon}
                  onChange={(e) => setNuevoCliRazon(e.target.value.toUpperCase())}
                  placeholder="CLIENTE S.A.C."
                  className="w-full text-xs font-bold p-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dirección (Opcional)</label>
                <input
                  type="text"
                  value={nuevoCliDireccion}
                  onChange={(e) => setNuevoCliDireccion(e.target.value)}
                  placeholder="Av. Las Camelias 450, San Isidro"
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setModalAltaCliente(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearClienteRapido}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Anular */}
      {modalAnular.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Anular Comprobante de Venta</h3>
            </div>
            <p className="text-xs text-slate-600">
              ¿Está seguro de anular el comprobante <strong>{modalAnular.serieNumero}</strong>? Se generará un asiento contable de extorno y se anulará la cuenta por cobrar asociada.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Motivo de Anulación</label>
              <input
                type="text"
                value={modalAnular.motivo}
                onChange={(e) => setModalAnular(prev => ({ ...prev, motivo: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setModalAnular({ isOpen: false, id: '', serieNumero: '', motivo: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAnular}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
