/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Database, 
  Lock, 
  AlertTriangle,
  ArrowLeft,
  X
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
import { EmpresaSidebarNivel2, TabIdNivel2 } from './components/layout/EmpresaSidebarNivel2';
import { ConfigEmpresaModal } from './components/modals/ConfigEmpresaModal';
import { PdfExportModal, TipoReportePdf } from './components/modals/PdfExportModal';
import { SearchEmpresasModal } from './components/modals/SearchEmpresasModal';
import { ConfirmarCambioEmpresaModal } from './components/modals/ConfirmarCambioEmpresaModal';
import { useEmpresas, useCrearEmpresa, useMigrarLocalStorage } from './hooks/useEmpresas';
import { useToast } from './context/ToastContext';
import { EmpresaPeriodoProvider, useEmpresaPeriodo } from './context/EmpresaPeriodoContext';

// Views
import { MisEmpresasNivel1View } from './components/views/MisEmpresasNivel1View';
import { AccesoDenegadoView } from './components/views/AccesoDenegadoView';
import { DashboardView } from './components/views/DashboardView';
import { MaestrosSiscontView } from './components/views/MaestrosSiscontView';
import { VouchersSiscontView } from './components/views/VouchersSiscontView';
import { HonorariosView } from './components/views/HonorariosView';
import { SireConciliadorView } from './components/views/SireConciliadorView';
import { SunatSyncView } from './components/views/SunatSyncView';
import { RegistroComprasView } from './components/views/RegistroComprasView';
import { RegistroVentasView } from './components/views/RegistroVentasView';
import { LibroDiarioView } from './components/views/LibroDiarioView';
import { LibroMayorView } from './components/views/LibroMayorView';
import { CajaBancosView } from './components/views/CajaBancosView';
import { PlanillaPlameView } from './components/views/PlanillaPlameView';
import { ProcesosCierreView } from './components/views/ProcesosCierreView';
import { LiquidacionTributariaView } from './components/views/LiquidacionTributariaView';
import { ReportesFinancierosView } from './components/views/ReportesFinancierosView';
import { HojaTrabajo10ColumnasView } from './components/views/HojaTrabajo10ColumnasView';
import { SqlDatabaseView } from './components/views/SqlDatabaseView';
import { PeriodosView } from './components/views/PeriodosView';
import { ReglasContabilizacionView } from './components/views/ReglasContabilizacionView';
import { AuditoriaView } from './components/views/AuditoriaView';
import { CarteraSaldosView } from './components/views/CarteraSaldosView';
import { ActivosKardexView } from './components/views/ActivosKardexView';
import { UsuariosPermisosView } from './components/views/UsuariosPermisosView';

