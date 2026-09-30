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
  AlertCircle 
} from 'lucide-react';
import { AsientoContable, Comprobante, EmpresaCliente } from '../../types';

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
  const [ejecutandoDestino, setEjecutandoDestino] = useState(false);
  const [ejecutandoTc, setEjecutandoTc] = useState(false);
  const [resultadoTc, setResultadoTc] = useState<string | null>(null);

  // Vouchers sin destino
  const comprasConElemento6 = compras.filter(c => c.cuentaContableAsignada?.startsWith('6') || c.categoriaGasto.startsWith('6'));

  const handleEjecutarDestinos = () => {
    setEjecutandoDestino(true);
    setTimeout(() => {
      onGenerarDestinos();
      setEjecutandoDestino(false);
      alert('Proceso de Destinos Automáticos finalizado. Asientos transferidos al Subdiario 08.');
    }, 500);
  };

  const handleEjecutarAjusteTc = () => {
    setEjecutandoTc(true);
    setTimeout(() => {
      setEjecutandoTc(false);

      // Compras en USD a valuar: Factura F002-0003411 por USD 1,500
      // TC emisión: 3.752. TC cierre SBS: 3.759. Diferencia por USD 1,500 = S/ 10.50
      const ganancia = 10.50;
      const nuevoAsiento: AsientoContable = {
        id: `ast-tc-${Date.now()}`,
        subdiario: '09',
        numeroAsiento: `09090001`,
        periodo,
        fecha: '2026-09-30',
        moneda: 'PEN',
        tipoCambio: 3.759,
        tipoOperacion: 'AJUSTE',
        glosaGeneral: 'Ajuste mensual por Diferencia de Cambio SBS al 30/09/2026',
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
    }, 600);
  };

  const descuadres = asientos.filter(a => !a.cuadrado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            Procesos & Cierre Contable (SISCONT SMART & CODEPLEX)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generación automática de asientos de destino, ajuste por diferencia de cambio en moneda extranjera y consistencia contable.
          </p>
        </div>
      </div>

      {/* Grid of Processes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proceso 1: Destinos Automáticos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Proceso de Destinos Automáticos (Subdiario 08)</h3>
              <p className="text-xs text-slate-500">Transfiere cuentas del elemento 6 a las cuentas de función (94/95) o existencias (20/61).</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Cuentas de compras de mercaderías (60):</span>
              <strong className="text-slate-900">Destino a 20111 / 6111 (Almacén)</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Cuentas de servicios prestados por terceros (63/65):</span>
              <strong className="text-slate-900">60% Admin (941) + 40% Ventas (951) contra 791</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Comprobantes procesados en el periodo:</span>
              <strong className="text-blue-700 font-mono font-bold">{comprasConElemento6.length} compras</strong>
            </div>
          </div>

          <button
            onClick={handleEjecutarDestinos}
            disabled={ejecutandoDestino}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {ejecutandoDestino ? 'Generando Destinos...' : 'Ejecutar Proceso de Destinos Automáticos'}
          </button>
        </div>

        {/* Proceso 2: Diferencia de Cambio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Ajuste por Diferencia de Cambio (Subdiario 09)</h3>
              <p className="text-xs text-slate-500">Valuación de saldos en moneda extranjera (USD) según el Tipo de Cambio SBS de cierre.</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Tipo de Cambio SBS al Cierre de Mes:</span>
              <strong className="text-slate-900 font-mono">Compra: S/ 3.753 | Venta: S/ 3.759</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Cuentas involucradas:</span>
              <strong className="text-slate-900">1212 (USD), 4212 (USD), 104 (USD)</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Cuentas de resultado por valuación:</span>
              <strong className="text-slate-900">776 (Ganancia) / 676 (Pérdida)</strong>
            </div>
          </div>

          {resultadoTc && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {resultadoTc}
            </div>
          )}

          <button
            onClick={handleEjecutarAjusteTc}
            disabled={ejecutandoTc}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {ejecutandoTc ? 'Calculando Valuación SBS...' : 'Ejecutar Ajuste de Diferencia de Cambio'}
          </button>
        </div>
      </div>

      {/* Proceso 3: Consistencia y Auditoría de Vouchers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ShieldAlert className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Auditoría y Consistencia de Vouchers</h3>
              <p className="text-xs text-slate-500">Detección de descuadres de partida doble, asientos vacíos o inconsistencias en libros.</p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            descuadres.length === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {descuadres.length === 0 ? '100% Consistente' : `${descuadres.length} Descuadres`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-sans block mb-1">Total Asientos Auditados:</span>
            <span className="text-lg font-bold text-slate-900">{asientos.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-sans block mb-1">Total Debe Acumulado:</span>
            <span className="text-lg font-bold text-slate-900">
              S/ {asientos.reduce((a, b) => a + b.totalDebe, 0).toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-sans block mb-1">Total Haber Acumulado:</span>
            <span className="text-lg font-bold text-slate-900">
              S/ {asientos.reduce((a, b) => a + b.totalHaber, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
