import { apiClient } from './client';
import { 
  HojaTrabajo10ColumnasReporte, 
  OpcionesHojaTrabajo10Col, 
  LibroDiarioSISCONTReporte, 
  OpcionesLibroDiarioSISCONT 
} from '../services/siscontReportsEngine';

export const reportesSiscontApi = {
  async getHojaTrabajo10Columnas(
    empresaId: string, 
    periodo: string, 
    opciones?: OpcionesHojaTrabajo10Col
  ): Promise<HojaTrabajo10ColumnasReporte> {
    const params = new URLSearchParams();
    if (periodo) params.set('periodo', periodo);
    if (opciones?.acumuladoAlMes !== undefined) params.set('acumulado', String(opciones.acumuladoAlMes));
    if (opciones?.correctorasActivoEnNegativo !== undefined) params.set('correctorasEnNegativo', String(opciones.correctorasActivoEnNegativo));
    if (opciones?.incluirCierreYAjustes !== undefined) params.set('incluirCierre', String(opciones.incluirCierreYAjustes));

    const res: any = await apiClient.get(`/empresas/${empresaId}/reportes/hoja-trabajo-10-columnas?${params.toString()}`);
    return res && res.data ? res.data : res;
  },

  async getLibroDiarioSISCONT(
    empresaId: string, 
    periodo: string, 
    opciones?: OpcionesLibroDiarioSISCONT
  ): Promise<LibroDiarioSISCONTReporte> {
    const params = new URLSearchParams();
    if (periodo) params.set('periodo', periodo);
    if (opciones?.incluirAjustesYCierre !== undefined) params.set('incluirCierre', String(opciones.incluirAjustesYCierre));
    if (opciones?.formatoFecha) params.set('formatoFecha', opciones.formatoFecha);
    if (opciones?.voucherDesde) params.set('voucherDesde', opciones.voucherDesde);
    if (opciones?.voucherHasta) params.set('voucherHasta', opciones.voucherHasta);

    const res: any = await apiClient.get(`/empresas/${empresaId}/reportes/libro-diario-estructurado?${params.toString()}`);
    return res && res.data ? res.data : res;
  },

  async descargarPle51Diario(empresaId: string, periodo: string): Promise<string> {
    const res: any = await apiClient.get(`/empresas/${empresaId}/reportes/ple-5-1-diario?periodo=${periodo}`, {
      responseType: 'text'
    });
    return typeof res === 'string' ? res : (res?.data || '');
  }
};
