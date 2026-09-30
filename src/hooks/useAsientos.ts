import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { asientosApi, AsientoDto } from '../api/asientosApi';

export function useAsientosList(empresaId: string, filtros: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['asientos', empresaId, filtros],
    queryFn: () => asientosApi.listar(empresaId, filtros),
    enabled: !!empresaId,
    staleTime: 1000 * 30, // 30s
  });
}

export function useAsiento(id?: string) {
  return useQuery<AsientoDto>({
    queryKey: ['asiento', id],
    queryFn: () => asientosApi.obtener(id!),
    enabled: !!id,
  });
}

export function useCrearAsiento(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => asientosApi.crear(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useActualizarAsiento(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => asientosApi.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asiento'] });
    }
  });
}

export function useContabilizarAsiento(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => asientosApi.contabilizar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useAnularAsiento(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => asientosApi.anular(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useDuplicarAsiento(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => asientosApi.duplicar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function usePeriodosList(empresaId: string, anio = 2026) {
  return useQuery({
    queryKey: ['periodos', empresaId, anio],
    queryFn: () => asientosApi.listarPeriodos(empresaId, anio),
    enabled: !!empresaId,
  });
}

export function useCerrarPeriodo(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodoId: string) => asientosApi.cerrarPeriodo(periodoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos', empresaId] });
    }
  });
}

export function useReabrirPeriodo(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodoId, motivo }: { periodoId: string; motivo: string }) => 
      asientosApi.reabrirPeriodo(periodoId, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos', empresaId] });
    }
  });
}

export function useAuditoriaList(empresaId: string) {
  return useQuery({
    queryKey: ['auditoria', empresaId],
    queryFn: () => asientosApi.listarAuditoria(empresaId),
    enabled: !!empresaId,
  });
}
