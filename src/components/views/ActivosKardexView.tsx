import React, { useState } from 'react';
import { 
  Boxes, 
  Package, 
  Percent, 
  Plus, 
  Play, 
  Download, 
  TrendingUp, 
  Clock, 
  Building2, 
  Car, 
  Cpu, 
  Wrench, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  CheckCircle2, 
  Scale, 
  Layers, 
  Calendar 
} from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { useToast } from '../../context/ToastContext';
import { 
  useActivosFijos, 
  useCalcularDepreciacion, 
  useGenerarAsientoDepreciacion, 
  useKardexProductos, 
  useKardexTarjeta, 
  useRegistrarProductoKardex, 
  useRegistrarMovimientoKardex, 
  useGenerarAsientoCostoVentas, 
  useProrrataIgv 
} from '../../hooks/useActivosKardex';

interface ActivosKardexViewProps {
  empresa: EmpresaCliente;
  periodo: string;
}

export const ActivosKardexView: React.FC<ActivosKardexViewProps> = ({ empresa, periodo }) => {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'activos' | 'kardex' | 'prorrata'>('activos');

  // Modales
  const [isModalActivoOpen, setIsModalActivoOpen] = useState(false);
  const [isModalProdOpen, setIsModalProdOpen] = useState(false);
  const [isModalMovOpen, setIsModalMovOpen] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState<string>('');

  // Form Activo
  const [codigoActivo, setCodigoActivo] = useState('');
  const [descripcionActivo, setDescripcionActivo] = useState('');
  const [categoriaActivo, setCategoriaActivo] = useState<'EDIFICIOS' | 'VEHICULOS' | 'MAQUINARIA' | 'EQUIPOS_COMPUTO' | 'MUEBLES_ENSERES'>('EQUIPOS_COMPUTO');
  const [fechaAdquisicion, setFechaAdquisicion] = useState(`${periodo}-01`);
  const [valorAdquisicion, setValorAdquisicion] = useState<number>(3500);

  // Form Producto
  const [codigoProd, setCodigoProd] = useState('');
  const [descProd, setDescProd] = useState('');
  const [umProd, setUmProd] = useState('NIU');

  // Form Movimiento
  const [cantMov, setCantMov] = useState<number>(10);
  const [cuMov, setCuMov] = useState<number>(50);
  const [tipoOperacionMov, setTipoOperacionMov] = useState('02'); // 02 Compra, 01 Venta

  // Queries
  const activosQuery = useActivosFijos(empresa.id);
  const deprecQuery = useCalcularDepreciacion(empresa.id, periodo);
  const generarDeprecMutation = useGenerarAsientoDepreciacion(empresa.id);

  const productosQuery = useKardexProductos(empresa.id);
  const selectedProduct = selectedProdId || (productosQuery.data && productosQuery.data[0]?.id) || '';
  const tarjetaQuery = useKardexTarjeta(empresa.id, selectedProduct);
  const regProdMutation = useRegistrarProductoKardex(empresa.id);
  const regMovMutation = useRegistrarMovimientoKardex(empresa.id);
  const generarCvMutation = useGenerarAsientoCostoVentas(empresa.id);

  const prorrataQuery = useProrrataIgv(empresa.id, periodo);

  // Handlers
  const handleCrearActivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoActivo || !descripcionActivo || valorAdquisicion <= 0) {
      error('Complete todos los campos obligatorios del activo fijo.');
      return;
    }
    try {
      await fetch(`/api/empresas/${empresa.id}/activos-fijos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoActivo,
          descripcion: descripcionActivo,
          categoria: categoriaActivo,
          fechaAdquisicion,
          fechaInicioUso: fechaAdquisicion,
          valorAdquisicion,
          moneda: 'PEN'
        })
      });
      activosQuery.refetch();
      deprecQuery.refetch();
      setIsModalActivoOpen(false);
      setCodigoActivo('');
      setDescripcionActivo('');
      success('Activo fijo registrado con éxito en el inventario patrimonial.', 'Activo Creado');
    } catch (err: any) {
      error('Error al registrar el activo fijo: ' + err.message);
    }
  };

  const handleGenerarAsientoDepreciacion = async () => {
    try {
      const res = await generarDeprecMutation.mutateAsync(periodo);
      success(res.mensaje, 'Asiento de Depreciación');
    } catch (err: any) {
      error('Error al generar la depreciación: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleDescargarPle71 = () => {
    const anio = periodo.split('-')[0];
    const link = document.createElement('a');
    link.href = `/api/empresas/${empresa.id}/activos-fijos/ple-71?anio=${anio}`;
    link.download = `LE${empresa.ruc}${anio}0000070100001111.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Archivo PLE Libro 7.1 descargado.', 'PLE Exportado');
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoProd || !descProd) {
      error('Ingrese código y descripción del producto.');
      return;
    }
    try {
      await regProdMutation.mutateAsync({
        codigoProducto: codigoProd,
        descripcion: descProd,
        unidadMedidaSUNAT: umProd,
        tipoExistenciaSUNAT: '01',
        metodoValuacion: 'PROMEDIO_PONDERADO'
      });
      setIsModalProdOpen(false);
      setCodigoProd('');
      setDescProd('');
      success('Producto incorporado al catálogo de inventarios.', 'Producto Creado');
    } catch (err: any) {
      error('Error al registrar producto: ' + err.message);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || cantMov <= 0) {
      error('Seleccione un producto y cantidad válida.');
      return;
    }
    try {
      await regMovMutation.mutateAsync({
        productoId: selectedProduct,
        periodo,
        fecha: `${periodo}-15`,
        tipoOperacionSUNAT: tipoOperacionMov,
        cantidad: cantMov,
        costoUnitario: cuMov
      });
      setIsModalMovOpen(false);
      success('Movimiento de Kardex registrado y valuado exitosamente.', 'Kardex Actualizado');
    } catch (err: any) {
      error('Error al registrar movimiento: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleGenerarAsientoCostoVentas = async () => {
    try {
      const res = await generarCvMutation.mutateAsync(periodo);
      success(res.mensaje, 'Costo de Ventas Generado');
    } catch (err: any) {
      error('Error al generar costo de ventas: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleDescargarPle131 = () => {
    const link = document.createElement('a');
    link.href = `/api/empresas/${empresa.id}/kardex/ple-131?periodo=${periodo}`;
    link.download = `LE${empresa.ruc}${periodo.replace('-', '')}00130100001111.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Archivo PLE Libro 13.1 descargado.', 'Kardex PLE Exportado');
  };

  const getCategoriaIcon = (cat: string) => {
    switch (cat) {
      case 'EDIFICIOS': return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'VEHICULOS': return <Car className="w-4 h-4 text-emerald-600" />;
      case 'EQUIPOS_COMPUTO': return <Cpu className="w-4 h-4 text-indigo-600" />;
      default: return <Wrench className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              FASE 11 — GESTIÓN PATRIMONIAL & LOGÍSTICA
            </span>
            <span className="text-xs text-slate-500 font-mono">Período: {periodo}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <Boxes className="w-5 h-5 text-indigo-600" />
            Activos Fijos (Libro 7.1), Kardex (Libro 13.1) & Prorrata IGV
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Depreciación financiera (NIC 16) vs tributaria (LIR Art. 22), control valorado de existencias (Promedio/PEPS) y prorrata de crédito fiscal común.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('activos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'activos'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Activos Fijos & Depreciación (Libro 7.1)
        </button>

        <button
          onClick={() => setActiveTab('kardex')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'kardex'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Kardex Valorado (Libro 13.1)
        </button>

        <button
          onClick={() => setActiveTab('prorrata')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'prorrata'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Percent className="w-4 h-4" />
          Prorrata Crédito Fiscal IGV (Art. 23 LIGV)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ACTIVOS FIJOS */}
      {/* ==================================================================== */}
      {activeTab === 'activos' && (
        <div className="space-y-6">
          {/* Card Resumen Depreciación */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Activos en Explotación</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{activosQuery.data?.length || 0}</span>
                <span className="text-xs text-slate-400">bienes</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium block mt-1">Tasa LIR promedio: 18.5%</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Deprec. Financiera Mes</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-indigo-600">
                  S/ {(deprecQuery.data?.totalDepreciacionFinanciera || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">NIC 16 / NIIF</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Deprec. Tributaria Mes</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  S/ {(deprecQuery.data?.totalDepreciacionTributaria || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">Art. 22 Regl. LIR</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">IR Diferido (NIC 12)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-emerald-700">
                  S/ {(deprecQuery.data?.totalIrDiferido || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">Tasa 29.5% s/ Dif. Temporal</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalActivoOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Registrar Nuevo Activo
              </button>
              <button
                onClick={handleGenerarAsientoDepreciacion}
                disabled={generarDeprecMutation.isPending}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {generarDeprecMutation.isPending ? 'Contabilizando...' : 'Contabilizar Depreciación (Subdiario 08)'}
              </button>
            </div>

            <button
              onClick={handleDescargarPle71}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Descargar PLE Libro 7.1 (.txt)
            </button>
          </div>

          {/* Tabla de Activos */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Catálogo de Propiedades, Planta y Equipo (Libro 7.1)</h4>
                <p className="text-xs text-slate-500">Control de vida útil, cuentas PCGE, depreciación acumulada y valor neto en libros.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Cta PCGE</th>
                    <th className="p-3 text-right">Valor Adq. (S/)</th>
                    <th className="p-3 text-center">Tasa LIR</th>
                    <th className="p-3 text-right">Deprec. Acum.</th>
                    <th className="p-3 text-right">Valor Neto Libros</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {activosQuery.data?.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{a.codigoActivo}</td>
                      <td className="p-3 font-sans font-medium text-slate-800">{a.descripcion}</td>
                      <td className="p-3 font-sans text-slate-600 flex items-center gap-1.5">
                        {getCategoriaIcon(a.categoria)}
                        <span className="text-[11px] capitalize">{a.categoria.toLowerCase()}</span>
                      </td>
                      <td className="p-3 text-indigo-700">{a.cuentaActivoPCGE}</td>
                      <td className="p-3 text-right text-slate-900 font-medium">
                        S/ {a.valorAdquisicionSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center text-slate-700 font-sans font-medium">
                        {a.tasaDepreciacionTributariaAnual}%
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        S/ {a.depreciacionAcumuladaTributaria.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        S/ {a.valorNetoEnLibrosTributario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!activosQuery.data || activosQuery.data.length === 0) && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                        No hay activos fijos registrados en el catálogo. Haga clic en "Registrar Nuevo Activo".
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
      {/* TAB 2: KARDEX VALORADO (LIBRO 13.1) */}
      {/* ==================================================================== */}
      {activeTab === 'kardex' && (
        <div className="space-y-6">
          {/* Card Resumen Kardex */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Producto a Inspeccionar:</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {productosQuery.data?.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.codigoProducto}] {p.descripcion} (Stock: {p.stockActual} {p.unidadMedidaSUNAT})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalProdOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Producto
              </button>
              <button
                onClick={() => setIsModalMovOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Registrar Movimiento
              </button>
              <button
                onClick={handleGenerarAsientoCostoVentas}
                disabled={generarCvMutation.isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                Contabilizar Costo de Ventas (69 vs 20)
              </button>
              <button
                onClick={handleDescargarPle131}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                PLE 13.1 (.txt)
              </button>
            </div>
          </div>

          {/* Tarjeta de Kardex del Producto */}
          {tarjetaQuery.data && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      [{tarjetaQuery.data.producto.codigoProducto}] {tarjetaQuery.data.producto.descripcion}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {tarjetaQuery.data.producto.metodoValuacion}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Unidad: {tarjetaQuery.data.producto.unidadMedidaSUNAT} | Cuenta PCGE: {tarjetaQuery.data.producto.cuentaExistenciasPCGE}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Stock Físico:</span>
                    <span className="font-bold text-slate-900">{tarjetaQuery.data.producto.stockActual} unid</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Costo Unitario:</span>
                    <span className="font-bold text-indigo-700">S/ {tarjetaQuery.data.producto.costoUnitarioActual.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Saldo Valorado:</span>
                    <span className="font-bold text-emerald-700">S/ {tarjetaQuery.data.saldoFinalValorado.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Tabla de Movimientos Kardex */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="p-2.5 border-r border-slate-200">Fecha</th>
                      <th rowSpan={2} className="p-2.5 border-r border-slate-200">Operación</th>
                      <th colSpan={3} className="p-2 text-center bg-blue-50/60 text-blue-900 border-r border-slate-200">ENTRADAS</th>
                      <th colSpan={3} className="p-2 text-center bg-amber-50/60 text-amber-900 border-r border-slate-200">SALIDAS</th>
                      <th colSpan={3} className="p-2 text-center bg-emerald-50/60 text-emerald-900">SALDO FINAL</th>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="p-2 text-right bg-blue-50/30">Cant</th>
                      <th className="p-2 text-right bg-blue-50/30">C.U.</th>
                      <th className="p-2 text-right bg-blue-50/30 border-r border-slate-200">Total (S/)</th>
                      <th className="p-2 text-right bg-amber-50/30">Cant</th>
                      <th className="p-2 text-right bg-amber-50/30">C.U.</th>
                      <th className="p-2 text-right bg-amber-50/30 border-r border-slate-200">Total (S/)</th>
                      <th className="p-2 text-right bg-emerald-50/30">Cant</th>
                      <th className="p-2 text-right bg-emerald-50/30">C.U.</th>
                      <th className="p-2 text-right bg-emerald-50/30">Total (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {tarjetaQuery.data.movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-100 text-slate-700">{m.fecha}</td>
                        <td className="p-2.5 border-r border-slate-100 font-sans text-slate-600 text-[11px]">{m.glosa}</td>
                        {/* ENTRADAS */}
                        <td className="p-2 text-right text-blue-700">{m.cantidadEntrada > 0 ? m.cantidadEntrada : '-'}</td>
                        <td className="p-2 text-right text-slate-600">{m.costoUnitarioEntrada > 0 ? m.costoUnitarioEntrada.toFixed(4) : '-'}</td>
                        <td className="p-2 text-right font-medium text-slate-900 border-r border-slate-100">
                          {m.costoTotalEntrada > 0 ? m.costoTotalEntrada.toFixed(2) : '-'}
                        </td>
                        {/* SALIDAS */}
                        <td className="p-2 text-right text-amber-700">{m.cantidadSalida > 0 ? m.cantidadSalida : '-'}</td>
                        <td className="p-2 text-right text-slate-600">{m.costoUnitarioSalida > 0 ? m.costoUnitarioSalida.toFixed(4) : '-'}</td>
                        <td className="p-2 text-right font-medium text-slate-900 border-r border-slate-100">
                          {m.costoTotalSalida > 0 ? m.costoTotalSalida.toFixed(2) : '-'}
                        </td>
                        {/* SALDOS */}
                        <td className="p-2 text-right font-bold text-slate-900">{m.saldoCantidad}</td>
                        <td className="p-2 text-right text-slate-700">{m.saldoCostoUnitario.toFixed(4)}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">{m.saldoCostoTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    {tarjetaQuery.data.movimientos.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                          No hay movimientos registrados para este producto. Registre una entrada inicial o compra.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PRORRATA IGV */}
      {/* ==================================================================== */}
      {activeTab === 'prorrata' && (
        <div className="space-y-6">
          {prorrataQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coeficiente */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Art. 23 TUO Ley del IGV
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Regla de Prorrata</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Determinación del Coeficiente de Prorrata</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para contribuyentes que realizan simultáneamente operaciones gravadas y operaciones no gravadas (exoneradas o inafectas) con adquisiciones de destino común (Tipo 2).
                </p>

                <div className="p-4 bg-slate-50 rounded-xl space-y-3 font-mono text-xs border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">Ventas Gravadas del Período:</span>
                    <span className="font-bold text-slate-900">S/ {prorrataQuery.data.ventasGravadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">Ventas No Gravadas (Exoneradas/Inafectas):</span>
                    <span className="font-bold text-slate-900">S/ {prorrataQuery.data.ventasNoGravadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                    <span className="text-slate-700 font-sans">Ventas Totales:</span>
                    <span>S/ {prorrataQuery.data.ventasTotales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">Coeficiente de Prorrata Obtenido:</span>
                    <span className="text-[11px] text-indigo-700">Factor aplicable al crédito fiscal</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-indigo-900">{prorrataQuery.data.coeficienteProrrata}</span>
                    <span className="text-xs font-bold text-indigo-700 block">({prorrataQuery.data.porcentajeProrrata}%)</span>
                  </div>
                </div>
              </div>

              {/* Distribución del IGV */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Distribución de Compras de Destino Común (Tipo 2)</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  El IGV de las adquisiciones comunes se segrega: el porcentaje admitido se utiliza como crédito fiscal y la porción no admitida se deduce como gasto o costo para el Impuesto a la Renta.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                    <span className="font-sans text-slate-600">Base Imponible Común (Tipo 2):</span>
                    <span className="font-bold text-slate-900">S/ {prorrataQuery.data.totalBaseComprasDestinoComun.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                    <span className="font-sans text-slate-600">IGV Total Común (18%):</span>
                    <span className="font-bold text-slate-900">S/ {prorrataQuery.data.totalIgvDestinoComun.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between font-mono">
                    <div>
                      <span className="font-sans font-bold text-emerald-900 block">Crédito Fiscal Admitido ({prorrataQuery.data.porcentajeProrrata}%):</span>
                      <span className="text-[10px] text-emerald-700 font-sans">A deducir en la casilla 107 del PDT 621</span>
                    </div>
                    <span className="font-bold text-base text-emerald-900">
                      S/ {prorrataQuery.data.igvCreditoFiscalPermitido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex justify-between font-mono">
                    <div>
                      <span className="font-sans font-bold text-amber-900 block">IGV Gasto / Costo No Admitido:</span>
                      <span className="text-[10px] text-amber-700 font-sans">Transferido a Cuenta PCGE 6411 (Gasto Deducible LIR)</span>
                    </div>
                    <span className="font-bold text-base text-amber-900">
                      S/ {prorrataQuery.data.igvGastoCostoNoAdmitido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar Activo Fijo */}
      {isModalActivoOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Alta de Activo Fijo (Libro 7.1)</h3>
              <button onClick={() => setIsModalActivoOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCrearActivo} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Código de Activo / Placa / Serie:</label>
                <input
                  type="text"
                  value={codigoActivo}
                  onChange={(e) => setCodigoActivo(e.target.value)}
                  placeholder="Ej: ACT-001 o LAPTOP-DELL-01"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descripción del Bien:</label>
                <input
                  type="text"
                  value={descripcionActivo}
                  onChange={(e) => setDescripcionActivo(e.target.value)}
                  placeholder="Ej: Laptop Dell XPS 15 32GB RAM"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Categoría / Tipo de Bien LIR:</label>
                <select
                  value={categoriaActivo}
                  onChange={(e) => setCategoriaActivo(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="EQUIPOS_COMPUTO">Equipos de Cómputo (25% anual LIR)</option>
                  <option value="VEHICULOS">Vehículos de Transporte (20% anual LIR)</option>
                  <option value="MAQUINARIA">Maquinaria y Equipo (10% anual LIR)</option>
                  <option value="EDIFICIOS">Edificios y Construcciones (5% anual LIR)</option>
                  <option value="MUEBLES_ENSERES">Muebles y Enseres (10% anual LIR)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fecha Adquisición:</label>
                  <input
                    type="date"
                    value={fechaAdquisicion}
                    onChange={(e) => setFechaAdquisicion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Valor Adquisición (S/):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorAdquisicion}
                    onChange={(e) => setValorAdquisicion(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalActivoOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Registrar Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Producto Kardex */}
      {isModalProdOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Nuevo Producto / Existencia (Libro 13.1)</h3>
              <button onClick={() => setIsModalProdOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCrearProducto} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Código del Producto (SKU):</label>
                <input
                  type="text"
                  value={codigoProd}
                  onChange={(e) => setCodigoProd(e.target.value)}
                  placeholder="Ej: PROD-001 o MFR-550"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descripción Comercial:</label>
                <input
                  type="text"
                  value={descProd}
                  onChange={(e) => setDescProd(e.target.value)}
                  placeholder="Ej: Resma Papel Bond A4 75g"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unidad de Medida SUNAT (Tabla 6):</label>
                <select
                  value={umProd}
                  onChange={(e) => setUmProd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="NIU">NIU — Unidades</option>
                  <option value="KGM">KGM — Kilogramos</option>
                  <option value="LTR">LTR — Litros</option>
                  <option value="BX">BX — Cajas</option>
                  <option value="MTQ">MTQ — Metros cúbicos</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalProdOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento Kardex */}
      {isModalMovOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Registrar Entrada / Salida en Kardex</h3>
              <button onClick={() => setIsModalMovOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleRegistrarMovimiento} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Movimiento:</label>
                <select
                  value={tipoOperacionMov}
                  onChange={(e) => setTipoOperacionMov(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="02">02 — Compra / Ingreso a Almacén</option>
                  <option value="16">16 — Saldo Inicial de Inventario</option>
                  <option value="01">01 — Venta / Salida Valorada</option>
                  <option value="05">05 — Devolución de Cliente</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cantidad:</label>
                  <input
                    type="number"
                    step="1"
                    value={cantMov}
                    onChange={(e) => setCantMov(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Costo Unitario (S/):</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={tipoOperacionMov === '01'}
                    value={cuMov}
                    onChange={(e) => setCuMov(Number(e.target.value))}
                    placeholder={tipoOperacionMov === '01' ? 'Automático por promedio' : ''}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalMovOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Procesar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
