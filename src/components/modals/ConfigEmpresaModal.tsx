import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { EmpresaCliente } from '../../types';

interface ConfigEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaCliente;
  onSave: (updated: Partial<EmpresaCliente>) => void;
}

export const ConfigEmpresaModal: React.FC<ConfigEmpresaModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onSave
}) => {
  const [ruc, setRuc] = useState(empresa.ruc);
  const [razonSocial, setRazonSocial] = useState(empresa.razonSocial);
  const [direccionFiscal, setDireccionFiscal] = useState(empresa.direccionFiscal);
  const [contactoNombre, setContactoNombre] = useState(empresa.contactoNombre);
  const [contactoTelefono, setContactoTelefono] = useState(empresa.contactoTelefono);
  const [contactoEmail, setContactoEmail] = useState(empresa.contactoEmail);
  const [regimen, setRegimen] = useState(empresa.regimenTributario);
  const [tasaRenta, setTasaRenta] = useState(empresa.tasaRentaMensual * 100);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ruc,
      razonSocial,
      direccionFiscal,
      contactoNombre,
      contactoTelefono,
      contactoEmail,
      regimenTributario: regimen,
      tasaRentaMensual: tasaRenta / 100,
      ultimoDigitoRuc: ruc.slice(-1)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Configuración de Empresa Activa</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">RUC:</label>
            <input
              type="text"
              value={ruc}
              maxLength={11}
              onChange={(e) => setRuc(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Razón Social:</label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Dirección Fiscal:</label>
            <input
              type="text"
              value={direccionFiscal}
              onChange={(e) => setDireccionFiscal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contacto Principal:</label>
              <input
                type="text"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Teléfono / WhatsApp:</label>
              <input
                type="text"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Régimen Tributario:</label>
              <select
                value={regimen}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setRegimen(val);
                  if (val === 'MYPE_TRIBUTARIO') setTasaRenta(1.0);
                  if (val === 'REGIMEN_GENERAL') setTasaRenta(1.5);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 cursor-pointer"
              >
                <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario (1% Renta)</option>
                <option value="REGIMEN_GENERAL">Régimen General (1.5% Renta)</option>
                <option value="REGIMEN_ESPECIAL">Régimen Especial (1.5% Renta)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tasa Renta Mensual (%):</label>
              <input
                type="number"
                step="0.1"
                value={tasaRenta}
                onChange={(e) => setTasaRenta(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
