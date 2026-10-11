import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  ShieldCheck, 
  ChevronDown, 
  Bell, 
  Sparkles,
  Search, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Lock,
  Layers,
  User,
  Users,
  RotateCcw,
  Upload,
  Archive
} from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { useEmpresaPeriodo, RolEmpresa } from '../../context/EmpresaPeriodoContext';
import { useToast } from '../../context/ToastContext';
import { BackgroundJobsPanel } from './BackgroundJobsPanel';

interface TitleBarProps {
  empresaActiva?: EmpresaCliente | null;
  onOpenConfig?: () => void;
  onOpenPdfExport?: () => void;
  onOpenImport?: () => void;
  onOpenBackup?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  empresaActiva: propEmpresaActiva,
  onOpenConfig,
  onOpenPdfExport,
  onOpenImport,
  onOpenBackup
}) => {
  const { 
    nivelNavegacion, 
    empresaActiva: contextEmpresaActiva, 
    salirAEmpresas, 
    periodo, 
    setPeriodo,
    isPeriodoCerrado,
    usuario,
    setUsuarioIdDemo,
    rolEnEmpresa,
    setRolEnEmpresa,
    setIsSearchModalOpen,
    trabajosSegundoPlano
  } = useEmpresaPeriodo();

  const [isJobsOpen, setIsJobsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [restableciendoDemo, setRestableciendoDemo] = useState(false);
  const { success, error: toastError } = useToast();

  const empresa = contextEmpresaActiva || propEmpresaActiva;
  const isNivelEmpresa = nivelNavegacion === 'EMPRESA' && empresa;
  const isDemoEmpresa = empresa?.esDemo || empresa?.id === 'emp-demo-sac' || empresa?.ruc === '20000000001';

  const handleRestablecerDemo = async () => {
    if (!confirm('¿Desea restablecer todos los datos de la Empresa Demo S.A.C.? Se volverán a cargar 20 compras, 15 ventas, planillas y el balance cuadrado.')) {
      return;
    }
    setRestableciendoDemo(true);
    try {
      const token = localStorage.getItem('sunaconta_jwt_token');
      const res = await fetch('/api/empresas/demo/restablecer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error restableciendo empresa demo');
      }
      success('Empresa Demo S.A.C. restablecida con balance cuadrado y 100% de operaciones.');
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || 'Error al restablecer la empresa demo');
    } finally {
      setRestableciendoDemo(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 select-none z-40 text-xs shadow-xs relative">
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-sm">
            S
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 text-sm">
              SUNAConta <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-200">ERP CLOUD</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium -mt-0.5 truncate max-w-[180px]">
              {usuario.estudioNombre}
            </div>
          </div>
        </div>

        {/* Nivel 2: Botón "Cambiar empresa" SIEMPRE VISIBLE + Empresa Activa (Requisitos 1 y 8) */}
        {isNivelEmpresa ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => salirAEmpresas()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Volver a Mis Empresas (Cartera) sin cerrar sesión"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cambiar empresa</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl max-w-xs md:max-w-md truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-extrabold text-slate-900 text-xs truncate">
                {empresa.razonSocial}
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                RUC {empresa.ruc}
              </span>
              {isDemoEmpresa && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] shrink-0">
                  DEMO S.A.C.
                </span>
              )}
            </div>

            {isDemoEmpresa && (
              <button
                onClick={handleRestablecerDemo}
                disabled={restableciendoDemo}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Restablecer datos demo con balance cuadrado"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${restableciendoDemo ? 'animate-spin' : ''}`} />
                <span>{restableciendoDemo ? 'Restableciendo...' : 'Restablecer Demo'}</span>
              </button>
            )}
          </div>
        ) : (
          /* Nivel 1: Estudio Contable Banner */
          <div className="hidden sm:flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Nivel Estudio: Gestión Integral de Cartera</span>
          </div>
        )}
      </div>

      {/* CENTER SECTION */}
      <div className="flex items-center gap-3">
        {/* En Nivel 2: Selector de Período & Aviso de Período Cerrado */}
        {isNivelEmpresa && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Periodo:</span>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-transparent font-bold text-amber-950 outline-hidden cursor-pointer"
              >
                <option value="2026-09">2026-09 (Abierto)</option>
                <option value="2026-08">2026-08 (Cerrado)</option>
                <option value="2026-07">2026-07 (Cerrado)</option>
                <option value="2026-10">2026-10 (Próximo)</option>
              </select>
            </div>

            {isPeriodoCerrado && (
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold animate-pulse">
                <Lock className="w-3 h-3 text-red-600" />
                <span>PERÍODO CERRADO (SOLO LECTURA)</span>
              </div>
            )}
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SUNAT: CONECTADO</span>
        </div>
      </div>

      {/* RIGHT SECTION: Quick Search (Ctrl+K), Background Jobs, User Profile & Role Switcher */}
      <div className="flex items-center gap-2">
        {/* Fast Ctrl+K search button */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
          title="Buscar empresa instantáneamente (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xl:inline">Buscar</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-white text-slate-500 text-[10px] font-mono rounded border border-slate-200">
            Ctrl+K
          </kbd>
        </button>

        {/* Background Jobs Indicator */}
        <div className="relative">
          <button
            onClick={() => setIsJobsOpen(!isJobsOpen)}
            className={`p-2 rounded-xl transition cursor-pointer relative ${
              isJobsOpen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Trabajos en segundo plano"
          >
            <Layers className="w-4 h-4" />
            {trabajosSegundoPlano.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {trabajosSegundoPlano.length}
              </span>
            )}
          </button>
          <BackgroundJobsPanel isOpen={isJobsOpen} onClose={() => setIsJobsOpen(false)} />
        </div>

        {/* Importación CSV/Excel */}
        {isNivelEmpresa && onOpenImport && (
          <button
            onClick={onOpenImport}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Importar Catálogos y Apertura CSV / Excel"
          >
            <Upload className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* Respaldo ZIP Cifrado */}
        {isNivelEmpresa && onOpenBackup && (
          <button
            onClick={onOpenBackup}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Copia de Seguridad y Restauración SISCONT (.ZIP AES-256)"
          >
            <Archive className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* PDF Export Modal Trigger if on Nivel 2 */}
        {isNivelEmpresa && onOpenPdfExport && (
          <button
            onClick={onOpenPdfExport}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Exportar reportes PDF oficiales"
          >
            <FileText className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* User Profile & Demo RBAC Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
              {usuario.nombre.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-extrabold text-slate-900 text-xs truncate max-w-[130px]">
                {usuario.nombre}
              </div>
              <div className="text-[10px] text-blue-600 font-bold -mt-0.5">
                {isNivelEmpresa ? `Rol: ${rolEnEmpresa}` : usuario.rolGlobal}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs block">{usuario.nombre}</span>
                <span className="text-[11px] text-slate-500 font-mono block">{usuario.email}</span>
                <span className="text-[10px] text-blue-700 font-bold uppercase mt-1 inline-block bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {usuario.rolGlobal}
                </span>
              </div>

              {/* Demo Switcher for Multi-Role Testing (Requisito: Un usuario con roles distintos ve menús distintos) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Simular Rol en Empresa Activa:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['ADMINISTRADOR', 'CONTADOR', 'ASISTENTE', 'AUDITOR'] as RolEmpresa[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRolEnEmpresa(r);
                        setIsUserMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer text-left ${
                        rolEnEmpresa === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demo Switcher for User Account */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Cambiar Usuario Demo:
                </span>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setUsuarioIdDemo('usr-admin-01');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg font-medium ${
                      usuario.id === 'usr-admin-01' ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    CPC. Carlos Mendoza (Admin Estudio)
                  </button>
                  <button
                    onClick={() => {
                      setUsuarioIdDemo('usr-contador-01');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg font-medium ${
                      usuario.id === 'usr-contador-01' ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    CPC. Ana Morales (Contador Senior)
                  </button>
                  <button
                    onClick={() => {
                      setUsuarioIdDemo('usr-asistente-01');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg font-medium ${
                      usuario.id === 'usr-asistente-01' ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    Bach. Jorge Valdivia (Asistente)
                  </button>
                  <button
                    onClick={() => {
                      setUsuarioIdDemo('usr-auditor-01');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg font-medium ${
                      usuario.id === 'usr-auditor-01' ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    Dr. Roberto Sánchez (Auditor)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
