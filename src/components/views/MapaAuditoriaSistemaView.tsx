import React, { useState } from 'react';
import { 
  Network, 
  Database, 
  ShieldCheck, 
  FileCheck2, 
  Cpu, 
  Server, 
  Code2, 
  Download, 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  ExternalLink, 
  Layers, 
  Search,
  BookOpen,
  Boxes,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { useSistemaMapa, useSistemaDiagnostico } from '../../hooks/useSistemaAudit';
import { EmpresaCliente } from '../../types';
import { useToast } from '../../context/ToastContext';

interface MapaAuditoriaSistemaViewProps {
  empresa: EmpresaCliente;
}

type TabAudit = 'arquitectura' | 'base_datos' | 'normativa_sunat' | 'diagnostico' | 'seguridad_rbac' | 'dossier_export';

export const MapaAuditoriaSistemaView: React.FC<MapaAuditoriaSistemaViewProps> = ({ empresa }) => {
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<TabAudit>('arquitectura');
  const [tablaSeleccionada, setTablaSeleccionada] = useState<string>('empresas_clientes');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: mapa, isLoading: isMapaLoading, refetch: refetchMapa } = useSistemaMapa();
  const { 
    data: diagnostico, 
    isDiagnosticoLoading, 
    ejecutarDiagnostico 
  } = useSistemaDiagnostico(empresa.id);

  const handleCopiarDossier = () => {
    if (!mapa) return;
    const jsonStr = JSON.stringify({ mapa, diagnostico }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    success('Dossier técnico copiado al portapapeles en formato JSON.', 'Copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDescargarJson = () => {
    if (!mapa) return;
    const dataToExport = {
      empresaAuditada: {
        id: empresa.id,
        ruc: empresa.ruc,
        razonSocial: empresa.razonSocial,
        regimen: empresa.regimenTributario
      },
      mapaSistema: mapa,
      diagnosticoIntegridad: diagnostico,
      fechaExportacion: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SUNAConta_Dossier_Auditoria_${empresa.ruc}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Dossier de auditoría descargado exitosamente.', 'Exportación Completa');
  };

  const handleImprimir = () => {
    window.print();
  };

  const tablasFiltradas = (mapa?.esquemaBaseDatos || []).filter(t => 
    t.tabla.toLowerCase().includes(filtroTabla.toLowerCase()) ||
    t.descripcion.toLowerCase().includes(filtroTabla.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Meta Barra */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Mapa del Sistema & Auditoría Integral
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  v1.7.0 Enterprise
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {mapa?.sistema.estadoMotorDatos || 'MOTOR ACTIVO'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dossier técnico para auditoría externa: topología de módulos, diccionario de datos, reglas tributarias SUNAT y verificación de integridad criptográfica.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Globales */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => ejecutarDiagnostico()}
            disabled={isDiagnosticoLoading}
            className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Ejecutar comprobación de integridad en vivo"
          >
            <RefreshCw className={`w-4 h-4 ${isDiagnosticoLoading ? 'animate-spin' : ''}`} />
            <span>Ejecutar Diagnóstico</span>
          </button>

          <button
            onClick={handleDescargarJson}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={handleImprimir}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Dossier</span>
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'arquitectura', label: 'Topología & Arquitectura', icon: Layers },
          { id: 'base_datos', label: 'Diccionario de Datos (Schema)', icon: Database },
          { id: 'normativa_sunat', label: 'Normativa & Reglas SUNAT', icon: FileCheck2 },
          { id: 'diagnostico', label: 'Diagnóstico en Vivo', icon: ShieldCheck, badge: diagnostico?.dictamen === 'CONFORME_SIN_OBSERVACIONES' ? '100% OK' : 'Atención' },
          { id: 'seguridad_rbac', label: 'Seguridad & Hash Chain', icon: Lock },
          { id: 'dossier_export', label: 'Dossier de Auditoría', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabAudit)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* PESTAÑA 1: ARQUITECTURA & TOPOLOGÍA */}
      {activeTab === 'arquitectura' && (
        <div className="space-y-6">
          {/* Tarjetas de Capas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-3">
                <Code2 className="w-4 h-4" />
                <span>1. Capa Frontend (Cliente SPA)</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li><strong className="text-slate-800">Framework:</strong> React 19.x con Vite Bundler</li>
                <li><strong className="text-slate-800">Tipado:</strong> TypeScript 5.x estricto</li>
                <li><strong className="text-slate-800">Estilos:</strong> Tailwind CSS v4 con diseño modular</li>
                <li><strong className="text-slate-800">Estado de Servidor:</strong> TanStack React Query v5</li>
                <li><strong className="text-slate-800">Validaciones UI:</strong> Algoritmo Módulo 11 en tiempo real</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-3">
                <Server className="w-4 h-4" />
                <span>2. Capa Backend & API REST</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li><strong className="text-slate-800">Servidor:</strong> Node.js con Express 4.21</li>
                <li><strong className="text-slate-800">Seguridad:</strong> JWT, RBAC por empresa, Helmet, CORS</li>
                <li><strong className="text-slate-800">Validación Payload:</strong> Zod en mutaciones</li>
                <li><strong className="text-slate-800">Controles Transaccionales:</strong> Reversión atómica</li>
                <li><strong className="text-slate-800">Inmutabilidad:</strong> SHA-256 Hash Chaining</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-3">
                <Database className="w-4 h-4" />
                <span>3. Capa de Persistencia & SUNAT</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li><strong className="text-slate-800">Motor Primario:</strong> Cloud SQL (PostgreSQL 15+)</li>
                <li><strong className="text-slate-800">ORM / Esquema:</strong> Drizzle ORM</li>
                <li><strong className="text-slate-800">Resiliencia:</strong> Fallback In-Memory tolerante a fallos</li>
                <li><strong className="text-slate-800">Aislamiento:</strong> Tenant & Empresa ID forzosos</li>
                <li><strong className="text-slate-800">Integración SUNAT:</strong> RCE, RVIE, PLE 5.1/6.1, RUC API</li>
              </ul>
            </div>
          </div>

          {/* Matriz de Módulos del Sistema */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Módulos Funcionales y Rutas del Sistema</h3>
                <p className="text-xs text-slate-500">Mapeo entre interfaz de usuario, endpoints de API REST y tablas de base de datos afectadas.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {mapa?.topologiaModulos.length || 8} Módulos Registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Módulo Funcional</th>
                    <th className="py-2.5 px-4">Vistas UI</th>
                    <th className="py-2.5 px-4">Endpoints REST</th>
                    <th className="py-2.5 px-4">Tablas Afectadas</th>
                    <th className="py-2.5 px-4">Políticas de Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mapa?.topologiaModulos.map((mod, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        {mod.modulo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {mod.rutaUI}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {mod.endpoints.map((ep, j) => (
                            <span key={j} className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 max-w-fit">
                              {ep}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {mod.tablasAfectadas.map((tb, k) => (
                            <span key={k} className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              {tb}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {mod.seguridad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: BASE DE DATOS & DICCIONARIO */}
      {activeTab === 'base_datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de Tablas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tablas del Esquema ({mapa?.esquemaBaseDatos.length || 0})
              </h3>
              <Database className="w-4 h-4 text-slate-400" />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tabla o campo..."
                value={filtroTabla}
                onChange={(e) => setFiltroTabla(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {tablasFiltradas.map((tb) => {
                const isSelected = tablaSeleccionada === tb.tabla;
                return (
                  <button
                    key={tb.tabla}
                    onClick={() => setTablaSeleccionada(tb.tabla)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">
                      <p className="font-mono">{tb.tabla}</p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {tb.descripcion}
                      </p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle de la Tabla Seleccionada */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-5">
            {(() => {
              const tb = (mapa?.esquemaBaseDatos || []).find(t => t.tabla === tablaSeleccionada) || (mapa?.esquemaBaseDatos?.[0]);
              if (!tb) return <p className="text-xs text-slate-500">Selecciona una tabla.</p>;

              return (
                <>
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-mono text-xs font-bold">
                        TABLE
                      </span>
                      <h2 className="text-lg font-mono font-bold text-slate-900">{tb.tabla}</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{tb.descripcion}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Clave Primaria (PK)</span>
                      <code className="text-xs font-mono font-bold text-blue-700">{tb.clavePrimaria}</code>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Aislamiento Multitenant</span>
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Garantizado por <code className="text-[11px] bg-white px-1 py-0.5 rounded border border-emerald-200">empresa_id</code>
                      </span>
                    </div>
                  </div>

                  {/* Índices */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Índices Configurados</h4>
                    <div className="flex flex-wrap gap-2">
                      {tb.indices.map((idx, i) => (
                        <span key={i} className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                          {idx}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Campos Clave */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Campos Principales del Esquema</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {tb.camposClave.map((campo, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-800">
                          {campo}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: NORMATIVA & REGLAS SUNAT */}
      {activeTab === 'normativa_sunat' && (
        <div className="space-y-6">
          {/* IGV y Crédito Fiscal */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Impuesto General a las Ventas (IGV) & Crédito Fiscal</h3>
                <p className="text-xs text-slate-500">Reglas de cálculo conforme al TUO de la Ley del IGV (Decreto Supremo Nº 055-99-EF)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tasa Nominal</span>
                <p className="text-sm font-extrabold text-blue-900">{mapa?.reglasTributariasSunat.igv.tasaNominal}</p>
                <p className="text-[11px] text-slate-500 mt-1">16% IGV + 2% IPM</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Fórmula Base</span>
                <code className="text-xs font-mono font-bold text-slate-800">{mapa?.reglasTributariasSunat.igv.formulaBase}</code>
                <p className="text-[11px] text-slate-500 mt-1">Aplica sobre operaciones gravadas locales</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Criterio de Redondeo</span>
                <p className="text-xs font-bold text-slate-800">{mapa?.reglasTributariasSunat.igv.redondeo}</p>
                <p className="text-[11px] text-slate-500 mt-1">Redondeo aritmético a 2 decimales</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Requisitos Sustanciales para el Crédito Fiscal (Art. 18 y 19 LIGV)</h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
                {mapa?.reglasTributariasSunat.igv.creditoFiscalRequisitos.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Regímenes de Renta */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Regímenes Tributarios del Impuesto a la Renta</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900">Régimen MYPE Tributario (RMT)</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">D.L. 1269</span>
                </div>
                <p className="text-xs text-slate-600"><strong>Tasas Anuales:</strong> Primeras 15 UIT: 10% | Exceso: 29.5%</p>
                <p className="text-xs text-slate-600"><strong>Pagos a Cuenta:</strong> 1.0% mensual (hasta 300 UIT) o coeficiente</p>
                <p className="text-xs text-slate-600"><strong>Tope de Ingresos:</strong> Hasta 1,700 UIT anuales</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Régimen Especial de Renta (RER)</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Definitivo</span>
                </div>
                <p className="text-xs text-slate-600"><strong>Cuota Mensual:</strong> 1.5% sobre ingresos netos mensuales</p>
                <p className="text-xs text-slate-600"><strong>Sin DJ Anual:</strong> Los pagos mensuales tienen carácter cancelatorio</p>
                <p className="text-xs text-slate-600"><strong>Límite:</strong> Hasta S/ 525,000 de ingresos o compras anuales</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Régimen General (RG)</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">Art. 55 LIR</span>
                </div>
                <p className="text-xs text-slate-600"><strong>Tasa Anual:</strong> 29.5% sobre la renta neta imponible</p>
                <p className="text-xs text-slate-600"><strong>Pagos a Cuenta:</strong> Sistema de coeficiente o 1.5% mensual</p>
                <p className="text-xs text-slate-600"><strong>Libros:</strong> Contabilidad completa si supera 1,700 UIT</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900">Detracciones SPOT (D.L. 940)</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Monto Min. S/ 700</span>
                </div>
                <p className="text-xs text-slate-600"><strong>Servicios Frecuentes:</strong> 12% (Otros serv. empresariales), 10% (Alquileres), 4% (Construcción)</p>
                <p className="text-xs text-slate-600"><strong>Condición de Crédito:</strong> El depósito debe efectuarse antes del día 5 hábil del mes siguiente</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: DIAGNÓSTICO EN VIVO */}
      {activeTab === 'diagnostico' && (
        <div className="space-y-6">
          {/* Banner de Dictamen */}
          <div className={`p-6 rounded-3xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            diagnostico?.dictamen === 'CONFORME_SIN_OBSERVACIONES'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : diagnostico?.dictamen === 'CONFORME_CON_OBSERVACIONES_PREVENTIVAS'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-3">
              {diagnostico?.dictamen === 'CONFORME_SIN_OBSERVACIONES' ? (
                <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 bg-amber-600 text-white rounded-2xl">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Dictamen de Auditoría en Tiempo Real
                </span>
                <h3 className="text-xl font-black">
                  {diagnostico?.dictamen === 'CONFORME_SIN_OBSERVACIONES'
                    ? 'CONFORME: SIN OBSERVACIONES'
                    : diagnostico?.dictamen === 'CONFORME_CON_OBSERVACIONES_PREVENTIVAS'
                    ? 'CONFORME CON ALERTAS PREVENTIVAS'
                    : 'NO CONFORME - REQUIERE SUBSANACIÓN'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  Empresa Auditada: <strong className="font-bold">{empresa.razonSocial}</strong> (RUC: {empresa.ruc}) | Evaluado: {diagnostico?.fechaDiagnostico ? new Date(diagnostico.fechaDiagnostico).toLocaleString() : 'En proceso...'}
                </p>
              </div>
            </div>

            <button
              onClick={() => ejecutarDiagnostico()}
              disabled={isDiagnosticoLoading}
              className="px-4 py-2 bg-white rounded-xl shadow-xs border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-50 transition cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isDiagnosticoLoading ? 'animate-spin' : ''}`} />
              Re-evaluar
            </button>
          </div>

          {/* Métricas Clave del Diagnóstico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Cuadre Debe vs Haber</span>
              <p className="text-lg font-black text-slate-900 mt-1">
                S/ {diagnostico?.resumen.diferenciaGlobal.toFixed(2) || '0.00'}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {diagnostico?.resumen.asientosDescuadradosCount === 0 ? 'Balance 100% Cuadrado' : `${diagnostico?.resumen.asientosDescuadradosCount} Descuadres`}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Cadena Hash Criptográfica</span>
              <p className="text-lg font-black text-slate-900 mt-1">
                {diagnostico?.resumen.cadenaAuditoriaValida ? 'Inalterada' : 'Alterada'}
              </p>
              <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
                {diagnostico?.resumen.eventosAuditoriaRegistrados || 0} Bloques SHA-256
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Comprobantes RCE/RVIE</span>
              <p className="text-lg font-black text-slate-900 mt-1">
                {(diagnostico?.resumen.totalCompras || 0) + (diagnostico?.resumen.totalVentas || 0)}
              </p>
              <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">
                {diagnostico?.resumen.totalCompras || 0} Compras | {diagnostico?.resumen.totalVentas || 0} Ventas
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Padrón RUC Anexos</span>
              <p className="text-lg font-black text-slate-900 mt-1">
                {diagnostico?.resumen.totalAnexos || 0} Anexos
              </p>
              <span className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${
                (diagnostico?.resumen.anexosNoHabidos || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {(diagnostico?.resumen.anexosNoHabidos || 0) > 0 
                  ? `${diagnostico?.resumen.anexosNoHabidos} No Habidos` 
                  : '100% Habidos & Activos'}
              </span>
            </div>
          </div>

          {/* Hallazgos y Observaciones */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Detalle de Hallazgos y Alertas de Auditoría</h3>
            
            {diagnostico?.hallazgosCriticos && diagnostico.hallazgosCriticos.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Hallazgos Críticos ({diagnostico.hallazgosCriticos.length})
                </span>
                <ul className="text-xs text-rose-700 space-y-1 list-disc pl-5">
                  {diagnostico.hallazgosCriticos.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {diagnostico?.observaciones && diagnostico.observaciones.length > 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Alertas Preventivas ({diagnostico.observaciones.length})
                </span>
                <ul className="text-xs text-amber-700 space-y-1 list-disc pl-5">
                  {diagnostico.observaciones.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No se registraron observaciones normativas ni inconsistencias contables en la empresa.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 5: SEGURIDAD, RBAC & HASH CHAIN */}
      {activeTab === 'seguridad_rbac' && (
        <div className="space-y-6">
          {/* Matriz RBAC */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Matriz de Roles y Permisos (RBAC)</h3>
              <p className="text-xs text-slate-500">Control granular de operaciones por perfil en cada empresa cliente.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Operación / Módulo</th>
                    <th className="py-2.5 px-4 text-center">Superadmin Estudio</th>
                    <th className="py-2.5 px-4 text-center">Contador General</th>
                    <th className="py-2.5 px-4 text-center">Asistente Contable</th>
                    <th className="py-2.5 px-4 text-center">Auditor Externo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { op: 'Crear / Anular Asientos Contables', sa: true, cg: true, ac: true, ae: false },
                    { op: 'Cierre Mensual de Periodos & Bloqueo', sa: true, cg: true, ac: false, ae: false },
                    { op: 'Reapertura de Periodo Cerrado (Con justificación)', sa: true, cg: true, ac: false, ae: false },
                    { op: 'Consulta y Validación RUC SUNAT', sa: true, cg: true, ac: true, ae: true },
                    { op: 'Generación TXT SIRE & Libros PLE', sa: true, cg: true, ac: true, ae: true },
                    { op: 'Generación y Modificación de Reglas Contables', sa: true, cg: true, ac: false, ae: false },
                    { op: 'Acceso al Libro de Auditoría Criptográfica', sa: true, cg: true, ac: false, ae: true },
                    { op: 'Descarga de Copia de Seguridad SQL', sa: true, cg: true, ac: false, ae: true }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{row.op}</td>
                      <td className="py-2.5 px-4 text-center">{row.sa ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-2.5 px-4 text-center">{row.cg ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-2.5 px-4 text-center">{row.ac ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      <td className="py-2.5 px-4 text-center">{row.ae ? <Check className="w-4 h-4 text-blue-600 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Criptografía Inmutable SHA-256 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Lock className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cadena de Auditoría Inmutable (SHA-256 Hash Chaining)</h3>
                <p className="text-xs text-slate-500">Mecanismo de no repudio criptográfico para cumplimiento de la Ley 29733 y normas contables</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2">
              <p className="text-emerald-400 font-bold">// Algoritmo de Encadenamiento Criptográfico (auditoriaChainService):</p>
              <p className="text-slate-300">
                Hash Actual = SHA256( id + &quot;|&quot; + empresaId + &quot;|&quot; + usuarioId + &quot;|&quot; + tabla + &quot;|&quot; + registroId + &quot;|&quot; + accion + &quot;|&quot; + JSON(datos) + &quot;|&quot; + Hash Previo )
              </p>
              <p className="text-slate-400 text-[11px] pt-1">
                Cualquier manipulación de un registro histórico en la base de datos invalida automáticamente la cadena posterior, evidenciando de inmediato la vulneración.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: DOSSIER DE AUDITORÍA & EXPORTACIÓN */}
      {activeTab === 'dossier_export' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Dossier Técnico Estructurado para Auditores</h3>
              <p className="text-xs text-slate-500">Documento unificado listo para revisión técnica, auditoría contable y cumplimiento fiscal.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarDossier}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
              </button>

              <button
                onClick={handleDescargarJson}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 overflow-x-auto max-h-[500px] scrollbar-thin text-xs font-mono">
            <pre>
              {JSON.stringify({
                titulo: 'DOSSIER OFICIAL DE AUDITORIA TECNICA Y TRIBUTARIA',
                fechaEmision: new Date().toISOString(),
                empresaAuditada: {
                  id: empresa.id,
                  ruc: empresa.ruc,
                  razonSocial: empresa.razonSocial,
                  regimenTributario: empresa.regimenTributario
                },
                dictamenGlobal: diagnostico?.dictamen || 'EVALUACION_PENDIENTE',
                metricasIntegridad: diagnostico?.resumen,
                topologiaCapas: mapa?.stack,
                modulosYEndpoints: mapa?.topologiaModulos,
                esquemaBaseDatos: mapa?.esquemaBaseDatos,
                reglasFiscalesSunat: mapa?.reglasTributariasSunat
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
