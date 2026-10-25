import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  Phone, 
  Mail, 
  ExternalLink, 
  Plus, 
  ShieldCheck, 
  Coins, 
  Users, 
  Bell, 
  Sparkles,
  MessageSquare,
  LogIn,
  FolderLock
} from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { useToast } from '../../context/ToastContext';

interface EmpresasClientesViewProps {
  empresas: EmpresaCliente[];
  empresaActivaId: string;
  onSelectEmpresa: (empresaId: string) => void;
  onAddEmpresa: (nueva: EmpresaCliente) => void;
  onTogglePreliquidacionNotificada: (empresaId: string) => void;
  onIngresarEmpresa?: (empresaId: string) => void;
}

export const EmpresasClientesView: React.FC<EmpresasClientesViewProps> = ({
  empresas,
  empresaActivaId,
  onSelectEmpresa,
  onAddEmpresa,
  onTogglePreliquidacionNotificada,
  onIngresarEmpresa
}) => {
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'POR_VENCER' | 'PRELIQUIDADO' | 'AL_DIA'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParaRecordatorio, setSelectedParaRecordatorio] = useState<EmpresaCliente | null>(null);

  // New company form state
  const [newRuc, setNewRuc] = useState('');
  const [newRazonSocial, setNewRazonSocial] = useState('');
  const [newContacto, setNewContacto] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRegimen, setNewRegimen] = useState<'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL'>('MYPE_TRIBUTARIO');

  const filtered = empresas.filter(e => {
    const matchesSearch = 
      e.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.ruc.includes(searchTerm) ||
      e.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filtroEstado !== 'TODOS' && e.estadoDeclaracion !== filtroEstado) return false;
    return true;
  });

  const handleCrearEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuc || !newRazonSocial) return;

    const ultimoDigito = newRuc.slice(-1);
    const nuevaEmpresa: EmpresaCliente = {
      id: `emp-${Date.now()}`,
      ruc: newRuc,
      razonSocial: newRazonSocial,
      nombreComercial: newRazonSocial,
      direccionFiscal: 'Dirección Lima, Perú',
      contactoNombre: newContacto || 'Contacto Principal',
      contactoTelefono: newTelefono || '+51 900 000 000',
      contactoEmail: newEmail || 'contacto@empresa.com',
      regimenTributario: newRegimen,
      tasaRentaMensual: newRegimen === 'MYPE_TRIBUTARIO' ? 0.01 : 0.015,
      usuarioSol: 'MODDATOS',
      claveSol: 'moddatos123',
      clientIdSire: 'sire-id-demo',
      clientSecretSire: 'sire-secret-demo',
      ambienteSunat: 'PRODUCCION',
      ultimoDigitoRuc: ultimoDigito,
      vencimientoPdt621: `2026-10-${20 + parseInt(ultimoDigito || '0') % 5}`,
      vencimientoSire: `2026-10-${20 + parseInt(ultimoDigito || '0') % 5}`,
      vencimientoPlame: `2026-10-${20 + parseInt(ultimoDigito || '0') % 5}`,
      estadoDeclaracion: 'POR_VENCER',
      preliquidacionNotificada: false,
      montoPreliquidacionIgv: 1200.00,
      montoPreliquidacionRenta: 200.00,
      trabajadoresPlanilla: 5
    };

    onAddEmpresa(nuevaEmpresa);
    setIsModalOpen(false);
    setNewRuc('');
    setNewRazonSocial('');
    setNewContacto('');
    setNewTelefono('');
    setNewEmail('');
  };

  const generarMensajePreliquidacion = (empresa: EmpresaCliente) => {
    const total = (empresa.montoPreliquidacionIgv || 0) + (empresa.montoPreliquidacionRenta || 0);
    return `Estimado(a) ${empresa.contactoNombre} (${empresa.razonSocial}):\n\nLe enviamos el resumen de PRELIQUIDACIÓN TRIBUTARIA del periodo 2026-09 previo al cierre de mes:\n- IGV por pagar estimado: S/ ${(empresa.montoPreliquidacionIgv || 0).toFixed(2)}\n- Pago a cuenta Renta 3ra: S/ ${(empresa.montoPreliquidacionRenta || 0).toFixed(2)}\n- TOTAL ESTIMADO A DECLARAR: S/ ${total.toFixed(2)}\n\nFecha límite de vencimiento SUNAT según último dígito ${empresa.ultimoDigitoRuc}: ${empresa.vencimientoPdt621}.\n\nQuedamos a su disposición para coordinar la declaración oportuna.`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Gestión y acceso a empresas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo principal de acceso: selecciona la empresa para ingresar a su entorno contable. Cada empresa mantiene su contabilidad, libros SIRE, vouchers y base de datos SQL de manera 100% aislada e independiente.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Empresa
        </button>
      </div>

      {/* Isolation Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <FolderLock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <strong className="font-bold">Aislamiento Total de Datos por Empresa:</strong> Al ingresar a una empresa, todos los comprobantes, asientos de compras/ventas, planilla, honorarios y reportes tributarios corresponden única y exclusivamente a esa razón social.
          </div>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-blue-100 font-mono text-[11px] font-bold text-blue-800">
          Base de Datos SQL Independiente
        </span>
      </div>

      {/* KPI Cards: Resumen de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Empresas Gestionadas</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{empresas.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-empresa activa</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Por Vencer en Próximos 10 Días</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {empresas.filter(e => e.estadoDeclaracion === 'POR_VENCER').length}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-1 font-medium">Revisar SIRE / Propuestas</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Preliquidaciones Emitidas</span>
            <Coins className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">
            {empresas.filter(e => e.preliquidacionNotificada).length} / {empresas.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Clientes avisados a tiempo</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Empresas al Día (Declaradas)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {empresas.filter(e => e.estadoDeclaracion === 'AL_DIA').length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Cumplimiento OK</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por RUC, Razón Social o Contacto..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-pointer"
          >
            <option value="TODOS">Todos los estados de vencimiento</option>
            <option value="POR_VENCER">Por vencer (Alerta preventiva)</option>
            <option value="PRELIQUIDADO">Preliquidado (Pendiente aviso)</option>
            <option value="AL_DIA">Al día (Declaración completa)</option>
          </select>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filtered.map((empresa) => {
          const isActive = empresa.id === empresaActivaId;
          return (
            <div
              key={empresa.id}
              className={`rounded-2xl border p-5 transition relative shadow-sm ${
                isActive
                  ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {empresa.ultimoDigitoRuc}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {empresa.razonSocial}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-medium text-slate-700">RUC: {empresa.ruc}</span>
                      <span>•</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {empresa.regimenTributario.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                    Activa Ahora
                  </span>
                )}
              </div>

              {/* Deadlines Section */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">PDT 621</span>
                  <strong className="text-slate-800 font-mono">{empresa.vencimientoPdt621}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">SIRE RCE/RVIE</span>
                  <strong className="text-slate-800 font-mono">{empresa.vencimientoSire}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">PLAME (Planilla)</span>
                  <strong className="text-slate-800 font-mono">{empresa.vencimientoPlame}</strong>
                </div>
              </div>

              {/* Preliquidacion Alert Banner */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl mb-4 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wide block">
                    Preliquidación Fin de Mes Estimada:
                  </span>
                  <span className="font-mono font-bold text-amber-900 text-sm">
                    S/ {((empresa.montoPreliquidacionIgv || 0) + (empresa.montoPreliquidacionRenta || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-2">
                    (IGV: S/ {empresa.montoPreliquidacionIgv} | Renta: S/ {empresa.montoPreliquidacionRenta})
                  </span>
                </div>

                <button
                  onClick={() => setSelectedParaRecordatorio(empresa)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                  title="Generar aviso para WhatsApp o correo al cliente"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Notificar
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <span>Contacto: <strong>{empresa.contactoNombre}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectEmpresa(empresa.id);
                      if (onIngresarEmpresa) onIngresarEmpresa(empresa.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      isActive 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    {isActive ? 'Ingresar al Tablero' : 'Ingresar a esta Empresa'}
                  </button>
                  {isActive && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Activa
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Enviar / Copiar Recordatorio de Preliquidación */}
      {selectedParaRecordatorio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Recordatorio de Preliquidación Tributaria
                </h3>
              </div>
              <button onClick={() => setSelectedParaRecordatorio(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Mensaje automático listo para enviar al cliente por WhatsApp o correo antes del vencimiento oficial de SUNAT:
            </p>

            <textarea
              readOnly
              rows={8}
              value={generarMensajePreliquidacion(selectedParaRecordatorio)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-sans leading-relaxed focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Cliente: {selectedParaRecordatorio.contactoTelefono}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generarMensajePreliquidacion(selectedParaRecordatorio));
                    onTogglePreliquidacionNotificada(selectedParaRecordatorio.id);
                    success('Mensaje copiado al portapapeles listo para enviar por WhatsApp.', 'Notificación Copiada');
                    setSelectedParaRecordatorio(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Copiar para WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nueva Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Registrar Empresa Cliente en Cartera</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEmpresa} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">RUC (11 dígitos):</label>
                <input
                  type="text"
                  maxLength={11}
                  required
                  placeholder="20XXXXXXXXX"
                  value={newRuc}
                  onChange={(e) => setNewRuc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Razón Social:</label>
                <input
                  type="text"
                  required
                  placeholder="NOMBRE COMERCIAL S.A.C."
                  value={newRazonSocial}
                  onChange={(e) => setNewRazonSocial(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nombre de Contacto:</label>
                  <input
                    type="text"
                    placeholder="Gerente o Administrador"
                    value={newContacto}
                    onChange={(e) => setNewContacto(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Teléfono / WhatsApp:</label>
                  <input
                    type="text"
                    placeholder="+51 999 888 777"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Régimen Tributario:</label>
                <select
                  value={newRegimen}
                  onChange={(e) => setNewRegimen(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 cursor-pointer"
                >
                  <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario (RMT - 1% Renta)</option>
                  <option value="REGIMEN_GENERAL">Régimen General (RG - 1.5% Renta)</option>
                  <option value="REGIMEN_ESPECIAL">Régimen Especial (RER - 1.5% Renta)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  Guardar en Cartera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
