import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Users, 
  Landmark, 
  CreditCard, 
  FileText, 
  BookOpen, 
  FileSpreadsheet, 
  Calculator, 
  ArrowRightLeft, 
  Sparkles, 
  RefreshCw, 
  Boxes, 
  BarChart3, 
  SlidersHorizontal, 
  Settings, 
  FolderTree, 
  ShieldCheck, 
  Cpu, 
  Lock, 
  ChevronDown, 
  ChevronRight,
  UserCheck,
  Network
} from 'lucide-react';
import { useEmpresaPeriodo, RolEmpresa } from '../../context/EmpresaPeriodoContext';
import { Comprobante, AsientoContable, MovimientoCajaBanco, ReciboHonorario } from '../../types';

export type TabIdNivel2 = 
  | 'dashboard'
  | 'rce_compras'
  | 'rvie_ventas'
  | 'honorarios'
  | 'planilla'
  | 'caja_bancos'
  | 'cartera_saldos'
  | 'vouchers'
  | 'diario'
  | 'mayor'
  | 'balance_comprobacion'
  | 'destinos_dc'
  | 'sire_smart'
  | 'sire_sync'
  | 'ple'
  | 'pdt621'
  | 'reportes'
  | 'cierre'
  | 'mapa_sistema'
  | 'config_empresa'
  | 'maestros'
  | 'reglas'
  | 'conexion_sol'
  | 'usuarios_permisos';

interface EmpresaSidebarNivel2Props {
  activeTab: TabIdNivel2;
  onSelectTab: (tab: TabIdNivel2) => void;
  compras: Comprobante[];
  ventas: Comprobante[];
  asientos: AsientoContable[];
  movimientosBancarios: MovimientoCajaBanco[];
  honorarios: ReciboHonorario[];
  onOpenConfigModal: () => void;
}

