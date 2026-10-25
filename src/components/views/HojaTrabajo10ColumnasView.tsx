import React, { useState, useMemo } from 'react';
import { 
  Table, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  SlidersHorizontal, 
  Calendar, 
  Eye, 
  Settings2, 
  HelpCircle,
  Building2,
  BookOpen,
  X
} from 'lucide-react';
import { AsientoContable, EmpresaCliente } from '../../types';
import { 
  calcularHojaTrabajo10Columnas, 
  exportarHojaTrabajoHojaCalculo,
  exportarHojaTrabajoPdf,
  HojaTrabajo10ColumnasReporte,
  OpcionesHojaTrabajo10Col
} from '../../services/reportesEngine';
import { useToast } from '../../context/ToastContext';

interface HojaTrabajo10ColumnasViewProps {
  asientos: AsientoContable[];
  empresa: EmpresaCliente;
  periodo: string;
  onAbrirMayor?: (codigoCuenta: string) => void;
}

export const HojaTrabajo10ColumnasView: React.FC<HojaTrabajo10ColumnasViewProps> = ({
  asientos,
  empresa,
  periodo,
  onAbrirMayor
}) => {
  const { info } = useToast();

  // Opciones de cálculo de la Hoja de Trabajo
  const [acumuladoAlMes, setAcumuladoAlMes] = useState<boolean>(true);
  const [correctorasEnNegativo, setCorrectorasEnNegativo] = useState<boolean>(false);
  const [incluirCierre, setIncluirCierre] = useState<boolean>(true);
  
  // Interruptores de exportación / impresión
  const [incluirFechaImpresion, setIncluirFechaImpresion] = useState<boolean>(true);
  const [incluirUsuario, setIncluirUsuario] = useState<boolean>(true);
  const [incluirNumeroPagina, setIncluirNumeroPagina] = useState<boolean>(true);

  // Mapeos configurables
  const [modalMapeoOpen, setModalMapeoOpen] = useState(false);
  const [mapeosFuncion, setMapeosFuncion] = useState<Record<string, 'COSTO_VENTAS' | 'GASTOS_ADMIN' | 'GASTOS_VENTAS' | 'GASTOS_FINANCIEROS' | 'INGRESOS' | 'EXCLUIDO'>>({
    '6911': 'COSTO_VENTAS',
    '941': 'GASTOS_ADMIN',
    '951': 'GASTOS_VENTAS',
    '971': 'GASTOS_FINANCIEROS'
  });

  // Cálculo de la Hoja de Trabajo
  const reporte: HojaTrabajo10ColumnasReporte = useMemo(() => {
    return calcularHojaTrabajo10Columnas(asientos, empresa, periodo, {
      acumuladoAlMes,
      correctorasActivoEnNegativo: correctorasEnNegativo,
      incluirCierreYAjustes: incluirCierre,
      mapeoFuncionPersonalizado: mapeosFuncion
    });
  }, [asientos, empresa, periodo, acumuladoAlMes, correctorasEnNegativo, incluirCierre, mapeosFuncion]);

  const { totales, resultadoEjercicio, filaResultado, sumasIguales, controlesCuadre } = reporte;

  const handleRowDoubleClick = (codigoCuenta: string) => {
    if (onAbrirMayor) {
      onAbrirMayor(codigoCuenta);
    } else {
      info(`Abriendo Mayor para la cuenta ${codigoCuenta}...`, 'Libro Mayor');
    }
  };

  const handleExportPdf = () => {
    exportarHojaTrabajoPdf(reporte, {
      incluirFechaImpresion,
      incluirUsuario,
      incluirNumeroPagina,
      usuarioNombre: 'Contador General'
    });
  };

  const handleExportHojaCalculo = () => {
    exportarHojaTrabajoHojaCalculo(reporte, {
      incluirFechaImpresion,
      incluirUsuario,
      usuarioNombre: 'Contador General'
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Encabezado del reporte */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                Formato estándar
              </span>
              <span className="text-xs text-slate-400 font-mono">
                PCGE 2020 / NIIF
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Table className="w-5 h-5 text-blue-600" />
              {reporte.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-mono">
              <span><strong>Razón Social:</strong> {reporte.razonSocial}</span>
              <span>•</span>
              <span><strong>RUC:</strong> {reporte.ruc}</span>
              <span>•</span>
              <span><strong>Moneda:</strong> {reporte.moneda} (Soles)</span>
            </div>
          </div>

          {/* Botones de Exportación e Impresión */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setModalMapeoOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Configurar tabla de mapeo de cuentas a función y vigencia"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              Mapeo Función
            </button>
            <button
              onClick={handleExportHojaCalculo}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Exportar Hoja de Trabajo 10 Columnas a hoja de cálculo"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Hoja de cálculo (10 Col)
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Exportar a PDF oficial con membrete"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Imprimir
            </button>
          </div>
        </div>

        {/* 2. Barra de Opciones y Selectores */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Selector de Rango Temporal */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium px-2">Rango:</span>
            <button
              onClick={() => setAcumuladoAlMes(true)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                acumuladoAlMes ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Acumulado al mes (Ene - {reporte.mesNombre})
            </button>
            <button
              onClick={() => setAcumuladoAlMes(false)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                !acumuladoAlMes ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Solo el mes ({reporte.mesNombre})
            </button>
          </div>

          {/* Opciones de presentación contable */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={correctorasEnNegativo}
                onChange={(e) => setCorrectorasEnNegativo(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span title="Muestra cuentas correctoras (19, 29, 39) en Activo con signo negativo en vez de Pasivo">
                Cuentas correctoras en Activo (-)
              </span>
            </label>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirCierre}
                onChange={(e) => setIncluirCierre(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Incluir asientos de cierre / ajuste (00 y 09)</span>
            </label>

            <div className="border-l border-slate-200 pl-3 flex items-center gap-3 text-[11px] text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirFechaImpresion}
                  onChange={(e) => setIncluirFechaImpresion(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Fecha imp.</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirUsuario}
                  onChange={(e) => setIncluirUsuario(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Usuario</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirNumeroPagina}
                  onChange={(e) => setIncluirNumeroPagina(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>N° pág.</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Panel de Controles de Validación & Alerta Roja de Descuadre */}
      <div className={`p-4 rounded-2xl border text-xs shadow-xs transition-all ${
        controlesCuadre.todoCuadrado
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {controlesCuadre.todoCuadrado ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
            )}
            <div>
              <span className="font-bold text-sm font-sans block">
                {controlesCuadre.todoCuadrado 
                  ? 'Hoja de Trabajo 10 Columnas Cuadrada y Validada' 
                  : 'ALERTA DE DESCUADRE EN HOJA DE TRABAJO'}
              </span>
              <span className="text-[11px] opacity-80">
                {controlesCuadre.todoCuadrado 
                  ? 'Las 5 verificaciones oficiales de cuadre (Montos, Saldos, Balance, Naturaleza y Función) cumplen la partida doble.' 
                  : 'Se detectaron inconsistencias en las sumas o discrepancias entre Naturaleza y Función.'}
              </span>
            </div>
          </div>

          {/* Badges de las 4 verificaciones clave */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border ${
              controlesCuadre.montosCuadrados 
                ? 'bg-white text-emerald-700 border-emerald-300' 
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              D = C: {controlesCuadre.montosCuadrados ? '✓ OK' : `Dif S/ ${controlesCuadre.diferenciaMontos.toFixed(2)}`}
            </span>

            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border ${
              controlesCuadre.saldosCuadrados 
                ? 'bg-white text-emerald-700 border-emerald-300' 
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              Deudor = Acreedor: {controlesCuadre.saldosCuadrados ? '✓ OK' : `Dif S/ ${controlesCuadre.diferenciaSaldos.toFixed(2)}`}
            </span>

            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border ${
              controlesCuadre.balanceCuadrado 
                ? 'bg-white text-emerald-700 border-emerald-300' 
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              Balance: {controlesCuadre.balanceCuadrado ? '✓ OK' : 'DESCUADRADO'}
            </span>

            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border ${
              controlesCuadre.resultadosCoinciden 
                ? 'bg-white text-emerald-700 border-emerald-300' 
                : 'bg-rose-100 text-rose-900 border-rose-400 font-extrabold'
            }`}>
              Naturaleza = Función: {controlesCuadre.resultadosCoinciden ? '✓ OK' : `DIF: S/ ${controlesCuadre.diferenciaNaturalezaFuncion.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Lista de alertas rojas si hubiere descuadre */}
        {!controlesCuadre.todoCuadrado && controlesCuadre.alertas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-rose-200 space-y-1">
            {controlesCuadre.alertas.map((al, idx) => (
              <div key={idx} className="flex items-center gap-2 font-mono text-[11px] text-rose-800 font-semibold">
                <span>•</span>
                <span>{al}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tabla de la Hoja de Trabajo de 10 Columnas */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-800 font-sans">{reporte.filas.length} cuentas con movimiento</span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] text-blue-700 font-semibold">Doble clic en una cuenta para abrir el Libro Mayor</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Valores expresados en Soles (PEN)</span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            {/* Cabecera de 10 Columnas */}
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold sticky top-0 z-20 border-b-2 border-slate-300 select-none shadow-xs">
              <tr>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 w-20 text-center bg-slate-200/80">
                  Cuenta
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 min-w-[220px] font-sans">
                  Nombre de la Cuenta
                </th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-300 bg-blue-50/70 text-blue-900">
                  MONTOS
                </th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-300 bg-slate-50">
                  SALDO
                </th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-300 bg-amber-50/60 text-amber-900">
                  INVENTARIO
                </th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-300 bg-emerald-50/60 text-emerald-900">
                  NATURALEZA
                </th>
                <th colSpan={2} className="py-1 px-2 text-center bg-indigo-50/60 text-indigo-900">
                  FUNCIÓN
                </th>
              </tr>
              <tr className="border-t border-slate-300 text-[10px]">
                {/* Montos */}
                <th className="py-1 px-2 text-right border-r border-slate-200 bg-blue-50/40 text-blue-900 w-24">Débito</th>
                <th className="py-1 px-2 text-right border-r border-slate-300 bg-blue-50/40 text-blue-900 w-24">Crédito</th>
                {/* Saldo */}
                <th className="py-1 px-2 text-right border-r border-slate-200 w-24">Deudor</th>
                <th className="py-1 px-2 text-right border-r border-slate-300 w-24">Acreedor</th>
                {/* Inventario */}
                <th className="py-1 px-2 text-right border-r border-slate-200 bg-amber-50/30 text-amber-900 w-24">Activo</th>
                <th className="py-1 px-2 text-right border-r border-slate-300 bg-amber-50/30 text-amber-900 w-24">Pasivo</th>
                {/* Naturaleza */}
                <th className="py-1 px-2 text-right border-r border-slate-200 bg-emerald-50/30 text-emerald-900 w-24">Pérdida</th>
                <th className="py-1 px-2 text-right border-r border-slate-300 bg-emerald-50/30 text-emerald-900 w-24">Ganancia</th>
                {/* Función */}
                <th className="py-1 px-2 text-right border-r border-slate-200 bg-indigo-50/30 text-indigo-900 w-24">Pérdida</th>
                <th className="py-1 px-2 text-right bg-indigo-50/30 text-indigo-900 w-24">Ganancia</th>
              </tr>
            </thead>

            {/* Filas de Cuentas Contables */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {reporte.filas.map((fila) => (
                <tr 
                  key={fila.codigoCuenta}
                  onDoubleClick={() => handleRowDoubleClick(fila.codigoCuenta)}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                  title="Doble clic para ver Libro Mayor de esta cuenta"
                >
                  {/* Cuenta y Nombre */}
                  <td className="py-1.5 px-3 font-bold text-blue-700 border-r border-slate-200 text-center">
                    {fila.codigoCuenta}
                  </td>
                  <td className="py-1.5 px-3 font-sans text-slate-900 border-r border-slate-200 truncate max-w-[240px]">
                    {fila.nombreCuenta}
                    {fila.esCorrectora && (
                      <span className="ml-1 text-[9px] font-mono text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                        correctora
                      </span>
                    )}
                  </td>

                  {/* 1. MONTOS */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100">
                    {fila.montosDebe > 0 ? fila.montosDebe.toFixed(2) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    {fila.montosHaber > 0 ? fila.montosHaber.toFixed(2) : '-'}
                  </td>

                  {/* 2. SALDO */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100">
                    {fila.saldoDeudor > 0 ? fila.saldoDeudor.toFixed(2) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    {fila.saldoAcreedor > 0 ? fila.saldoAcreedor.toFixed(2) : '-'}
                  </td>

                  {/* 3. INVENTARIO */}
                  <td className={`py-1.5 px-2 text-right border-r border-slate-100 ${fila.inventarioActivo < 0 ? 'text-rose-600 font-bold' : ''}`}>
                    {fila.inventarioActivo !== 0 ? fila.inventarioActivo.toFixed(2) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    {fila.inventarioPasivo > 0 ? fila.inventarioPasivo.toFixed(2) : '-'}
                  </td>

                  {/* 4. NATURALEZA */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100 text-rose-700">
                    {fila.naturalezaPerdida > 0 ? fila.naturalezaPerdida.toFixed(2) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-200 text-emerald-700">
                    {fila.naturalezaGanancia > 0 ? fila.naturalezaGanancia.toFixed(2) : '-'}
                  </td>

                  {/* 5. FUNCIÓN */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100 text-rose-700">
                    {fila.funcionPerdida > 0 ? fila.funcionPerdida.toFixed(2) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-700">
                    {fila.funcionGanancia > 0 ? fila.funcionGanancia.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Filas Finales de la Hoja de Trabajo */}
            <tfoot className="border-t-2 border-slate-300 font-bold select-none">
              {/* Fila 1: TOTALES */}
              <tr className="bg-slate-100/90 text-slate-900 border-b border-slate-200">
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] font-sans border-r border-slate-300">
                  TOTALES:
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-blue-950">
                  {totales.montosDebe.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono text-blue-950">
                  {totales.montosHaber.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono">
                  {totales.saldoDeudor.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono">
                  {totales.saldoAcreedor.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-amber-950">
                  {totales.inventarioActivo.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono text-amber-950">
                  {totales.inventarioPasivo.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-rose-800">
                  {totales.naturalezaPerdida.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono text-emerald-800">
                  {totales.naturalezaGanancia.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-rose-800">
                  {totales.funcionPerdida.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-emerald-800">
                  {totales.funcionGanancia.toFixed(2)}
                </td>
              </tr>

              {/* Fila 2: PÉRDIDA/UTILIDAD DEL EJERCICIO (Fila Equilibradora) */}
              <tr className="bg-blue-50/70 text-blue-900 border-b border-slate-200">
                <td colSpan={2} className="py-2 px-3 text-right uppercase text-[11px] font-sans font-extrabold border-r border-slate-300">
                  {filaResultado.etiqueta}:
                </td>
                <td colSpan={4} className="py-2 px-3 text-center text-slate-400 font-sans text-[10px] border-r border-slate-300">
                  (Equilibrio de columnas)
                </td>
                {/* Inventario equilibrador */}
                <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-extrabold">
                  {filaResultado.inventarioActivo > 0 ? filaResultado.inventarioActivo.toFixed(2) : ''}
                </td>
                <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-extrabold">
                  {filaResultado.inventarioPasivo > 0 ? filaResultado.inventarioPasivo.toFixed(2) : ''}
                </td>
                {/* Naturaleza equilibrador */}
                <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-extrabold text-rose-800">
                  {filaResultado.naturalezaPerdida > 0 ? filaResultado.naturalezaPerdida.toFixed(2) : ''}
                </td>
                <td className="py-2 px-2 text-right border-r border-slate-300 font-mono font-extrabold text-emerald-800">
                  {filaResultado.naturalezaGanancia > 0 ? filaResultado.naturalezaGanancia.toFixed(2) : ''}
                </td>
                {/* Función equilibrador */}
                <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-extrabold text-rose-800">
                  {filaResultado.funcionPerdida > 0 ? filaResultado.funcionPerdida.toFixed(2) : ''}
                </td>
                <td className="py-2 px-2 text-right font-mono font-extrabold text-emerald-800">
                  {filaResultado.funcionGanancia > 0 ? filaResultado.funcionGanancia.toFixed(2) : ''}
                </td>
              </tr>

              {/* Fila 3: SUMAS IGUALES */}
              <tr className="bg-slate-200 text-slate-900 border-t border-slate-300 text-[11px]">
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase font-sans font-extrabold border-r border-slate-400">
                  SUMAS IGUALES:
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono font-extrabold text-blue-900">
                  {sumasIguales.montosDebe.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-400 font-mono font-extrabold text-blue-900">
                  {sumasIguales.montosHaber.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono font-extrabold">
                  {sumasIguales.saldoDeudor.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-400 font-mono font-extrabold">
                  {sumasIguales.saldoAcreedor.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono font-extrabold text-amber-900">
                  {sumasIguales.inventarioActivo.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-400 font-mono font-extrabold text-amber-900">
                  {sumasIguales.inventarioPasivo.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono font-extrabold text-emerald-900">
                  {sumasIguales.naturalezaPerdida.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-400 font-mono font-extrabold text-emerald-900">
                  {sumasIguales.naturalezaGanancia.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 font-mono font-extrabold text-indigo-900">
                  {sumasIguales.funcionPerdida.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-extrabold text-indigo-900">
                  {sumasIguales.funcionGanancia.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Modal de Configuración de Mapeo Cuenta -> Función */}
      {modalMapeoOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-blue-600" />
                  Mapeo Configurable: Cuenta → Rubro de Función
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Establece la asignación para la columna Función con vigencia anual (Ejercicio 2026).
                </p>
              </div>
              <button 
                onClick={() => setModalMapeoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-[11px]">
                <strong>Regla general PCGE:</strong> Las cuentas 69 (Costo de ventas) y elemento 9 (94 Administración, 95 Ventas, 97 Financieros) alimentan el Estado por Función. Cuentas 70 van a Ingresos y la cuenta 79 queda neutralizada.
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Cuenta PCGE</th>
                    <th className="py-2 px-3">Rubro de Función Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2 px-3 font-bold text-blue-700">6911 (Costo de Ventas)</td>
                    <td className="py-2 px-3">
                      <select 
                        value={mapeosFuncion['6911'] || 'COSTO_VENTAS'}
                        onChange={(e) => setMapeosFuncion(prev => ({ ...prev, '6911': e.target.value as any }))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="COSTO_VENTAS">COSTO DE VENTAS (Pérdida)</option>
                        <option value="EXCLUIDO">EXCLUIR DE FUNCIÓN</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-blue-700">941 (Gastos de Administración)</td>
                    <td className="py-2 px-3">
                      <select 
                        value={mapeosFuncion['941'] || 'GASTOS_ADMIN'}
                        onChange={(e) => setMapeosFuncion(prev => ({ ...prev, '941': e.target.value as any }))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="GASTOS_ADMIN">GASTOS DE ADMINISTRACIÓN (Pérdida)</option>
                        <option value="EXCLUIDO">EXCLUIR DE FUNCIÓN</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-blue-700">951 (Gastos de Ventas)</td>
                    <td className="py-2 px-3">
                      <select 
                        value={mapeosFuncion['951'] || 'GASTOS_VENTAS'}
                        onChange={(e) => setMapeosFuncion(prev => ({ ...prev, '951': e.target.value as any }))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="GASTOS_VENTAS">GASTOS DE VENTAS (Pérdida)</option>
                        <option value="EXCLUIDO">EXCLUIR DE FUNCIÓN</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-blue-700">971 (Gastos Financieros)</td>
                    <td className="py-2 px-3">
                      <select 
                        value={mapeosFuncion['971'] || 'GASTOS_FINANCIEROS'}
                        onChange={(e) => setMapeosFuncion(prev => ({ ...prev, '971': e.target.value as any }))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="GASTOS_FINANCIEROS">GASTOS FINANCIEROS (Pérdida)</option>
                        <option value="EXCLUIDO">EXCLUIR DE FUNCIÓN</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalMapeoOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Guardar y Aplicar Mapeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
