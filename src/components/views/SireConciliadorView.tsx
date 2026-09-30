import React, { useState } from 'react';
import { 
  FileCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Search, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  Eye, 
  Sparkles,
  FileCode2
} from 'lucide-react';
import { Comprobante, EmpresaCliente } from '../../types';
import { generarSireRceTxt } from '../../services/sireTxtGenerator';

interface SireConciliadorViewProps {
  compras: Comprobante[];
  empresa: EmpresaCliente;
  periodo: string;
  onImportarComprobanteSunat: (comprobante: Comprobante) => void;
}

export const SireConciliadorView: React.FC<SireConciliadorViewProps> = ({
  compras,
  empresa,
  periodo,
  onImportarComprobanteSunat
}) => {
  const [tabRegistro, setTabRegistro] = useState<'RCE_COMPRAS' | 'RVIE_VENTAS'>('RCE_COMPRAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'COINCIDENTE' | 'SOLO_SUNAT' | 'DIFERENCIA'>('TODOS');
  const [conciliando, setConciliando] = useState(false);

  // Simulated SUNAT Proposal Items (Includes the 6 existing + 1 unrecorded supplier invoice to demonstrate automatic detection)
  const [propuestaSunat, setPropuestaSunat] = useState<Comprobante[]>([
    ...compras,
    {
      id: 'sunat-extra-01',
      car: '2051982736101F003000891220260920',
      tipoDoc: '01',
      serie: 'F003',
      numero: '0008912',
      fechaEmision: '2026-09-20',
      fechaVencimiento: '2026-10-05',
      rucEmisor: '20519827361',
      razonSocialEmisor: 'SEGURIDAD & VIGILANCIA INTEGRAL PRIVADA S.A.C.',
      rucReceptor: empresa.ruc,
      razonSocialReceptor: empresa.razonSocial,
      moneda: 'PEN',
      tipoCambio: 1.000,
      baseImponibleGravada: 1800.00,
      igv: 324.00,
      adquisicionesNoGravadas: 0,
      isc: 0,
      icbper: 0,
      otrosTributos: 0,
      total: 2124.00,
      sujetoADetraccion: true,
      codigoDetraccion: '022',
      tasaDetraccion: 12,
      montoDetraccion: 254.88,
      clasificacionBienServicio: 'GASTO_SERVICIOS',
      categoriaGasto: '6391',
      cuentaContableAsignada: '6391',
      asientoGenerado: false,
      estadoSunat: 'ACEPTADO',
      origen: 'SUNAT_SIRE_SYNC',
      observaciones: 'Factura detectada en la propuesta SUNAT pero NO contabilizada aún en el sistema'
    }
  ]);

  const handleEjecutarConciliacion = () => {
    setConciliando(true);
    setTimeout(() => {
      setConciliando(false);
      alert('Conciliación con el API SIRE SUNAT finalizada: 6 coincidentes, 1 comprobante pendiente de incorporación identificado.');
    }, 500);
  };

  const handleDescargarReemplazo = () => {
    const { nombreArchivo, contenido } = generarSireRceTxt(empresa.ruc, periodo, compras);
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo.replace('000804', '000804_REEMPLAZO');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Módulo SIRE SMART - Conciliador y Comparador SUNAT
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compara automáticamente la propuesta de compras y ventas de SUNAT vs los comprobantes de tu contabilidad interna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEjecutarConciliacion}
            disabled={conciliando}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${conciliando ? 'animate-spin' : ''}`} />
            Comparar con SUNAT SIRE
          </button>
          <button
            onClick={handleDescargarReemplazo}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Genera el archivo plano oficial de reemplazo de propuesta SIRE 8.4"
          >
            <FileCode2 className="w-4 h-4 text-emerald-600" />
            Descargar Reemplazo SIRE
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Propuesta SUNAT (Total)</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{propuestaSunat.length}</div>
          <span className="text-[11px] text-slate-400">Comprobantes descargados</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Coincidentes (100% Validados)</span>
          <div className="text-2xl font-black text-emerald-600 font-mono">6</div>
          <span className="text-[11px] text-emerald-700 font-medium">Cuadre perfecto con libros</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Solo en SUNAT (Falta Registrar)</span>
          <div className="text-2xl font-black text-amber-600 font-mono">1</div>
          <span className="text-[11px] text-amber-700 font-medium">Crédito fiscal por incorporar</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Diferencias de Importes</span>
          <div className="text-2xl font-black text-slate-400 font-mono">0</div>
          <span className="text-[11px] text-slate-500 font-medium">Sin inconsistencias</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">
            Comparativa Detallada: Propuesta SUNAT vs Registros en SUNAConta ERP
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            Periodo: {periodo} | RCE Formato 8.4
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-white text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Comprobante</th>
              <th className="py-2.5 px-3">Fecha</th>
              <th className="py-2.5 px-3">Proveedor / RUC</th>
              <th className="py-2.5 px-3 text-right">Base SUNAT</th>
              <th className="py-2.5 px-3 text-right">Total SUNAT</th>
              <th className="py-2.5 px-3 text-center">Estado Conciliación</th>
              <th className="py-2.5 px-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
            {propuestaSunat.map((c) => {
              const estaEnSistema = compras.some(comp => comp.id === c.id);
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{c.serie}-{c.numero}</div>
                    <div className="text-[10px] font-mono text-slate-400">Tipo {c.tipoDoc}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{c.fechaEmision}</td>
                  <td className="py-2.5 px-3 max-w-[220px]">
                    <div className="font-semibold text-slate-800 truncate">{c.razonSocialEmisor}</div>
                    <div className="text-[10px] font-mono text-slate-500">RUC: {c.rucEmisor}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium">S/ {c.baseImponibleGravada.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">S/ {c.total.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {estaEnSistema ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Coincidente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Solo en SUNAT
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {!estaEnSistema ? (
                      <button
                        onClick={() => {
                          onImportarComprobanteSunat(c);
                          alert(`Factura ${c.serie}-${c.numero} importada exitosamente a tu Registro de Compras interno.`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 mx-auto transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Incorporar a Compras
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Verificado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
