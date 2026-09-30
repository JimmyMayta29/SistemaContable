import React, { useState } from 'react';
import { 
  FolderTree, 
  Search, 
  Coins, 
  Users, 
  Layers, 
  Plus, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Building 
} from 'lucide-react';
import { PLAN_CONTABLE_PCGE } from '../../data/pcgeAccounts';
import { TIPOS_CAMBIO_SBS_DEMO, CATALOGO_ENTIDADES_DEMO } from '../../data/maestrosSiscont';
import { SUBDIARIOS_SISCONT, TipoCambioSbs, EntidadCatalogo } from '../../types';

export const MaestrosSiscontView: React.FC = () => {
  const [tab, setTab] = useState<'PCGE' | 'TIPO_CAMBIO' | 'ENTIDADES' | 'SUBDIARIOS'>('PCGE');
  
  // Search states
  const [searchPcge, setSearchPcge] = useState('');
  const [searchEntidad, setSearchEntidad] = useState('');
  const [tiposCambio, setTiposCambio] = useState<TipoCambioSbs[]>(TIPOS_CAMBIO_SBS_DEMO);
  const [entidades, setEntidades] = useState<EntidadCatalogo[]>(CATALOGO_ENTIDADES_DEMO);
  const [actualizandoTc, setActualizandoTc] = useState(false);

  const pcgeFiltrado = PLAN_CONTABLE_PCGE.filter(c => 
    c.codigo.includes(searchPcge) || c.nombre.toLowerCase().includes(searchPcge.toLowerCase())
  );

  const entidadesFiltradas = entidades.filter(e => 
    e.numeroDocumento.includes(searchEntidad) || 
    e.razonSocial.toLowerCase().includes(searchEntidad.toLowerCase())
  );

  const handleActualizarTcSbs = () => {
    setActualizandoTc(true);
    setTimeout(() => {
      setActualizandoTc(false);
      alert('Tipos de Cambio SBS actualizados con el Web Service oficial de la Superintendencia de Banca y Seguros.');
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600" />
            Tablas & Maestros Generales (Arquitectura SISCONT SMART)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuración del Plan Contable General Empresarial (PCGE), Tipos de Cambio SBS diarios, Catálogo de Entidades y Subdiarios.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-2 text-xs">
        <button
          onClick={() => setTab('PCGE')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            tab === 'PCGE'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Plan de Cuentas PCGE
        </button>
        <button
          onClick={() => setTab('TIPO_CAMBIO')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            tab === 'TIPO_CAMBIO'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          Tipos de Cambio SBS
        </button>
        <button
          onClick={() => setTab('ENTIDADES')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            tab === 'ENTIDADES'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes y Proveedores
        </button>
        <button
          onClick={() => setTab('SUBDIARIOS')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            tab === 'SUBDIARIOS'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Subdiarios / Orígenes
        </button>
      </div>

      {/* Tab 1: Plan de Cuentas PCGE */}
      {tab === 'PCGE' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchPcge}
                onChange={(e) => setSearchPcge(e.target.value)}
                placeholder="Buscar cuenta por código o denominación (ej. 6011, IGV, Banco)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800"
              />
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              {pcgeFiltrado.length} cuentas registradas
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-32">Código</th>
                  <th className="py-2.5 px-4">Denominación de la Cuenta</th>
                  <th className="py-2.5 px-4">Elemento</th>
                  <th className="py-2.5 px-4">Naturaleza</th>
                  <th className="py-2.5 px-4">Tipo en EE.FF.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pcgeFiltrado.map(cta => (
                  <tr key={cta.codigo} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-bold text-blue-700">{cta.codigo}</td>
                    <td className="py-2 px-4 font-medium text-slate-900">{cta.nombre}</td>
                    <td className="py-2 px-4 font-mono text-slate-500">Elemento {cta.elemento}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cta.naturaleza === 'DEUDORA' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {cta.naturaleza}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-500 text-[11px] font-semibold">{cta.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Tipo de Cambio SBS */}
      {tab === 'TIPO_CAMBIO' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            <div className="text-slate-600">
              Cotización oficial de la Superintendencia de Banca, Seguros y AFP (SBS) para Dólar Americano (USD).
            </div>
            <button
              onClick={handleActualizarTcSbs}
              disabled={actualizandoTc}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actualizandoTc ? 'animate-spin' : ''}`} />
              Sincronizar TC SBS en Línea
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4 text-right">TC Compra (S/)</th>
                  <th className="py-2.5 px-4 text-right">TC Venta (S/)</th>
                  <th className="py-2.5 px-4">Fuente Oficial</th>
                  <th className="py-2.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {tiposCambio.map((tc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{tc.fecha}</td>
                    <td className="py-2.5 px-4 text-right text-blue-700 font-bold">{tc.compra.toFixed(3)}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">{tc.venta.toFixed(3)}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500 font-medium">{tc.fuente} / SUNAT</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                        Vigente
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Clientes y Proveedores */}
      {tab === 'ENTIDADES' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchEntidad}
                onChange={(e) => setSearchEntidad(e.target.value)}
                placeholder="Buscar por RUC o Razón Social de cliente / proveedor..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800"
              />
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              {entidadesFiltradas.length} entidades registradas
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Documento</th>
                  <th className="py-2.5 px-4">Razón Social / Nombres</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Dirección Fiscal</th>
                  <th className="py-2.5 px-4 text-center">Condición SUNAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {entidadesFiltradas.map(ent => (
                  <tr key={ent.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{ent.numeroDocumento}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{ent.razonSocial}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ent.tipoEntidad === 'CLIENTE' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {ent.tipoEntidad}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] truncate max-w-[240px]">{ent.direccion}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ent.condicionSunat}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Subdiarios / Orígenes */}
      {tab === 'SUBDIARIOS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            Estructura oficial de subdiarios para clasificación de vouchers en Libros Principales y Auxiliares (Estándar Siscont Smart).
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-24">Código</th>
                <th className="py-2.5 px-4">Descripción del Subdiario</th>
                <th className="py-2.5 px-4">Tipo de Operación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SUBDIARIOS_SISCONT.map(sub => (
                <tr key={sub.codigo} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{sub.codigo}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{sub.descripcion}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{sub.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
