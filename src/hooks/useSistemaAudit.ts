import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sistemaAuditApi, SistemaAuditMapa, SistemaDiagnosticoResult } from '../api/sistemaAuditApi';

export function useSistemaMapa() {
  return useQuery<SistemaAuditMapa>({
    queryKey: ['sistema', 'mapa'],
    queryFn: () => sistemaAuditApi.obtenerMapa(),
    staleTime: 1000 * 60 * 10 // 10 min
  });
}

export function useSistemaDiagnostico(empresaId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<SistemaDiagnosticoResult>({
    queryKey: ['sistema', 'diagnostico', empresaId],
    queryFn: () => sistemaAuditApi.ejecutarDiagnostico(empresaId),
    enabled: !!empresaId,
    staleTime: 1000 * 60 * 2 // 2 min
  });

  const refetchMutation = useMutation({
    mutationFn: () => sistemaAuditApi.ejecutarDiagnostico(empresaId),
    onSuccess: (data) => {
      queryClient.setQueryData(['sistema', 'diagnostico', empresaId], data);
    }
  });

  return {
    ...query,
    ejecutarDiagnostico: refetchMutation.mutate,
    isDiagnosticoLoading: refetchMutation.isPending || query.isFetching
  };
}
