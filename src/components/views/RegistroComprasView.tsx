import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Download,
  Calendar,
  Sparkles,
  FileText,
  Plus,
  Copy,
  Trash2,
  Ban,
  Keyboard,
  ArrowRight,
  Eye,
  RefreshCw,
  Coins,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Info,
  Loader2
} from 'lucide-react';
import { Comprobante, EmpresaCliente } from '../../types';
import { 
  useComprasList, 
  useRegistroComprasLibro, 
  useCrearCompra, 
  useAnularCompra, 
  useDuplicarCompra, 
  useAnexosList, 
  useCrearAnexo,
  useConsultarRuc 
} from '../../hooks/useOperaciones';
import { operacionesApi } from '../../api/operacionesApi';
import { generarSireRceTxt, exportarComprobantesCsv } from '../../services/sireTxtGenerator';
import { exportarRegistroComprasPdf } from '../../services/pdfExportService';
import { VisorDocumentoSunatModal } from '../modals/VisorDocumentoSunatModal';
import { useReportStyle } from '../../context/ReportStyleContext';
import { construirDefinicionRegistroComprasSiscont } from '../../services/reports/siscontFormatEngine';
import { VisorReporteSiscontModal } from '../modals/VisorReporteSiscontModal';
import { useToast } from '../../context/ToastContext';
import { EmptyStateInstructivo } from '../common/EmptyStateInstructivo';

interface RegistroComprasViewProps {
  compras: Comprobante[];
  empresa: EmpresaCliente;
  periodo: string;
  onGenerarAsientos?: () => void;
  onUpdateCuentaContable?: (id: string, cuenta: string) => void;
}

