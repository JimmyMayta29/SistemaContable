import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  FileText,
  DollarSign,
  Calculator,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';
import { TrabajadorPlanilla } from '../../types';
import { 
  useTrabajadores, 
  useCrearTrabajador,
  useCalcularPlanilla,
  useContabilizarPlanilla,
  useAnularPlanilla,
  useExportarPlame
} from '../../hooks/useTesoreriaPlanilla';

interface PlanillaPlameViewProps {
  empresaId?: string;
  periodo?: string;
  trabajadores?: TrabajadorPlanilla[];
  onAddTrabajador?: (trabajador: TrabajadorPlanilla) => void;
  onGenerarAsientoPlanilla?: () => void;
}

export const PlanillaPlameView: React.FC<PlanillaPlameViewProps> = ({
  empresaId = '00000000-0000-0000-0000-000000000001',
  periodo = '2026-09',
  trabajadores: legacyTrabajadores = [],
  onAddTrabajador,
  onGenerarAsientoPlanilla
}) => {
  const [activeTab, setActiveTab] = useState<'nomina' | 'trabajadores'>('nomina');
  const [isModalTrabajadorOpen, setIsModalTrabajadorOpen] = useState(false);
  const [isModalPlameInfoOpen, setIsModalPlameInfoOpen] = useState(false);

  // Queries
  const { data: apiTrabajadores = [], isLoading: loadingTrabajadores } = useTrabajadores(empresaId);

  // Mutations
  const crearTrabajadorMutation = useCrearTrabajador(empresaId);
  const calcularPlanillaMutation = useCalcularPlanilla(empresaId);
  const contabilizarPlanillaMutation = useContabilizarPlanilla(empresaId);
  const anularPlanillaMutation = useAnularPlanilla(empresaId);

  // State local de la planilla calculada
  const [planillaCalculada, setPlanillaCalculada] = useState<any>(null);

  // Form states de nuevo trabajador
  const [tipoDoc, setTipoDoc] = useState('1');
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cargo, setCargo] = useState('');
  const [sueldoBase, setSueldoBase] = useState<number>(1025);
  const [tieneAsigFam, setTieneAsigFam] = useState(false);
  const [sistemaPensiones, setSistemaPensiones] = useState<'ONP' | 'AFP'>('ONP');
  const [afpAdmin, setAfpAdmin] = useState<'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT'>('INTEGRA');
  const [tipoComision, setTipoComision] = useState<'FLUJO' | 'MIXTA'>('FLUJO');
  const [fechaIngreso, setFechaIngreso] = useState('2024-01-01');

  const trabajadoresMostrados = apiTrabajadores.length > 0 ? apiTrabajadores : legacyTrabajadores.map(t => ({
    id: t.id,
    empresaId,
    tipoDocumento: '1',
    numeroDocumento: t.dni,
    nombres: t.nombres,
    apellidos: t.apellidos,
    cargo: t.cargo,
    regimenLaboral: 'GENERAL' as const,
    sueldoBase: t.sueldoBruto,
    tieneAsignacionFamiliar: false,
    sistemaPensiones: t.afpOnp === 'ONP' ? ('ONP' as const) : ('AFP' as const),
    afpAdministradora: t.afpOnp !== 'ONP' ? t.afpOnp : undefined,
    afpTipoComision: 'FLUJO' as const,
    centroCosto: 'ADMINISTRACION',
    activo: true
  }));

  const handleCrearTrabajador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || !nombres || sueldoBase <= 0) return;

    try {
      await crearTrabajadorMutation.mutateAsync({
        tipoDocumento: tipoDoc,
        numeroDocumento: dni,
        nombres,
        apellidos,
        cargo: cargo || 'Colaborador',
        regimenLaboral: 'GENERAL',
        sueldoBase,
        tieneAsignacionFamiliar: tieneAsigFam,
        sistemaPensiones,
        afpAdministradora: sistemaPensiones === 'AFP' ? afpAdmin : undefined,
        afpTipoComision: tipoComision,
        fechaIngreso,
        centroCosto: 'ADMINISTRACION',
        activo: true
      });

      setIsModalTrabajadorOpen(false);
      setDni('');
      setNombres('');
      setApellidos('');
      setCargo('');
    } catch (err: any) {
      alert('Error creando trabajador: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleCalcularPlanilla = async () => {
    try {
      const res = await calcularPlanillaMutation.mutateAsync({
        periodoId: `per-${periodo}`,
        mes: periodo
      });
      setPlanillaCalculada(res);
    } catch (err: any) {
      alert('Error calculando planilla: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleContabilizar = async () => {
    if (!planillaCalculada) return;
    try {
      const res = await contabilizarPlanillaMutation.mutateAsync(planillaCalculada.id);
      setPlanillaCalculada((prev: any) => ({ ...prev, estado: 'CONTABILIZADA', asientoId: res.asientoId }));
      alert(`Planilla contabilizada exitosamente con Asiento N° ${res.asientoNumero || 'generado'}.`);
    } catch (err: any) {
      alert('Error contabilizando planilla: ' + (err?.response?.data?.error || err.message));
    }
  };

  const lineasPlanilla = planillaCalculada?.lineas || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Planilla de Remuneraciones & PLAME (PDT 0601)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo mensual laboral según parámetros vigentes (RMV S/ 1,025, Asig. Familiar 10%, ONP 13%, EsSalud 9% y AFPs).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('nomina')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'nomina' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Liquidación del Período
            </button>
            <button
              onClick={() => setActiveTab('trabajadores')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'trabajadores' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Ficha de Colaboradores ({trabajadoresMostrados.length})
            </button>
          </div>

          <button
            onClick={() => setIsModalPlameInfoOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar PLAME SUNAT
          </button>

          {activeTab === 'trabajadores' ? (
            <button
              onClick={() => setIsModalTrabajadorOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Trabajador
            </button>
          ) : (
            <button
              onClick={handleCalcularPlanilla}
              disabled={calcularPlanillaMutation.isPending}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              {calcularPlanillaMutation.isPending ? 'Calculando...' : 'Calcular Planilla Mes'}
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: NÓMINA LIQUIDADA */}
      {activeTab === 'nomina' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          {planillaCalculada && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">Total Remuneraciones (6211)</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  S/ {planillaCalculada.totalIngresos.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">Retención Pensiones (4032/407)</span>
                <div className="text-xl font-black text-rose-600 font-mono mt-1">
                  S/ {planillaCalculada.totalDescuentos.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">Aporte Patronal EsSalud 9% (6271)</span>
                <div className="text-xl font-black text-amber-600 font-mono mt-1">
                  S/ {planillaCalculada.totalAportesEmpleador.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold">Neto a Pagar en Banco (4111)</span>
                <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                  S/ {planillaCalculada.totalNeto.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Action Bar for Contabilizar */}
          {planillaCalculada && (
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    planillaCalculada.estado === 'CONTABILIZADA' ? 'bg-emerald-400 text-slate-900' : 'bg-amber-400 text-slate-900'
                  }`}>
                    {planillaCalculada.estado}
                  </span>
                  <span className="text-xs text-blue-200">Período: {planillaCalculada.mes}</span>
                </div>
                <h3 className="text-sm font-bold mt-1">
                  Liquidación de Nómina ({planillaCalculada.lineas.length} colaboradores procesados)
                </h3>
              </div>

              {planillaCalculada.estado !== 'CONTABILIZADA' ? (
                <button
                  onClick={handleContabilizar}
                  disabled={contabilizarPlanillaMutation.isPending}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {contabilizarPlanillaMutation.isPending ? 'Contabilizando...' : 'Contabilizar Asiento en Diario'}
                </button>
              ) : (
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Asiento contable N° {planillaCalculada.asientoId ? '04090001' : 'registrado'}
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">
                Detalle por Trabajador ({lineasPlanilla.length > 0 ? lineasPlanilla.length : trabajadoresMostrados.length})
              </span>
              <span className="text-xs text-slate-500 font-medium">Período: {periodo}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">DNI / Doc</th>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3 text-right">Básico</th>
                    <th className="p-3 text-right">Asig. Fam.</th>
                    <th className="p-3 text-right">Total Remun.</th>
                    <th className="p-3 text-right">Desc. Pensión</th>
                    <th className="p-3 text-right">EsSalud (9%)</th>
                    <th className="p-3 text-right">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {lineasPlanilla.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Haga clic en <strong>"Calcular Planilla Mes"</strong> para liquidar los sueldos y aportes de {periodo}.
                      </td>
                    </tr>
                  ) : (
                    lineasPlanilla.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{l.trabajadorDocumento}</td>
                        <td className="p-3 font-bold text-slate-900">{l.trabajadorNombre}</td>
                        <td className="p-3 text-right font-mono">S/ {l.sueldoBasico.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">
                          {l.asignacionFamiliar > 0 ? `S/ ${l.asignacionFamiliar.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-900">
                          S/ {l.totalRemuneracion.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-600 font-bold">
                          - S/ {l.totalDescuentos.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-amber-600 font-bold">
                          S/ {l.aporteEssalud.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          S/ {l.netoPagar.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TRABAJADORES (FICHA DE COLABORADORES) */}
      {activeTab === 'trabajadores' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Padrón de Trabajadores Activos ({trabajadoresMostrados.length})
              </span>
              <p className="text-[11px] text-slate-500">
                Datos personales confidenciales protegidos por control de permisos RBAC.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Documento</th>
                  <th className="p-3">Apellidos y Nombres</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Régimen</th>
                  <th className="p-3">Pensión</th>
                  <th className="p-3">Asig. Familiar</th>
                  <th className="p-3 text-right">Sueldo Base</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                {trabajadoresMostrados.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono">{t.numeroDocumento}</td>
                    <td className="p-3 font-bold text-slate-900">{t.apellidos}, {t.nombres}</td>
                    <td className="p-3">{t.cargo}</td>
                    <td className="p-3 text-[11px]">{t.regimenLaboral}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {t.sistemaPensiones} {t.afpAdministradora ? `(${t.afpAdministradora})` : ''}
                      </span>
                    </td>
                    <td className="p-3">
                      {t.tieneAsignacionFamiliar ? (
                        <span className="text-emerald-700 font-bold">Sí (10% RMV)</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      S/ {t.sueldoBase.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR TRABAJADOR */}
      {isModalTrabajadorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Alta de Trabajador en Nómina (T-Registro)
            </h3>

            <form onSubmit={handleCrearTrabajador} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Tipo Doc</label>
                  <select
                    value={tipoDoc}
                    onChange={(e) => setTipoDoc(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                  >
                    <option value="1">DNI</option>
                    <option value="4">Carnet Ext.</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700">N° Documento</label>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="44556677"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nombres</label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Asistente Contable"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Sueldo Básico (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1025"
                    value={sueldoBase || ''}
                    onChange={(e) => setSueldoBase(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Asignación Familiar */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneAsigFam}
                    onChange={(e) => setTieneAsigFam(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Acredita derecho a Asignación Familiar (+10% RMV = S/ 102.50)
                  </span>
                </label>
              </div>

              {/* Sistema de Pensiones */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Sistema Previsional</label>
                  <select
                    value={sistemaPensiones}
                    onChange={(e: any) => setSistemaPensiones(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                  >
                    <option value="ONP">ONP (13%)</option>
                    <option value="AFP">AFP (Privado)</option>
                  </select>
                </div>

                {sistemaPensiones === 'AFP' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Administradora</label>
                    <select
                      value={afpAdmin}
                      onChange={(e: any) => setAfpAdmin(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white text-slate-800"
                    >
                      <option value="INTEGRA">Integra</option>
                      <option value="PRIMA">Prima</option>
                      <option value="PROFUTURO">Profuturo</option>
                      <option value="HABITAT">Habitat</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalTrabajadorOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={crearTrabajadorMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {crearTrabajadorMutation.isPending ? 'Guardando...' : 'Guardar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPORTAR PLAME INFO */}
      {isModalPlameInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Exportador PLAME (PDT 0601)
              </h3>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-bold">
                Estado: Pendiente de implementación (Fase 6 - Libros y Exportaciones Oficiales).
              </p>
              <p>
                La generación de archivos planos empaquetados (.rem, .jor, .snl, .tot) para el aplicativo oficial PLAME de SUNAT se habilita en la Fase 6, cumpliendo con la R.S. N° 183-2011/SUNAT.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsModalPlameInfoOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