function AppContent({
  empresas,
  onAddEmpresa
}: {
  empresas: EmpresaCliente[];
  onAddEmpresa: (nueva: EmpresaCliente) => void;
}) {
  const { 
    nivelNavegacion, 
    empresaActiva, 
    salirAEmpresas, 
    periodo, 
    isPeriodoCerrado, 
    accesoDenegadoEmpresaId,
    cruceNavegacion,
    limpiarCruceNavegacion,
    isSearchModalOpen,
    setIsSearchModalOpen
  } = useEmpresaPeriodo();

  const { success } = useToast();

  const empresaActivaId = empresaActiva?.id || 'emp-01';

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
    if (!empresaActiva) {
      return crearDatosInicialesEmpresa('emp-01', '20100000001', 'Empresa Demo');
    }
    if (empresaDataMap[empresaActivaId]) {
      return empresaDataMap[empresaActivaId];
    }
    return crearDatosInicialesEmpresa(empresaActivaId, empresaActiva.ruc, empresaActiva.razonSocial);
  }, [empresaDataMap, empresaActivaId, empresaActiva]);

  // Funciones de actualización seguras para la empresa activa
  const updateActiveData = (updater: (prev: EmpresaDataState) => EmpresaDataState) => {
    if (!empresaActiva) return;
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

  // Pestaña activa en Nivel 2
  const [activeTab, setActiveTab] = useState<TabIdNivel2>('dashboard');

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfTipoInicial, setPdfTipoInicial] = useState<TipoReportePdf>('COMPRAS');

  // Sincronización de Navegación Cruzada
  useEffect(() => {
    if (cruceNavegacion?.moduloDestino) {
      const destino = cruceNavegacion.moduloDestino as TabIdNivel2;
      setActiveTab(destino);
    }
  }, [cruceNavegacion]);

  // Recalcular liquidación PDT 621 para la empresa activa
  const liquidacion: LiquidacionPDT621 = useMemo(() => {
    if (!empresaActiva) {
      return calcularLiquidacionPDT621([], [], periodo, 0.01, 0);
    }
    return calcularLiquidacionPDT621(
      compras,
      ventas,
      periodo,
      empresaActiva.tasaRentaMensual,
      saldoAnteriorIgv
    );
  }, [compras, ventas, periodo, empresaActiva, saldoAnteriorIgv]);

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
    success('Asientos de compras y ventas generados en el Libro Diario.', 'Asientos Contabilizados');
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
    success('Asiento de Planilla (Subdiario 07) generado con éxito en el Libro Diario.', 'Planilla Contabilizada');
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
    if (!empresaActiva) return;
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
    if (!empresaActiva) return;
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
      {/* TitleBar (Se adapta automáticamente a Nivel 1 Estudio vs Nivel 2 Empresa) */}
      <TitleBar
        empresaActiva={empresaActiva}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenPdfExport={() => {
          setPdfTipoInicial(
            activeTab === 'rvie_ventas' ? 'VENTAS' :
            activeTab === 'diario' ? 'DIARIO' :
            activeTab === 'honorarios' ? 'HONORARIOS' : 'COMPRAS'
          );
          setIsPdfModalOpen(true);
        }}
      />

      {/* RENDERIZADO CONDICIONAL DE NIVELES DE NAVEGACIÓN */}
      {accesoDenegadoEmpresaId ? (
        /* Caso Error 403: Intento de forzar URL a empresa sin permisos */
        <AccesoDenegadoView />
      ) : nivelNavegacion === 'ESTUDIO' || !empresaActiva ? (
        /* ==================================================================== */
        /* NIVEL 1 (ESTUDIO): Login → "Mis empresas" (cartera)                  */
        /* Sin menú lateral de módulos. Tablero de cartera con datos reales.    */
        /* ==================================================================== */
        <MisEmpresasNivel1View
          empresas={empresas}
          onAddEmpresa={onAddEmpresa}
        />
      ) : (
        /* ==================================================================== */
        /* NIVEL 2 (EMPRESA): Entorno operativo aislado de la empresa activa    */
        /* Con menú lateral agrupado por módulos operativos y contadores pend.  */
        /* ==================================================================== */
        <div className="flex flex-1 overflow-hidden">
          {/* Menú Lateral Agrupado por Módulos (Requisito 3) */}
          <EmpresaSidebarNivel2
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            compras={compras}
            ventas={ventas}
            asientos={asientos}
            movimientosBancarios={movimientosBancarios}
            honorarios={honorarios}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
          />

          {/* Área de Trabajo de la Empresa */}
          <main className="flex-1 bg-slate-50 overflow-y-auto p-6 flex flex-col space-y-4">
            {/* Banner de Período Cerrado (Requisito 6) */}
            {isPeriodoCerrado && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      Período Fiscal Cerrado ({periodo})
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Este ejercicio mensual se encuentra cerrado oficialmente. La interfaz desactiva edición y el servidor rechaza cualquier modificación.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-200 text-amber-950 font-mono font-bold rounded-xl text-[10px]">
                  SOLO LECTURA
                </span>
              </div>
            )}

            {/* Vistas Operativas de Nivel 2 */}
            <div className="flex-1">
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

              {activeTab === 'honorarios' && (
                <HonorariosView
                  honorarios={honorarios}
                  empresa={empresaActiva}
                  periodo={periodo}
                  onAddHonorario={(h) => setHonorarios(prev => [h, ...prev])}
                  onGenerarAsientoHonorario={handleGenerarAsientoHonorario}
                />
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

              {activeTab === 'vouchers' && (
                <VouchersSiscontView
                  empresaId={empresaActivaId}
                  periodo={periodo}
                  isPeriodoCerrado={isPeriodoCerrado}
                />
              )}

              {activeTab === 'diario' && (
                <LibroDiarioView
                  asientos={asientos}
                  empresa={empresaActiva}
                  periodo={periodo}
                  onGenerarAsientosMasivos={handleGenerarAsientosMasivos}
                  onAbrirAsiento={() => {
                    setActiveTab('vouchers');
                  }}
                />
              )}

              {activeTab === 'mayor' && (
                <LibroMayorView
                  asientos={asientos}
                  empresa={empresaActiva}
                  periodo={periodo}
                />
              )}

              {activeTab === 'balance_comprobacion' && (
                <HojaTrabajo10ColumnasView
                  asientos={asientos}
                  empresa={empresaActiva}
                  periodo={periodo}
                  onAbrirMayor={() => {
                    setActiveTab('mayor');
                  }}
                />
              )}

              {activeTab === 'destinos_dc' && (
                <ProcesosCierreView
                  asientos={asientos}
                  compras={compras}
                  empresa={empresaActiva}
                  periodo={periodo}
                  onGenerarDestinos={handleGenerarAsientosMasivos}
                  onGenerarAjusteTc={handleAddAsiento}
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
                  onUpdateEmpresa={() => {}}
                  compras={compras}
                  ventas={ventas}
                  onAddComprobantes={handleAddComprobantes}
                />
              )}

              {activeTab === 'ple' && (
                <SireConciliadorView
                  compras={compras}
                  empresa={empresaActiva}
                  periodo={periodo}
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
                  empresa={empresaActiva}
                  periodo={periodo}
                  onAbrirMayor={() => {
                    setActiveTab('mayor');
                  }}
                />
              )}

              {activeTab === 'cierre' && (
                <ProcesosCierreView
                  asientos={asientos}
                  compras={compras}
                  empresa={empresaActiva}
                  periodo={periodo}
                  onGenerarDestinos={handleGenerarAsientosMasivos}
                  onGenerarAjusteTc={handleAddAsiento}
                />
              )}

              {activeTab === 'maestros' && (
                <MaestrosSiscontView />
              )}

              {activeTab === 'reglas' && (
                <ReglasContabilizacionView empresaId={empresaActivaId} />
              )}

              {activeTab === 'usuarios_permisos' && (
                <UsuariosPermisosView />
              )}
            </div>
          </main>
        </div>
      )}

      {/* Modals & Command Palette */}
      <SearchEmpresasModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        empresas={empresas}
      />

      <ConfirmarCambioEmpresaModal />

      {empresaActiva && (
        <ConfigEmpresaModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          empresa={empresaActiva}
          onSave={(upd) => {
            console.log('Empresa actualizada:', upd);
          }}
        />
      )}

      {empresaActiva && (
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
      )}
    </div>
  );
}

export default function App() {
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

  const handleAddEmpresa = (nueva: EmpresaCliente) => {
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
    });
  };

  return (
    <EmpresaPeriodoProvider initialEmpresas={empresas}>
      <AppContent
        empresas={empresas}
        onAddEmpresa={handleAddEmpresa}
      />
    </EmpresaPeriodoProvider>
  );
}