export const RegistroComprasView: React.FC<RegistroComprasViewProps> = ({
  compras: legacyCompras,
  empresa,
  periodo,
  onGenerarAsientos
}) => {
  const { success, error } = useToast();
  const { reportStyle } = useReportStyle();
  const [modalSiscontOpen, setModalSiscontOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIBRO' | 'DIGITACION'>('LIBRO');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [comprobanteVisor, setComprobanteVisor] = useState<any | null>(null);

  // Modal confirmación anular
  const [modalAnular, setModalAnular] = useState<{ isOpen: boolean; id: string; serieNumero: string; motivo: string }>({
    isOpen: false,
    id: '',
    serieNumero: '',
    motivo: 'Error en digitación de importes'
  });

  // Modal Alta Rápida de Proveedor
  const [modalAltaProveedor, setModalAltaProveedor] = useState(false);
  const [nuevoProvRuc, setNuevoProvRuc] = useState('');
  const [nuevoProvRazon, setNuevoProvRazon] = useState('');
  const [nuevoProvDireccion, setNuevoProvDireccion] = useState('');
  const [nuevoProvCondicion, setNuevoProvCondicion] = useState<'HABIDO' | 'NO_HABIDO'>('HABIDO');

  // Hooks API
  const { data: comprasApiData, isLoading: loadingList, refetch: refetchCompras } = useComprasList(empresa.id, {
    periodoId: periodo
  });
  const { data: libroReporte, refetch: refetchLibro } = useRegistroComprasLibro(empresa.id, periodo);
  const { data: anexosList = [] } = useAnexosList(empresa.id, undefined, 'PROVEEDOR');
  
  const crearCompraMutation = useCrearCompra(empresa.id);
  const anularCompraMutation = useAnularCompra(empresa.id);
  const duplicarCompraMutation = useDuplicarCompra(empresa.id);
  const crearAnexoMutation = useCrearAnexo(empresa.id);
  const consultarRucMutation = useConsultarRuc(empresa.id);

  // Estados de Consulta RUC en Tiempo Real (SUNAT + Caché PostgreSQL)
  const [rucBusquedaDirecta, setRucBusquedaDirecta] = useState('');
  const [resultadoConsultaRuc, setResultadoConsultaRuc] = useState<any | null>(null);
  const [errorConsultaRuc, setErrorConsultaRuc] = useState<string | null>(null);
  const [consultandoModalRuc, setConsultandoModalRuc] = useState(false);

  // Formulario Digitación Rápida (Teclado Primero)
  const [formTipo, setFormTipo] = useState<'01' | '03' | '07' | '08'>('01');
  const [formSerie, setFormSerie] = useState('F001');
  const [formNumero, setFormNumero] = useState('');
  const [formFechaEmision, setFormFechaEmision] = useState(() => new Date().toISOString().substring(0, 10));
  const [formFechaContable, setFormFechaContable] = useState(() => new Date().toISOString().substring(0, 10));
  const [formProveedorId, setFormProveedorId] = useState('');
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [formBase, setFormBase] = useState<number>(0);
  const [formIgv, setFormIgv] = useState<number>(0);
  const [formTotal, setFormTotal] = useState<number>(0);
  const [formTipoAdquisicion, setFormTipoAdquisicion] = useState<'1' | '2' | '3' | '4'>('1');
  const [formMoneda, setFormMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [formTipoCambio, setFormTipoCambio] = useState<number>(1.0);
  const [formFormaPago, setFormFormaPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [formDiasCredito, setFormDiasCredito] = useState<number>(30);
  const [formTieneDetraccion, setFormTieneDetraccion] = useState(false);
  const [formPctDetraccion, setFormPctDetraccion] = useState<number>(12);
  const [formEsServicio, setFormEsServicio] = useState(false);

  // Previsualización de Asiento
  const [previewAsiento, setPreviewAsiento] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Proveedor seleccionado y advertencias
  const proveedorSeleccionado = anexosList.find((a: any) => a.id === formProveedorId);

  // Cálculo automático de Base / IGV / Total
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

  // Previsualizar asiento en tiempo real
  useEffect(() => {
    if (formTotal > 0) {
      setLoadingPreview(true);
      const timer = setTimeout(async () => {
        try {
          const res = await operacionesApi.previsualizarAsiento(empresa.id, formEsServicio ? 'COMPRA_SERVICIO' : 'COMPRA_MERCADERIA', {
            total: formTotal,
            baseImponible: formBase,
            igv: formIgv,
            docTipo: formTipo,
            docSerie: formSerie,
            docNumero: formNumero || '00000001',
            anexoId: formProveedorId || 'anx-01'
          });
          setPreviewAsiento(res);
        } catch {
          // ignore transient preview error
        } finally {
          setLoadingPreview(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPreviewAsiento(null);
    }
  }, [formTotal, formBase, formIgv, formTipo, formSerie, formNumero, formEsServicio, formProveedorId]);

  // Atajos de teclado: Ctrl+Enter (Registrar), Ctrl+N (Nuevo), Ctrl+D (Duplicar)
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
  }, [formTipo, formSerie, formNumero, formProveedorId, formTotal, formBase, formIgv, formTipoAdquisicion, formFormaPago, formTieneDetraccion]);

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
      setBannerError('Debe ingresar la serie y el número de comprobante.');
      return;
    }
    if (!formProveedorId) {
      setBannerError('Debe seleccionar o registrar un proveedor.');
      return;
    }
    if (formTotal <= 0) {
      setBannerError('El total debe ser mayor a cero.');
      return;
    }

    try {
      await crearCompraMutation.mutateAsync({
        periodoId: periodo,
        fechaEmision: formFechaEmision,
        fechaVencimiento: formFormaPago === 'CREDITO' ? new Date(Date.now() + formDiasCredito * 86400000).toISOString().substring(0, 10) : formFechaEmision,
        fechaContable: formFechaContable,
        tipoComprobante: formTipo,
        serie: formSerie.toUpperCase(),
        numero: formNumero,
        proveedorId: formProveedorId,
        moneda: formMoneda,
        tipoCambio: formTipoCambio,
        baseGravada: formBase,
        igv: formIgv,
        total: formTotal,
        tipoAdquisicion: formTipoAdquisicion,
        formaPago: formFormaPago,
        diasCredito: formDiasCredito,
        tieneDetraccion: formTieneDetraccion,
        porcentajeDetraccion: formPctDetraccion,
        esServicio: formEsServicio,
        estado: comoBorrador ? 'BORRADOR' : 'REGISTRADO'
      });

      limpiarFormulario();
      refetchCompras();
      refetchLibro();
      setActiveTab('LIBRO');
    } catch (err: any) {
      setBannerError(err?.response?.data?.message || err.message);
    }
  };

  const handleCrearProveedorRapido = async () => {
    if (!nuevoProvRuc || !nuevoProvRazon) return;
    try {
      const nuevo = await crearAnexoMutation.mutateAsync({
        tipoDocumento: '6',
        numeroDocumento: nuevoProvRuc,
        razonSocial: nuevoProvRazon,
        direccion: nuevoProvDireccion,
        tipoEntidad: 'PROVEEDOR',
        condicionSunat: nuevoProvCondicion,
        estadoSunat: 'ACTIVO'
      });
      setFormProveedorId(nuevo.id);
      setModalAltaProveedor(false);
      setNuevoProvRuc('');
      setNuevoProvRazon('');
      setNuevoProvDireccion('');
      success('Proveedor registrado en el catálogo de anexos con éxito.', 'Proveedor Guardado');
    } catch (err: any) {
      error('Error registrando proveedor: ' + (err?.response?.data?.message || err.message), 'Fallo al Guardar');
    }
  };

  const handleConsultarRucEnRegistro = async (forzar = false) => {
    const ruc = rucBusquedaDirecta.trim().replace(/\D/g, '');
    if (!ruc) {
      setErrorConsultaRuc('Ingrese un RUC de 11 dígitos');
      return;
    }
    if (ruc.length !== 11) {
      setErrorConsultaRuc('El RUC debe tener exactamente 11 dígitos');
      return;
    }

    setErrorConsultaRuc(null);
    try {
      const res = await consultarRucMutation.mutateAsync({ ruc, tipoEntidad: 'PROVEEDOR', forzar });
      setResultadoConsultaRuc(res);
      if (res.anexoId) {
        setFormProveedorId(res.anexoId);
      }
      if (res.condicion === 'NO_HABIDO') {
        error(
          'El proveedor figura como NO HABIDO en SUNAT. Según Art. 65-A TUO IGV y Art. 44 TUO LIR, no permite deducir crédito fiscal.',
          'Alerta Tributaria SUNAT'
        );
      } else if (res.estado !== 'ACTIVO') {
        error(
          `El proveedor figura en estado ${res.estado} en SUNAT. Los comprobantes carecen de validez fiscal durante baja o suspensión.`,
          'Alerta Tributaria SUNAT'
        );
      } else {
        success(
          `${res.razonSocial} (${res.origen === 'CACHE_LOCAL' ? 'Caché PostgreSQL' : 'SUNAT en Vivo'})`,
          'RUC Verificado'
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error al consultar RUC';
      setErrorConsultaRuc(msg);
      error(msg, 'Error Consulta RUC');
    }
  };

  const handleConsultarRucEnModal = async () => {
    const ruc = nuevoProvRuc.trim().replace(/\D/g, '');
    if (ruc.length !== 11) {
      error('El RUC debe contener exactamente 11 dígitos', 'RUC Incompleto');
      return;
    }
    setConsultandoModalRuc(true);
    try {
      const res = await consultarRucMutation.mutateAsync({ ruc, tipoEntidad: 'PROVEEDOR' });
      setNuevoProvRazon(res.razonSocial);
      setNuevoProvDireccion(res.direccion || '');
      setNuevoProvCondicion(res.condicion || 'HABIDO');
      success(`Datos SUNAT cargados: ${res.razonSocial}`, 'Consulta Exitosa');
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'Error consultando SUNAT', 'Fallo de Consulta');
    } finally {
      setConsultandoModalRuc(false);
    }
  };

  const handleConfirmarAnular = async () => {
    if (!modalAnular.id || !modalAnular.motivo) return;
    try {
      await anularCompraMutation.mutateAsync({ id: modalAnular.id, motivo: modalAnular.motivo });
      setModalAnular({ isOpen: false, id: '', serieNumero: '', motivo: '' });
      refetchCompras();
      refetchLibro();
      success('Comprobante de compra anulado conforme a normativa SUNAT.', 'Compra Anulada');
    } catch (err: any) {
      error('Error anulando comprobante: ' + (err?.response?.data?.message || err.message), 'Fallo de Anulación');
    }
  };

  // Combinar compras de la API o usar compras de sesión
  const itemsCompras = comprasApiData?.items && comprasApiData.items.length > 0 
    ? comprasApiData.items 
    : legacyCompras.map(c => ({
        id: c.id,
        tipoComprobante: (c as any).tipoComprobante || c.tipoDoc,
        serie: c.serie,
        numero: c.numero,
        fechaEmision: c.fechaEmision,
        proveedorNombre: c.razonSocialEmisor,
        proveedorRuc: c.rucEmisor,
        baseGravada: c.baseImponibleGravada,
        igv: c.igv,
        otrosTributos: 0,
        total: c.total,
        tipoAdquisicion: '1',
        estado: 'REGISTRADO',
        asientoNumero: '01090001'
      }));

  const filtrados = itemsCompras.filter((c: any) => {
    if (filtroTipo !== 'TODOS' && c.tipoComprobante !== filtroTipo) return false;
    if (filtroEstado !== 'TODOS' && c.estado !== filtroEstado) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.proveedorNombre && c.proveedorNombre.toLowerCase().includes(q)) ||
      (c.proveedorRuc && c.proveedorRuc.includes(q)) ||
      `${c.serie}-${c.numero}`.toLowerCase().includes(q)
    );
  });

  const cuadre = libroReporte?.cuadreLibroDiario;

  return (
    <div className="space-y-4">
      {/* Top Banner Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Registro de Compras Electrónico (RCE) — Formato SIRE 8.4
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Digitación rápida de teclado, contabilización automática por reglas PCGE, libro oficial y cuadre con Libro Diario.
          </p>
        </div>

        {/* Tab switcher & New Button */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('LIBRO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'LIBRO' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Consulta Libro (8.4)
            </button>
            <button
              onClick={() => setActiveTab('DIGITACION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DIGITACION' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Digitación Rápida
              <span className="text-[10px] opacity-75 font-mono">(Ctrl+N)</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (reportStyle === 'siscont') {
                setModalSiscontOpen(true);
              } else {
                exportarRegistroComprasPdf(empresa, legacyCompras, periodo);
              }
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title={reportStyle === 'siscont' ? 'Previsualizar y Exportar en Formato Oficial SISCONT (B/N)' : 'Exportar Libro PDF Oficial'}
          >
            <FileText className={`w-4 h-4 ${reportStyle === 'siscont' ? 'text-black' : 'text-blue-600'}`} />
            <span>{reportStyle === 'siscont' ? 'Reporte SISCONT' : 'PDF (8.4)'}</span>
          </button>
        </div>
      </div>

      {/* Indicador de Cuadre con Libro Diario Banner */}
      <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${
        cuadre?.estaCuadrado !== false
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${cuadre?.estaCuadrado !== false ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
            {cuadre?.estaCuadrado !== false ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{cuadre?.estaCuadrado !== false ? 'Libro Cuadrado con el Diario' : 'Descuadre Detectado con el Libro Diario'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/70">
                Periodo {periodo}
              </span>
            </div>
            <div className="text-[11px] opacity-90">
              {cuadre?.mensaje || 'El total de crédito fiscal IGV de compras coincide exactamente con la cuenta 40111 del Libro Diario.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
          <span>IGV Registro: <strong>S/ {libroReporte?.totales?.totalIgv?.toFixed(2) || '0.00'}</strong></span>
          <span>|</span>
          <span>Cuenta 40111 (Debe): <strong>S/ {cuadre?.totalDebeCuenta40111Diario?.toFixed(2) || '0.00'}</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DIGITACIÓN RÁPIDA (TECLADO PRIMERO)                              */}
      {/* ========================================================================= */}
      {activeTab === 'DIGITACION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Keyboard-First Form (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Digitación Rápida de Comprobante</h3>
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
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="01">01 - Factura</option>
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
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Número Correlativo</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  placeholder="00012345"
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  value={formFechaEmision}
                  onChange={(e) => setFormFechaEmision(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Contable</label>
                <input
                  type="date"
                  value={formFechaContable}
                  onChange={(e) => setFormFechaContable(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo Adquisición</label>
                <select
                  value={formTipoAdquisicion}
                  onChange={(e) => setFormTipoAdquisicion(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="1">1: Gravada (100% Crédito Fiscal)</option>
                  <option value="2">2: Prorrata (Operaciones Mixtas)</option>
                  <option value="3">3: Gravada sin derecho a crédito</option>
                  <option value="4">4: Adquisición No Gravada</option>
                </select>
              </div>
            </div>

            {/* Proveedor selector with Validación SUNAT en Tiempo Real */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-800">
                    Proveedor y Validación SUNAT en Tiempo Real
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAltaProveedor(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Alta Rápida
                </button>
              </div>

              {/* Barra de Consulta RUC en Vivo */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={11}
                    value={rucBusquedaDirecta}
                    onChange={(e) => {
                      setRucBusquedaDirecta(e.target.value.replace(/\D/g, ''));
                      if (errorConsultaRuc) setErrorConsultaRuc(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConsultarRucEnRegistro();
                      }
                    }}
                    placeholder="Consultar RUC (11 dígitos, ej. 20100070970)..."
                    className="w-full text-xs font-mono font-bold pl-3 pr-20 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-slate-400">
                    {rucBusquedaDirecta.length}/11
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleConsultarRucEnRegistro(false)}
                  disabled={consultarRucMutation.isPending || rucBusquedaDirecta.length !== 11}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer ${
                    consultarRucMutation.isPending || rucBusquedaDirecta.length !== 11
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                  }`}
                  title="Verificar estado del contribuyente en SUNAT y caché local"
                >
                  {consultarRucMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Consultar SUNAT</span>
                    </>
                  )}
                </button>
              </div>

              {errorConsultaRuc && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorConsultaRuc}</span>
                </div>
              )}

              {/* Selector de lista de proveedores guardados */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  O seleccionar de catálogo registrado:
                </label>
                <select
                  value={formProveedorId}
                  onChange={(e) => {
                    setFormProveedorId(e.target.value);
                    const p = anexosList.find((a: any) => a.id === e.target.value);
                    if (p) {
                      setRucBusquedaDirecta(p.numeroDocumento);
                      setResultadoConsultaRuc(null);
                    }
                  }}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Seleccionar proveedor del catálogo --</option>
                  {anexosList.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.numeroDocumento} - {a.razonSocial} {a.condicionSunat === 'NO_HABIDO' ? '⚠️ (NO HABIDO)' : ''} ({a.estadoSunat})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha de Estado Tributario del Proveedor Seleccionado */}
              {(proveedorSeleccionado || resultadoConsultaRuc) && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        RUC: {proveedorSeleccionado?.numeroDocumento || resultadoConsultaRuc?.ruc}
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">
                        {proveedorSeleccionado?.razonSocial || resultadoConsultaRuc?.razonSocial}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Badge Estado SUNAT */}
                      {(() => {
                        const estado = proveedorSeleccionado?.estadoSunat || resultadoConsultaRuc?.estado;
                        const esActivo = estado === 'ACTIVO';
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            esActivo 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {esActivo ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-rose-600" />}
                            {estado}
                          </span>
                        );
                      })()}

                      {/* Badge Condición SUNAT */}
                      {(() => {
                        const condicion = proveedorSeleccionado?.condicionSunat || resultadoConsultaRuc?.condicion;
                        const esHabido = condicion === 'HABIDO';
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            esHabido 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}>
                            {esHabido ? 'HABIDO' : '⚠️ NO HABIDO'}
                          </span>
                        );
                      })()}

                      {/* Origen de los datos */}
                      {resultadoConsultaRuc?.origen && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600">
                          {resultadoConsultaRuc.origen === 'CACHE_LOCAL' ? '⚡ Caché DB' : '🌐 SUNAT Online'}
                        </span>
                      )}

                      {/* Botón Revalidar en Vivo */}
                      <button
                        type="button"
                        onClick={() => handleConsultarRucEnRegistro(true)}
                        disabled={consultarRucMutation.isPending}
                        className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer transition"
                        title="Forzar actualización en tiempo real desde SUNAT"
                      >
                        <RefreshCw className={`w-3 h-3 ${consultarRucMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>Revalidar</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Dirección Fiscal: </span>
                    {proveedorSeleccionado?.direccion || resultadoConsultaRuc?.direccion || 'Sin dirección registrada en padrón'}
                  </div>

                  {/* Alerta de Contingencia Tributaria (No Bloqueante) */}
                  {((proveedorSeleccionado?.condicionSunat === 'NO_HABIDO' || resultadoConsultaRuc?.condicion === 'NO_HABIDO') ||
                    (proveedorSeleccionado?.estadoSunat && proveedorSeleccionado?.estadoSunat !== 'ACTIVO') ||
                    (resultadoConsultaRuc?.estado && resultadoConsultaRuc?.estado !== 'ACTIVO')) && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Contingencia Tributaria SUNAT (Art. 65-A TUO IGV / Art. 44 TUO LIR)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-900">
                        {resultadoConsultaRuc?.advertenciaFiscal || 
                          'Este proveedor figura como NO HABIDO o NO ACTIVO. El comprobante no otorgará derecho a crédito fiscal ni a deducción de gasto de renta, a menos que regularice su condición de domicilio fiscal antes del vencimiento del periodo.'}
                      </p>
                      <div className="text-[10px] text-amber-800 font-semibold italic">
                        ℹ️ El sistema permite continuar el registro para efectos de control contable interno y cuentas por pagar.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Importes con cálculo automático */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Base Gravada (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formBase || ''}
                  onChange={(e) => handleBaseChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-sm font-mono font-bold p-2.5 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full text-sm font-mono font-bold p-2.5 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-1">Total Comprobante (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formTotal || ''}
                  onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-base font-mono font-black text-blue-950 p-2.5 border border-blue-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Forma de Pago y Detracción SPOT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-[11px] font-bold text-slate-700">Forma de Pago</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="formaPago"
                      checked={formFormaPago === 'CONTADO'}
                      onChange={() => setFormFormaPago('CONTADO')}
                    />
                    Contado
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="formaPago"
                      checked={formFormaPago === 'CREDITO'}
                      onChange={() => setFormFormaPago('CREDITO')}
                    />
                    Crédito (Genera CxP)
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

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formTieneDetraccion}
                      onChange={(e) => setFormTieneDetraccion(e.target.checked)}
                    />
                    Sujeto a Detracción SPOT (Banco Nación)
                  </label>
                </div>
                {formTieneDetraccion && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-600">Porcentaje:</span>
                    <select
                      value={formPctDetraccion}
                      onChange={(e) => setFormPctDetraccion(parseFloat(e.target.value))}
                      className="p-1 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="4">4% (Transporte)</option>
                      <option value="10">10% (Otros servicios)</option>
                      <option value="12">12% (Servicios empresariales)</option>
                    </select>
                    <span className="font-mono font-bold text-amber-800">
                      Monto: S/ {(formTotal * (formPctDetraccion / 100)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
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
                  disabled={crearCompraMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Registrar y Contabilizar (Ctrl+Enter)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Side Preview Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Previsualización de Asiento PCGE
              </h3>
              {loadingPreview && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
            </div>

            <p className="text-[11px] text-slate-500">
              Generado en tiempo real según las reglas de contabilización de la empresa antes del guardado físico.
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
                Ingrese un importe mayor a cero para previsualizar el asiento oficial.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CONSULTA Y TABLA DENSA LIBRO 8.4                                 */}
      {/* ========================================================================= */}
      {activeTab === 'LIBRO' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por RUC, razón social, serie o correlativo..."
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              >
                <option value="TODOS">Todos los comprobantes</option>
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

          {/* Tabla Densa Virtualizada */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Serie-Número</th>
                    <th className="p-3">RUC Proveedor</th>
                    <th className="p-3">Razón Social</th>
                    <th className="p-3 text-right">Base Gravada</th>
                    <th className="p-3 text-right">IGV (18%)</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Destino</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Asiento</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-4 text-center font-sans">
                        <EmptyStateInstructivo
                          moduloNombre="Registro de Compras (RCE)"
                          titulo="No hay comprobantes de compra en este periodo"
                          descripcion="El Registro de Compras Electrónico (RCE) almacena las adquisiciones con desglose tributario oficial (Base gravada, IGV, No gravada y SPOT de Detracción)."
                          checklist={[
                            { titulo: 'Identificación de Proveedor (RUC/DNI)', cumplido: false, descripcion: 'Verificar condición de habido y estado activo en SUNAT' },
                            { titulo: 'Asignación de Cuenta de Gasto / Inventario', cumplido: false, descripcion: 'Elemento 60 (Mercaderías) o 63/65 (Servicios/Gastos) con destino automático' },
                            { titulo: 'Verificación de Detracción / Bancarización', cumplido: false, descripcion: 'Operaciones sujetas al SPOT mayores a S/ 700.00 (Medio de pago bancarizado)' }
                          ]}
                          onRegistrarNuevo={() => setActiveTab('DIGITACION')}
                          textoRegistrar="Registrar Primera Compra"
                        />
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((c: any) => (
                      <tr key={c.id} className={`hover:bg-slate-50 ${c.estado === 'ANULADO' ? 'opacity-50 line-through' : ''}`}>
                        <td className="p-3 whitespace-nowrap">{c.fechaEmision}</td>
                        <td className="p-3 font-bold text-blue-700">{c.tipoComprobante}</td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{c.serie}-{c.numero}</td>
                        <td className="p-3 text-slate-600">{c.proveedorRuc}</td>
                        <td className="p-3 font-sans truncate max-w-[180px] font-medium text-slate-800" title={c.proveedorNombre}>
                          {c.proveedorNombre}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">{Number(c.baseGravada).toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{Number(c.igv).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-slate-900">{Number(c.total).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {c.tipoAdquisicion || '1'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.estado === 'REGISTRADO' ? 'bg-emerald-100 text-emerald-800' :
                            c.estado === 'BORRADOR' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-indigo-600 font-bold">{c.asientoNumero || '-'}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setFormTipo(c.tipoComprobante);
                                setFormSerie(c.serie);
                                setFormNumero(`${parseInt(c.numero, 10) + 1 || 1}`);
                                setFormBase(c.baseGravada);
                                setFormIgv(c.igv);
                                setFormTotal(c.total);
                                setActiveTab('DIGITACION');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Duplicar datos para nueva factura (Ctrl+D)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {c.estado === 'REGISTRADO' && (
                              <button
                                onClick={() => setModalAnular({
                                  isOpen: true,
                                  id: c.id,
                                  serieNumero: `${c.serie}-${c.numero}`,
                                  motivo: 'Error de digitación'
                                })}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Anular comprobante con extorno contable"
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
                    <td colSpan={5} className="p-3">Totales ({filtrados.length} comprobantes)</td>
                    <td className="p-3 text-right font-mono">
                      S/ {filtrados.reduce((acc: number, c: any) => acc + (c.estado !== 'ANULADO' ? Number(c.baseGravada) : 0), 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      S/ {filtrados.reduce((acc: number, c: any) => acc + (c.estado !== 'ANULADO' ? Number(c.igv) : 0), 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-900 font-black">
                      S/ {filtrados.reduce((acc: number, c: any) => acc + (c.estado !== 'ANULADO' ? Number(c.total) : 0), 0).toFixed(2)}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA RÁPIDA DE PROVEEDOR */}
      {modalAltaProveedor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Alta Rápida de Proveedor</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">RUC (11 dígitos)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={11}
                    value={nuevoProvRuc}
                    onChange={(e) => setNuevoProvRuc(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConsultarRucEnModal();
                      }
                    }}
                    placeholder="20XXXXXXXXX"
                    className="flex-1 text-xs font-mono font-bold p-2 border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarRucEnModal}
                    disabled={consultandoModalRuc || nuevoProvRuc.length !== 11}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      consultandoModalRuc || nuevoProvRuc.length !== 11
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs'
                    }`}
                  >
                    {consultandoModalRuc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Consultar</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Razón Social</label>
                <input
                  type="text"
                  value={nuevoProvRazon}
                  onChange={(e) => setNuevoProvRazon(e.target.value.toUpperCase())}
                  placeholder="NOMBRE COMERCIAL S.A.C."
                  className="w-full text-xs font-bold p-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dirección Fiscal</label>
                <input
                  type="text"
                  value={nuevoProvDireccion}
                  onChange={(e) => setNuevoProvDireccion(e.target.value)}
                  placeholder="Av. Principal 123, Lima"
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Condición SUNAT</label>
                <select
                  value={nuevoProvCondicion}
                  onChange={(e) => setNuevoProvCondicion(e.target.value as any)}
                  className="w-full text-xs font-bold p-2 border border-slate-300 rounded-xl"
                >
                  <option value="HABIDO">HABIDO</option>
                  <option value="NO_HABIDO">NO HABIDO (Sin derecho a crédito fiscal)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setModalAltaProveedor(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearProveedorRapido}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
              >
                Guardar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ANULACIÓN */}
      {modalAnular.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Anular Comprobante</h3>
            </div>
            <p className="text-xs text-slate-600">
              ¿Está seguro de anular el comprobante <strong>{modalAnular.serieNumero}</strong>? Se generará un asiento de extorno vinculado y se cancelará la cuenta por pagar asociada.
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

      {/* Modal Visor y Exportador SISCONT (Formato Oficial B/N) */}
      {modalSiscontOpen && (
        <VisorReporteSiscontModal
          isOpen={modalSiscontOpen}
          onClose={() => setModalSiscontOpen(false)}
          definicion={construirDefinicionRegistroComprasSiscont(empresa, itemsCompras, periodo)}
          onExportarLegacyPdf={() => exportarRegistroComprasPdf(empresa, legacyCompras, periodo)}
        />
      )}
    </div>
  );
};
