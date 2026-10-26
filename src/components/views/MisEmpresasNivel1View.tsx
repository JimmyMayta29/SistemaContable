import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
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
  Plus, 
  ShieldCheck, 
  Coins, 
  LogIn, 
  FolderLock, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Upload,
  Archive,
  RotateCcw
} from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';
import { useToast } from '../../context/ToastContext';
import { ModalNuevaEmpresaBlanco } from '../modals/ModalNuevaEmpresaBlanco';
import { ModalImportacionCsv } from '../modals/ModalImportacionCsv';
import { ModalBackupEmpresa } from '../modals/ModalBackupEmpresa';
import { EmptyStateInstructivo } from '../common/EmptyStateInstructivo';

interface MisEmpresasNivel1ViewProps {
  empresas: EmpresaCliente[];
  onAddEmpresa: (nueva: EmpresaCliente) => void;
}

export const MisEmpresasNivel1View: React.FC<MisEmpresasNivel1ViewProps> = ({
  empresas,
  onAddEmpresa
}) => {
  const { entrarAEmpresa, usuario, setIsSearchModalOpen } = useEmpresaPeriodo();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'POR_VENCER' | 'PRELIQUIDADO' | 'AL_DIA'>('TODOS');
  const [filtroRegimen, setFiltroRegimen] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalBlancoOpen, setIsModalBlancoOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [selectedParaRecordatorio, setSelectedParaRecordatorio] = useState<EmpresaCliente | null>(null);
  const [restableciendoDemo, setRestableciendoDemo] = useState(false);

  // Formulario nueva empresa básica
  const [newRuc, setNewRuc] = useState('');
  const [newRazonSocial, setNewRazonSocial] = useState('');
  const [newContacto, setNewContacto] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRegimen, setNewRegimen] = useState<'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL'>('MYPE_TRIBUTARIO');

  const handleRestablecerDemo = async () => {
    setRestableciendoDemo(true);
    try {
      const data: any = await apiClient.post('/empresas/demo/restablecer');
      if (!data.success) {
        throw new Error(data.error || 'Error restableciendo empresa demo');
      }
      success('Empresa Demo S.A.C. restablecida con balance cuadrado y 100% de operaciones.');
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || 'Error al restablecer la empresa demo.');
    } finally {
      setRestableciendoDemo(false);
    }
  };

  // Cálculos reales para el Tablero de Cartera
  const statsCartera = useMemo(() => {
    const total = empresas.length;
    const porVencer = empresas.filter(e => e.estadoDeclaracion === 'POR_VENCER').length;
    const preliquidadas = empresas.filter(e => e.preliquidacionNotificada || (e.montoPreliquidacionIgv && e.montoPreliquidacionIgv > 0)).length;
    const alDia = empresas.filter(e => e.estadoDeclaracion === 'AL_DIA').length;
    const totalIgv = empresas.reduce((acc, e) => acc + (e.montoPreliquidacionIgv || 0), 0);
    const totalRenta = empresas.reduce((acc, e) => acc + (e.montoPreliquidacionRenta || 0), 0);
    const trabajadores = empresas.reduce((acc, e) => acc + (e.trabajadoresPlanilla || 0), 0);

    return {
      total,
      porVencer,
      preliquidadas,
      alDia,
      totalImpuestos: totalIgv + totalRenta,
      totalIgv,
      totalRenta,
      trabajadores
    };
  }, [empresas]);

  const filteredEmpresas = useMemo(() => {
    return empresas.filter(e => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        e.razonSocial.toLowerCase().includes(q) ||
        e.ruc.includes(q) ||
        e.contactoNombre?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filtroEstado !== 'TODOS' && e.estadoDeclaracion !== filtroEstado) return false;
      if (filtroRegimen !== 'TODOS' && e.regimenTributario !== filtroRegimen) return false;
      return true;
    });
  }, [empresas, searchTerm, filtroEstado, filtroRegimen]);

  const handleCrearEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuc || !newRazonSocial) return;

    const ultimoDigito = newRuc.slice(-1);
    const nuevaEmpresa: EmpresaCliente = {
      id: `emp-${Date.now()}`,
      ruc: newRuc,
      razonSocial: newRazonSocial,
      nombreComercial: newRazonSocial,
      direccionFiscal: 'Dirección Fiscal Lima, Perú',
      contactoNombre: newContacto || 'Representante Legal',
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
      montoPreliquidacionIgv: 1450.00,
      montoPreliquidacionRenta: 250.00,
      trabajadoresPlanilla: 4
    };

    onAddEmpresa(nuevaEmpresa);
    setIsModalOpen(false);
    setNewRuc('');
    setNewRazonSocial('');
    setNewContacto('');
    setNewTelefono('');
    setNewEmail('');
    success(`Empresa ${nuevaEmpresa.razonSocial} registrada correctamente en la cartera.`, 'Empresa Creada');
  };

  const getVencimientoLabel = (ultimoDigito: string) => {
    const digito = parseInt(ultimoDigito || '0', 10);
    const dia = 16 + (digito % 6);
    return `2026-10-${dia.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6 md:p-8 space-y-6">
      {/* Header Banner - Nivel 1 Estudio */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              Nivel 1: Estudio Contable & Cartera Centralizada
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mis Empresas — Cartera de Clientes
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Seleccione una empresa para ingresar a su entorno contable operativo aislado. Cada cliente cuenta con plan contable, libros SIRE, vouchers y reportes independientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-300" />
              <span>Buscar</span>
              <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">Ctrl+K</kbd>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar CSV</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-amber-300" />
              <span>Copias de seguridad</span>
            </button>

            <button
              onClick={handleRestablecerDemo}
              disabled={restableciendoDemo}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Cargar o restaurar la Empresa Demo con operaciones completas y balance cuadrado"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{restableciendoDemo ? 'Restableciendo...' : 'Empresa Demo'}</span>
            </button>

            <button
              onClick={() => setIsModalBlancoOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Empresa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Cartera Total</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{statsCartera.total} Empresas</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% aisladas
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Por Vencer en SUNAT</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{statsCartera.porVencer}</div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Próximos 10 días según RUC
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Preliquidaciones Activas</span>
            <Coins className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{statsCartera.preliquidadas}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            S/ {statsCartera.totalImpuestos.toLocaleString('es-PE', { minimumFractionDigits: 2 })} en tributos
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Empresas al Día</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{statsCartera.alDia}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            PDT 621 y SIRE presentados
          </div>
        </div>
      </div>

      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por RUC, razón social o contacto..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-hidden transition font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['TODOS', 'POR_VENCER', 'PRELIQUIDADO', 'AL_DIA'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroEstado === estado
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {estado === 'TODOS' ? 'Todos' :
                 estado === 'POR_VENCER' ? 'Por Vencer' :
                 estado === 'PRELIQUIDADO' ? 'Preliquidado' : 'Al Día'}
              </button>
            ))}
          </div>

          <select
            value={filtroRegimen}
            onChange={(e) => setFiltroRegimen(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold cursor-pointer outline-hidden"
          >
            <option value="TODOS">Todos los regímenes</option>
            <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario</option>
            <option value="REGIMEN_GENERAL">Régimen General</option>
            <option value="REGIMEN_ESPECIAL">Régimen Especial (RER)</option>
          </select>
        </div>
      </div>

      {/* Grid of Company Cards or Empty State */}
      {filteredEmpresas.length === 0 ? (
        <EmptyStateInstructivo
          moduloNombre="Cartera de Empresas"
          titulo="No se encontraron empresas registradas"
          descripcion="Puede registrar una nueva empresa cliente en blanco o inicializar la Empresa Demo con datos operacionales y balance cuadrado."
          checklist={[
            { titulo: 'Identificación de RUC y Razón Social', cumplido: false, descripcion: 'Validación automática bajo algoritmo Módulo 11 de SUNAT' },
            { titulo: 'Asignación de Régimen Tributario', cumplido: false, descripcion: 'MYPE Tributario, Régimen General, Régimen Especial o NRUS' },
            { titulo: 'Inicialización de Catálogos PCGE', cumplido: true, descripcion: 'Plan Contable General Empresarial 2019/2020 y subdiarios estándar predefinidos' }
          ]}
          onRegistrarNuevo={() => setIsModalBlancoOpen(true)}
          textoRegistrar="Registrar Empresa en Blanco"
          onCargarPlantilla={handleRestablecerDemo}
          textoPlantilla="Cargar Empresa Demo S.A.C."
          onImportarCsv={() => setIsImportModalOpen(true)}
          textoImportar="Importar desde CSV / hoja de cálculo"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmpresas.map((empresa) => {
            const ultimoDigito = empresa.ultimoDigitoRuc || empresa.ruc.slice(-1);
            const fechaVencimiento = getVencimientoLabel(ultimoDigito);
            const esDemo = empresa.ruc === '20000000001' || (empresa as any).esDemo;

            return (
              <div
                key={empresa.id}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Header: Avatar, Name, RUC & Regime */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0">
                        {ultimoDigito}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition">
                            {empresa.razonSocial}
                          </h3>
                          {esDemo && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0">
                              DEMO EDUCATIVA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono font-bold text-slate-700">RUC {empresa.ruc}</span>
                          <span>•</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-600">
                            {empresa.regimenTributario.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deadlines & SUNAT Obligations */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PDT 621</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{empresa.vencimientoPdt621 || fechaVencimiento}</span>
                      <span className="text-[9px] text-amber-600 block font-semibold mt-0.5">Pendiente</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SIRE</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{empresa.vencimientoSire || fechaVencimiento}</span>
                      <span className="text-[9px] text-blue-600 block font-semibold mt-0.5">Propuesta</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PLAME</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{empresa.vencimientoPlame || fechaVencimiento}</span>
                      <span className="text-[9px] text-emerald-600 block font-semibold mt-0.5">Al Día</span>
                    </div>
                  </div>

                  {/* Preliquidación Summary */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                        Tributos Proyectados Periodo:
                      </span>
                      <span className="font-mono font-extrabold text-blue-950 text-sm">
                        S/ {((empresa.montoPreliquidacionIgv || 0) + (empresa.montoPreliquidacionRenta || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">
                        (IGV S/ {empresa.montoPreliquidacionIgv || 0} + Rta S/ {empresa.montoPreliquidacionRenta || 0})
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedParaRecordatorio(empresa)}
                      className="p-2 rounded-xl bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer shadow-2xs"
                      title="Notificar por WhatsApp / Correo"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Button: Entrar a la empresa */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 truncate">
                    Contacto: <strong className="text-slate-700">{empresa.contactoNombre || 'Gerencia'}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {esDemo && (
                      <button
                        type="button"
                        onClick={handleRestablecerDemo}
                        disabled={restableciendoDemo}
                        className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Restablecer datos originales de la demo"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer</span>
                      </button>
                    )}

                    <button
                      onClick={() => entrarAEmpresa(empresa)}
                      className="px-4 py-2 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <span>Ingresar</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Enviar Aviso de Preliquidación */}
      {selectedParaRecordatorio && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Aviso de Preliquidación Tributaria
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedParaRecordatorio.razonSocial}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParaRecordatorio(null)} 
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
{`Estimado(a) ${selectedParaRecordatorio.contactoNombre} (${selectedParaRecordatorio.razonSocial}):

Le remitimos la PRELIQUIDACIÓN TRIBUTARIA del periodo 2026-09:
- IGV por pagar estimado: S/ ${(selectedParaRecordatorio.montoPreliquidacionIgv || 0).toFixed(2)}
- Pago a cuenta Impuesto a la Renta: S/ ${(selectedParaRecordatorio.montoPreliquidacionRenta || 0).toFixed(2)}
- TOTAL ESTIMADO A DECLARAR: S/ ${((selectedParaRecordatorio.montoPreliquidacionIgv || 0) + (selectedParaRecordatorio.montoPreliquidacionRenta || 0)).toFixed(2)}

Fecha límite de vencimiento según último dígito ${selectedParaRecordatorio.ultimoDigitoRuc}: ${selectedParaRecordatorio.vencimientoPdt621}.

Mendoza & Asociados — Asesores Tributarios S.C.R.L.`}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Estimado cliente de ${selectedParaRecordatorio.razonSocial}, su liquidación es S/ ${((selectedParaRecordatorio.montoPreliquidacionIgv || 0) + (selectedParaRecordatorio.montoPreliquidacionRenta || 0)).toFixed(2)}`);
                  success('Texto copiado al portapapeles para WhatsApp.', 'Copiado');
                  setSelectedParaRecordatorio(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Copiar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Registrar Nueva Empresa en el Estudio
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEmpresa} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">RUC (11 dígitos):</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={newRuc}
                  onChange={(e) => setNewRuc(e.target.value.replace(/\D/g, ''))}
                  placeholder="20100000001"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Razón Social:</label>
                <input
                  type="text"
                  required
                  value={newRazonSocial}
                  onChange={(e) => setNewRazonSocial(e.target.value)}
                  placeholder="Comercializadora Ejemplo S.A.C."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contacto Principal:</label>
                  <input
                    type="text"
                    value={newContacto}
                    onChange={(e) => setNewContacto(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Régimen Tributario:</label>
                  <select
                    value={newRegimen}
                    onChange={(e) => setNewRegimen(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                  >
                    <option value="MYPE_TRIBUTARIO">MYPE Tributario</option>
                    <option value="REGIMEN_GENERAL">Régimen General</option>
                    <option value="REGIMEN_ESPECIAL">Régimen Especial</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Guardar y Añadir a Cartera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Registrar Empresa en Blanco (Asistente Completo) */}
      <ModalNuevaEmpresaBlanco
        isOpen={isModalBlancoOpen}
        onClose={() => setIsModalBlancoOpen(false)}
        onEmpresaCreada={() => {
          void queryClient.invalidateQueries({ queryKey: ['empresas'] });
        }}
      />

      {/* Modal: Importación CSV / hoja de cálculo */}
      <ModalImportacionCsv
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportExitoso={() => {
          window.location.reload();
        }}
      />

      {/* Modal: Copias de seguridad por empresa */}
      <ModalBackupEmpresa
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};
