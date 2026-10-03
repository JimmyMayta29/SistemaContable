import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EmpresaCliente } from '../types';
import { useToast } from './ToastContext';

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
  setUsuarioIdDemo: (userId: string) => void;
  rolEnEmpresa: RolEmpresa;
  setRolEnEmpresa: (rol: RolEmpresa) => void;
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
  entrarAEmpresa: (empresa: EmpresaCliente, bypassDirtyCheck?: boolean) => boolean;
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
}> = ({ children, initialEmpresas = [] }) => {
  const queryClient = useQueryClient();
  const { warning, info, success, error: toastError } = useToast();

  const [usuario, setUsuario] = useState<UsuarioEstudio>({
    id: 'usr-admin-01',
    email: 'admin@sunaconta.pe',
    nombre: 'CPC. Carlos Mendoza R.',
    rolGlobal: 'ADMIN_ESTUDIO',
    estudioNombre: 'Mendoza & Asociados — Asesores Tributarios S.C.R.L.'
  });

  const setUsuarioIdDemo = useCallback((userId: string) => {
    if (userId === 'usr-admin-01') {
      setUsuario({
        id: 'usr-admin-01',
        email: 'admin@sunaconta.pe',
        nombre: 'CPC. Carlos Mendoza R.',
        rolGlobal: 'ADMIN_ESTUDIO',
        estudioNombre: 'Mendoza & Asociados — Asesores Tributarios S.C.R.L.'
      });
    } else if (userId === 'usr-contador-01') {
      setUsuario({
        id: 'usr-contador-01',
        email: 'contador@sunaconta.pe',
        nombre: 'CPC. Ana María Morales',
        rolGlobal: 'CONTADOR_SENIOR',
        estudioNombre: 'Mendoza & Asociados — Asesores Tributarios S.C.R.L.'
      });
    } else if (userId === 'usr-asistente-01') {
      setUsuario({
        id: 'usr-asistente-01',
        email: 'asistente@sunaconta.pe',
        nombre: 'Bach. Jorge Valdivia P.',
        rolGlobal: 'ASISTENTE_CONTABLE',
        estudioNombre: 'Mendoza & Asociados — Asesores Tributarios S.C.R.L.'
      });
    } else if (userId === 'usr-auditor-01') {
      setUsuario({
        id: 'usr-auditor-01',
        email: 'auditor@sunaconta.pe',
        nombre: 'Dr. Roberto Sánchez L.',
        rolGlobal: 'AUDITOR_REVISOR',
        estudioNombre: 'Mendoza & Asociados — Asesores Tributarios S.C.R.L.'
      });
    }
  }, []);

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

  // Trabajos en segundo plano con persistencia y visualización transversal
  const [trabajosSegundoPlano, setTrabajosSegundoPlano] = useState<TrabajoSegundoPlano[]>([
    {
      id: 'job-init-1',
      empresaId: 'emp-01',
      empresaNombre: 'Comercializadora Los Andes SAC',
      descripcion: 'Sincronización SIRE RCE / RVIE SUNAT',
      progreso: 100,
      estado: 'COMPLETADO',
      iniciadoEn: 'Hace 5 min'
    }
  ]);

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

  // Entrar a una empresa (Nivel 2) con invalidación completa de caché y cancelación de consultas
  const entrarAEmpresa = useCallback((empresa: EmpresaCliente, bypassDirtyCheck: boolean = false): boolean => {
    if (isFormDirty && !bypassDirtyCheck) {
      setEmpresaPendienteCambio(empresa);
      warning('Tiene cambios sin guardar en el formulario actual. Guarde o confirme el descarte.', 'Cambios Pendientes');
      return false;
    }

    // Verificar permisos del usuario para esta empresa
    // usr-contador-01 y usr-asistente-01 no tienen permiso en Empresa B (00000000-0000-0000-0000-000000000002)
    const empresaId = empresa.id;
    if (
      (usuario.id === 'usr-contador-01' || usuario.id === 'usr-asistente-01') &&
      (empresaId.endsWith('2') || empresaId.includes('0002'))
    ) {
      setAccesoDenegadoEmpresaId(empresaId);
      toastError(`Acceso denegado (403): El usuario no tiene permisos asignados para ${empresa.razonSocial}`, 'Error 403');
      return false;
    }

    // 1. Cancelar todas las consultas en vuelo en TanStack Query
    queryClient.cancelQueries();

    // 2. Limpiar todo el caché de TanStack Query para garantizar cero filtración de datos
    queryClient.clear();

    // 3. Establecer empresa activa
    setEmpresaActiva(empresa);
    setNivelNavegacion('EMPRESA');
    setAccesoDenegadoEmpresaId(null);
    setIsFormDirty(false);
    setEmpresaPendienteCambio(null);
    agregarARecientes(empresa.id);

    // 4. Asignar rol RBAC por empresa según el usuario y empresa
    let rolAsignado: RolEmpresa = 'ADMINISTRADOR';
    if (usuario.id === 'usr-auditor-01') {
      rolAsignado = 'AUDITOR';
    } else if (usuario.id === 'usr-asistente-01') {
      rolAsignado = 'ASISTENTE';
    } else if (usuario.id === 'usr-contador-01') {
      rolAsignado = 'CONTADOR';
    } else {
      // Si es admin, puede tener distintos roles por empresa de demostración
      rolAsignado = empresa.id.endsWith('2') ? 'CONTADOR' : 'ADMINISTRADOR';
    }
    setRolEnEmpresa(rolAsignado);

    // 5. Verificar estado de período
    setIsPeriodoCerrado(periodo === '2026-08');

    // 6. Actualizar URL de navegación amigable /e/:empresaId
    try {
      window.history.pushState({}, '', `/e/${empresa.id}`);
    } catch {}

    localStorage.setItem('sunaconta_empresa_activa_id', empresa.id);
    success(`Entorno operativo conectado: ${empresa.razonSocial}`, 'Empresa Conectada');
    return true;
  }, [isFormDirty, usuario.id, queryClient, agregarARecientes, periodo, warning, toastError, success]);

  // Salir al selector de empresas (Nivel 1)
  const salirAEmpresas = useCallback((force: boolean = false): boolean => {
    if (isFormDirty && !force) {
      warning('Tiene un formulario con cambios pendientes. Guarde o confirme antes de salir a la cartera.', 'Advertencia');
      return false;
    }

    // Cancelar y limpiar caché
    queryClient.cancelQueries();
    queryClient.clear();

    setNivelNavegacion('ESTUDIO');
    setEmpresaActiva(null);
    setCruceNavegacion(null);
    setIsFormDirty(false);
    setEmpresaPendienteCambio(null);

    try {
      window.history.pushState({}, '', '/');
    } catch {}

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
    if (usuario.rolGlobal === 'ADMIN_ESTUDIO') return true;
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
            entrarAEmpresa(emp, true);
          } else {
            // URL con empresa desconocida o no autorizada
            salirAEmpresas(true);
          }
        }
      } else {
        salirAEmpresas(true);
      }
    };

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
        setUsuarioIdDemo,
        rolEnEmpresa,
        setRolEnEmpresa,
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
