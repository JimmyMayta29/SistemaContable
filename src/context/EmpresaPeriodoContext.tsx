import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EmpresaCliente } from '../types';
import { useToast } from './ToastContext';
import { authApi } from '../api/authApi';
import { guardarSesion } from '../api/session';

export type RolEmpresa = 'ADMINISTRADOR' | 'CONTADOR' | 'ASISTENTE' | 'AUDITOR';

export interface UsuarioEstudio {
  id: string;
  email: string;
  nombre: string;
  rolGlobal: string;
  estudioNombre: string;
}

export interface TrabajoSegundoPlano {
  id: string;
  empresaId: string;
  empresaNombre: string;
  descripcion: string;
  progreso: number; // 0 a 100
  estado: 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';
  iniciadoEn: string;
}

export interface CruceNavegacionInfo {
  moduloDestino: string;
  filtroOReferencia?: string;
  entidadId?: string;
}

export interface EmpresaPeriodoContextType {
  nivelNavegacion: 'ESTUDIO' | 'EMPRESA';
  empresaActiva: EmpresaCliente | null;
  empresaId: string | null;
  periodo: string;
  setPeriodo: (p: string) => void;
  usuario: UsuarioEstudio;
  rolEnEmpresa: RolEmpresa;
  isPeriodoCerrado: boolean;
  setIsPeriodoCerrado: (cerrado: boolean) => void;
  empresasRecientes: string[];
  isFormDirty: boolean;
  setIsFormDirty: (dirty: boolean) => void;
  empresaPendienteCambio: EmpresaCliente | null;
  setEmpresaPendienteCambio: (empresa: EmpresaCliente | null) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  trabajosSegundoPlano: TrabajoSegundoPlano[];
  agregarTrabajoSegundoPlano: (job: Omit<TrabajoSegundoPlano, 'id' | 'iniciadoEn'>) => string;
  actualizarTrabajoSegundoPlano: (id: string, updates: Partial<TrabajoSegundoPlano>) => void;
  eliminarTrabajoSegundoPlano: (id: string) => void;
  entrarAEmpresa: (empresa: EmpresaCliente, bypassDirtyCheck?: boolean) => Promise<boolean>;
  cambiandoEmpresa: boolean;
  cerrarSesion: () => Promise<void>;
  salirAEmpresas: (force?: boolean) => boolean;
  cruceNavegacion: CruceNavegacionInfo | null;
  navegarCruzado: (moduloDestino: string, filtroOReferencia?: string, entidadId?: string) => void;
  limpiarCruceNavegacion: () => void;
  verificarPermiso: (rolesPermitidos: RolEmpresa[]) => boolean;
  accesoDenegadoEmpresaId: string | null;
  despejarAccesoDenegado: () => void;
}

const EmpresaPeriodoContext = createContext<EmpresaPeriodoContextType | null>(null);

