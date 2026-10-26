import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Calendar, 
  Coins, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../api/client';

interface ModalNuevaEmpresaBlancoProps {
  isOpen: boolean;
  onClose: () => void;
  onEmpresaCreada: (empresa: any) => void;
}

export const ModalNuevaEmpresaBlanco: React.FC<ModalNuevaEmpresaBlancoProps> = ({
  isOpen,
  onClose,
  onEmpresaCreada
}) => {
  const { success, error: toastError } = useToast();

  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [regimenTributario, setRegimenTributario] = useState<'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL' | 'NRUS'>('MYPE_TRIBUTARIO');
  const [domicilioFiscal, setDomicilioFiscal] = useState('');
  const [departamento, setDepartamento] = useState('LIMA');
  const [provincia, setProvincia] = useState('LIMA');
  const [distrito, setDistrito] = useState('SAN ISIDRO');
  
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');

  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [contadorNombre, setContadorNombre] = useState('');
  const [contadorColegiatura, setContadorColegiatura] = useState('');

  const [ejercicio, setEjercicio] = useState<number>(2026);
  const [monedaPrincipal, setMonedaPrincipal] = useState<'PEN' | 'USD'>('PEN');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  // Validación Módulo 11 en vivo
  const validarRucModulo11 = (rucInput: string): boolean => {
    if (!/^(10|15|17|20)\d{9}$/.test(rucInput)) return false;
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += parseInt(rucInput[i], 10) * factores[i];
    }
    const residuo = suma % 11;
    let esperado = 11 - residuo;
    if (esperado === 10) esperado = 0;
    else if (esperado === 11) esperado = 1;
    return parseInt(rucInput[10], 10) === esperado;
  };

  const rucValido = ruc.length === 11 ? validarRucModulo11(ruc) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rucValido) {
      toastError('El RUC ingresado no cumple con el algoritmo Módulo 11 de SUNAT.');
      return;
    }
    if (!razonSocial.trim()) {
      toastError('Ingrese la Razón Social de la empresa.');
      return;
    }

    setGuardando(true);
    try {
      const data: any = await apiClient.post('/empresas', {
          codigoEmpresa: codigoEmpresa.trim() || ruc.slice(-6),
          ruc: ruc.trim(),
          razonSocial: razonSocial.trim(),
          nombreComercial: nombreComercial.trim() || razonSocial.trim(),
          regimenTributario,
          domicilioFiscal: domicilioFiscal.trim() || 'LIMA, PERÚ',
          departamento,
          provincia,
          distrito,
          contactoNombre: contactoNombre.trim(),
          contactoTelefono: contactoTelefono.trim(),
          contactoEmail: contactoEmail.trim() || undefined,
          representanteLegal: representanteLegal.trim() || undefined,
          contadorNombre: contadorNombre.trim() || undefined,
          contadorColegiatura: contadorColegiatura.trim() || undefined,
          ejercicio,
          monedaPrincipal
      });
      if (!data.success) {
        throw new Error(data.error || 'Error creando empresa');
      }

      success(`Empresa en blanco creada exitosamente: ${data.data.razonSocial}`);
      onEmpresaCreada(data.data);
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Error al registrar la empresa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Asistente: Registrar Empresa en Blanco</h3>
              <p className="text-xs text-slate-300">
                Inicialización limpia con Plan Contable PCGE 2019/2020 y subdiarios estándar
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* SECCIÓN 1: IDENTIFICACIÓN TRIBUTARIA */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1">
              <FileText className="w-4 h-4 text-indigo-600" />
              1. Identificación Tributaria ante SUNAT
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RUC (11 Dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={ruc}
                  onChange={e => setRuc(e.target.value.replace(/\D/g, ''))}
                  placeholder="20601234567"
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none font-mono ${
                    ruc.length === 11
                      ? (rucValido ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-rose-500 ring-2 ring-rose-100')
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
                {ruc.length === 11 && (
                  <p className={`text-[11px] mt-1 font-medium ${rucValido ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {rucValido ? '✓ RUC válido (Módulo 11)' : '✗ RUC no supera Módulo 11'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Interno
                </label>
                <input
                  type="text"
                  value={codigoEmpresa}
                  onChange={e => setCodigoEmpresa(e.target.value.toUpperCase())}
                  placeholder="EMP01"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Régimen Tributario *
                </label>
                <select
                  value={regimenTributario}
                  onChange={e => setRegimenTributario(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario (RMT)</option>
                  <option value="REGIMEN_GENERAL">Régimen General (RG)</option>
                  <option value="REGIMEN_ESPECIAL">Régimen Especial (RER)</option>
                  <option value="NRUS">Nuevo RUS (NRUS)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  placeholder="COMERCIAL ANDINA DEL PERU S.A.C."
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Comercial
                </label>
                <input
                  type="text"
                  value={nombreComercial}
                  onChange={e => setNombreComercial(e.target.value)}
                  placeholder="ANDINA STORE"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DOMICILIO Y CONTACTO */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1">
              <Building2 className="w-4 h-4 text-indigo-600" />
              2. Domicilio Fiscal y Contacto
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección Fiscal *
              </label>
              <input
                type="text"
                required
                value={domicilioFiscal}
                onChange={e => setDomicilioFiscal(e.target.value)}
                placeholder="Av. República de Panamá 3500, Oficina 402"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto Persona</label>
                <input
                  type="text"
                  value={contactoNombre}
                  onChange={e => setContactoNombre(e.target.value)}
                  placeholder="Juan Perez"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={contactoTelefono}
                  onChange={e => setContactoTelefono(e.target.value)}
                  placeholder="+51 999 888 777"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={contactoEmail}
                  onChange={e => setContactoEmail(e.target.value)}
                  placeholder="contacto@andina.pe"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: REPRESENTANTES Y CONFIGURACIÓN CONTABLE */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              3. Profesionales y Ejercicio Contable
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Representante Legal</label>
                <input
                  type="text"
                  value={representanteLegal}
                  onChange={e => setRepresentanteLegal(e.target.value)}
                  placeholder="Mario Vargas Silva"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contador General</label>
                <input
                  type="text"
                  value={contadorNombre}
                  onChange={e => setContadorNombre(e.target.value)}
                  placeholder="CPC Rosa Medina"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula Colegiatura</label>
                <input
                  type="text"
                  value={contadorColegiatura}
                  onChange={e => setContadorColegiatura(e.target.value)}
                  placeholder="CPC-32451"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ejercicio Activo</label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={ejercicio}
                  onChange={e => setEjercicio(parseInt(e.target.value, 10))}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda Principal</label>
                <select
                  value={monedaPrincipal}
                  onChange={e => setMonedaPrincipal(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="PEN">Soles (PEN S/)</option>
                  <option value="USD">Dólares Americanos (USD $)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !rucValido}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{guardando ? 'Inicializando Empresa...' : 'Crear Empresa en Blanco'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
