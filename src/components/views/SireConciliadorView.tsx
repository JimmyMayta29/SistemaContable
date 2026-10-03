import React, { useState } from 'react';
import { 
  FileCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Search, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  Eye, 
  Sparkles,
  FileCode2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Settings2,
  Send,
  History,
  RotateCcw,
  Plus,
  ShieldCheck,
  FileArchive
} from 'lucide-react';
import { Comprobante, EmpresaCliente } from '../../types';
import { 
  useSireConciliacion, 
  useDescargarPropuestaSire, 
  useAplicarConciliacionSire,
  useRevertirLineaSire,
  useReglasProveedorSire,
  useGuardarReglaProveedorSire,
  useAceptarPropuestaOficialSire,
  useReemplazarPropuestaOficialSire,
  useRegistrarAjustePosteriorSire
} from '../../hooks/useSunatSirePle';
import { generarSireRceTxt } from '../../services/sireTxtGenerator';
import { useToast } from '../../context/ToastContext';

interface SireConciliadorViewProps {
  compras: Comprobante[];
  empresa: EmpresaCliente;
  periodo: string;
  onImportarComprobanteSunat?: (comprobante: Comprobante) => void;
}

type MainTab = 'CONCILIACION' | 'REGLAS' | 'CIERRE_OFICIAL' | 'AJUSTES_POSTERIORES';

