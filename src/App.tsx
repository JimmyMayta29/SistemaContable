/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  BookOpen, 
  FileCheck, 
  FileSpreadsheet, 
  TrendingUp, 
  Receipt, 
  Landmark, 
  Users, 
  Cpu, 
  Calculator, 
  BarChart3, 
  Building2, 
  Database, 
  Laptop, 
  Settings, 
  RefreshCw, 
  Sparkles,
  FileText,
  LogIn,
  SlidersHorizontal,
  Lock,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

import { 
  Comprobante, 
  AsientoContable, 
  EmpresaCliente, 
  LiquidacionPDT621,
  MovimientoCajaBanco,
  TrabajadorPlanilla,
  ReciboHonorario,
  EmpresaDataState
} from './types';
import { 
  EMPRESAS_CLIENTES_DEMO, 
  crearDatosInicialesEmpresa 
} from './data/empresasClientes';
import { 
  generarAsientoCompra, 
  generarAsientoVenta, 
  generarAsientoPlanilla,
  generarAsientoHonorario,
  calcularLiquidacionPDT621 
} from './services/accountingEngine';
import { generarSireRceTxt } from './services/sireTxtGenerator';
import { generarSqlDumpCompleto } from './services/sqlDatabaseService';

// Desktop & Header Components
import { TitleBar } from './components/desktop/TitleBar';
import { ConfigEmpresaModal } from './components/modals/ConfigEmpresaModal';
import { PdfExportModal, TipoReportePdf } from './components/modals/PdfExportModal';
import { useEmpresas, useCrearEmpresa, useMigrarLocalStorage } from './hooks/useEmpresas';

// Views
import { DashboardView } from './components/views/DashboardView';
import { MaestrosSiscontView } from './components/views/MaestrosSiscontView';
import { VouchersSiscontView } from './components/views/VouchersSiscontView';
import { HonorariosView } from './components/views/HonorariosView';
import { SireConciliadorView } from './components/views/SireConciliadorView';
import { SunatSyncView } from './components/views/SunatSyncView';
import { RegistroComprasView } from './components/views/RegistroComprasView';
import { RegistroVentasView } from './components/views/RegistroVentasView';
import { LibroDiarioView } from './components/views/LibroDiarioView';
import { CajaBancosView } from './components/views/CajaBancosView';
import { PlanillaPlameView } from './components/views/PlanillaPlameView';
import { ProcesosCierreView } from './components/views/ProcesosCierreView';
import { LiquidacionTributariaView } from './components/views/LiquidacionTributariaView';
import { ReportesFinancierosView } from './components/views/ReportesFinancierosView';
import { EmpresasClientesView } from './components/views/EmpresasClientesView';
import { SqlDatabaseView } from './components/views/SqlDatabaseView';
import { PeriodosView } from './components/views/PeriodosView';
import { ReglasContabilizacionView } from './components/views/ReglasContabilizacionView';
import { AuditoriaView } from './components/views/AuditoriaView';
import { CarteraSaldosView } from './components/views/CarteraSaldosView';

