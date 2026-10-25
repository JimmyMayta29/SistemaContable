import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionesApi, ParametrosBusqueda } from '../api/operacionesApi';

// ----------------------------------------------------------------------------
// COMPRAS (RCE)
// ----------------------------------------------------------------------------
export function useComprasList(empresaId: string, params?: ParametrosBusqueda) {
  return useQuery({
    queryKey: ['compras', empresaId, params],
    queryFn: () => operacionesApi.listarCompras(empresaId, params),
    enabled: !!empresaId,
  });
}

export function useRegistroComprasLibro(empresaId: string, periodo: string) {
  return useQuery({
    queryKey: ['registro_compras_libro', empresaId, periodo],
    queryFn: () => operacionesApi.obtenerRegistroCompras(empresaId, periodo),
    enabled: !!empresaId && !!periodo,
  });
}

export function useCrearCompra(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => operacionesApi.crearCompra(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['registro_compras_libro', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxp', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['detracciones', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['liquidacion_igv', empresaId] });
    }
  });
}

export function useAnularCompra(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => operacionesApi.anularCompra(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['registro_compras_libro', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxp', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['liquidacion_igv', empresaId] });
    }
  });
}

export function useDuplicarCompra(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => operacionesApi.duplicarCompra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
    }
  });
}

// ----------------------------------------------------------------------------
// VENTAS (RVIE)
// ----------------------------------------------------------------------------
export function useVentasList(empresaId: string, params?: ParametrosBusqueda) {
  return useQuery({
    queryKey: ['ventas', empresaId, params],
    queryFn: () => operacionesApi.listarVentas(empresaId, params),
    enabled: !!empresaId,
  });
}

export function useRegistroVentasLibro(empresaId: string, periodo: string) {
  return useQuery({
    queryKey: ['registro_ventas_libro', empresaId, periodo],
    queryFn: () => operacionesApi.obtenerRegistroVentas(empresaId, periodo),
    enabled: !!empresaId && !!periodo,
  });
}

export function useCrearVenta(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => operacionesApi.crearVenta(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['registro_ventas_libro', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxc', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['liquidacion_igv', empresaId] });
    }
  });
}

export function useAnularVenta(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => operacionesApi.anularVenta(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['registro_ventas_libro', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cxc', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['liquidacion_igv', empresaId] });
    }
  });
}

export function useDuplicarVenta(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => operacionesApi.duplicarVenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas', empresaId] });
    }
  });
}

// ----------------------------------------------------------------------------
// CARTERA CxP / CxC & APLICACIONES
// ----------------------------------------------------------------------------
export function useCuentasPorPagar(empresaId: string, filtros?: any) {
  return useQuery({
    queryKey: ['cxp', empresaId, filtros],
    queryFn: () => operacionesApi.listarCxP(empresaId, filtros),
    enabled: !!empresaId,
  });
}

export function useCuentasPorCobrar(empresaId: string, filtros?: any) {
  return useQuery({
    queryKey: ['cxc', empresaId, filtros],
    queryFn: () => operacionesApi.listarCxC(empresaId, filtros),
    enabled: !!empresaId,
  });
}

export function useAntiguedadSaldos(empresaId: string, tipo: 'CXP' | 'CXC', fechaCorte?: string) {
  return useQuery({
    queryKey: ['antiguedad_saldos', empresaId, tipo, fechaCorte],
    queryFn: () => operacionesApi.reporteAntiguedad(empresaId, tipo, fechaCorte),
    enabled: !!empresaId,
  });
}

export function useEstadoCuenta(empresaId: string, anexoId: string, tipo: 'PROVEEDOR' | 'CLIENTE') {
  return useQuery({
    queryKey: ['estado_cuenta', empresaId, anexoId, tipo],
    queryFn: () => operacionesApi.obtenerEstadoCuenta(empresaId, anexoId, tipo),
    enabled: !!empresaId && !!anexoId,
  });
}

export function useAplicarPago(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => operacionesApi.aplicarPago(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cxp', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['antiguedad_saldos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['estado_cuenta', empresaId] });
    }
  });
}

export function useAplicarCobranza(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => operacionesApi.aplicarCobranza(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cxc', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['antiguedad_saldos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['estado_cuenta', empresaId] });
    }
  });
}

// ----------------------------------------------------------------------------
// ANEXOS
// ----------------------------------------------------------------------------
export function useAnexosList(empresaId: string, query?: string, tipoEntidad?: string) {
  return useQuery({
    queryKey: ['anexos', empresaId, query, tipoEntidad],
    queryFn: () => operacionesApi.listarAnexos(empresaId, query, tipoEntidad),
    enabled: !!empresaId,
  });
}

export function useCrearAnexo(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => operacionesApi.crearAnexo(empresaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', empresaId] });
    }
  });
}

export function useConsultarRuc(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruc, tipoEntidad, forzar }: { ruc: string; tipoEntidad?: 'PROVEEDOR' | 'CLIENTE' | 'AMBOS'; forzar?: boolean }) =>
      operacionesApi.consultarRuc(empresaId, ruc, tipoEntidad, forzar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', empresaId] });
    }
  });
}

// ----------------------------------------------------------------------------
// DETRACCIONES SPOT
// ----------------------------------------------------------------------------
export function useDetraccionesList(empresaId: string) {
  return useQuery({
    queryKey: ['detracciones', empresaId],
    queryFn: () => operacionesApi.listarDetracciones(empresaId),
    enabled: !!empresaId,
  });
}

export function useRegistrarDepositoDetraccion(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ detraccionId, data }: { detraccionId: string; data: { numeroConstancia: string; fechaDeposito: string } }) => 
      operacionesApi.registrarDepositoDetraccion(detraccionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detracciones', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['liquidacion_igv', empresaId] });
    }
  });
}

// ----------------------------------------------------------------------------
// LIQUIDACIÓN TRIBUTARIA
// ----------------------------------------------------------------------------
export function useLiquidacionIGV(empresaId: string, periodo: string, saldoAnterior = 0) {
  return useQuery({
    queryKey: ['liquidacion_igv', empresaId, periodo, saldoAnterior],
    queryFn: () => operacionesApi.liquidarIGV(empresaId, periodo, saldoAnterior),
    enabled: !!empresaId,
  });
}
