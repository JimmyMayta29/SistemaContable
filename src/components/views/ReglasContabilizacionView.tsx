import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Save, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface ReglasContabilizacionViewProps {
  empresaId: string;
}

export const ReglasContabilizacionView: React.FC<ReglasContabilizacionViewProps> = ({ empresaId }) => {
  const { error } = useToast();
  const [operacionSeleccionada, setOperacionSeleccionada] = useState<string>('COMPRA_SERVICIO');
  const [pctAdmin, setPctAdmin] = useState<number>(60);
  const [pctVentas, setPctVentas] = useState<number>(40);
  const [montoPrueba, setMontoPrueba] = useState<number>(1180);
  const [simulacion, setSimulacion] = useState<any | null>(null);

  const ejecutarPrueba = async () => {
    try {
      const res: any = await apiClient.post(`/empresas/${empresaId}/contabilizacion/previsualizar`, {
        tipoOperacion: operacionSeleccionada,
        total: montoPrueba,
        porcentajeAdmin: pctAdmin,
        porcentajeVentas: pctVentas,
        glosa: `Prueba de regla ${operacionSeleccionada}`
      });
      setSimulacion(res.data);
    } catch (err: any) {
      error(`Error en simulación: ${err.message}`, 'Simulación Fallida');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            Reglas de Contabilización & Destinos Parametrizables
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuración por empresa: define las cuentas predeterminadas y las proporciones de destino a gastos de administración (94) y ventas (95).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Operation Selector & Destination Proportions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Tipo de Operación
          </h3>

          <div className="space-y-1.5">
            {[
              { id: 'COMPRA_SERVICIO', label: 'Compra de Servicios (Gasto + Destino 94/95)' },
              { id: 'COMPRA_MERCADERIA', label: 'Compra de Mercadería (Destino Almacén 20/61)' },
              { id: 'VENTA', label: 'Venta de Mercaderías (12/40/70)' },
              { id: 'HONORARIO', label: 'Recibos por Honorarios (4ta categoría + 94/95)' },
              { id: 'PLANILLA', label: 'Planilla de Sueldos (PLAME + Destino 94/95)' },
              { id: 'COBRANZA', label: 'Cobranza a Clientes (1041 a 1212)' },
              { id: 'PAGO', label: 'Pago a Proveedores (4212 a 1041)' }
            ].map(op => (
              <button
                key={op.id}
                onClick={() => {
                  setOperacionSeleccionada(op.id);
                  setSimulacion(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  operacionSeleccionada === op.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{op.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            ))}
          </div>

          {/* Configuración de Porcentajes de Destino */}
          {(operacionSeleccionada === 'COMPRA_SERVICIO' || operacionSeleccionada === 'HONORARIO' || operacionSeleccionada === 'PLANILLA') && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-xs text-slate-900">Distribución de Gastos por Función</h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cta 941 Administración (%)</label>
                  <input
                    type="number"
                    value={pctAdmin}
                    min={0}
                    max={100}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setPctAdmin(val);
                      setPctVentas(100 - val);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-blue-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cta 951 Ventas (%)</label>
                  <input
                    type="number"
                    value={pctVentas}
                    min={0}
                    max={100}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setPctVentas(val);
                      setPctAdmin(100 - val);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1 font-mono">
                <span>Suma de porcentajes:</span>
                <strong className={pctAdmin + pctVentas === 100 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {pctAdmin + pctVentas}% {pctAdmin + pctVentas === 100 ? '✓' : '(Debe sumar 100%)'}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Test & Resulting Lines */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Simulador de Generación de Partida Doble</h3>
              <p className="text-xs text-slate-500">Prueba que la regla genere líneas cuadradas antes de aplicarla.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">Total: S/</span>
                <input
                  type="number"
                  value={montoPrueba}
                  onChange={(e) => setMontoPrueba(parseFloat(e.target.value) || 0)}
                  className="w-24 p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={ejecutarPrueba}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Ejecutar Simulación
              </button>
            </div>
          </div>

          {/* Resultado de la Simulación */}
          {simulacion ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">{simulacion.glosaGeneral}</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  simulacion.cuadrado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {simulacion.cuadrado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {simulacion.cuadrado ? 'PARTIDA DOBLE CUADRADA' : 'DESCUADRADO'}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Cuenta</th>
                      <th className="py-2.5 px-3">Denominación</th>
                      <th className="py-2.5 px-3 text-right">Debe (S/)</th>
                      <th className="py-2.5 px-3 text-right">Haber (S/)</th>
                      <th className="py-2.5 px-3">Glosa Línea</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {simulacion.lineas.map((l: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-blue-900">{l.codigoCuenta}</td>
                        <td className="py-2 px-3 font-sans text-slate-800">{l.denominacionCuenta}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{l.debe > 0 ? Number(l.debe).toFixed(2) : '—'}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{l.haber > 0 ? Number(l.haber).toFixed(2) : '—'}</td>
                        <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">{l.glosaLinea}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-mono font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right font-sans">SUMAS TOTALES:</td>
                      <td className="py-2.5 px-3 text-right">S/ {Number(simulacion.totalDebe).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">S/ {Number(simulacion.totalHaber).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Haga clic en <strong>Ejecutar Simulación</strong> para ver el desglose contable generado por las reglas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