export const EmpresaPeriodoProvider: React.FC<{
  children: React.ReactNode;
  initialEmpresas?: EmpresaCliente[];
  usuario: UsuarioEstudio;
  onCerrarSesion: () => Promise<void>;
}> = ({ children, initialEmpresas = [], usuario, onCerrarSesion }) => {
  const queryClient = useQueryClient();
  const { warning, info, success, error: toastError } = useToast();

  const [cambiandoEmpresa, setCambiandoEmpresa] = useState(false);
  const cambioEnCurso = useRef(false);
  const rutaInicialPendiente = useRef(true);

  // Nivel 1: 'ESTUDIO' (Mis empresas) vs Nivel 2: 'EMPRESA' (Entorno de empresa)
  const [nivelNavegacion, setNivelNavegacion] = useState<'ESTUDIO' | 'EMPRESA'>('ESTUDIO');
  const [empresaActiva, setEmpresaActiva] = useState<EmpresaCliente | null>(null);
  const [periodo, setPeriodoState] = useState<string>('2026-09');
  const [isPeriodoCerrado, setIsPeriodoCerrado] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);
  const [empresaPendienteCambio, setEmpresaPendienteCambio] = useState<EmpresaCliente | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [cruceNavegacion, setCruceNavegacion] = useState<CruceNavegacionInfo | null>(null);
  const [accesoDenegadoEmpresaId, setAccesoDenegadoEmpresaId] = useState<string | null>(null);

  // Rol del usuario en la empresa activa (RBAC por empresa)
  const [rolEnEmpresa, setRolEnEmpresa] = useState<RolEmpresa>('ADMINISTRADOR');

  const [trabajosSegundoPlano, setTrabajosSegundoPlano] = useState<TrabajoSegundoPlano[]>([]);

  const agregarTrabajoSegundoPlano = useCallback((job: Omit<TrabajoSegundoPlano, 'id' | 'iniciadoEn'>) => {
    const id = `job-${Date.now()}`;
    const nuevoTrabajo: TrabajoSegundoPlano = {
      ...job,
      id,
      iniciadoEn: 'Justo ahora'
    };
    setTrabajosSegundoPlano(prev => [nuevoTrabajo, ...prev]);
    return id;
  }, []);

  const actualizarTrabajoSegundoPlano = useCallback((id: string, updates: Partial<TrabajoSegundoPlano>) => {
    setTrabajosSegundoPlano(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  }, []);

  const eliminarTrabajoSegundoPlano = useCallback((id: string) => {
    setTrabajosSegundoPlano(prev => prev.filter(j => j.id !== id));
  }, []);

  // Empresas recientes en localStorage
  const [empresasRecientes, setEmpresasRecientes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sunaconta_empresas_recientes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const agregarARecientes = useCallback((id: string) => {
    setEmpresasRecientes(prev => {
      const filtered = prev.filter(item => item !== id);
      const updated = [id, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('sunaconta_empresas_recientes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Hotkey global Ctrl+K / Cmd+K para abrir buscador instantáneo de empresas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // El servidor autoriza el cambio y emite la sesión de la empresa elegida.
  const entrarAEmpresa = useCallback(async (empresa: EmpresaCliente, bypassDirtyCheck = false): Promise<boolean> => {
    if (isFormDirty && !bypassDirtyCheck) {
      setEmpresaPendienteCambio(empresa);
      warning('Tiene cambios sin guardar en el formulario actual. Guarde o confirme el descarte.', 'Cambios Pendientes');
      return false;
    }
    if (cambioEnCurso.current) return false;
    cambioEnCurso.current = true;
    setCambiandoEmpresa(true);
    try {
      await queryClient.cancelQueries({ predicate: query => query.queryKey[0] !== 'empresas' });
      const sesion = await authApi.seleccionarEmpresa(empresa.id);
      guardarSesion(sesion);
      queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'empresas' });
      const roles: Record<string, RolEmpresa> = {
        ADMINISTRADOR: 'ADMINISTRADOR',
        CONTADOR_SENIOR: 'CONTADOR',
        CONTADOR: 'CONTADOR',
        ASISTENTE_CONTABLE: 'ASISTENTE',
        ASISTENTE: 'ASISTENTE',
        AUDITOR_REVISOR: 'AUDITOR',
        AUDITOR: 'AUDITOR'
      };
      setRolEnEmpresa(roles[sesion.rolEnEmpresa || sesion.usuario.rolGlobal] || 'AUDITOR');
      setEmpresaActiva(empresa);
      setNivelNavegacion('EMPRESA');
      setAccesoDenegadoEmpresaId(null);
      setIsFormDirty(false);
      setEmpresaPendienteCambio(null);
      setCruceNavegacion(null);
      agregarARecientes(empresa.id);
      if (window.location.pathname !== `/e/${empresa.id}`) window.history.pushState({}, '', `/e/${empresa.id}`);
      void queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success(`Entorno operativo conectado: ${empresa.razonSocial}`, 'Empresa Conectada');
      return true;
    } catch (err: any) {
      if (err.response?.status === 403) setAccesoDenegadoEmpresaId(empresa.id);
      toastError(err.message || 'No se pudo cambiar de empresa.', 'Acceso a empresa');
      return false;
    } finally {
      cambioEnCurso.current = false;
      setCambiandoEmpresa(false);
    }
  }, [isFormDirty, queryClient, agregarARecientes, warning, toastError, success]);

  // Salir al selector de empresas (Nivel 1)
  const salirAEmpresas = useCallback((force: boolean = false): boolean => {
    if (isFormDirty && !force) {
      warning('Tiene un formulario con cambios pendientes. Guarde o confirme antes de salir a la cartera.', 'Advertencia');
      return false;
    }

    // Cancelar y limpiar caché
    void queryClient.cancelQueries({ predicate: query => query.queryKey[0] !== 'empresas' });
    queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'empresas' });

    setNivelNavegacion('ESTUDIO');
    setEmpresaActiva(null);
    setCruceNavegacion(null);
    setIsFormDirty(false);
    setEmpresaPendienteCambio(null);

    try {
      if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
    } catch {}

    localStorage.removeItem('sunaconta_empresa_activa_id');
    info('Ha vuelto a la vista general de cartera de empresas.', 'Mis Empresas');
    return true;
  }, [isFormDirty, queryClient, warning, info]);

  // Cambiar período contable
  const setPeriodo = useCallback((nuevoPeriodo: string) => {
    setPeriodoState(nuevoPeriodo);
    setIsPeriodoCerrado(nuevoPeriodo === '2026-08');
  }, []);

  // Navegación Cruzada
  const navegarCruzado = useCallback((moduloDestino: string, filtroOReferencia?: string, entidadId?: string) => {
    setCruceNavegacion({
      moduloDestino,
      filtroOReferencia,
      entidadId
    });
  }, []);

  const limpiarCruceNavegacion = useCallback(() => {
    setCruceNavegacion(null);
  }, []);

  // Verificador de Permisos RBAC
  const verificarPermiso = useCallback((rolesPermitidos: RolEmpresa[]): boolean => {
    if (usuario.rolGlobal === 'ADMINISTRADOR') return true;
    return rolesPermitidos.includes(rolEnEmpresa);
  }, [usuario.rolGlobal, rolEnEmpresa]);

  const despejarAccesoDenegado = useCallback(() => {
    setAccesoDenegadoEmpresaId(null);
  }, []);

  // Listener para popstate (botón atrás/adelante del navegador) y sincronización con URL /e/:empresaId
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/e/')) {
        const idFromUrl = pathname.split('/')[2];
        if (idFromUrl) {
          const emp = initialEmpresas.find(e => e.id === idFromUrl);
          if (emp) {
            void entrarAEmpresa(emp, true);
          } else {
            // URL con empresa desconocida o no autorizada
            salirAEmpresas(true);
          }
        }
      } else {
        salirAEmpresas(true);
      }
    };

    if (rutaInicialPendiente.current) {
      rutaInicialPendiente.current = false;
      if (window.location.pathname.startsWith('/e/')) handlePopState();
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialEmpresas, entrarAEmpresa, salirAEmpresas]);

  return (
    <EmpresaPeriodoContext.Provider
      value={{
        nivelNavegacion,
        empresaActiva,
        empresaId: empresaActiva?.id || null,
        periodo,
        setPeriodo,
        usuario,
        rolEnEmpresa,
        isPeriodoCerrado,
        setIsPeriodoCerrado,
        empresasRecientes,
        isFormDirty,
        setIsFormDirty,
        empresaPendienteCambio,
        setEmpresaPendienteCambio,
        isSearchModalOpen,
        setIsSearchModalOpen,
        trabajosSegundoPlano,
        agregarTrabajoSegundoPlano,
        actualizarTrabajoSegundoPlano,
        eliminarTrabajoSegundoPlano,
        entrarAEmpresa,
        cambiandoEmpresa,
        cerrarSesion: onCerrarSesion,
        salirAEmpresas,
        cruceNavegacion,
        navegarCruzado,
        limpiarCruceNavegacion,
        verificarPermiso,
        accesoDenegadoEmpresaId,
        despejarAccesoDenegado
      }}
    >
      {children}
    </EmpresaPeriodoContext.Provider>
  );
};

export function useEmpresaPeriodo() {
  const context = useContext(EmpresaPeriodoContext);
  if (!context) {
    throw new Error('useEmpresaPeriodo debe utilizarse dentro de un EmpresaPeriodoProvider');
  }
  return context;
}