export const SireConciliadorView: React.FC<SireConciliadorViewProps> = ({
  compras,
  empresa,
  periodo: initialPeriodo,
  onImportarComprobanteSunat
}) => {
  const { success, error, info, warning } = useToast();
  const [periodo, setPeriodo] = useState(initialPeriodo || '2026-09');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('CONCILIACION');
  const [tabRegistro, setTabRegistro] = useState<'COMPRAS' | 'VENTAS'>('COMPRAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [lineaDetalle, setLineaDetalle] = useState<any | null>(null);

  // Modals state
  const [motivoModal, setMotivoModal] = useState<{ open: boolean; accion: 'OBSERVAR' | 'IGNORAR'; lineas: string[] }>({
    open: false,
    accion: 'OBSERVAR',
    lineas: []
  });
  const [motivoTexto, setMotivoTexto] = useState('');

  const [revertirModal, setRevertirModal] = useState<{ open: boolean; lineaId: string; comprobante: string }>({
    open: false,
    lineaId: '',
    comprobante: ''
  });
  const [revertirMotivo, setRevertirMotivo] = useState('');

  // Ticket Modal state
  const [ticketModal, setTicketModal] = useState<{ open: boolean; ticket: string; operacion: string; detalle: any } | null>(null);

  // New Rule Form
  const [nuevaRegla, setNuevaRegla] = useState({
    proveedorRuc: '',
    proveedorRazonSocial: '',
    destinoCompra: '1' as '1' | '2' | '3' | '4',
    cuentaContableDefault: '60111',
    centroCostoDefault: 'CC-ADM'
  });

  // Ajuste Posterior Form
  const [nuevoAjuste, setNuevoAjuste] = useState({
    periodoAjuste: '2026-09',
    periodoAfectado: '2026-05',
    serie: 'F001',
    numero: '00004521',
    tipoComprobante: '01',
    rucEmisor: '20555888991',
    razonSocialEmisor: 'PROVEEDOR RECTIFICADO SAC',
    baseImponible: '1500.00',
    igv: '270.00',
    total: '1770.00'
  });

  // Queries & Mutations
  const { data: conciliacion, isLoading, refetch } = useSireConciliacion(empresa.id, tabRegistro, periodo);
  const { data: reglasProveedor = [], refetch: refetchReglas } = useReglasProveedorSire(empresa.id);

  const descargarMutation = useDescargarPropuestaSire(empresa.id);
  const aplicarMutation = useAplicarConciliacionSire(empresa.id);
  const revertirMutation = useRevertirLineaSire(empresa.id);
  const guardarReglaMutation = useGuardarReglaProveedorSire(empresa.id);
  const aceptarOficialMutation = useAceptarPropuestaOficialSire(empresa.id);
  const reemplazarOficialMutation = useReemplazarPropuestaOficialSire(empresa.id);
  const ajustePosteriorMutation = useRegistrarAjustePosteriorSire(empresa.id);

  // Handlers
  const handleDescargarPropuesta = async () => {
    try {
      await descargarMutation.mutateAsync({ tipo: tabRegistro, periodo });
      await refetch();
      success(`Propuesta SUNAT SIRE (${tabRegistro}) descargada y conciliada exitosamente.`, 'SIRE Sincronizado');
    } catch (err: any) {
      error(err.message || 'Error de red con servidor SIRE SUNAT', 'Fallo al Descargar');
    }
  };

  const handleAceptarIndividual = async (lineaId: string) => {
    try {
      await aplicarMutation.mutateAsync({
        accion: 'ACEPTAR',
        lineasIds: [lineaId]
      });
      success('Comprobante aceptado e incorporado atómicamente a la contabilidad.', 'Aceptación SIRE');
    } catch (err: any) {
      error(err.message || 'Error al aceptar comprobante', 'Error de Operación');
    }
  };

  const handleConfirmarMotivo = async () => {
    if (!motivoModal.lineas.length) return;
    try {
      await aplicarMutation.mutateAsync({
        accion: motivoModal.accion,
        lineasIds: motivoModal.lineas,
        motivo: motivoTexto || undefined
      });
      success(`Acción ${motivoModal.accion} aplicada a ${motivoModal.lineas.length} comprobante(s).`, 'SIRE Procesado');
      setMotivoModal({ open: false, accion: 'OBSERVAR', lineas: [] });
      setMotivoTexto('');
      setSelectedLines([]);
    } catch (err: any) {
      error(err.message || 'Error aplicando acción', 'Error');
    }
  };

  const handleConfirmarReversion = async () => {
    if (!revertirModal.lineaId) return;
    try {
      const res: any = await revertirMutation.mutateAsync({
        lineaId: revertirModal.lineaId,
        motivo: revertirMotivo || 'Reversión voluntaria de propuesta SIRE por ajuste'
      });
      success(
        `Aceptación revertida con éxito. Contra-asiento de extorno generado ID: ${res.extornoId || 'OK'}`,
        'Extorno Contable Generado'
      );
      setRevertirModal({ open: false, lineaId: '', comprobante: '' });
      setRevertirMotivo('');
    } catch (err: any) {
      error(err.message || 'Error al revertir aceptación', 'Fallo de Extorno');
    }
  };

  const handleCrearRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaRegla.proveedorRuc || nuevaRegla.proveedorRuc.length !== 11) {
      warning('El RUC del proveedor debe tener exactamente 11 dígitos.', 'Validación');
      return;
    }
    try {
      await guardarReglaMutation.mutateAsync(nuevaRegla);
      success(`Regla para proveedor ${nuevaRegla.proveedorRuc} guardada exitosamente.`, 'Regla Activa');
      setNuevaRegla({
        proveedorRuc: '',
        proveedorRazonSocial: '',
        destinoCompra: '1',
        cuentaContableDefault: '60111',
        centroCostoDefault: 'CC-ADM'
      });
      refetchReglas();
    } catch (err: any) {
      error(err.message || 'Error guardando regla', 'Error');
    }
  };

  const handleAceptarOficialPropuesta = async () => {
    try {
      const res: any = await aceptarOficialMutation.mutateAsync({ tipo: tabRegistro, periodo });
      setTicketModal({
        open: true,
        ticket: res.ticket,
        operacion: 'ACEPTACION_PROPUESTA_SIRE',
        detalle: res
      });
      success(`Propuesta oficial ${tabRegistro} aceptada. Ticket emitido: ${res.ticket}`, 'Ticket SUNAT Emitido');
    } catch (err: any) {
      error(err.message || 'Error en aceptación oficial', 'Fallo SUNAT');
    }
  };

  const handleReemplazarOficialPropuesta = async () => {
    try {
      const { nombreArchivo, contenido } = generarSireRceTxt(empresa.ruc, periodo, compras);
      const res: any = await reemplazarOficialMutation.mutateAsync({
        tipo: tabRegistro,
        periodo,
        archivoContenidoTxt: contenido
      });
      setTicketModal({
        open: true,
        ticket: res.ticket,
        operacion: 'REEMPLAZO_PROPUESTA_SIRE',
        detalle: { ...res, archivoNombre: nombreArchivo }
      });
      success(`Archivo de reemplazo enviado. Ticket SUNAT emitido: ${res.ticket}`, 'Reemplazo Registrado');
    } catch (err: any) {
      error(err.message || 'Error reemplazando propuesta', 'Fallo SUNAT');
    }
  };

  const handleGuardarAjustePosterior = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await ajustePosteriorMutation.mutateAsync({
        tipo: tabRegistro,
        periodoAjuste: nuevoAjuste.periodoAjuste,
        periodoAfectado: nuevoAjuste.periodoAfectado,
        comprobante: {
          serie: nuevoAjuste.serie,
          numero: nuevoAjuste.numero,
          tipoComprobante: nuevoAjuste.tipoComprobante,
          rucEmisor: nuevoAjuste.rucEmisor,
          razonSocialEmisor: nuevoAjuste.razonSocialEmisor,
          baseImponible: parseFloat(nuevoAjuste.baseImponible) || 0,
          igv: parseFloat(nuevoAjuste.igv) || 0,
          total: parseFloat(nuevoAjuste.total) || 0
        }
      });
      success(
        `Ajuste posterior registrado para período ${nuevoAjuste.periodoAfectado}. Seguimiento ID: ${res.ajusteId || res.id}`,
        'Ajuste SIRE Guardado'
      );
    } catch (err: any) {
      error(err.message || 'Error registrando ajuste posterior', 'Fallo');
    }
  };

  const handleDescargarReemplazo = () => {
    const { nombreArchivo, contenido } = generarSireRceTxt(empresa.ruc, periodo, compras);
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo.replace('000804', '000804_REEMPLAZO');
    a.click();
    URL.revokeObjectURL(url);
    info(`Archivo plano ${a.download} descargado para validación en el cliente SIRE SUNAT.`);
  };

  const lineas = conciliacion?.lineas || [];
  const filtradas = lineas.filter(l => {
    if (filtroEstado !== 'TODOS' && l.estadoConciliacion !== filtroEstado) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        l.serie?.toLowerCase().includes(s) ||
        l.numero?.toLowerCase().includes(s) ||
        l.rucEmisor?.toLowerCase().includes(s) ||
        l.razonSocialEmisor?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedLines.length === filtradas.length) {
      setSelectedLines([]);
    } else {
      setSelectedLines(filtradas.map(l => l.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Conciliador & Cierre Automatizado SUNAT SIRE (RCE & RVIE)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruce algorítmico por clave única (RUC-Tipo-Serie-Número), clasificación en los 8 estados normativos y cierre oficial con Tickets SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
          />

          <button
            onClick={handleDescargarPropuesta}
            disabled={descargarMutation.isPending}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${descargarMutation.isPending ? 'animate-spin' : ''}`} />
            {descargarMutation.isPending ? 'Descargando...' : 'Descargar Propuesta SIRE'}
          </button>

          <button
            onClick={handleDescargarReemplazo}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Genera el archivo plano oficial de reemplazo de propuesta SIRE 8.4"
          >
            <FileCode2 className="w-4 h-4 text-emerald-600" />
            Exportar TXT Reemplazo
          </button>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('CONCILIACION')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'CONCILIACION'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Conciliación & Cruce
          </button>
          <button
            onClick={() => setActiveMainTab('REGLAS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'REGLAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4 text-amber-500" />
            Reglas de Proveedor ({reglasProveedor.length})
          </button>
          <button
            onClick={() => setActiveMainTab('CIERRE_OFICIAL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'CIERRE_OFICIAL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Cierre Oficial & Tickets
          </button>
          <button
            onClick={() => setActiveMainTab('AJUSTES_POSTERIORES')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'AJUSTES_POSTERIORES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-purple-500" />
            Ajustes Posteriores (Anexos 11-13)
          </button>
        </div>

        {/* Subtabs RCE / RVIE */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTabRegistro('COMPRAS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tabRegistro === 'COMPRAS'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RCE (Compras 8.4)
          </button>
          <button
            onClick={() => setTabRegistro('VENTAS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tabRegistro === 'VENTAS'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RVIE (Ventas 14.4)
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CONCILIACION & CRUCE ALGORITMICO                       */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === 'CONCILIACION' && (
        <div className="space-y-4">
          {/* Summary KPI Cards with all 8 normative SIRE states */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div 
              onClick={() => setFiltroEstado('COINCIDE')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'COINCIDE' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Coinciden</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-600 font-mono">
                {conciliacion?.totalCoinciden ?? 0}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Cuadre exacto</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('SOLO_EN_SUNAT')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'SOLO_EN_SUNAT' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Solo SUNAT</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 font-mono">
                {conciliacion?.totalSoloSunat ?? 0}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Por incorporar</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('SOLO_EN_SISTEMA')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'SOLO_EN_SISTEMA' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Solo ERP</span>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-black text-blue-600 font-mono">
                {conciliacion?.totalSoloSistema ?? 0}
              </div>
              <span className="text-[10px] text-blue-700 font-medium">No en SUNAT</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('DIFERENCIA_IMPORTE')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'DIFERENCIA_IMPORTE' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Diferencia</span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 font-mono">
                {conciliacion?.totalDiferencias ?? 0}
              </div>
              <span className="text-[10px] text-rose-700 font-medium">Importe / IGV</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('ANULADO_EN_SUNAT')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'ANULADO_EN_SUNAT' ? 'ring-2 ring-red-500 border-red-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Anulado SUNAT</span>
                <X className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-xl font-black text-red-600 font-mono">
                {conciliacion?.totalAnuladosSunat ?? 0}
              </div>
              <span className="text-[10px] text-red-700 font-medium">Baja en SUNAT</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('PERIODO_DISTINTO')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'PERIODO_DISTINTO' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Período Distinto</span>
                <Clock className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-black text-purple-600 font-mono">
                {conciliacion?.totalPeriodoDistinto ?? 0}
              </div>
              <span className="text-[10px] text-purple-700 font-medium">Otro mes</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('DIFERENCIA_OTROS_CAMPOS')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'DIFERENCIA_OTROS_CAMPOS' ? 'ring-2 ring-cyan-500 border-cyan-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Otros Campos</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="text-xl font-black text-cyan-600 font-mono">
                {conciliacion?.totalDiferenciaOtrosCampos ?? 0}
              </div>
              <span className="text-[10px] text-cyan-700 font-medium">Moneda/Fechas</span>
            </div>

            <div 
              onClick={() => setFiltroEstado('POSIBLE_DUPLICADO')}
              className={`bg-white border rounded-xl p-3 shadow-xs cursor-pointer transition ${filtroEstado === 'POSIBLE_DUPLICADO' ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Duplicado</span>
                <Layers className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <div className="text-xl font-black text-orange-600 font-mono">
                {conciliacion?.totalPosibleDuplicado ?? 0}
              </div>
              <span className="text-[10px] text-orange-700 font-medium">Posible doble</span>
            </div>
          </div>

          {/* Batch Actions Bar */}
          {selectedLines.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-blue-900">
                {selectedLines.length} comprobante(s) seleccionado(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => aplicarMutation.mutateAsync({ accion: 'ACEPTAR', lineasIds: selectedLines })}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer"
                >
                  Aceptar en Lote
                </button>
                <button
                  onClick={() => setMotivoModal({ open: true, accion: 'OBSERVAR', lineas: selectedLines })}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition cursor-pointer"
                >
                  Observar en Lote
                </button>
                <button
                  onClick={() => setMotivoModal({ open: true, accion: 'IGNORAR', lineas: selectedLines })}
                  className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
                >
                  Ignorar en Lote
                </button>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'TODOS', label: 'Todos' },
                { key: 'COINCIDE', label: 'Coinciden' },
                { key: 'SOLO_EN_SUNAT', label: 'Solo SUNAT' },
                { key: 'SOLO_EN_SISTEMA', label: 'Solo ERP' },
                { key: 'DIFERENCIA_IMPORTE', label: 'Diferencia Importe' },
                { key: 'ANULADO_EN_SUNAT', label: 'Anulado SUNAT' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filtroEstado === key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por serie, número o RUC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedLines.length > 0 && selectedLines.length === filtradas.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="py-2.5 px-3">Comprobante</th>
                  <th className="py-2.5 px-3">Emisión</th>
                  <th className="py-2.5 px-3">Proveedor / RUC</th>
                  <th className="py-2.5 px-3 text-right">Base SUNAT</th>
                  <th className="py-2.5 px-3 text-right">Total SUNAT</th>
                  <th className="py-2.5 px-3 text-right">Total ERP</th>
                  <th className="py-2.5 px-3 text-center">Estado Normativo</th>
                  <th className="py-2.5 px-3 text-center">Decisión</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No se encontraron comprobantes para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedLines.includes(l.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLines(prev => [...prev, l.id]);
                            else setSelectedLines(prev => prev.filter(x => x !== l.id));
                          }}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        {l.serie}-{l.numero}
                        <span className="block text-[10px] font-normal text-slate-400">Tipo {l.tipoComprobante}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{l.fechaEmision}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">{l.razonSocialEmisor}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{l.rucEmisor}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        S/ {(l.baseSunat || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        S/ {(l.totalSunat || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {l.totalSistema !== undefined ? `S/ ${l.totalSistema.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {l.estadoConciliacion === 'COINCIDE' && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Coincide
                          </span>
                        )}
                        {l.estadoConciliacion === 'SOLO_EN_SUNAT' && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Solo SUNAT
                          </span>
                        )}
                        {l.estadoConciliacion === 'SOLO_EN_SISTEMA' && (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            Solo ERP
                          </span>
                        )}
                        {l.estadoConciliacion === 'DIFERENCIA_IMPORTE' && (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Diferencia (S/ {(l.diferenciaTotal || 0).toFixed(2)})
                          </span>
                        )}
                        {l.estadoConciliacion === 'ANULADO_EN_SUNAT' && (
                          <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            Anulado SUNAT
                          </span>
                        )}
                        {l.estadoConciliacion === 'PERIODO_DISTINTO' && (
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            Período Distinto
                          </span>
                        )}
                        {l.estadoConciliacion === 'DIFERENCIA_OTROS_CAMPOS' && (
                          <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                            Diferencia Campos
                          </span>
                        )}
                        {l.estadoConciliacion === 'POSIBLE_DUPLICADO' && (
                          <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            Duplicado
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          l.decision === 'ACEPTADA' ? 'text-emerald-700 bg-emerald-100' :
                          l.decision === 'OBSERVADA' ? 'text-amber-700 bg-amber-100' :
                          l.decision === 'IGNORADA' ? 'text-slate-500 bg-slate-100' :
                          'text-slate-600 bg-slate-100'
                        }`}>
                          {l.decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {l.decision !== 'ACEPTADA' ? (
                            <button
                              onClick={() => handleAceptarIndividual(l.id)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition cursor-pointer"
                              title="Aceptar comprobante e incorporar a contabilidad aplicando reglas"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setRevertirModal({
                                open: true,
                                lineaId: l.id,
                                comprobante: `${l.serie}-${l.numero}`
                              })}
                              className="p-1 hover:bg-purple-50 text-purple-600 rounded transition cursor-pointer"
                              title="Revertir aceptación con contra-asiento de extorno"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setMotivoModal({ open: true, accion: 'OBSERVAR', lineas: [l.id] })}
                            className="p-1 hover:bg-amber-50 text-amber-600 rounded transition cursor-pointer"
                            title="Observar comprobante con motivo"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMotivoModal({ open: true, accion: 'IGNORAR', lineas: [l.id] })}
                            className="p-1 hover:bg-slate-100 text-slate-500 rounded transition cursor-pointer"
                            title="Ignorar comprobante"
                          >
                            <X className="w-4 h-4" />
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: REGLAS INTELIGENTES POR PROVEEDOR (FASE 9.2)           */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === 'REGLAS' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Motor de Clasificación y Reglas Automáticas por Proveedor
            </h3>
            <p className="text-xs text-amber-800 mt-1 max-w-3xl leading-relaxed">
              Define para cada RUC proveedor su tipo de destino fiscal (Destinos 1 al 4 de la R.S. N° 000112-2021/SUNAT), su cuenta contable de costo o gasto PCGE (60, 63, 65) y centro de costos. Al aceptar una propuesta SIRE en bloque o individualmente, el sistema aplicará automáticamente estas reglas sin intervención manual.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Rule Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Registrar Nueva Regla
              </h4>
              <form onSubmit={handleCrearRegla} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RUC Proveedor (11 dígitos):</label>
                  <input
                    type="text"
                    maxLength={11}
                    required
                    value={nuevaRegla.proveedorRuc}
                    onChange={(e) => setNuevaRegla({ ...nuevaRegla, proveedorRuc: e.target.value })}
                    placeholder="20555888991"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Razón Social:</label>
                  <input
                    type="text"
                    required
                    value={nuevaRegla.proveedorRazonSocial}
                    onChange={(e) => setNuevaRegla({ ...nuevaRegla, proveedorRazonSocial: e.target.value })}
                    placeholder="COMERCIAL ANDINA SAC"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino Compra (R.S. 112-2021):</label>
                  <select
                    value={nuevaRegla.destinoCompra}
                    onChange={(e) => setNuevaRegla({ ...nuevaRegla, destinoCompra: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">Destino 1: Adquisición Gravada (100% Crédito Fiscal)</option>
                    <option value="2">Destino 2: Adquisición Destinada a Ventas Gravadas y No Gravadas (Prorrata)</option>
                    <option value="3">Destino 3: Adquisición Destinada a Ventas No Gravadas (Sin Crédito Fiscal)</option>
                    <option value="4">Destino 4: Adquisición No Gravada (Inafecta / Exonerada)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cuenta PCGE:</label>
                    <input
                      type="text"
                      value={nuevaRegla.cuentaContableDefault}
                      onChange={(e) => setNuevaRegla({ ...nuevaRegla, cuentaContableDefault: e.target.value })}
                      placeholder="60111"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Centro Costos:</label>
                    <input
                      type="text"
                      value={nuevaRegla.centroCostoDefault}
                      onChange={(e) => setNuevaRegla({ ...nuevaRegla, centroCostoDefault: e.target.value })}
                      placeholder="CC-ADM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardarReglaMutation.isPending}
                  className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {guardarReglaMutation.isPending ? 'Guardando...' : 'Guardar Regla'}
                </button>
              </form>
            </div>

            {/* List of Rules */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Catálogo de Reglas Activas ({reglasProveedor.length})</span>
                <span className="text-xs text-slate-400 font-normal">Aislamiento por Empresa Activo</span>
              </h4>

              {reglasProveedor.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aún no se han configurado reglas específicas por proveedor. El sistema utilizará la clasificación predeterminada de Destino 1 (Crédito Fiscal).
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {reglasProveedor.map((regla: any) => (
                    <div key={regla.id || regla.proveedorRuc} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">{regla.proveedorRazonSocial}</div>
                        <div className="text-slate-400 font-mono text-[11px]">RUC: {regla.proveedorRuc}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          regla.destinoCompra === '1' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          regla.destinoCompra === '2' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          regla.destinoCompra === '3' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          Destino {regla.destinoCompra}
                        </span>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          Cta: {regla.cuentaContableDefault} | {regla.centroCostoDefault}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CIERRE OFICIAL & TICKETS SUNAT (FASE 9.3)              */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === 'CIERRE_OFICIAL' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Cierre Oficial del Ciclo Mensual SIRE (R.S. N° 000112-2021/SUNAT)
            </h3>
            <p className="text-xs text-emerald-800 mt-1 max-w-3xl leading-relaxed">
              El cierre mensual formaliza la presentación de los Registros de Compras (RCE) y Ventas (RVIE). Puedes optar por aceptar la propuesta de SUNAT tal cual fue presentada o formular el reemplazo integral de la propuesta mediante la carga del archivo TXT normalizado. Ambas operaciones emiten el ticket oficial de recepción de SUNAT con valor tributario probatorio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action 1: Aceptar Propuesta */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Aceptar Propuesta Oficial SUNAT</h4>
                  <p className="text-xs text-slate-500">Período tributario activo: {periodo}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Confirma la propuesta de SUNAT para el registro de {tabRegistro}. Esta acción formaliza el registro sin observaciones y genera el ticket de constancia electrónica emitido por la plataforma SIRE.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo de Registro:</span>
                  <span className="font-bold text-slate-800">{tabRegistro === 'COMPRAS' ? 'RCE (Formato 8.4)' : 'RVIE (Formato 14.4)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Comprobantes Propuesta:</span>
                  <span className="font-bold text-slate-800">{conciliacion?.lineas?.length || 0}</span>
                </div>
              </div>

              <button
                onClick={handleAceptarOficialPropuesta}
                disabled={aceptarOficialMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                {aceptarOficialMutation.isPending ? 'Enviando a SUNAT...' : 'Aceptar Propuesta Oficial'}
              </button>
            </div>

            {/* Action 2: Reemplazar Propuesta */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Reemplazar Propuesta Oficial SIRE</h4>
                  <p className="text-xs text-slate-500">Estructura normalizada Anexo 8</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Sustituye íntegramente la propuesta de SUNAT por la información registrada y auditada en tu software contable. Emite un ticket de validación para seguimiento de estado en la cola asíncrona de SUNAT.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Comprobantes Internos:</span>
                  <span className="font-bold text-slate-800">{compras.length} comprobantes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validación de Esquema:</span>
                  <span className="font-bold text-emerald-600">Aprobado (Regla R.S. 112)</span>
                </div>
              </div>

              <button
                onClick={handleReemplazarOficialPropuesta}
                disabled={reemplazarOficialMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <FileCode2 className="w-4 h-4" />
                {reemplazarOficialMutation.isPending ? 'Transmitiendo Reemplazo...' : 'Enviar Reemplazo Oficial con Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: AJUSTES POSTERIORES (ANEXOS 11, 12, 13)                */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === 'AJUSTES_POSTERIORES' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
            <h3 className="text-base font-bold text-purple-950 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Módulo de Ajustes Posteriores SIRE (Anexos 11, 12 y 13)
            </h3>
            <p className="text-xs text-purple-800 mt-1 max-w-3xl leading-relaxed">
              Permite rectificar y modificar registros de meses ya cerrados en el SIRE conforme a la Resolución de Superintendencia N° 000112-2021/SUNAT. Cada ajuste queda vinculado al período original afectado, garantizando consistencia tributaria en fiscalizaciones posteriores.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-2xl">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Registrar Rectificatoria / Ajuste Posterior</h4>
            <form onSubmit={handleGuardarAjustePosterior} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Período de Ajuste (Actual):</label>
                  <input
                    type="month"
                    required
                    value={nuevoAjuste.periodoAjuste}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, periodoAjuste: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Período Afectado (Anterior):</label>
                  <input
                    type="month"
                    required
                    value={nuevoAjuste.periodoAfectado}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, periodoAfectado: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo Comprobante:</label>
                  <select
                    value={nuevoAjuste.tipoComprobante}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, tipoComprobante: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white"
                  >
                    <option value="01">01 - Factura</option>
                    <option value="03">03 - Boleta</option>
                    <option value="07">07 - Nota de Crédito</option>
                    <option value="08">08 - Nota de Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serie:</label>
                  <input
                    type="text"
                    required
                    value={nuevoAjuste.serie}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, serie: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Número:</label>
                  <input
                    type="text"
                    required
                    value={nuevoAjuste.numero}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, numero: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RUC Emisor:</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={nuevoAjuste.rucEmisor}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, rucEmisor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Razón Social:</label>
                  <input
                    type="text"
                    required
                    value={nuevoAjuste.razonSocialEmisor}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, razonSocialEmisor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Imponible:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevoAjuste.baseImponible}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const igv = (base * 0.18).toFixed(2);
                      const total = (base + parseFloat(igv)).toFixed(2);
                      setNuevoAjuste({ ...nuevoAjuste, baseImponible: e.target.value, igv, total });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IGV (18%):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevoAjuste.igv}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, igv: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevoAjuste.total}
                    onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, total: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ajustePosteriorMutation.isPending}
                className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <History className="w-4 h-4" />
                {ajustePosteriorMutation.isPending ? 'Registrando...' : 'Registrar Ajuste Posterior Anexo 11'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Motivo (Observar / Ignorar) */}
      {motivoModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {motivoModal.accion === 'OBSERVAR' ? 'Observar Comprobante SIRE' : 'Ignorar Comprobante SIRE'}
            </h3>
            <p className="text-xs text-slate-500">
              Indique el motivo que quedará registrado en la pista de auditoría inmutable del sistema:
            </p>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Ej: El comprobante corresponde a otro período o servicio no prestado..."
              rows={3}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMotivoModal({ open: false, accion: 'OBSERVAR', lineas: [] })}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarMotivo}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Revertir con Extorno Contable */}
      {revertirModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-purple-700">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">
                Revertir Aceptación de Propuesta SIRE
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Está seguro de revertir la aceptación del comprobante <strong className="font-mono text-slate-900">{revertirModal.comprobante}</strong>? Se generará automáticamente un <strong>asiento contable de extorno</strong> en el Libro Diario para preservar la partida doble y el cuadre histórico.
            </p>
            <input
              type="text"
              value={revertirMotivo}
              onChange={(e) => setRevertirMotivo(e.target.value)}
              placeholder="Motivo de la reversión (Ej: Error en imputación fiscal)..."
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRevertirModal({ open: false, lineaId: '', comprobante: '' })}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarReversion}
                disabled={revertirMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition cursor-pointer"
              >
                {revertirMutation.isPending ? 'Extornando...' : 'Confirmar y Extornar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket SUNAT */}
      {ticketModal && ticketModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-600 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-7 h-7" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Constancia Electrónica SIRE Emitida</h3>
                <p className="text-xs text-slate-500">Operación: {ticketModal.operacion}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ticket SUNAT:</span>
                <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {ticketModal.ticket}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Período:</span>
                <span className="font-semibold text-slate-800">{periodo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Normativa de Referencia:</span>
                <span className="font-medium text-slate-700">R.S. N° 000112-2021/SUNAT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado en Cola SUNAT:</span>
                <span className="font-bold text-emerald-600">RECEPCIONADO_CONFORME</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Este número de ticket certifica ante la Administración Tributaria el cumplimiento de la obligación de presentación de los registros electrónicos en el plazo legal establecido.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setTicketModal(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
