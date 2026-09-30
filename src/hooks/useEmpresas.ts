import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empresasApi, ParametroTributarioDto } from '../api/empresasApi';
import { EmpresaCliente } from '../types';

export function useEmpresas() {
  return useQuery<EmpresaCliente[]>({
    queryKey: ['empresas'],
    queryFn: () => empresasApi.listar(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useParametrosTributarios() {
  return useQuery<ParametroTributarioDto[]>({
    queryKey: ['parametros_tributarios'],
    queryFn: () => empresasApi.listarParametros(),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useCrearEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nuevaEmpresa: Partial<EmpresaCliente>) => empresasApi.crear(nuevaEmpresa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    }
  });
}

export function useMigrarLocalStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => empresasApi.migrarLocalStorage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    }
  });
}
