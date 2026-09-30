import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  FileText, 
  Database, 
  RefreshCw, 
  FileCode2,
  CalendarDays,
  ShieldCheck,
  Building2,
  Users,
  Landmark,
  Coins,
  MessageSquare,
  ChevronRight,
  Info,
  CreditCard
} from 'lucide-react';
import { Comprobante, AsientoContable, LiquidacionPDT621, EmpresaCliente } from '../../types';
import { useLiquidacionIGV, useDetraccionesList } from '../../hooks/useOperaciones';
import { useCuentasFinancieras } from '../../hooks/useTesoreriaPlanilla';

interface DashboardViewProps {
  compras: Comprobante[];
  ventas: Comprobante[];
  asientos: AsientoContable[];
  liquidacion: LiquidacionPDT621;
  empresa: EmpresaCliente;
  onNavigate: (tab: string) => void;
  onTriggerSync: () => void;
  onDownloadSireTxt: () => void;
  onDownloadSqlDump: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  compras,
  ventas,
  asientos,
  liquidacion: legacyLiquidacion,
  empresa,
  onNavigate,
  onDownloadSireTxt,
  onDownloadSqlDump
}) => {
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);

  // Hook directo a LiquidacionIGVService en Backend
  const { data: apiLiquidacion } = useLiquidacionIGV(empresa.id, '2026-09', legacyLiquidacion.saldoFavorPeriodoAnterior || 0);
  const { data: apiDetracciones = [] } = useDetraccionesList(empresa.id);
  const { data: apiCuentas = [] } = useCuentasFinancieras(empresa.id);

  const saldoTotalCajaBancos = apiCuentas.reduce((acc, c) => acc + (c.activa ? c.saldoActual : 0), 0);

  // Usar datos del motor backend si están disponibles, con fallback a props
  const liq = apiLiquidacion || {
    ventasGravadas: legacyLiquidacion.ventasNetasGravadas,
    debitoFiscalIgv: legacyLiquidacion.debitoFiscalIgv,
    comprasGravadasCreditoTotal: legacyLiquidacion.comprasNetasGravadas,
    creditoFiscalIgv: legacyLiquidacion.creditoFiscalIgv,
    saldoAnteriorAFavor: legacyLiquidacion.saldoFavorPeriodoAnterior || 0,
    igvPorPagar: legacyLiquidacion.igvPorPagar,
    baseImponibleRenta: legacyLiquidacion.ventasNetasGravadas,
    tasaRentaAplicada: empresa.tasaRentaMensual * 100,
    etiquetaRenta: `Régimen ${empresa.regimenTributario.replace('_', ' ')} (${(empresa.tasaRentaMensual * 100).toFixed(1)}%)`,
    pagoCuentaRenta: legacyLiquidacion.rentaPorPagar,
    totalTributosPorPagar: legacyLiquidacion.totalTributosPorPagar,
    detalleCalculo: []
  };

  const comprasConDetraccion = compras.filter(c => c.sujetoADetraccion);
  const totalDetraccionesSpot = apiDetracciones.length > 0
    ? apiDetracciones.reduce((acc: number, d: any) => acc + (d.estado === 'PENDIENTE' ? Number(d.monto) : 0), 0)
    : comprasConDetraccion.reduce((acc, c) => acc + (c.montoDetraccion || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-xs font-bold shadow-xs">
                Periodo Activo: 2026-09
              </span>
              <span className="text-xs text-blue-200">
                Régimen: <strong className="text-white">{empresa.regimenTributario.replace('_', ' ')}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {empresa.razonSocial}
            </h1>
            <p className="text-xs text-blue-200 flex items-center gap-3">
              <span>RUC: <strong className="text-white font-mono">{empresa.ruc}</strong></span>
              <span>•</span>
              <span>Domicilio: {empresa.direccionFiscal || 'LIMA, PERÚ'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('cartera_saldos')}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-purple-200" />
              Cartera CxC / CxP
            </button>
            <button
              onClick={onDownloadSireTxt}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileCode2 className="w-4 h-4 text-emerald-300" />
              Descargar TXT SIRE
            </button>
            <button
              onClick={onDownloadSqlDump}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Database className="w-4 h-4 text-sky-300" />
              Respaldo SQL
            </button>
          </div>
        </div>
      </div>

      {/* Preliquidación Preventiva Alert Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <Coins className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-amber-950 text-sm">
                Preliquidación Preventiva de Impuestos (PDT 621)
              </h3>
              <button
                onClick={() => setModalDetalleOpen(true)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 hover:bg-amber-300 transition cursor-pointer flex items-center gap-1"
              >
                <Info className="w-3 h-3" /> Ver detalle del cálculo
              </button>
            </div>
            <p className="text-xs text-amber-900/80 mt-0.5">
              Proyección calculada dinámicamente con las tasas tributarias vigentes de la empresa.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-xs">
              <span className="text-slate-600">IGV estimado: <strong className="text-slate-900">S/ {liq.igvPorPagar.toFixed(2)}</strong></span>
              <span className="text-slate-600">
                {liq.etiquetaRenta}: <strong className="text-slate-900">S/ {liq.pagoCuentaRenta.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400 font-sans ml-1">(Base S/ {liq.baseImponibleRenta.toFixed(2)})</span>
              </span>
              <span className="text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded">
                Total estimado: S/ {liq.totalTributosPorPagar.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('cartera')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Notificar al Cliente por WhatsApp
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compras Totales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Registro de Compras (RCE)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            S/ {compras.reduce((acc, c) => acc + c.total, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span>{compras.length} facturas recibidas</span>
            <span className="text-emerald-700 font-bold">Crédito IGV: S/ {liq.creditoFiscalIgv.toFixed(2)}</span>
          </div>
        </div>

        {/* Ventas Totales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Registro de Ventas (RVIE)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            S/ {ventas.reduce((acc, v) => acc + v.total, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span>{ventas.length} emitidos</span>
            <span className="text-blue-700 font-bold">Débito Fiscal: S/ {liq.debitoFiscalIgv.toFixed(2)}</span>
          </div>
        </div>

        {/* Liquidación PDT 621 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Impuestos por Pagar PDT 621</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            S/ {liq.totalTributosPorPagar.toFixed(2)}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span>IGV: S/ {liq.igvPorPagar.toFixed(2)}</span>
            <span className="text-amber-700 font-bold">Renta: S/ {liq.pagoCuentaRenta.toFixed(2)}</span>
          </div>
        </div>

        {/* Asientos Contables PCGE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Contabilidad Interna</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {asientos.length} <span className="text-xs font-normal text-slate-500">Asientos Diario</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Balance Cuadrado
            </span>
            <span>PCGE 2026</span>
          </div>
        </div>

        {/* Disponibilidad Caja y Bancos (Fase 4) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Tesorería (Caja y Bancos)</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">
            S/ {saldoTotalCajaBancos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span>{apiCuentas.length} cuentas activas</span>
            <span className="text-purple-700 font-bold">Saldo disponible</span>
          </div>
        </div>
      </div>

      {/* Cronograma SUNAT & SPOT Detracciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cronograma SUNAT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Calendario de Vencimientos SUNAT
            </h3>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Dígito {empresa.ultimoDigitoRuc}
            </span>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="text-xs text-blue-900 font-semibold mb-1">
              Fecha límite oficial declaración mensual:
            </div>
            <div className="text-lg font-extrabold text-blue-900 font-mono">
              {empresa.vencimientoPdt621}
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              Aplica para PDT 621 IGV-Renta, SIRE RCE y RVIE, y PLAME.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">SIRE Registro de Compras:</span>
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Por Declarar
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">SIRE Registro de Ventas:</span>
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Por Declarar
              </span>
            </div>
          </div>
        </div>

        {/* Detracciones SPOT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Detracciones SPOT (Banco de la Nación)
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {apiDetracciones.length || comprasConDetraccion.length} comprobantes
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Monto pendiente por depositar Banco de la Nación:</div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              S/ {totalDetraccionesSpot.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Debe depositarse para tener derecho a utilizar el crédito fiscal del IGV en el período.
            </p>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto">
            {comprasConDetraccion.map(c => (
              <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{c.serie}-{c.numero}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[170px]">{c.razonSocialEmisor}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-amber-800">S/ {c.montoDetraccion?.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">SPOT 12%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL / DRAWER: DETALLE DE CÁLCULO DE LIQUIDACIÓN */}
      {modalDetalleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Detalle y Trazabilidad del Cálculo Tributario
              </h3>
              <button
                onClick={() => setModalDetalleOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <div className="font-bold text-blue-900">Régimen y Parámetros Oficiales</div>
                <div className="text-blue-800">
                  Régimen: <strong>{empresa.regimenTributario.replace('_', ' ')}</strong> | Tasa Renta: <strong>{liq.tasaRentaAplicada}%</strong> | Tasa IGV: <strong>18%</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5 text-left">Paso / Concepto</th>
                      <th className="p-2.5 text-left">Fórmula Aplicada</th>
                      <th className="p-2.5 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold">1. Débito Fiscal IGV</td>
                      <td className="p-2.5 text-slate-600">S/ {liq.ventasGravadas.toFixed(2)} × 18%</td>
                      <td className="p-2.5 text-right font-bold text-blue-900">S/ {liq.debitoFiscalIgv.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">2. Crédito Fiscal IGV</td>
                      <td className="p-2.5 text-slate-600">Compras gravadas total</td>
                      <td className="p-2.5 text-right font-bold text-emerald-800">S/ {liq.creditoFiscalIgv.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">3. Saldo a Favor Mes Anterior</td>
                      <td className="p-2.5 text-slate-600">Arrastre del período previo</td>
                      <td className="p-2.5 text-right font-bold text-purple-700">S/ {liq.saldoAnteriorAFavor.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5">IGV Determinado por Pagar</td>
                      <td className="p-2.5 text-slate-600">Max(0, Débito - Crédito - Saldo)</td>
                      <td className="p-2.5 text-right text-slate-900">S/ {liq.igvPorPagar.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">4. Pago a Cuenta Renta</td>
                      <td className="p-2.5 text-slate-600">S/ {liq.baseImponibleRenta.toFixed(2)} × {liq.tasaRentaAplicada}%</td>
                      <td className="p-2.5 text-right font-bold text-amber-800">S/ {liq.pagoCuentaRenta.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-blue-100/60 font-black text-xs">
                      <td className="p-3">Total Tributos por Pagar</td>
                      <td className="p-3 text-slate-600">IGV + Renta</td>
                      <td className="p-3 text-right text-blue-950">S/ {liq.totalTributosPorPagar.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setModalDetalleOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
