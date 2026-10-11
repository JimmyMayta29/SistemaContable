import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  FileText, 
  Users, 
  BookOpen, 
  DollarSign, 
  Package, 
  History,
  AlertTriangle
} from 'lucide-react';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';
import { useToast } from '../../context/ToastContext';

export type TipoMaestro = 
  | 'PROVEEDORES' 
  | 'CLIENTES' 
  | 'PLAN_CUENTAS' 
  | 'SALDOS_INICIALES' 
  | 'TRABAJADORES' 
  | 'ARTICULOS';

interface ModalImportacionCsvProps {
  isOpen: boolean;
  onClose: () => void;
  tipoInicial?: TipoMaestro;
  onImportExitoso?: () => void;
}

export const ModalImportacionCsv: React.FC<ModalImportacionCsvProps> = ({
  isOpen,
  onClose,
  tipoInicial = 'PROVEEDORES',
  onImportExitoso
}) => {
  const { empresaActiva } = useEmpresaPeriodo();
  const { success, error: toastError } = useToast();

  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoMaestro>(tipoInicial);
  const [tabActual, setTabActual] = useState<'IMPORTAR' | 'HISTORIAL'>('IMPORTAR');

  const [archivoContenido, setArchivoContenido] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [analizando, setAnalizando] = useState(false);
  const [resultadoAnalisis, setResultadoAnalisis] = useState<any | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Opciones de confirmación
  const [modo, setModo] = useState<'OMITIR_ERRORES' | 'TODO_O_NADA'>('OMITIR_ERRORES');
  const [duplicados, setDuplicados] = useState<'OMITIR' | 'ACTUALIZAR'>('OMITIR');

  // Historial de lotes
  const [historialLotes, setHistorialLotes] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (tipoInicial) {
      setTipoSeleccionado(tipoInicial);
    }
  }, [tipoInicial]);

  // Cargar historial al abrir pestaña de historial
  useEffect(() => {
    if (isOpen && tabActual === 'HISTORIAL' && empresaActiva?.id) {
      cargarHistorial();
    }
  }, [isOpen, tabActual, empresaActiva?.id]);

  const cargarHistorial = async () => {
    if (!empresaActiva?.id) return;
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/importacion/empresas/${empresaActiva.id}/historial`);
      const data = await res.json();
      if (data.success) {
        setHistorialLotes(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando historial de importaciones:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  if (!isOpen) return null;

  const handleDescargarPlantilla = async () => {
    try {
      const res = await fetch(`/api/importacion/plantillas/${tipoSeleccionado}`);
      const data = await res.json();
      if (data.success && data.data) {
        const blob = new Blob([data.data.contenidoCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success(`Plantilla descargada: ${data.data.nombreArchivo}`);
      }
    } catch (err) {
      toastError('No se pudo descargar la plantilla oficial.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setResultadoAnalisis(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const texto = event.target?.result as string;
      setArchivoContenido(texto);
      ejecutarAnalisis(texto);
    };
    reader.readAsText(file);
  };

  const ejecutarAnalisis = async (texto: string) => {
    if (!empresaActiva?.id) return;
    setAnalizando(true);

    try {
      const res = await fetch(`/api/importacion/empresas/${empresaActiva.id}/analizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoMaestro: tipoSeleccionado,
          contenidoTexto: texto
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al analizar el archivo');
      }

      setResultadoAnalisis(data.data);
    } catch (err: any) {
      toastError(err.message || 'Error analizando estructura del archivo');
    } finally {
      setAnalizando(false);
    }
  };

  const handleConfirmarImportacion = async () => {
    if (!empresaActiva?.id || !resultadoAnalisis?.loteId) return;
    setConfirmando(true);

    try {
      const res = await fetch(`/api/importacion/empresas/${empresaActiva.id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loteId: resultadoAnalisis.loteId,
          modo,
          duplicados
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al confirmar importación');
      }

      success(`Importación completada: ${data.data.insertados} registros insertados.`);
      setResultadoAnalisis(null);
      setArchivoContenido(null);
      setNombreArchivo('');
      if (onImportExitoso) onImportExitoso();
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Error confirmando importación');
    } finally {
      setConfirmando(false);
    }
  };

  const handleDeshacerLote = async (loteId: string) => {
    if (!empresaActiva?.id) return;
    if (!confirm('¿Está seguro de revertir este lote de importación? Se eliminarán los registros asociados creados por este lote.')) return;

    try {
      const res = await fetch(`/api/importacion/empresas/${empresaActiva.id}/deshacer/${loteId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al deshacer lote');
      }
      success('Lote revertido exitosamente.');
      cargarHistorial();
      if (onImportExitoso) onImportExitoso();
    } catch (err: any) {
      toastError(err.message || 'Error revirtiendo lote');
    }
  };

  const TIPOS_CONFIG = [
    { id: 'PROVEEDORES', label: 'Proveedores', icon: <Users className="w-4 h-4" /> },
    { id: 'CLIENTES', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'PLAN_CUENTAS', label: 'Plan de Cuentas', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'SALDOS_INICIALES', label: 'Saldos Iniciales / Apertura', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'TRABAJADORES', label: 'Trabajadores', icon: <Users className="w-4 h-4" /> },
    { id: 'ARTICULOS', label: 'Artículos / Kardex', icon: <Package className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Motor de Importación de Datos (CSV / Excel)</h3>
              <p className="text-xs text-slate-300">
                Empresa: <span className="text-white font-semibold">{empresaActiva?.razonSocial || 'Empresa Activa'}</span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas Importar / Historial */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTabActual('IMPORTAR')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                tabActual === 'IMPORTAR'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Importar Nuevo Lote</span>
            </button>
            <button
              type="button"
              onClick={() => setTabActual('HISTORIAL')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                tabActual === 'HISTORIAL'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial y Rollback</span>
            </button>
          </div>

          {tabActual === 'IMPORTAR' && (
            <button
              type="button"
              onClick={handleDescargarPlantilla}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla {TIPOS_CONFIG.find(t => t.id === tipoSeleccionado)?.label}</span>
            </button>
          )}
        </div>

        {/* Contenido Principal */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {tabActual === 'IMPORTAR' ? (
            <div className="space-y-5">
              {/* Selector de Maestro a Importar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Seleccione el catálogo o maestro que desea importar:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIPOS_CONFIG.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTipoSeleccionado(t.id as TipoMaestro);
                        setResultadoAnalisis(null);
                        setArchivoContenido(null);
                        setNombreArchivo('');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        tipoSeleccionado === t.id
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.icon}
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zona de subida de archivo */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csvFileInput"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {nombreArchivo ? nombreArchivo : 'Haga clic para seleccionar o arrastre un archivo CSV / TXT'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Detecta automáticamente delimitadores (, o ;) y codificación UTF-8
                  </span>
                </label>
              </div>

              {analizando && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xs text-indigo-700 font-medium">
                  Analizando estructura de columnas y validando reglas normativas...
                </div>
              )}

              {/* Resultados del Análisis Pre-Vuelo */}
              {resultadoAnalisis && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Resumen de Validación Previa (Pre-flight Check)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Lote ID: <code className="text-slate-700 font-mono">{resultadoAnalisis.loteId}</code>
                    </span>
                  </div>

                  {/* Tarjetas de estadísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <p className="text-[11px] text-slate-500">Total Filas</p>
                      <p className="text-base font-bold text-slate-800">{resultadoAnalisis.totalFilas}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                      <p className="text-[11px] text-emerald-700">Filas Válidas</p>
                      <p className="text-base font-bold text-emerald-800">{resultadoAnalisis.filasValidas}</p>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                      <p className="text-[11px] text-rose-700">Filas con Errores</p>
                      <p className="text-base font-bold text-rose-800">{resultadoAnalisis.filasInvalidas}</p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <p className="text-[11px] text-amber-700">Duplicados</p>
                      <p className="text-base font-bold text-amber-800">{resultadoAnalisis.filasDuplicadas}</p>
                    </div>
                  </div>

                  {/* Cuadre de Saldos Iniciales si aplica */}
                  {tipoSeleccionado === 'SALDOS_INICIALES' && (
                    <div className={`p-4 rounded-xl border ${
                      resultadoAnalisis.cuadraBalance
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          {resultadoAnalisis.cuadraBalance ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          )}
                          Verificación de Partida Doble en Asiento de Apertura
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          resultadoAnalisis.cuadraBalance ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {resultadoAnalisis.cuadraBalance ? 'CUADRADO' : 'DESCUADRADO'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>Debe Total: <strong>S/ {(resultadoAnalisis.totalDebe || 0).toFixed(2)}</strong></div>
                        <div>Haber Total: <strong>S/ {(resultadoAnalisis.totalHaber || 0).toFixed(2)}</strong></div>
                        <div>Diferencia: <strong>S/ {(resultadoAnalisis.diferencia || 0).toFixed(2)}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Errores Encontrados si los hay */}
                  {resultadoAnalisis.errores && resultadoAnalisis.errores.length > 0 && (
                    <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3 max-h-48 overflow-y-auto">
                      <p className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Observaciones y Errores Detectados ({resultadoAnalisis.errores.length}):
                      </p>
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="text-slate-600 border-b border-rose-200">
                            <th className="pb-1">Fila</th>
                            <th className="pb-1">Campo</th>
                            <th className="pb-1">Valor</th>
                            <th className="pb-1">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {resultadoAnalisis.errores.map((err: any, idx: number) => (
                            <tr key={idx} className="text-rose-900">
                              <td className="py-1 font-mono font-bold">#{err.fila}</td>
                              <td className="py-1 font-mono">{err.campo}</td>
                              <td className="py-1 max-w-[120px] truncate">{String(err.valor || '-')}</td>
                              <td className="py-1">{err.mensaje}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Opciones de Inserción */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-slate-800">
                      Políticas de Inserción:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Tratamiento de Errores:</label>
                        <select
                          value={modo}
                          onChange={e => setModo(e.target.value as any)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="OMITIR_ERRORES">Omitir filas erróneas e importar las válidas</option>
                          <option value="TODO_O_NADA">Todo o Nada (Abortar si hay al menos 1 error)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Tratamiento de Duplicados:</label>
                        <select
                          value={duplicados}
                          onChange={e => setDuplicados(e.target.value as any)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="OMITIR">Omitir registros ya existentes</option>
                          <option value="ACTUALIZAR">Actualizar datos de los existentes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Confirmación */}
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setResultadoAnalisis(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmarImportacion}
                      disabled={confirmando || (resultadoAnalisis.filasValidas === 0) || (tipoSeleccionado === 'SALDOS_INICIALES' && !resultadoAnalisis.cuadraBalance)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      {confirmando ? (
                        <span>Insertando Registros...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar e Importar ({resultadoAnalisis.filasValidas} válidos)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PESTAÑA HISTORIAL Y ROLLBACK */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-600">
                  Historial de lotes importados para esta empresa. Puede revertir cualquier lote para eliminar sus registros asociados.
                </p>
                <button
                  type="button"
                  onClick={cargarHistorial}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Actualizar
                </button>
              </div>

              {cargandoHistorial ? (
                <div className="p-8 text-center text-slate-500 text-xs">Cargando historial de lotes...</div>
              ) : historialLotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  No hay lotes de importación registrados para esta empresa.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-3">Lote ID</th>
                        <th className="p-3">Maestro</th>
                        <th className="p-3">Registros</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historialLotes.map((lote) => (
                        <tr key={lote.loteId} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-medium text-slate-800">{lote.loteId}</td>
                          <td className="p-3 font-medium text-slate-700">{lote.tipoMaestro}</td>
                          <td className="p-3">{lote.totalRegistros}</td>
                          <td className="p-3 text-slate-500">{new Date(lote.fechaImportacion).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lote.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {lote.activo ? 'ACTIVO' : 'REVERTIDO'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {lote.activo && (
                              <button
                                type="button"
                                onClick={() => handleDeshacerLote(lote.loteId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Deshacer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