export default function App() {
  const [periodo] = useState<string>('2026-09');

  // Cartera de Empresas conectada a Backend mediante TanStack Query
  const { data: apiEmpresas = [] } = useEmpresas();
  const crearEmpresaMutation = useCrearEmpresa();
  const migrarMutation = useMigrarLocalStorage();
  const [empresasCustom, setEmpresasCustom] = useState<Record<string, Partial<EmpresaCliente>>>({});

  const empresas = useMemo<EmpresaCliente[]>(() => {
    const base = (apiEmpresas && apiEmpresas.length > 0) ? apiEmpresas : EMPRESAS_CLIENTES_DEMO;
    return base.map(e => ({
      ...e,
      ...(empresasCustom[e.id] || {})
    }));
  }, [apiEmpresas, empresasCustom]);

  const updateEmpresaCustom = (id: string, updates: Partial<EmpresaCliente>) => {
    setEmpresasCustom(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...updates }
    }));
  };

  const [empresaActivaId, setEmpresaActivaId] = useState<string>(() => {
    return localStorage.getItem('sunaconta_empresa_activa_id') || 'emp-01';
  });

  // Guardar solo preferencia de UI
  useEffect(() => {
    localStorage.setItem('sunaconta_empresa_activa_id', empresaActivaId);
  }, [empresaActivaId]);

  // Migración automática al backend si hay datos previos en localStorage
  useEffect(() => {
    const legacyData = localStorage.getItem('sunaconta_empresas_data_v4');
    if (legacyData && !localStorage.getItem('sunaconta_migrated_to_db')) {
      try {
        const parsedMap = JSON.parse(legacyData);
        migrarMutation.mutate({
          empresas,
          empresaDataMap: parsedMap
        }, {
          onSuccess: (res) => {
            console.log('✅ [Migración Backend] Datos importados a la base de datos:', res);
            localStorage.setItem('sunaconta_migrated_to_db', 'true');
          }
        });
      } catch (e) {
        console.warn('Error procesando migración inicial:', e);
      }
    }
  }, [empresas]);

  const empresaActiva = useMemo(() => {
    return empresas.find(e => e.id === empresaActivaId) || empresas[0];
  }, [empresas, empresaActivaId]);

  // Almacenamiento Aislado por Empresa en memoria de sesión
  const [empresaDataMap, setEmpresaDataMap] = useState<Record<string, EmpresaDataState>>(() => {
    const map: Record<string, EmpresaDataState> = {};
    EMPRESAS_CLIENTES_DEMO.forEach(emp => {
      map[emp.id] = crearDatosInicialesEmpresa(emp.id, emp.ruc, emp.razonSocial);
    });
    return map;
  });

  // Datos de la empresa actualmente seleccionada
  const activeData = useMemo<EmpresaDataState>(() => {
    if (empresaDataMap[empresaActivaId]) {
      return empresaDataMap[empresaActivaId];
    }
    return crearDatosInicialesEmpresa(empresaActivaId, empresaActiva.ruc, empresaActiva.razonSocial);
  }, [empresaDataMap, empresaActivaId, empresaActiva]);

  // Funciones de actualización seguras para la empresa activa
  const updateActiveData = (updater: (prev: EmpresaDataState) => EmpresaDataState) => {
    setEmpresaDataMap(prevMap => {
      const current = prevMap[empresaActivaId] || crearDatosInicialesEmpresa(empresaActivaId, empresaActiva.ruc, empresaActiva.razonSocial);
      const updated = updater(current);
      return {
        ...prevMap,
        [empresaActivaId]: updated
      };
    });
  };

  const compras = activeData.compras;
  const ventas = activeData.ventas;
  const asientos = activeData.asientos;
  const movimientosBancarios = activeData.movimientosBancarios;
  const trabajadoresPlanilla = activeData.trabajadoresPlanilla;
  const honorarios = activeData.honorarios || [];
  const saldoAnteriorIgv = activeData.saldoAnteriorIgv || 0;

  const setCompras = (action: React.SetStateAction<Comprobante[]>) => {
    updateActiveData(prev => ({
      ...prev,
      compras: typeof action === 'function' ? action(prev.compras) : action
    }));
  };

  const setVentas = (action: React.SetStateAction<Comprobante[]>) => {
    updateActiveData(prev => ({
      ...prev,
      ventas: typeof action === 'function' ? action(prev.ventas) : action
    }));
  };

  const setAsientos = (action: React.SetStateAction<AsientoContable[]>) => {
    updateActiveData(prev => ({
      ...prev,
      asientos: typeof action === 'function' ? action(prev.asientos) : action
    }));
  };

  const setMovimientosBancarios = (action: React.SetStateAction<MovimientoCajaBanco[]>) => {
    updateActiveData(prev => ({
      ...prev,
      movimientosBancarios: typeof action === 'function' ? action(prev.movimientosBancarios) : action
    }));
  };

  const setTrabajadoresPlanilla = (action: React.SetStateAction<TrabajadorPlanilla[]>) => {
    updateActiveData(prev => ({
      ...prev,
      trabajadoresPlanilla: typeof action === 'function' ? action(prev.trabajadoresPlanilla) : action
    }));
  };

  const setHonorarios = (action: React.SetStateAction<ReciboHonorario[]>) => {
    updateActiveData(prev => ({
      ...prev,
      honorarios: typeof action === 'function' ? action(prev.honorarios || []) : action
    }));
  };

  const setSaldoAnteriorIgv = (monto: number) => {
    updateActiveData(prev => ({
      ...prev,
      saldoAnteriorIgv: monto
    }));
  };

  // Active View Tab (Modular SISCONT SMART architecture)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'maestros' | 'reglas' | 'vouchers' | 'periodos' | 'honorarios' | 'sire_smart' | 'sire_sync' | 'rce_compras' | 'rvie_ventas' | 'diario' | 'caja_bancos' | 'cartera_saldos' | 'planilla' | 'procesos' | 'pdt621' | 'reportes' | 'cartera' | 'sql_db' | 'auditoria'
  >('dashboard');

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfTipoInicial, setPdfTipoInicial] = useState<TipoReportePdf>('COMPRAS');

  // Recalculate PDT 621 whenever purchases or sales change for active company
  const liquidacion: LiquidacionPDT621 = useMemo(() => {
    return calcularLiquidacionPDT621(
      compras,
      ventas,
      periodo,
      empresaActiva.tasaRentaMensual,
      saldoAnteriorIgv
    );
  }, [compras, ventas, periodo, empresaActiva.tasaRentaMensual, saldoAnteriorIgv]);

  // Generadores & Asientos
  const handleGenerarAsientosMasivos = () => {
    const [, mes] = periodo.split('-');
    const asientosCompras = compras.map((c, idx) => ({
      ...generarAsientoCompra(c, idx + 1),
      subdiario: '01' as const,
      numeroAsiento: `01${mes}${String(idx + 1).padStart(4, '0')}`,
      moneda: 'PEN' as const,
      tipoCambio: 3.752
    }));
    const asientosVentas = ventas.map((v, idx) => ({
      ...generarAsientoVenta(v, idx + 1),
      subdiario: '02' as const,
      numeroAsiento: `02${mes}${String(idx + 1).padStart(4, '0')}`,
      moneda: 'PEN' as const,
      tipoCambio: 3.752
    }));
    setAsientos(prev => [...asientosCompras, ...asientosVentas, ...prev.filter(a => a.subdiario !== '01' && a.subdiario !== '02')]);
    setCompras(prev => prev.map(c => ({ ...c, asientoGenerado: true })));
    setVentas(prev => prev.map(v => ({ ...v, asientoGenerado: true })));
  };

  const handleAddAsiento = (nuevo: AsientoContable) => {
    setAsientos(prev => [nuevo, ...prev]);
  };

  const handleGenerarAsientoPlanilla = () => {
    const totalSueldos = trabajadoresPlanilla.reduce((a, b) => a + b.sueldoBruto, 0);
    const totalEssalud = trabajadoresPlanilla.reduce((a, b) => a + b.essaludEmpleador, 0);
    const totalRetPension = trabajadoresPlanilla.reduce((a, b) => a + b.aporteTrabajador, 0);
    const totalNeto = trabajadoresPlanilla.reduce((a, b) => a + b.netoAPagar, 0);

    const asientoPlanilla = generarAsientoPlanilla(
      totalSueldos,
      totalEssalud,
      totalRetPension,
      totalNeto,
      periodo,
      1
    );

    handleAddAsiento(asientoPlanilla);
    alert('Asiento de Planilla (Subdiario 07) generado con éxito en el Libro Diario.');
  };

  const handleGenerarAsientoHonorario = (honorario: ReciboHonorario) => {
    const [, mes] = periodo.split('-');
    const correlativo = String(asientos.filter(a => a.subdiario === '06').length + 1).padStart(4, '0');
    const nuevoAsiento = generarAsientoHonorario(
      {
        numeroRecibo: honorario.numeroRecibo,
        fechaEmision: honorario.fechaEmision,
        rucEmisor: honorario.rucEmisor,
        razonSocialEmisor: honorario.razonSocialEmisor,
        montoTotal: honorario.montoTotalHonorario,
        retencion8: honorario.retencionMonto,
        netoPagar: honorario.netoCobrado,
        cuentaGasto: honorario.cuentaGasto
      },
      periodo,
      parseInt(correlativo) || 1
    );
    handleAddAsiento(nuevoAsiento);
  };

  const handleAddComprobantes = (nuevos: Comprobante[], tipo: 'COMPRAS' | 'VENTAS') => {
    if (tipo === 'COMPRAS') {
      setCompras(prev => [...nuevos, ...prev]);
    } else {
      setVentas(prev => [...nuevos, ...prev]);
    }
  };

  const handleUpdateCuentaContable = (id: string, cuenta: string) => {
    setCompras(prev => prev.map(c => c.id === id ? { ...c, cuentaContableAsignada: cuenta } : c));
  };

  const handleDownloadSireTxt = () => {
    const { nombreArchivo, contenido } = generarSireRceTxt(empresaActiva.ruc, periodo, compras);
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSqlDump = () => {
    const dump = generarSqlDumpCompleto(
      {
        ...empresaActiva,
        sqlEngine: 'SQLITE_EMBEDDED',
        sqlHost: 'localhost',
        sqlPort: 5432,
        sqlDatabase: `sunaconta_db_${empresaActiva.ruc}`,
        sqlUser: 'postgres',
        sqlSsl: false,
        coeficienteRenta: 0.01
      }, 
      compras, 
      ventas, 
      asientos
    );
    const blob = new Blob([dump], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunaconta_db_dump_${empresaActiva.ruc}_${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* TitleBar & Fast Client Company Selector */}
      <TitleBar
        empresaActiva={empresaActiva}
        empresas={empresas}
        periodo={periodo}
        onSelectEmpresa={(id) => setEmpresaActivaId(id)}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenCartera={() => setActiveTab('cartera')}
        onOpenPdfExport={() => {
          setPdfTipoInicial(
            activeTab === 'rvie_ventas' ? 'VENTAS' :
            activeTab === 'diario' ? 'DIARIO' :
            activeTab === 'honorarios' ? 'HONORARIOS' : 'COMPRAS'
          );
          setIsPdfModalOpen(true);
        }}
      />

      {/* Main Workspace with SISCONT SMART Modular Menu */}
      <div className="flex flex-1 overflow-hidden">
        {/* Modular Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-xs">
          <div className="p-3 space-y-1 overflow-y-auto">
            {/* SECCIÓN PRINCIPAL: EMPRESAS & TABLERO */}
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Módulo Principal
            </div>

            <button
              onClick={() => setActiveTab('cartera')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'cartera'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                Acceso a Empresas
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'cartera' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {empresas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              Tablero Principal
            </button>

            {/* SECCIÓN 1: TABLAS & MAESTROS (SISCONT SMART) */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1. Tablas & Maestros
            </div>

            <button
              onClick={() => setActiveTab('maestros')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'maestros'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderTree className="w-4 h-4 text-blue-600" />
                Maestros del Sistema
              </div>
              <span className="text-[10px] font-mono text-slate-400">PCGE/TC</span>
            </button>

            <button
              onClick={() => setActiveTab('reglas')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'reglas'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                Reglas & Destinos (94/95)
              </div>
              <span className="text-[10px] font-mono text-amber-600 font-bold">Motor</span>
            </button>

            {/* SECCIÓN 2: GESTIÓN & VOUCHERS */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              2. Gestión / Vouchers
            </div>

            <button
              onClick={() => setActiveTab('vouchers')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'vouchers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Ingreso de Vouchers
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">BD OK</span>
            </button>

            <button
              onClick={() => setActiveTab('periodos')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'periodos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-rose-500" />
                Control de Períodos
              </div>
              <span className="text-[10px] font-mono text-slate-400">{periodo}</span>
            </button>

            <button
              onClick={() => setActiveTab('honorarios')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'honorarios'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-amber-600" />
                Recibos Honorarios (4ta)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'honorarios' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {honorarios.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('planilla')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'planilla'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                Planilla / PLAME (07)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'planilla' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {trabajadoresPlanilla.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('caja_bancos')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'caja_bancos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Caja y Bancos (03-05)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'caja_bancos' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {movimientosBancarios.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cartera_saldos')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'cartera_saldos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-purple-600" />
                Cartera CxC / CxP & Saldos
              </div>
              <span className="text-[10px] font-mono text-purple-600 font-bold">Tramos</span>
            </button>

            {/* SECCIÓN 3: MÓDULO SIRE & SUNAT HUB */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              3. Conexión & SIRE SUNAT
            </div>

            <button
              onClick={() => setActiveTab('sire_smart')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'sire_smart'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Conciliador SIRE SUNAT
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            <button
              onClick={() => setActiveTab('sire_sync')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'sire_sync'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Descargas Clave SOL
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1 rounded">XML/CDR</span>
            </button>

            {/* SECCIÓN 4: REGISTROS & LIBROS OFICIALES */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              4. Registros & Libros
            </div>

            <button
              onClick={() => setActiveTab('rce_compras')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'rce_compras'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                Registro Compras (8.4)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'rce_compras' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {compras.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rvie_ventas')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'rvie_ventas'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Registro Ventas (14.4)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'rvie_ventas' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {ventas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('diario')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'diario'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Libro Diario (5.1)
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'diario' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {asientos.length}
              </span>
            </button>

            {/* SECCIÓN 5: PROCESOS & TRIBUTACIÓN */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              5. Procesos & Tributación
            </div>

            <button
              onClick={() => setActiveTab('pdt621')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'pdt621'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4 text-rose-500" />
              Liquidación PDT 621
            </button>

            <button
              onClick={() => setActiveTab('procesos')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'procesos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-amber-600" />
                Destinos & Diferencia TC
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Cierre</span>
            </button>

            <button
              onClick={() => setActiveTab('reportes')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'reportes'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-sky-600" />
              Estados Financieros
            </button>

            {/* SECCIÓN 6: BASE DE DATOS SQL */}
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              6. Base de Datos SQL
            </div>

            <button
              onClick={() => setActiveTab('sql_db')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'sql_db'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-amber-500" />
                Base de Datos SQL
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">SQL OK</span>
            </button>

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Auditoría Inmutable
              </div>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">Logs</span>
            </button>
          </div>

          {/* Bottom Card for Selected Company */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Empresa Activa</span>
              <span className="text-emerald-600 font-bold">● Aislada</span>
            </div>
            <div className="font-bold text-slate-800 truncate mt-0.5">{empresaActiva.razonSocial}</div>
            <div className="text-slate-500 font-mono text-[11px]">RUC: {empresaActiva.ruc}</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cartera')}
                className="flex-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                title="Cambiar a otra empresa cliente"
              >
                <LogIn className="w-3.5 h-3.5" /> Cambiar
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center transition cursor-pointer"
                title="Editar configuración fiscal y credenciales SOL"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* View Main Work Content */}
        <main className="flex-1 bg-slate-50 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              compras={compras}
              ventas={ventas}
              asientos={asientos}
              liquidacion={liquidacion}
              empresa={empresaActiva}
              onNavigate={(tab) => setActiveTab(tab as any)}
              onTriggerSync={() => setActiveTab('sire_sync')}
              onDownloadSireTxt={handleDownloadSireTxt}
              onDownloadSqlDump={handleDownloadSqlDump}
            />
          )}

          {activeTab === 'cartera' && (
            <EmpresasClientesView
              empresas={empresas}
              empresaActivaId={empresaActivaId}
              onSelectEmpresa={(id) => setEmpresaActivaId(id)}
              onIngresarEmpresa={(id) => {
                setEmpresaActivaId(id);
                setActiveTab('dashboard');
              }}
              onAddEmpresa={(nueva) => {
                crearEmpresaMutation.mutate({
                  codigoEmpresa: nueva.codigoEmpresa,
                  ruc: nueva.ruc,
                  razonSocial: nueva.razonSocial,
                  nombreComercial: nueva.nombreComercial,
                  regimenTributario: nueva.regimenTributario,
                  direccionFiscal: nueva.direccionFiscal || 'LIMA, PERÚ',
                  contactoNombre: nueva.contactoNombre,
                  contactoTelefono: nueva.contactoTelefono,
                  contactoEmail: nueva.contactoEmail
                }, {
                  onSuccess: (creada) => {
                    setEmpresaDataMap(prev => ({
                      ...prev,
                      [creada.id]: crearDatosInicialesEmpresa(creada.id, creada.ruc, creada.razonSocial)
                    }));
                    setEmpresaActivaId(creada.id);
                    setActiveTab('dashboard');
                  }
                });
              }}
              onTogglePreliquidacionNotificada={(id) => {
                updateEmpresaCustom(id, { preliquidacionNotificada: true });
              }}
            />
          )}

          {activeTab === 'maestros' && (
            <MaestrosSiscontView />
          )}

          {activeTab === 'reglas' && (
            <ReglasContabilizacionView empresaId={empresaActivaId} />
          )}

          {activeTab === 'vouchers' && (
            <VouchersSiscontView
              empresaId={empresaActivaId}
              periodo={periodo}
              isPeriodoCerrado={false}
            />
          )}

          {activeTab === 'periodos' && (
            <PeriodosView empresaId={empresaActivaId} />
          )}

          {activeTab === 'honorarios' && (
            <HonorariosView
              honorarios={honorarios}
              empresa={empresaActiva}
              periodo={periodo}
              onAddHonorario={(h) => setHonorarios(prev => [h, ...prev])}
              onGenerarAsientoHonorario={handleGenerarAsientoHonorario}
            />
          )}

          {activeTab === 'sire_smart' && (
            <SireConciliadorView
              compras={compras}
              empresa={empresaActiva}
              periodo={periodo}
              onImportarComprobanteSunat={(comp) => {
                setCompras(prev => [comp, ...prev]);
              }}
            />
          )}

          {activeTab === 'sire_sync' && (
            <SunatSyncView
              empresa={empresaActiva}
              onUpdateEmpresa={(upd) => {
                updateEmpresaCustom(empresaActivaId, upd);
              }}
              compras={compras}
              ventas={ventas}
              onAddComprobantes={handleAddComprobantes}
            />
          )}

          {activeTab === 'rce_compras' && (
            <RegistroComprasView
              compras={compras}
              empresa={empresaActiva}
              periodo={periodo}
              onGenerarAsientos={handleGenerarAsientosMasivos}
              onUpdateCuentaContable={handleUpdateCuentaContable}
            />
          )}

          {activeTab === 'rvie_ventas' && (
            <RegistroVentasView
              ventas={ventas}
              empresa={empresaActiva}
              periodo={periodo}
            />
          )}

          {activeTab === 'diario' && (
            <LibroDiarioView
              asientos={asientos}
              empresa={empresaActiva}
              periodo={periodo}
              onGenerarAsientosMasivos={handleGenerarAsientosMasivos}
            />
          )}

          {activeTab === 'caja_bancos' && (
            <CajaBancosView
              empresaId={empresaActivaId}
              periodo={periodo}
              movimientos={movimientosBancarios}
              onAddMovimiento={(m) => setMovimientosBancarios(prev => [m, ...prev])}
            />
          )}

          {activeTab === 'cartera_saldos' && (
            <CarteraSaldosView empresaId={empresaActivaId} />
          )}

          {activeTab === 'planilla' && (
            <PlanillaPlameView
              empresaId={empresaActivaId}
              periodo={periodo}
              trabajadores={trabajadoresPlanilla}
              onAddTrabajador={(t) => setTrabajadoresPlanilla(prev => [...prev, t])}
              onGenerarAsientoPlanilla={handleGenerarAsientoPlanilla}
            />
          )}

          {activeTab === 'procesos' && (
            <ProcesosCierreView
              asientos={asientos}
              compras={compras}
              empresa={empresaActiva}
              periodo={periodo}
              onGenerarDestinos={handleGenerarAsientosMasivos}
              onGenerarAjusteTc={handleAddAsiento}
            />
          )}

          {activeTab === 'pdt621' && (
            <LiquidacionTributariaView
              liquidacion={liquidacion}
              empresa={empresaActiva}
              compras={compras}
              ventas={ventas}
              onUpdateSaldoAnterior={(nuevo) => setSaldoAnteriorIgv(nuevo)}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesFinancierosView
              asientos={asientos}
              periodo={periodo}
            />
          )}

          {activeTab === 'sql_db' && (
            <SqlDatabaseView
              empresa={empresaActiva}
              compras={compras}
              ventas={ventas}
              asientos={asientos}
              onUpdateEmpresa={(upd) => {
                updateEmpresaCustom(empresaActivaId, upd);
              }}
            />
          )}

          {activeTab === 'auditoria' && (
            <AuditoriaView empresaId={empresaActivaId} />
          )}
        </main>
      </div>

      {/* Business Setup Modal */}
      <ConfigEmpresaModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        empresa={empresaActiva}
        onSave={(upd) => {
          console.log('Empresa actualizada:', upd);
        }}
      />

      {/* Official PDF Export Modal with Legal Letterhead and Logo */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        empresa={empresaActiva}
        periodo={periodo}
        tipoReporteInicial={pdfTipoInicial}
        compras={compras}
        ventas={ventas}
        asientos={asientos}
        honorarios={honorarios}
      />
    </div>
  );
}
