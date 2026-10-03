import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  sunatSirePleApi, 
  SunatConexionEstado, 
  SireConciliacionResumen, 
  PleLibroConfig, 
  PleExportacion 
} from '../api/sunatSirePleApi';

// 1. Conexión SUNAT
export function useSunatConexionEstado(empresaId: string) {
  return useQuery({
    queryKey: ['sunatConexionEstado', empresaId],
    queryFn: async () => {
      const data = await sunatSirePleApi.obtenerEstadoConexion(empresaId);
      return data || { configurado: false, estado: 'SIN_CONFIGURAR', modoSimulado: true };
    },
    enabled: Boolean(empresaId)
  });
}

export function useGuardarConexionSunat(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => sunatSirePleApi.guardarConexion(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sunatConexionEstado', empresaId] });
    }
  });
}

export function useValidarConexionSunat(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sunatSirePleApi.validarConexion(empresaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sunatConexionEstado', empresaId] });
    }
  });
}

// 2. Conciliador SIRE
export function useSireConciliacion(empresaId: string, tipo: 'COMPRAS' | 'VENTAS', periodo: string, tolerancia = 0.05) {
  return useQuery({
    queryKey: ['sireConciliacion', empresaId, tipo, periodo, tolerancia],
    queryFn: async () => {
      const data = await sunatSirePleApi.obtenerConciliacion(empresaId, tipo, periodo, tolerancia);
      return data || {
        id: '',
        empresaId,
        tipo,
        periodo,
        fechaConciliacion: new Date().toISOString(),
        totalCoinciden: 0,
        totalSoloSistema: 0,
        totalSoloSunat: 0,
        totalDiferencias: 0,
        lineas: []
      };
    },
    enabled: Boolean(empresaId && periodo)
  });
}

export function useDescargarPropuestaSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, periodo }: { tipo: 'COMPRAS' | 'VENTAS'; periodo: string }) =>
      sunatSirePleApi.descargarPropuesta(empresaId, tipo, periodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
    }
  });
}

export function useAplicarConciliacionSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accion, lineasIds, motivo }: { accion: 'ACEPTAR' | 'OBSERVAR' | 'IGNORAR'; lineasIds: string[]; motivo?: string }) =>
      sunatSirePleApi.aplicarConciliacion(empresaId, accion, lineasIds, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['ventas', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxp', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxc', empresaId] });
    }
  });
}

export function useRevertirLineaSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineaId, motivo }: { lineaId: string; motivo: string }) =>
      sunatSirePleApi.revertirLinea(empresaId, lineaId, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxp', empresaId] });
    }
  });
}

export function useReglasProveedorSire(empresaId: string) {
  return useQuery({
    queryKey: ['sireReglasProveedor', empresaId],
    queryFn: () => sunatSirePleApi.listarReglasProveedor(empresaId),
    enabled: Boolean(empresaId)
  });
}

export function useGuardarReglaProveedorSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (regla: any) => sunatSirePleApi.guardarReglaProveedor(empresaId, regla),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireReglasProveedor', empresaId] });
    }
  });
}

export function useAceptarPropuestaOficialSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { tipo: 'COMPRAS' | 'VENTAS'; periodo: string }) =>
      sunatSirePleApi.aceptarPropuestaOficial(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
    }
  });
}

export function useReemplazarPropuestaOficialSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { tipo: 'COMPRAS' | 'VENTAS'; periodo: string; archivoContenidoTxt?: string }) =>
      sunatSirePleApi.reemplazarPropuestaOficial(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
    }
  });
}

export function useRegistrarAjustePosteriorSire(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { tipo: 'COMPRAS' | 'VENTAS'; periodoAjuste: string; periodoAfectado: string; comprobante: any }) =>
      sunatSirePleApi.registrarAjustePosterior(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sireConciliacion', empresaId] });
    }
  });
}

// 3. XML / CDR
export function useComprobantesXmlList(empresaId: string) {
  return useQuery({
    queryKey: ['comprobantesXml', empresaId],
    queryFn: async () => {
      const data = await sunatSirePleApi.listarComprobantesXml(empresaId);
      return data || [];
    },
    enabled: Boolean(empresaId)
  });
}

export function useImportarComprobantesXml(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archivos: Array<{ nombre: string; contenidoBase64: string }>) =>
      sunatSirePleApi.importarXml(empresaId, archivos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprobantesXml', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['ventas', empresaId] });
    }
  });
}

// 4. PLE 5.2
export function usePleLibrosCatalogo(empresaId: string) {
  return useQuery({
    queryKey: ['pleLibros', empresaId],
    queryFn: async () => {
      const data = await sunatSirePleApi.listarLibrosPle(empresaId);
      return data || [];
    },
    enabled: Boolean(empresaId)
  });
}

export function useExportarPle(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodo, codigoLibro, ruc }: { periodo: string; codigoLibro: string; ruc?: string }) =>
      sunatSirePleApi.exportarPle(empresaId, periodo, codigoLibro, ruc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pleExportaciones', empresaId] });
    }
  });
}
