import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activosKardexApi } from '../api/activosKardexApi';

export function useActivosFijos(empresaId: string) {
  return useQuery({
    queryKey: ['activos-fijos', empresaId],
    queryFn: () => activosKardexApi.listarActivos(empresaId),
    enabled: !!empresaId
  });
}

export function useCalcularDepreciacion(empresaId: string, periodo: string) {
  return useQuery({
    queryKey: ['depreciacion-periodo', empresaId, periodo],
    queryFn: () => activosKardexApi.calcularDepreciacion(empresaId, periodo),
    enabled: !!empresaId && !!periodo
  });
}

export function useGenerarAsientoDepreciacion(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodo: string) => activosKardexApi.generarAsientoDepreciacion(empresaId, periodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activos-fijos'] });
      queryClient.invalidateQueries({ queryKey: ['depreciacion-periodo'] });
      queryClient.invalidateQueries({ queryKey: ['asientos'] });
    }
  });
}

export function useKardexProductos(empresaId: string) {
  return useQuery({
    queryKey: ['kardex-productos', empresaId],
    queryFn: () => activosKardexApi.listarProductos(empresaId),
    enabled: !!empresaId
  });
}

export function useKardexTarjeta(empresaId: string, productoId?: string) {
  return useQuery({
    queryKey: ['kardex-tarjeta', empresaId, productoId],
    queryFn: () => activosKardexApi.obtenerKardexProducto(empresaId, productoId!),
    enabled: !!empresaId && !!productoId
  });
}

export function useRegistrarProductoKardex(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => activosKardexApi.registrarProducto(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kardex-productos'] });
    }
  });
}

export function useRegistrarMovimientoKardex(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => activosKardexApi.registrarMovimiento(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kardex-productos'] });
      queryClient.invalidateQueries({ queryKey: ['kardex-tarjeta'] });
    }
  });
}

export function useGenerarAsientoCostoVentas(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodo: string) => activosKardexApi.generarAsientoCostoVentas(empresaId, periodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kardex-productos'] });
      queryClient.invalidateQueries({ queryKey: ['asientos'] });
    }
  });
}

export function useProrrataIgv(empresaId: string, periodo: string) {
  return useQuery({
    queryKey: ['prorrata-igv', empresaId, periodo],
    queryFn: () => activosKardexApi.calcularProrrata(empresaId, periodo),
    enabled: !!empresaId && !!periodo
  });
}
