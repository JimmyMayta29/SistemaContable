import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tributarioAnualApi } from '../api/tributarioAnualApi';

export function useAuditoriaPreventiva(empresaId: string, anio: number = 2026) {
  return useQuery({
    queryKey: ['auditoria-preventiva', empresaId, anio],
    queryFn: async () => {
      try {
        const res = await tributarioAnualApi.getAuditoriaPreventiva(empresaId, anio);
        return res ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(empresaId)
  });
}

export function useDaotResumen(empresaId: string, anio: number = 2026) {
  return useQuery({
    queryKey: ['daot-resumen', empresaId, anio],
    queryFn: async () => {
      try {
        const res = await tributarioAnualApi.getDaotResumen(empresaId, anio);
        return res ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(empresaId)
  });
}

export function useSimularCierreAnual(empresaId: string, anio: number = 2026) {
  return useQuery({
    queryKey: ['cierre-anual-simular', empresaId, anio],
    queryFn: async () => {
      try {
        const res = await tributarioAnualApi.simularCierreAnual(empresaId, anio);
        return res ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(empresaId)
  });
}

export function useEjecutarCierreAnual(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anio: number = 2026) => tributarioAnualApi.ejecutarCierreAnual(empresaId, anio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos'] });
      queryClient.invalidateQueries({ queryKey: ['cierre-anual-simular'] });
    }
  });
}

export function useRevertirCierreAnual(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anio: number = 2026) => tributarioAnualApi.revertirCierreAnual(empresaId, anio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos'] });
      queryClient.invalidateQueries({ queryKey: ['cierre-anual-simular'] });
    }
  });
}

export function useCalculoDjAnual(empresaId: string, anio: number = 2026, params?: any) {
  return useQuery({
    queryKey: ['dj-anual-calcular', empresaId, anio, params],
    queryFn: async () => {
      try {
        const res = await tributarioAnualApi.calcularDjAnual(empresaId, anio, params);
        return res ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(empresaId)
  });
}
