import { db } from '../config/database';
import { sireService } from './sireService';
import { xmlImportService } from './xmlImportService';
import { pleExportService } from './pleExportService';
import { cryptoService } from './cryptoService';

export interface SunatJobModel {
  id: string;
  empresaId: string;
  tipoTrabajo: 'DESCARGA_SIRE_COMPRAS' | 'DESCARGA_SIRE_VENTAS' | 'IMPORTACION_XML_LOTE' | 'GENERACION_PLE';
  parametros: any;
  estado: 'EN_COLA' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  progreso: number; // 0 a 100
  reintentos: number;
  maxReintentos: number;
  resultado?: any;
  errorMensaje?: string;
  createdAt: string;
  updatedAt: string;
}

export const SUNAT_JOBS_MEMORIA: SunatJobModel[] = [];

export const sunatJobsService = {
  /**
   * Crea un nuevo trabajo en segundo plano
   */
  crearJob(
    empresaId: string,
    tipoTrabajo: SunatJobModel['tipoTrabajo'],
    parametros: any
  ): SunatJobModel {
    const job: SunatJobModel = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId,
      tipoTrabajo,
      parametros: cryptoService.sanitizarObjeto(parametros),
      estado: 'EN_COLA',
      progreso: 0,
      reintentos: 0,
      maxReintentos: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    SUNAT_JOBS_MEMORIA.push(job);

    // Ejecutar procesamiento asíncrono
    setTimeout(() => {
      this.procesarJob(job.id, 'SISTEMA_JOB_RUNNER').catch(() => {});
    }, 50);

    return job;
  },

  obtenerJob(jobId: string): SunatJobModel | null {
    return SUNAT_JOBS_MEMORIA.find(j => j.id === jobId) || null;
  },

  /**
   * Procesa un trabajo en la cola con reintentos y retroceso exponencial
   */
  async procesarJob(jobId: string, userId: string) {
    const job = this.obtenerJob(jobId);
    if (!job || job.estado === 'COMPLETADO') return;

    job.estado = 'PROCESANDO';
    job.progreso = 25;
    job.updatedAt = new Date().toISOString();

    try {
      if (job.tipoTrabajo === 'DESCARGA_SIRE_COMPRAS') {
        job.progreso = 50;
        const res = await sireService.descargarPropuesta(job.empresaId, 'COMPRAS', job.parametros.periodo, userId);
        job.progreso = 100;
        job.estado = 'COMPLETADO';
        job.resultado = {
          totalRegistros: res.totalRegistros,
          totalImporte: res.totalImporte,
          hash: res.hashArchivo
        };
      } else if (job.tipoTrabajo === 'DESCARGA_SIRE_VENTAS') {
        job.progreso = 50;
        const res = await sireService.descargarPropuesta(job.empresaId, 'VENTAS', job.parametros.periodo, userId);
        job.progreso = 100;
        job.estado = 'COMPLETADO';
        job.resultado = {
          totalRegistros: res.totalRegistros,
          totalImporte: res.totalImporte,
          hash: res.hashArchivo
        };
      } else if (job.tipoTrabajo === 'IMPORTACION_XML_LOTE') {
        job.progreso = 50;
        const archivos = job.parametros.archivos || [];
        const res = await xmlImportService.importarLote(job.empresaId, archivos, userId);
        job.progreso = 100;
        job.estado = 'COMPLETADO';
        job.resultado = res;
      } else if (job.tipoTrabajo === 'GENERACION_PLE') {
        job.progreso = 50;
        const res = await pleExportService.exportarLibro(
          job.empresaId,
          job.parametros.periodo,
          job.parametros.codigoLibro,
          job.parametros.ruc || '20601234567',
          userId
        );
        job.progreso = 100;
        job.estado = 'COMPLETADO';
        job.resultado = {
          exportacionId: res.id,
          nombreArchivo: res.nombreArchivo,
          totalFilas: res.totalFilas,
          hash: res.hashSha256,
          esOficial: res.esOficial
        };
      }
    } catch (err: any) {
      job.reintentos++;
      const sanitizado = cryptoService.sanitizarError(err.message);
      if (job.reintentos < job.maxReintentos) {
        job.estado = 'EN_COLA';
        job.errorMensaje = `Reintento ${job.reintentos}/${job.maxReintentos}: ${sanitizado}`;
        const backoffMs = Math.pow(2, job.reintentos) * 1000;
        setTimeout(() => {
          this.procesarJob(jobId, userId).catch(() => {});
        }, backoffMs);
      } else {
        job.estado = 'ERROR';
        job.errorMensaje = sanitizado;
      }
    } finally {
      job.updatedAt = new Date().toISOString();
    }
  }
};
