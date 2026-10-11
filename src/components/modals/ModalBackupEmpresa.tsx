import React, { useState, useEffect } from 'react';
import { 
  X, 
  Archive, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive, 
  Clock, 
  Lock, 
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';
import { useToast } from '../../context/ToastContext';

interface ModalBackupEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalBackupEmpresa: React.FC<ModalBackupEmpresaProps> = ({
  isOpen,
  onClose
}) => {
  const { empresaActiva } = useEmpresaPeriodo();
  const { success, error: toastError } = useToast();

  const [backups, setBackups] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Estado para modal de restauración
  const [backupParaRestaurar, setBackupParaRestaurar] = useState<any | null>(null);
  const [rucConfirmacion, setRucConfirmacion] = useState('');
  const [restaurando, setRestaurando] = useState(false);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && empresaActiva?.id) {
      cargarBackups();
    }
  }, [isOpen, empresaActiva?.id]);

  const cargarBackups = async () => {
    if (!empresaActiva?.id) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/empresas/${empresaActiva.id}/backups`);
      const data = await res.json();
      if (data.success) {
        setBackups(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando backups:', err);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerarBackup = async () => {
    if (!empresaActiva?.id) return;
    setGenerando(true);
    try {
      const res = await fetch(`/api/empresas/${empresaActiva.id}/backups/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen: 'MANUAL' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error generando respaldo');
      }
      success(`Copia de seguridad generada: ${data.data.nombreArchivo}`);
      cargarBackups();
    } catch (err: any) {
      toastError(err.message || 'No se pudo generar la copia de seguridad.');
    } finally {
      setGenerando(false);
    }
  };

  const handleVerificarIntegridad = async (b: any) => {
    if (!empresaActiva?.id) return;
    setVerificandoId(b.id);
    try {
      const res = await fetch(`/api/empresas/${empresaActiva.id}/backups/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: b.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fallo de integridad');
      }
      success(`Integridad verificada con éxito (AES-256-GCM y Checksum SHA-256 válidos).`);
    } catch (err: any) {
      toastError(err.message || 'Error verificando integridad del archivo.');
    } finally {
      setVerificandoId(null);
    }
  };

  const handleEjecutarRestauracion = async () => {
    if (!empresaActiva?.id || !backupParaRestaurar) return;
    if (rucConfirmacion.trim() !== empresaActiva.ruc) {
      toastError('El RUC ingresado no coincide exactamente con el RUC de la empresa activa.');
      return;
    }

    setRestaurando(true);
    try {
      const res = await fetch(`/api/empresas/${empresaActiva.id}/backups/restaurar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId: backupParaRestaurar.id,
          rucConfirmacion: rucConfirmacion.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error restaurando datos');
      }

      success(`Restauración atómica completada: ${data.data.registrosRestaurados} registros restablecidos.`);
      setBackupParaRestaurar(null);
      setRucConfirmacion('');
      onClose();
      // Recargar datos en ventana
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || 'Error al ejecutar restauración.');
    } finally {
      setRestaurando(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-400">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Copias de Seguridad por Empresa (Formato SISCONT)</h3>
              <p className="text-xs text-slate-300">
                Empresa: <span className="text-white font-semibold">{empresaActiva?.razonSocial || 'Empresa Activa'}</span> (RUC: {empresaActiva?.ruc})
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

        {/* Barra superior de acciones */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-2 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Cifrado AES-256-GCM con Checksum SHA-256</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-2 text-xs text-slate-700">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Política de Rotación: Últimos 10 Respaldos</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarBackups}
              className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              title="Actualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleGenerarBackup}
              disabled={generando}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>{generando ? 'Generando Copia...' : 'Generar Respaldo Ahora'}</span>
            </button>
          </div>
        </div>

        {/* Tabla de Backups */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {cargando ? (
            <div className="p-8 text-center text-slate-500 text-xs">Cargando copias de seguridad...</div>
          ) : backups.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-xl">
              <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No existen copias de seguridad generadas</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Haga clic en "Generar Respaldo Ahora" para crear un paquete ZIP cifrado con los registros contables y operacionales de esta empresa.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Archivo ZIP</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Tamaño</th>
                    <th className="p-3">Fecha de Creación</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="p-3">
                        <div className="font-mono font-medium text-slate-900">{b.nombreArchivo}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                          SHA: {b.hashSha256 || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.origen === 'MANUAL' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {b.origen}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{formatBytes(b.tamanoBytes)}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(b.fechaCreacion).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleVerificarIntegridad(b)}
                            disabled={verificandoId === b.id}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Verificar Integridad SHA-256"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/empresas/${empresaActiva?.id}/backups/${b.id}/descargar`}
                            download={b.nombreArchivo}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Descargar paquete ZIP"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setBackupParaRestaurar(b);
                              setRucConfirmacion('');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Confirmación para Restaurar */}
        {backupParaRestaurar && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 max-w-md w-full space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-bold text-slate-900">
                  ¿Confirmar Restauración de Copia de Seguridad?
                </h4>
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  ADVERTENCIA DE SOBRESCRITURA DE DATOS
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Esta acción restaurará el estado exacto de la empresa desde el archivo{' '}
                  <strong className="font-mono">{backupParaRestaurar.nombreArchivo}</strong>.
                  Cualquier registro ingresado posterior a esa fecha será reemplazado.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Para confirmar, escriba el RUC exacto de la empresa ({empresaActiva?.ruc}):
                </label>
                <input
                  type="text"
                  value={rucConfirmacion}
                  onChange={e => setRucConfirmacion(e.target.value)}
                  placeholder={empresaActiva?.ruc}
                  className="w-full p-2 border border-slate-300 rounded-lg text-center font-mono font-bold tracking-wider"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBackupParaRestaurar(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEjecutarRestauracion}
                  disabled={restaurando || rucConfirmacion.trim() !== empresaActiva?.ruc}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {restaurando ? 'Restaurando...' : 'Sobrescribir y Restaurar'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
