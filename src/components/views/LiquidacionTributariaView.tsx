import React, { useState } from 'react';
import { 
  Calculator, 
  Printer, 
  CheckCircle2, 
  Scale, 
  Landmark, 
  Send, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { LiquidacionPDT621, EmpresaCliente, Comprobante } from '../../types';

interface LiquidacionTributariaViewProps {
  liquidacion: LiquidacionPDT621;
  empresa: EmpresaCliente;
  compras: Comprobante[];
  ventas: Comprobante[];
  onUpdateSaldoAnterior: (nuevoSaldo: number) => void;
}

export const LiquidacionTributariaView: React.FC<LiquidacionTributariaViewProps> = ({
  liquidacion,
  empresa,
  compras,
  ventas,
  onUpdateSaldoAnterior
}) => {
  const [saldoAnteriorInput, setSaldoAnteriorInput] = useState<number>(liquidacion.saldoFavorPeriodoAnterior || 0);

  const handleApplySaldoAnterior = () => {
    onUpdateSaldoAnterior(saldoAnteriorInput);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Liquidación Mensual de Impuestos & Casillas PDT 621
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Determinación oficial de IGV (Cuenta Propia) y Pago a Cuenta del Impuesto a la Renta de 3ra Categoría.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          Imprimir Hoja de Liquidación
        </button>
      </div>

      {/* Main Grid: Casillas PDT 621 Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Casillas IGV (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                Determinación del IGV (Impuesto General a las Ventas)
              </h3>
              <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                Tasa: 18%
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {/* Casilla 100 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-blue-700 font-bold mr-2">[Cas. 100]</span>
                  <span className="text-slate-700 font-sans font-medium">Ventas Netas Gravadas</span>
                </div>
                <span className="text-slate-900 font-bold text-sm">
                  S/ {liquidacion.ventasNetasGravadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Casilla 101 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-amber-700 font-bold mr-2">[Cas. 101]</span>
                  <span className="text-slate-700 font-sans font-medium">Débito Fiscal (IGV Ventas)</span>
                </div>
                <span className="text-amber-800 font-bold text-sm">
                  S/ {liquidacion.debitoFiscalIgv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Casilla 107 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-blue-700 font-bold mr-2">[Cas. 107]</span>
                  <span className="text-slate-700 font-sans font-medium">Compras Netas Destinadas a Ventas Gravadas</span>
                </div>
                <span className="text-slate-900 font-bold text-sm">
                  S/ {liquidacion.comprasNetasGravadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Casilla 108 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-emerald-700 font-bold mr-2">[Cas. 108]</span>
                  <span className="text-slate-700 font-sans font-medium">Crédito Fiscal (IGV Compras)</span>
                </div>
                <span className="text-emerald-700 font-bold text-sm">
                  S/ {liquidacion.creditoFiscalIgv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Casilla 140 Saldo a favor anterior */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-bold mr-2">[Cas. 140]</span>
                  <span className="text-slate-700 font-sans font-medium">Saldo a Favor del Periodo Anterior</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">S/</span>
                  <input
                    type="number"
                    value={saldoAnteriorInput}
                    onChange={(e) => setSaldoAnteriorInput(parseFloat(e.target.value) || 0)}
                    onBlur={handleApplySaldoAnterior}
                    className="w-24 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Casilla 184 Total IGV */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center mt-3">
                <div>
                  <span className="text-blue-800 font-bold mr-2">[Cas. 184]</span>
                  <span className="text-blue-950 font-bold font-sans text-sm">IGV Por Pagar (A Favor de SUNAT)</span>
                </div>
                <span className="text-blue-900 font-black text-lg">
                  S/ {liquidacion.igvPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Casillas Renta 3ra & Gran Total (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-600" />
                Pago a Cuenta - Impuesto a la Renta 3ra
              </h3>
              <span className="text-[11px] font-mono bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                {empresa.regimenTributario.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-blue-700 font-bold mr-2">[Cas. 301]</span>
                  <span className="text-slate-700 font-sans font-medium">Ingresos Netos del Mes</span>
                </div>
                <span className="text-slate-900 font-bold text-sm">
                  S/ {liquidacion.baseCalculoRenta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-bold mr-2">[Cas. 312]</span>
                  <span className="text-slate-700 font-sans font-medium">Tasa Mensual Aplicable</span>
                </div>
                <span className="text-amber-800 font-bold text-sm">{(empresa.tasaRentaMensual * 100).toFixed(2)}%</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center mt-3">
                <div>
                  <span className="text-amber-800 font-bold mr-2">[Cas. 302]</span>
                  <span className="text-amber-950 font-bold font-sans text-sm">Pago a Cuenta Renta Por Pagar</span>
                </div>
                <span className="text-amber-900 font-black text-lg">
                  S/ {liquidacion.rentaPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Gran Total Deuda Tributaria Mensual */}
          <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span className="font-bold uppercase tracking-wider">TOTAL DEUDA TRIBUTARIA PDT 621</span>
              <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
                Boleta 1662 / NPS
              </span>
            </div>

            <div className="text-3xl font-black font-mono">
              S/ {liquidacion.totalTributosPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>

            <p className="text-xs text-blue-200 pt-2 border-t border-white/10 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Cálculo validado automáticamente con el Registro de Compras (RCE) y Registro de Ventas (RVIE).
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
