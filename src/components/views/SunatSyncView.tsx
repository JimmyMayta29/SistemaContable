import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  UploadCloud, 
  FileCode, 
  FileText, 
  Download, 
  RefreshCw, 
  AlertCircle,
  ShieldCheck,
  Building,
  Info
} from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { 
  useSunatConexionEstado, 
  useGuardarConexionSunat, 
  useValidarConexionSunat,
  useComprobantesXmlList,
  useImportarComprobantesXml,
  usePleLibrosCatalogo,
  useExportarPle
} from '../../hooks/useSunatSirePle';
import { useToast } from '../../context/ToastContext';

interface SunatSyncViewProps {
  empresa: EmpresaCliente;
  onUpdateEmpresa?: (updated: Partial<EmpresaCliente>) => void;
  compras?: any[];
  ventas?: any[];
  onAddComprobantes?: (nuevos: any[], tipo: 'COMPRAS' | 'VENTAS') => void;
}

export const SunatSyncView: React.FC<SunatSyncViewProps> = ({ empresa }) => {
  const { success, error, warning, info } = useToast();
  const [activeTab, setActiveTab] = useState<'conexion' | 'xml' | 'ple'>('conexion');

  // Form states for credentials (write-only for passwords, never prefilled from server)
  const [usuarioSol, setUsuarioSol] = useState('');
  const [claveSol, setClaveSol] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [modoSimulado, setModoSimulado] = useState(true);

  // XML uploader state
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // PLE state
  const [periodoPle, setPeriodoPle] = useState('2026-09');
  const [pleModal, setPleModal] = useState<{ open: boolean; exportacion: any | null }>({ open: false, exportacion: null });

  // Queries & Mutations
  const { data: estadoConexion, isLoading: loadingEstado, refetch: refetchEstado } = useSunatConexionEstado(empresa.id);
  const guardarMutation = useGuardarConexionSunat(empresa.id);
  const validarMutation = useValidarConexionSunat(empresa.id);
  const { data: xmlList = [], refetch: refetchXml } = useComprobantesXmlList(empresa.id);
  const importarXmlMutation = useImportarComprobantesXml(empresa.id);
  const { data: pleLibros = [] } = usePleLibrosCatalogo(empresa.id);
  const exportarPleMutation = useExportarPle(empresa.id);

  const handleGuardarCredenciales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSol || !claveSol) {
      warning('Debe ingresar Usuario SOL y Clave SOL para configurar el acceso.', 'Credenciales Incompletas');
      return;
    }
    try {
      await guardarMutation.mutateAsync({
        ruc: empresa.ruc,
        usuarioSol,
        claveSol,
        clientId: clientId || undefined,
        clientSecret: clientSecret || undefined,
        modoSimulado
      });
      // Limpiar campos sensibles de la memoria
      setClaveSol('');
      setClientSecret('');
      await refetchEstado();
      success('Credenciales cifradas con AES-256-GCM y guardadas exitosamente.', 'Seguridad SUNAT');
    } catch (err: any) {
      error('Error guardando credenciales: ' + (err.message || 'Error'), 'Fallo de Cifrado');
    }
  };

  const handleValidarConexion = async () => {
    try {
      const res: any = await validarMutation.mutateAsync();
      await refetchEstado();
      success(`Resultado de validación: ${res.mensaje}`, 'Conexión SUNAT');
    } catch (err: any) {
      error('Fallo en validación SUNAT: ' + (err.message || 'Error'), 'Error de Conexión');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const payloadArchivos: Array<{ nombre: string; contenidoBase64: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buffer = await f.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      payloadArchivos.push({ nombre: f.name, contenidoBase64: base64 });
    }

    try {
      const res: any = await importarXmlMutation.mutateAsync(payloadArchivos);
      setUploadFeedback(`Importación completada: ${res.exitosos} exitoso(s), ${res.fallidos} fallido(s).`);
      await refetchXml();
      success(`Importación de XML completada: ${res.exitosos} comprobante(s) procesados.`, 'Carga UBL');
    } catch (err: any) {
      error('Error en importación XML: ' + (err.message || 'Error'), 'Fallo XML');
    }
  };

  const handleExportarPle = async (codigoLibro: string) => {
    try {
      const res: any = await exportarPleMutation.mutateAsync({
        periodo: periodoPle,
        codigoLibro,
        ruc: empresa.ruc
      });
      success('Trabajo de generación de libro PLE 5.2 encolado exitosamente.', 'PLE 5.2 Encolado');
    } catch (err: any) {
      error('Error exportando libro PLE: ' + (err.message || 'Error'), 'Error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            Integración SUNAT, XML UBL y Libros Electrónicos (PLE)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión criptográfica de credenciales SOL (AES-256-GCM), validador seguro anti-XXE y generación oficial PLE 5.2.
          </p>
        </div>

        {/* State Banner */}
        <div className="flex items-center gap-2">
          {estadoConexion?.modoSimulado ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>MODO SIMULADO (Sandbox SUNAT)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>CONEXIÓN REAL PRODUCCIÓN</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('conexion')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'conexion'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Credenciales & Conexión SUNAT
        </button>
        <button
          onClick={() => setActiveTab('xml')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'xml'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Importador Seguro XML / CDR
        </button>
        <button
          onClick={() => setActiveTab('ple')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'ple'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Libros Electrónicos PLE 5.2
        </button>
      </div>

      {/* TAB 1: CREDENCIALES & CONEXIÓN */}
      {activeTab === 'conexion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <form onSubmit={handleGuardarCredenciales} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Credenciales Clave SOL & API SIRE (Cifrado AES-256-GCM)
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Solo Escritura
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">RUC:</label>
                  <input
                    type="text"
                    disabled
                    value={empresa.ruc}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Usuario SOL:</label>
                    <input
                      type="text"
                      value={usuarioSol}
                      onChange={(e) => setUsuarioSol(e.target.value)}
                      placeholder="MODDATOS"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Clave SOL:</label>
                    <input
                      type="password"
                      value={claveSol}
                      onChange={(e) => setClaveSol(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Client ID (Opcional):</label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="ID API SUNAT"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Client Secret (Opcional):</label>
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Secret API SUNAT"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="simuladoCheck"
                      checked={modoSimulado}
                      onChange={(e) => setModoSimulado(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <label htmlFor="simuladoCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                      Operar en MODO SIMULADO (Sandbox de prueba)
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Siguiendo la regla de control estricto, el sistema opera con el simulador determinista oficial hasta que autorices conexiones en vivo.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={guardarMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    {guardarMutation.isPending ? 'Guardando...' : 'Guardar Credenciales Cifradas'}
                  </button>
                  <button
                    type="button"
                    onClick={handleValidarConexion}
                    disabled={validarMutation.isPending}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validarMutation.isPending ? 'animate-spin' : ''}`} />
                    Validar Conexión
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Estado Real de la Conexión
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Configurado:</span>
                  <span className="font-bold text-slate-800">{estadoConexion?.configurado ? 'SÍ' : 'NO'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado de Validación:</span>
                  <span className={`font-bold ${
                    estadoConexion?.estado === 'CONECTADO' ? 'text-emerald-600' :
                    estadoConexion?.estado === 'MODO_SIMULADO' ? 'text-amber-600' :
                    estadoConexion?.estado === 'ERROR' ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    {estadoConexion?.estado || 'SIN CONFIGURAR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Último Chequeo:</span>
                  <span className="font-mono text-slate-700">{estadoConexion?.ultimoChequeo ? new Date(estadoConexion.ultimoChequeo).toLocaleString() : 'Pendiente'}</span>
                </div>
                {estadoConexion?.ultimoError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                    {estadoConexion.ultimoError}
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Política de Seguridad Estricta
                </div>
                <p className="text-[11px] text-blue-800">
                  Las credenciales nunca viajan en claro al navegador en las respuestas GET. Toda comunicación externa se realiza exclusivamente desde el backend en segundo plano con límites de tasa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORTADOR XML / CDR */}
      {activeTab === 'xml' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Importación Individual y Masiva de Comprobantes XML UBL 2.1 & CDR
            </h3>
            <p className="text-xs text-slate-500">
              Procesador protegido contra ataques XXE (entidades externas deshabilitadas), archivos sobredimensionados y bombas ZIP.
            </p>

            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl bg-blue-50/30 cursor-pointer transition">
              <FileCode className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-xs font-bold text-slate-800">Seleccionar archivos XML o comprimidos ZIP</span>
              <span className="text-[10px] text-slate-500 mt-1">Límites: Máx 5 MB por XML, 20 MB por ZIP, hasta 50 archivos por lote</span>
              <input
                type="file"
                multiple
                accept=".xml,.zip"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {uploadFeedback}
              </div>
            )}
          </div>

          {/* List of XMLs */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Comprobantes XML & CDRs Procesados ({xmlList.length})
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-white text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Archivo</th>
                  <th className="py-2.5 px-3">Comprobante</th>
                  <th className="py-2.5 px-3">Emisión</th>
                  <th className="py-2.5 px-3">Emisor / RUC</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Estado CDR</th>
                  <th className="py-2.5 px-3 text-center">Procesamiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {xmlList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No se han importado archivos XML en este período.
                    </td>
                  </tr>
                ) : (
                  xmlList.map((x: any) => (
                    <tr key={x.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-mono font-medium text-slate-800 truncate max-w-[180px]">{x.nombreArchivo}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{x.serie}-{x.numero}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{x.fechaEmision}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">{x.razonSocialEmisor}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{x.rucEmisor}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">S/ {Number(x.total).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {x.cdrEstado || 'ACEPTADO'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {x.estadoProcesamiento}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIBROS ELECTRÓNICOS PLE 5.2 */}
      {activeTab === 'ple' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Generador de Libros Electrónicos PLE 5.2 (SUNAT)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generación oficial a partir de asientos y registros contabilizados con validación de semáforo previo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Período:</span>
                <input
                  type="month"
                  value={periodoPle}
                  onChange={(e) => setPeriodoPle(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {pleLibros.map((libro) => (
                <div key={libro.codigoLibro} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-slate-800">{libro.codigoLibro}</span>
                      {libro.validadoOficial ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Validado Oficial
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" title="Requiere confirmación oficial">
                          Vista Previa No Oficial
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{libro.nombreLibro}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {libro.especificacionNormativa}
                    </p>
                  </div>

                  <button
                    onClick={() => handleExportarPle(libro.codigoLibro)}
                    disabled={exportarPleMutation.isPending}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {libro.validadoOficial ? 'Generar PLE Oficial' : 'Generar Vista Previa'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
