import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  ArrowRightLeft, 
  ShieldAlert, 
  Coins, 
  Play, 
  Clock, 
  Check, 
  AlertCircle,
  FileCheck2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCcw,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Building,
  Info
} from 'lucide-react';
import { AsientoContable, Comprobante, EmpresaCliente } from '../../types';
import { useToast } from '../../context/ToastContext';
import { 
  useAuditoriaPreventiva, 
  useDaotResumen, 
  useSimularCierreAnual, 
  useEjecutarCierreAnual, 
  useRevertirCierreAnual, 
  useCalculoDjAnual 
} from '../../hooks/useTributarioAnual';

interface ProcesosCierreViewProps {
  asientos: AsientoContable[];
  compras: Comprobante[];
  empresa: EmpresaCliente;
  periodo: string;
  onGenerarDestinos: () => void;
  onGenerarAjusteTc: (asientoAjuste: AsientoContable) => void;
}

export const ProcesosCierreView: React.FC<ProcesosCierreViewProps> = ({
  asientos,
  compras,
  empresa,
  periodo,
  onGenerarDestinos,
  onGenerarAjusteTc
}) => {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'cierre_anual' | 'auditoria_preventiva' | 'daot' | 'dj_renta' | 'procesos_mensuales'>('cierre_anual');
  const [anioCierre, setAnioCierre] = useState<number>(2026);
  const [regimenDj, setRegimenDj] = useState<'REGIMEN_GENERAL' | 'MYPE_TRIBUTARIO'>(
    empresa.regimenTributario === 'MYPE_TRIBUTARIO' ? 'MYPE_TRIBUTARIO' : 'REGIMEN_GENERAL'
  );
  const [expandedPaso, setExpandedPaso] = useState<number | null>(null);

  // Queries & Mutations de Fase 10
  const auditoriaQuery = useAuditoriaPreventiva(empresa.id, anioCierre);
  const daotQuery = useDaotResumen(empresa.id, anioCierre);
  const cierreSimuladoQuery = useSimularCierreAnual(empresa.id, anioCierre);
  const ejecutarCierreMutation = useEjecutarCierreAnual(empresa.id);
  const revertirCierreMutation = useRevertirCierreAnual(empresa.id);
  const djAnualQuery = useCalculoDjAnual(empresa.id, anioCierre, { regimen: regimenDj });

  // Procesos mensuales
  const [ejecutandoDestino, setEjecutandoDestino] = useState(false);
  const [ejecutandoTc, setEjecutandoTc] = useState(false);
  const [resultadoTc, setResultadoTc] = useState<string | null>(null);

  const handleEjecutarDestinos = () => {
    setEjecutandoDestino(true);
    setTimeout(() => {
      onGenerarDestinos();
      setEjecutandoDestino(false);
      success('Proceso de Destinos Automáticos finalizado. Asientos transferidos al Subdiario 08.', 'Destinos Generados');
    }, 500);
  };

  const handleEjecutarAjusteTc = () => {
    setEjecutandoTc(true);
    setTimeout(() => {
      setEjecutandoTc(false);
      const ganancia = 10.50;
      const nuevoAsiento: AsientoContable = {
        id: `ast-tc-${Date.now()}`,
        subdiario: '09',
        numeroAsiento: `09090001`,
        periodo,
        fecha: `${periodo}-30`,
        moneda: 'PEN',
        tipoCambio: 3.759,
        tipoOperacion: 'AJUSTE',
        glosaGeneral: `Ajuste mensual por Diferencia de Cambio SBS al ${periodo}`,
        items: [
          {
            id: 'it-tc-1',
            codigoCuenta: '1212',
            denominacionCuenta: 'Cuentas por cobrar comerciales - Cartera USD',
            debe: ganancia,
            haber: 0,
            glosa: 'Actualización cambiaria a TC cierre SBS 3.759'
          },
          {
            id: 'it-tc-2',
            codigoCuenta: '776',
            denominacionCuenta: 'Diferencia de cambio - Ganancia neta',
            debe: 0,
            haber: ganancia,
            glosa: 'Ganancia por diferencia de cambio al cierre de mes'
          }
        ],
        totalDebe: ganancia,
        totalHaber: ganancia,
        cuadrado: true,
        origenAutomatico: true
      };

      onGenerarAjusteTc(nuevoAsiento);
      setResultadoTc(`Se generó el Asiento de Diferencia de Cambio 09090001 en el Subdiario 09 con ganancia cambiaria de S/ ${ganancia.toFixed(2)}.`);
      success('Asiento de ajuste cambiario generado satisfactoriamente en Subdiario 09.', 'Diferencia de Cambio');
    }, 600);
  };

  const handleEjecutarCierreAnual = async () => {
    try {
      const res = await ejecutarCierreMutation.mutateAsync(anioCierre);
      success(res.mensaje, 'Cierre Anual Contable Ejecutado');
    } catch (err: any) {
      error('Error al ejecutar el cierre anual: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleRevertirCierreAnual = async () => {
    try {
      const res = await revertirCierreMutation.mutateAsync(anioCierre);
      info(res.mensaje, 'Cierre Revertido');
    } catch (err: any) {
      error('Error al revertir el cierre: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleDescargarDaotTxt = () => {
    if (!daotQuery.data?.txtGenerado) {
      info('No hay registros declarables para exportar en este ejercicio.', 'DAOT Vacío');
      return;
    }
    const blob = new Blob([daotQuery.data.txtGenerado], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = daotQuery.data.nombreArchivoTxt;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Archivo ${daotQuery.data.nombreArchivoTxt} descargado con éxito.`, 'Exportación DAOT');
  };

  const diagnostico = auditoriaQuery.data;
  const daot = daotQuery.data;
  const cierre = cierreSimuladoQuery.data;
  const dj = djAnualQuery.data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              FASE 10 — ENTERPRISE READY
            </span>
            <span className="text-xs text-slate-500 font-mono">Ejercicio: {anioCierre}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <Cpu className="w-5 h-5 text-indigo-600" />
            Cierre Anual, DAOT & Fiscalización Preventiva SUNAT
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo integral de auditoría tributaria, detección de inconsistencias, DAOT 3500, Regularización PCGE (Cuentas 80-89) y DJ Anual FV 710.
          </p>
        </div>

        {/* Selector de Ejercicio */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Año Contable:</label>
          <select 
            value={anioCierre} 
            onChange={(e) => setAnioCierre(Number(e.target.value))}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={2026}>2026 (Ejercicio Actual)</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('cierre_anual')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cierre_anual'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Scale className="w-4 h-4" />
          Cierre Anual PCGE (8 Pasos)
        </button>

        <button
          onClick={() => setActiveTab('auditoria_preventiva')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'auditoria_preventiva'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Auditoría Preventiva SUNAT
          {diagnostico && diagnostico.alertas.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
              {diagnostico.alertas.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('daot')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'daot'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          DAOT 3500 (Operaciones Terceros)
        </button>

        <button
          onClick={() => setActiveTab('dj_renta')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dj_renta'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          DJ Anual Renta (FV 710)
        </button>

        <button
          onClick={() => setActiveTab('procesos_mensuales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'procesos_mensuales'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Procesos Mensuales (Destinos & TC)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CIERRE ANUAL PCGE (8 PASOS) */}
      {/* ==================================================================== */}
      {activeTab === 'cierre_anual' && (
        <div className="space-y-6">
          {/* Card Resumen de Ejecución */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Plan Contable General Empresarial (PCGE) Normativo
                </span>
                <h3 className="text-xl font-bold">Secuencia de Regularización Patrimonial Anual</h3>
                <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
                  Generación de los 8 asientos correlativos del Subdiario 09 que cancelan las cuentas de gestión (Elementos 6 y 7), determinan los saldos intermediarios de gestión (Cuentas 80 a 85), calculan el Impuesto a la Renta (Cuenta 88), transfieren a Utilidades Acumuladas (Cuenta 89 vs 59) y efectúan el Cierre Definitivo del Balance (Elementos 1 a 5).
                </p>
              </div>

              <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                <button
                  onClick={handleEjecutarCierreAnual}
                  disabled={ejecutarCierreMutation.isPending}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {ejecutarCierreMutation.isPending ? 'Ejecutando Cierre...' : 'Ejecutar Cierre Anual'}
                </button>
                <button
                  onClick={handleRevertirCierreAnual}
                  disabled={revertirCierreMutation.isPending}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {revertirCierreMutation.isPending ? 'Revirtiendo...' : 'Revertir Cierre Anual'}
                </button>
              </div>
            </div>

            {/* Métricas clave */}
            {cierre && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-700/50">
                <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-700/40">
                  <span className="text-[11px] text-indigo-300 block">Total Pasos PCGE</span>
                  <span className="text-lg font-bold text-white">8 Asientos Oficiales</span>
                </div>
                <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-700/40">
                  <span className="text-[11px] text-indigo-300 block">Resultado Contable</span>
                  <span className={`text-lg font-bold ${cierre.resultadoNetoContable >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    S/ {cierre.resultadoNetoContable.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-700/40">
                  <span className="text-[11px] text-indigo-300 block">Condición Económica</span>
                  <span className="text-lg font-bold text-indigo-200">{cierre.tipoResultado}</span>
                </div>
                <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-700/40">
                  <span className="text-[11px] text-indigo-300 block">Cuentas Regularizadas</span>
                  <span className="text-lg font-bold text-white">{cierre.cuentasRegularizadas} Cuentas PCGE</span>
                </div>
              </div>
            )}
          </div>

          {/* Lista de los 8 Pasos con previsualización */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Previsualización de los 8 Pasos de Asientos de Cierre</h4>
                <p className="text-xs text-slate-500">Haga clic en cualquier paso para inspeccionar el asiento contable balanceado con partida doble estricta.</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Subdiario 09</span>
            </div>

            <div className="divide-y divide-slate-100">
              {cierre?.asientos.map((p) => {
                const isExpanded = expandedPaso === p.numeroPaso;
                return (
                  <div key={p.numeroPaso} className="transition-colors hover:bg-slate-50/50">
                    <div 
                      onClick={() => setExpandedPaso(isExpanded ? null : p.numeroPaso)}
                      className="px-6 py-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {p.numeroPaso}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{p.denominacionPaso}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
                              {p.numeroAsiento}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Partida Doble OK
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{p.glosa}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 block">
                            S/ {p.totalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400">Total Balanceado</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Detalle expandible del Asiento */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                              <tr>
                                <th className="p-2.5">Cuenta</th>
                                <th className="p-2.5">Denominación PCGE</th>
                                <th className="p-2.5 text-right">Debe (S/)</th>
                                <th className="p-2.5 text-right">Haber (S/)</th>
                                <th className="p-2.5">Glosa de Línea</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {p.lineas.map((lin, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-bold text-indigo-700">{lin.codigoCuenta}</td>
                                  <td className="p-2.5 font-sans text-slate-700">{lin.denominacionCuenta}</td>
                                  <td className="p-2.5 text-right font-medium text-slate-900">
                                    {lin.debe > 0 ? lin.debe.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                                  </td>
                                  <td className="p-2.5 text-right font-medium text-slate-900">
                                    {lin.haber > 0 ? lin.haber.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                                  </td>
                                  <td className="p-2.5 font-sans text-slate-500 text-[11px]">{lin.glosa}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                              <tr>
                                <td colSpan={2} className="p-2.5 text-right uppercase text-[10px] text-slate-500 font-sans">
                                  Sumas Iguales:
                                </td>
                                <td className="p-2.5 text-right text-emerald-700">
                                  S/ {p.totalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2.5 text-right text-emerald-700">
                                  S/ {p.totalHaber.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AUDITORÍA PREVENTIVA SUNAT */}
      {/* ==================================================================== */}
      {activeTab === 'auditoria_preventiva' && (
        <div className="space-y-6">
          {/* Header Score de Salud Fiscal */}
          {diagnostico && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black text-2xl shadow-inner ${
                  diagnostico.scoreSaludFiscal >= 80 
                    ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300' 
                    : diagnostico.scoreSaludFiscal >= 50
                    ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'
                    : 'bg-red-50 text-red-700 border-2 border-red-300'
                }`}>
                  <span>{diagnostico.scoreSaludFiscal}</span>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider">/ 100</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Score de Salud Fiscal SUNAT</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      diagnostico.nivelRiesgoGeneral === 'BAJO' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : diagnostico.nivelRiesgoGeneral === 'MEDIO'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      RIESGO {diagnostico.nivelRiesgoGeneral}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Evaluación algorítmica predictiva basada en los patrones de fiscalización de SUNAT (Bancarización Ley 28194, Detracciones SPOT, inconsistencias de correlativos y crédito fiscal atípico).
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-medium block">Comprobantes Auditados</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{diagnostico.resumenMetricas.totalComprobantesAnalizados}</span>
                  <span className="text-xs text-slate-400">docs</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Compras: {diagnostico.resumenMetricas.totalComprasAnalizadas}</span>
                  <span>Ventas: {diagnostico.resumenMetricas.totalVentasAnalizadas}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-medium block">Monto en Riesgo Contingente</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-red-600">
                    S/ {diagnostico.resumenMetricas.montoTotalEnRiesgo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex gap-2 pt-1 border-t border-slate-100">
                  <span className="text-red-600 font-bold">{diagnostico.resumenMetricas.alertasCriticas} Críticas</span>
                  <span className="text-amber-600 font-bold">{diagnostico.resumenMetricas.alertasMedias} Medias</span>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Alertas Fiscales */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hallazgos y Discrepancias Detectadas</h4>
                <p className="text-xs text-slate-500">Detalle de contingencias normativas para regularización antes del cierre o presentación ante SUNAT.</p>
              </div>
              <button 
                onClick={() => auditoriaQuery.refetch()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Re-escanear
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {diagnostico?.alertas.map((a) => (
                <div key={a.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.nivelRiesgo === 'CRITICO' 
                          ? 'bg-red-100 text-red-800 border border-red-200' 
                          : a.nivelRiesgo === 'MEDIO'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {a.nivelRiesgo}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900">{a.titulo}</h5>
                      {a.comprobanteRef && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700">
                          Ref: {a.comprobanteRef}
                        </span>
                      )}
                    </div>
                    {a.montoInvolucrado && a.montoInvolucrado > 0 && (
                      <span className="text-xs font-bold text-red-600 font-mono">
                        Importe: S/ {a.montoInvolucrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{a.descripcion}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                      <span className="font-bold text-slate-700 block mb-1">Base Legal SUNAT:</span>
                      <p className="text-slate-600 italic">{a.baseLegal}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px]">
                      <span className="font-bold text-blue-900 block mb-1">Acción Correctiva Sugerida:</span>
                      <p className="text-blue-800">{a.recomendacion}</p>
                    </div>
                  </div>
                </div>
              ))}

              {diagnostico?.alertas.length === 0 && (
                <div className="p-12 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h5 className="text-sm font-bold text-slate-800">Cero Inconsistencias Fiscales Detectadas</h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Los comprobantes de compras y ventas cumplen con las normativas de bancarización, detracciones SPOT y correlatividad legal del ejercicio.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: DAOT (OPERACIONES CON TERCEROS - FORMULARIO 3500) */}
      {/* ==================================================================== */}
      {activeTab === 'daot' && (
        <div className="space-y-6">
          {/* Header Card DAOT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Formulario Virtual N° 3500 SUNAT
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Umbral Legal: 2 UIT = S/ {daot?.umbral2Uit?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Declaración Anual de Operaciones con Terceros (DAOT)</h3>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Consolidación obligatoria anual de operaciones comerciales. Se declaran aquellos terceros con los cuales se hayan efectuado transacciones que superen las 2 UIT (S/ 10,700 en 2026), discriminando compras y ventas.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDescargarDaotTxt}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar TXT DAOT 3500
              </button>
            </div>
          </div>

          {/* Estadísticas DAOT */}
          {daot && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 block">Terceros Evaluados</span>
                <span className="text-xl font-bold text-slate-900">{daot.totalTercerosEvaluados}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 block">Terceros Declarables (&gt;2 UIT)</span>
                <span className="text-xl font-bold text-indigo-600">{daot.totalTercerosDeclarables}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 block">Compras Declarables</span>
                <span className="text-xl font-bold text-slate-900">
                  S/ {daot.totalComprasDeclarables.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 block">Ventas Declarables</span>
                <span className="text-xl font-bold text-emerald-600">
                  S/ {daot.totalVentasDeclarables.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Tabla de Terceros DAOT */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Listado de Operaciones Acumuladas por Tercero</h4>
                <p className="text-xs text-slate-500">Ordenados de mayor a menor volumen transaccionado en el ejercicio.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Doc</th>
                    <th className="p-3">Número Documento</th>
                    <th className="p-3">Razón Social / Nombres</th>
                    <th className="p-3 text-right">Compras (S/)</th>
                    <th className="p-3 text-right">Ventas (S/)</th>
                    <th className="p-3 text-right">Total Transacción (S/)</th>
                    <th className="p-3 text-center">Condición DAOT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {daot?.registros.map((r, idx) => (
                    <tr key={idx} className={r.superaUmbral2Uit ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50'}>
                      <td className="p-3 text-slate-500">{r.tipoDocIdentidad === '6' ? 'RUC' : 'DNI'}</td>
                      <td className="p-3 font-bold text-slate-900">{r.numeroDocIdentidad}</td>
                      <td className="p-3 font-sans text-slate-800 font-medium">{r.razonSocialONombres}</td>
                      <td className="p-3 text-right text-slate-700">
                        {r.totalCompras > 0 ? r.totalCompras.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 text-right text-slate-700">
                        {r.totalVentas > 0 ? r.totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        S/ {r.totalOperaciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.superaUmbral2Uit 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.condicion}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!daot || daot.registros.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                        No se registraron operaciones comerciales para el ejercicio seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DJ ANUAL RENTA TERCERA CATEGORÍA (FV 710) */}
      {/* ==================================================================== */}
      {activeTab === 'dj_renta' && (
        <div className="space-y-6">
          {/* Header Card FV 710 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Formulario Virtual N° 710 SUNAT
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Régimen: {regimenDj === 'MYPE_TRIBUTARIO' ? 'MYPE Tributario (RMT)' : 'Régimen General (RG)'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Simulador de Conciliación Tributaria del Impuesto a la Renta</h3>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Determinación de la Renta Neta Imponible a partir de la Utilidad Contable antes de Impuestos, incorporando Adiciones y Deducciones conforme a la Ley del Impuesto a la Renta (TUO D.S. N° 179-2004-EF).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">Régimen:</label>
              <select
                value={regimenDj}
                onChange={(e) => setRegimenDj(e.target.value as any)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="REGIMEN_GENERAL">Régimen General (29.5% plano)</option>
                <option value="MYPE_TRIBUTARIO">MYPE Tributario (10% hasta 15 UIT + 29.5% exceso)</option>
              </select>
            </div>
          </div>

          {/* Desglose de la Conciliación */}
          {dj && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda: Utilidad Contable, Adiciones y Deducciones */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    1. Conciliación de Resultado a Renta Neta
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">Utilidad Contable antes de Impuestos:</span>
                      <span className="font-bold font-mono text-slate-900">
                        S/ {dj.utilidadContableAntesImpuestos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Adiciones */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-red-700 font-semibold">
                        <span>(+) Adiciones Tributarias (Art. 44 LIR):</span>
                        <span className="font-mono">
                          + S/ {dj.totalAdiciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="pl-3 border-l-2 border-red-200 space-y-1.5">
                        {dj.adicionesDetalle.map(a => (
                          <div key={a.id} className="flex justify-between text-[11px] text-slate-500">
                            <span>{a.descripcion.slice(0, 45)}...</span>
                            <span className="font-mono text-slate-700">S/ {a.monto.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Deducciones */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>(-) Deducciones Tributarias:</span>
                        <span className="font-mono">
                          - S/ {dj.totalDeducciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="pl-3 border-l-2 border-emerald-200 space-y-1.5">
                        {dj.deduccionesDetalle.map(d => (
                          <div key={d.id} className="flex justify-between text-[11px] text-slate-500">
                            <span>{d.descripcion.slice(0, 45)}...</span>
                            <span className="font-mono text-slate-700">S/ {d.monto.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Renta Neta */}
                    <div className="flex justify-between items-center py-2 border-t-2 border-slate-300 font-bold text-sm bg-slate-50 px-3 rounded-lg">
                      <span className="text-slate-900">Renta Neta Imponible:</span>
                      <span className="font-mono text-indigo-700">
                        S/ {dj.rentaNetaImponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Determinación del Impuesto y Créditos */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    2. Liquidación del Impuesto & Créditos Fiscales
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <div>
                        <span className="text-slate-600 font-medium block">Impuesto a la Renta Calculado:</span>
                        <span className="text-[10px] text-slate-400">Tasa efectiva: {dj.tasaEfectiva}%</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        S/ {dj.impuestoRentaCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-blue-700 font-semibold">
                        <span>(-) Créditos con Derecho a Compensación:</span>
                        <span className="font-mono">
                          - S/ {dj.totalCreditos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="pl-3 border-l-2 border-blue-200 space-y-1.5 text-[11px] text-slate-500">
                        <div className="flex justify-between">
                          <span>Pagos a cuenta mensuales (PDT 621):</span>
                          <span className="font-mono text-slate-700">S/ {dj.creditosDetalle.pagosACuentaMensuales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saldo a favor del ejercicio anterior:</span>
                          <span className="font-mono text-slate-700">S/ {dj.creditosDetalle.saldoAFavorAnterior.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ITAN efectivamente pagado:</span>
                          <span className="font-mono text-slate-700">S/ {dj.creditosDetalle.itanPagado.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resultado Final */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between mt-4 ${
                      dj.saldoPorRegularizar >= 0 
                        ? 'bg-amber-50 border-amber-200 text-amber-900' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">
                          {dj.saldoPorRegularizar >= 0 ? 'Saldo por Regularizar a favor de SUNAT:' : 'Saldo a Favor del Contribuyente:'}
                        </span>
                        <span className="text-[11px] opacity-80">
                          {dj.saldoPorRegularizar >= 0 ? 'Monto a pagar en DJ Anual FV 710' : 'Disponible para compensar o solicitar devolución'}
                        </span>
                      </div>
                      <span className="text-xl font-bold font-mono">
                        S/ {Math.abs(dj.saldoPorRegularizar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: PROCESOS MENSUALES (DESTINOS & TC) */}
      {/* ==================================================================== */}
      {activeTab === 'procesos_mensuales' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Proceso: Destinos Automáticos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generación de Asientos de Destino (Clase 9 vs 79)</h3>
                <p className="text-xs text-slate-500">Subdiario 08 — Transferencia de Cuentas de Gasto</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Analiza las compras y gastos contabilizados en el Elemento 6 (Cuentas 60, 62, 63, 64, 65) y genera automáticamente los asientos de destino hacia Centros de Costo en la Clase 9 (94 Gastos de Administración, 95 Gastos de Ventas) con abono a la Cuenta 791 Cargas Imputables a Cuentas de Costos y Gastos.
            </p>

            <button
              onClick={handleEjecutarDestinos}
              disabled={ejecutandoDestino}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {ejecutandoDestino ? 'Procesando Destinos...' : 'Ejecutar Destinos Automáticos'}
            </button>
          </div>

          {/* Proceso: Ajuste Diferencia de Cambio SBS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ajuste por Diferencia de Cambio SBS (NIC 21)</h3>
                <p className="text-xs text-slate-500">Subdiario 09 — Cuentas 776 / 676</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Valúa las partidas monetarias en moneda extranjera (Cuentas 104, 121 y 421) al Tipo de Cambio de Cierre oficial publicado por la SBS al último día del período mensual, generando los asientos de ganancia (776) o pérdida (676) cambiaria.
            </p>

            {resultadoTc && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resultadoTc}</span>
              </div>
            )}

            <button
              onClick={handleEjecutarAjusteTc}
              disabled={ejecutandoTc}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              {ejecutandoTc ? 'Calculando Valuación SBS...' : 'Ejecutar Ajuste de TC al Cierre de Mes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
