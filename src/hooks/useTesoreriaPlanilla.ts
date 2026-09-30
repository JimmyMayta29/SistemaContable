import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  tesoreriaPlanillaApi,
  CuentaFinancieraApi, 
  MovimientoTesoreriaApi, 
  ReciboHonorarioApi, 
  TrabajadorApi, 
  PlanillaApi 
} from '../api/tesoreriaPlanillaApi';

// Cuentas Financieras
export function useCuentasFinancieras(empresaId: string) {
  return useQuery({
    queryKey: ['cuentasFinancieras', empresaId],
    queryFn: () => tesoreriaPlanillaApi.listarCuentas(empresaId),
    enabled: Boolean(empresaId)
  });
}

export function useCrearCuentaFinanciera(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.crearCuenta(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasFinancieras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['flujoCaja', empresaId] });
    }
  });
}

// Movimientos de Tesorería
export function useMovimientosTesoreria(empresaId: string, params?: any) {
  return useQuery({
    queryKey: ['movimientosTesoreria', empresaId, params],
    queryFn: () => tesoreriaPlanillaApi.listarMovimientos(empresaId, params),
    enabled: Boolean(empresaId)
  });
}

export function useRegistrarMovimientoTesoreria(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.registrarMovimiento(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasFinancieras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorCobrar', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorPagar', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['flujoCaja', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['detracciones', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useAnularMovimientoTesoreria(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => 
      tesoreriaPlanillaApi.anularMovimiento(empresaId, id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasFinancieras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorCobrar', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorPagar', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['flujoCaja', empresaId] });
    }
  });
}

// Transferencias
export function useRegistrarTransferencia(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.registrarTransferencia(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasFinancieras', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['flujoCaja', empresaId] });
    }
  });
}

// Conciliación Bancaria
export function useConciliacionBancaria(empresaId: string, cuentaFinancieraId: string, periodoId: string, fechaCorte?: string) {
  return useQuery({
    queryKey: ['conciliacion', empresaId, cuentaFinancieraId, periodoId, fechaCorte],
    queryFn: () => tesoreriaPlanillaApi.obtenerConciliacion(empresaId, cuentaFinancieraId, periodoId, fechaCorte),
    enabled: Boolean(empresaId && cuentaFinancieraId)
  });
}

export function useImportarExtracto(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.importarExtracto(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliacion', empresaId] });
    }
  });
}

export function useConciliarPartida(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ extractoLineaId, movimientoId }: { extractoLineaId: string; movimientoId: string }) =>
      tesoreriaPlanillaApi.conciliarPartida(empresaId, extractoLineaId, movimientoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliacion', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria', empresaId] });
    }
  });
}

export function useDesconciliarPartida(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (extractoLineaId: string) => tesoreriaPlanillaApi.desconciliarPartida(empresaId, extractoLineaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliacion', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria', empresaId] });
    }
  });
}

export function useCerrarConciliacion(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cuentaFinancieraId, periodoId, fechaCorte }: any) =>
      tesoreriaPlanillaApi.cerrarConciliacion(empresaId, cuentaFinancieraId, periodoId, fechaCorte),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliacion', empresaId] });
    }
  });
}

// Recibos por Honorarios
export function useHonorarios(empresaId: string, params?: any) {
  return useQuery({
    queryKey: ['honorarios', empresaId, params],
    queryFn: () => tesoreriaPlanillaApi.listarHonorarios(empresaId, params),
    enabled: Boolean(empresaId)
  });
}

export function useRegistrarHonorario(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.registrarHonorario(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honorarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorPagar', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useAnularHonorario(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      tesoreriaPlanillaApi.anularHonorario(empresaId, id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['honorarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['cuentasPorPagar', empresaId] });
    }
  });
}

// Trabajadores y Planillas
export function useTrabajadores(empresaId: string) {
  return useQuery({
    queryKey: ['trabajadores', empresaId],
    queryFn: () => tesoreriaPlanillaApi.listarTrabajadores(empresaId),
    enabled: Boolean(empresaId)
  });
}

export function useCrearTrabajador(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: any) => tesoreriaPlanillaApi.crearTrabajador(empresaId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajadores', empresaId] });
    }
  });
}

export function useCalcularPlanilla(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodoId, mes }: { periodoId: string; mes: string }) =>
      tesoreriaPlanillaApi.calcularPlanilla(empresaId, periodoId, mes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planillas', empresaId] });
    }
  });
}

export function useContabilizarPlanilla(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planillaId: string) => tesoreriaPlanillaApi.contabilizarPlanilla(empresaId, planillaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planillas', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['asientos', empresaId] });
    }
  });
}

export function useAnularPlanilla(empresaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planillaId, motivo }: { planillaId: string; motivo: string }) =>
      tesoreriaPlanillaApi.anularPlanilla(empresaId, planillaId, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planillas', empresaId] });
    }
  });
}

export function useExportarPlame(empresaId: string) {
  return useMutation({
    mutationFn: (planillaId: string) => tesoreriaPlanillaApi.exportarPlame(empresaId, planillaId)
  });
}

// Flujo de Caja
export function useFlujoCaja(empresaId: string, desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ['flujoCaja', empresaId, desde, hasta],
    queryFn: () => tesoreriaPlanillaApi.obtenerFlujoCaja(empresaId, desde, hasta),
    enabled: Boolean(empresaId)
  });
}