export const EmpresaSidebarNivel2: React.FC<EmpresaSidebarNivel2Props> = ({
  activeTab,
  onSelectTab,
  compras,
  ventas,
  asientos,
  movimientosBancarios,
  honorarios,
  onOpenConfigModal
}) => {
  const { rolEnEmpresa, verificarPermiso, isPeriodoCerrado } = useEmpresaPeriodo();

  // Estados de grupos expandidos
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operaciones: true,
    contabilidad: true,
    sunat: true,
    configuracion: false
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // CONTADORES DEL MENÚ: Muestran PENDIENTES, no totales (Requisito 3)
  const pendientesCompras = compras.filter(c => !c.asientoGenerado).length;
  const pendientesVentas = ventas.filter(v => !v.asientoGenerado).length;
  const pendientesHonorarios = honorarios.filter(h => !h.asientoGenerado).length;
  const pendientesBancos = movimientosBancarios.filter(m => !m.referenciaComprobante).length;
  const pendientesCxP = compras.filter(c => !c.asientoGenerado).length;
  const pendientesVouchers = asientos.filter(a => !a.cuadrado).length;
  const pendientesSire = compras.filter(c => c.estadoComparacionSire !== 'COINCIDE').length;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-xs z-30">
      <div className="p-3 space-y-1.5 overflow-y-auto">
        {/* Banner de Período Cerrado en el Sidebar si aplica */}
        {isPeriodoCerrado && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl mb-2 text-amber-900 text-[11px] font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Período Cerrado (Lectura)</span>
          </div>
        )}

        {/* 1. INICIO */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>Inicio (Tablero)</span>
          </div>
        </button>

        {/* 2. OPERACIONES */}
        <div className="pt-2">
          <button
            onClick={() => toggleGroup('operaciones')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <span>Operaciones</span>
            {openGroups.operaciones ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {openGroups.operaciones && (
            <div className="space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('rce_compras')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'rce_compras' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span>Compras (RCE)</span>
                </div>
                {pendientesCompras > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200" title="Pendientes de contabilizar">
                    {pendientesCompras} pend
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('rvie_ventas')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'rvie_ventas' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Ventas (RVIE)</span>
                </div>
                {pendientesVentas > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200" title="Pendientes de contabilizar">
                    {pendientesVentas} pend
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('honorarios')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'honorarios' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Honorarios (4ta)</span>
                </div>
                {pendientesHonorarios > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200" title="Pendientes de provisión">
                    {pendientesHonorarios} pend
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('planilla')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'planilla' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Planilla (PLAME)</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('caja_bancos')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'caja_bancos' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-500" />
                  <span>Caja y Bancos</span>
                </div>
                {pendientesBancos > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200" title="Movimientos pendientes de conciliar">
                    {pendientesBancos} pend
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('cartera_saldos')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'cartera_saldos' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>CxC y CxP (Saldos)</span>
                </div>
                {pendientesCxP > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200">
                    {pendientesCxP}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 3. CONTABILIDAD */}
        <div className="pt-2">
          <button
            onClick={() => toggleGroup('contabilidad')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <span>Contabilidad</span>
            {openGroups.contabilidad ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {openGroups.contabilidad && (
            <div className="space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('vouchers')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'vouchers' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>Vouchers Siscont</span>
                </div>
                {pendientesVouchers > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                    {pendientesVouchers} borrador
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('diario')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'diario' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Libro Diario</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('mayor')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'mayor' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-slate-500" />
                  <span>Libro Mayor</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('balance_comprobacion')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'balance_comprobacion' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Balance Comprobación</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('destinos_dc')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'destinos_dc' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                  <span>Destinos & Dif. Cambio</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 4. SUNAT */}
        <div className="pt-2">
          <button
            onClick={() => toggleGroup('sunat')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <span>SUNAT & Tributos</span>
            {openGroups.sunat ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {openGroups.sunat && (
            <div className="space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('sire_smart')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sire_smart' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Conciliador SIRE</span>
                </div>
                {pendientesSire > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full">
                    {pendientesSire}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('sire_sync')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sire_sync' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  <span>Descargas XML / CDR</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('ple')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'ple' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-slate-500" />
                  <span>Libros PLE (TXT)</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('pdt621')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'pdt621' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Liquidación PDT 621</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Pendiente
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 5. REPORTES */}
        <div className="pt-2">
          <button
            onClick={() => onSelectTab('reportes')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'reportes' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              <span>Reportes & EEFF</span>
            </div>
          </button>
        </div>

        {/* 6. CIERRE & AUDITORÍA */}
        <div className="pt-1 space-y-0.5">
          <button
            onClick={() => onSelectTab('cierre')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'cierre' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-600" />
              <span>Cierre & Balances</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('mapa_sistema')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'mapa_sistema' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-500" />
              <span>Mapa & Auditoría</span>
            </div>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              activeTab === 'mapa_sistema' ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-800'
            }`}>
              Audit
            </span>
          </button>
        </div>

        {/* 7. CONFIGURACIÓN (Con restricción RBAC: solo visible si tiene permiso) */}
        {verificarPermiso(['ADMINISTRADOR', 'CONTADOR']) && (
          <div className="pt-2">
            <button
              onClick={() => toggleGroup('configuracion')}
              className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span>Configuración</span>
              {openGroups.configuracion ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {openGroups.configuracion && (
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={onOpenConfigModal}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Datos de Empresa</span>
                </button>

                <button
                  onClick={() => onSelectTab('maestros')}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'maestros' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FolderTree className="w-4 h-4 text-slate-500" />
                  <span>Plan Contable PCGE</span>
                </button>

                <button
                  onClick={() => onSelectTab('reglas')}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'reglas' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>Reglas & Destinos</span>
                </button>

                {verificarPermiso(['ADMINISTRADOR']) && (
                  <>
                    <button
                      onClick={onOpenConfigModal}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                      <span>Conexión Clave SOL</span>
                    </button>

                    <button
                      onClick={() => onSelectTab('usuarios_permisos')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'usuarios_permisos' ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-slate-500" />
                      <span>Usuarios & Roles</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Role Indicator */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
        <div>
          <span className="block text-[10px] text-slate-400 font-semibold uppercase">Rol en Empresa</span>
          <span className="font-extrabold text-blue-900">{rolEnEmpresa}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
          Activo
        </span>
      </div>
    </aside>
  );
};
