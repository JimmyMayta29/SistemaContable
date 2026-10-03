import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Clock, CheckCircle2, ArrowRight, X, Shield } from 'lucide-react';
import { EmpresaCliente } from '../../types';
import { useEmpresaPeriodo } from '../../context/EmpresaPeriodoContext';

interface SearchEmpresasModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresas: EmpresaCliente[];
}

export const SearchEmpresasModal: React.FC<SearchEmpresasModalProps> = ({
  isOpen,
  onClose,
  empresas
}) => {
  const { entrarAEmpresa, empresaActiva, empresasRecientes } = useEmpresaPeriodo();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEmpresas = empresas.filter(e => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      e.razonSocial.toLowerCase().includes(q) ||
      e.ruc.includes(q) ||
      e.regimenTributario.toLowerCase().includes(q) ||
      e.contactoNombre?.toLowerCase().includes(q)
    );
  });

  const empresasRecientesList = empresasRecientes
    .map(id => empresas.find(e => e.id === id))
    .filter((e): e is EmpresaCliente => Boolean(e));

  const handleSelect = (empresa: EmpresaCliente) => {
    entrarAEmpresa(empresa);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa por RUC, razón social o régimen... (ESC para cerrar)"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-hidden font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 text-xs">
          {/* Recientes Section (if no query or query matches) */}
          {!query && empresasRecientesList.length > 0 && (
            <div className="p-3 bg-slate-50/50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                Empresas Recientes
              </div>
              <div className="space-y-1 mt-1">
                {empresasRecientesList.map((emp) => {
                  const isActive = empresaActiva?.id === emp.id;
                  return (
                    <button
                      key={`recent-${emp.id}`}
                      onClick={() => handleSelect(emp)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.ultimoDigitoRuc || emp.ruc.slice(-1)}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs truncate flex items-center gap-2">
                            {emp.razonSocial}
                            {isActive && (
                              <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] rounded font-semibold">
                                Activa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            RUC: {emp.ruc} • {emp.regimenTributario.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Todas las empresas encontradas */}
          <div className="p-3">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{query ? `Resultados (${filteredEmpresas.length})` : `Todas las Empresas (${empresas.length})`}</span>
              <span className="text-[9px] text-slate-400">Ctrl+K / Cmd+K</span>
            </div>

            {filteredEmpresas.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="font-semibold text-slate-600">No se encontraron empresas</p>
                <p className="text-[11px] mt-0.5">Intente buscar con otro RUC o razón social.</p>
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {filteredEmpresas.map((emp) => {
                  const isActive = empresaActiva?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/70 border border-blue-200 text-blue-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.ultimoDigitoRuc || emp.ruc.slice(-1)}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-2">
                            {emp.razonSocial}
                            {isActive && (
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-bold border border-blue-200">
                                Empresa actual
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                            <span>RUC: {emp.ruc}</span>
                            <span>•</span>
                            <span className="font-sans text-slate-400">{emp.regimenTributario.replace('_', ' ')}</span>
                            <span>•</span>
                            <span className="text-amber-700 font-sans">Vence: {emp.vencimientoPdt621}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg border border-slate-200">
                          {isActive ? 'En uso' : 'Entrar →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Presione <kbd className="px-1 bg-white border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> para seleccionar</span>
            <span><kbd className="px-1 bg-white border border-slate-200 rounded text-slate-600 font-mono">Esc</kbd> para salir</span>
          </div>
          <span className="font-medium text-blue-600">Aislamiento por Empresa Activo</span>
        </div>
      </div>
    </div>
  );
};
