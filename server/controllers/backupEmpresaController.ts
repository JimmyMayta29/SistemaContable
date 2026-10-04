import { Request, Response } from 'express';
import { backupEmpresaService, OrigenBackup } from '../services/backupEmpresaService';
import { successResponse, errorResponse } from '../utils/response';

export const backupEmpresaController = {
  listar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const backups = backupEmpresaService.listarBackupsEmpresa(empresaId);
      return successResponse(res, backups);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al listar respaldos');
    }
  },

  async generar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const { origen, passwordCifrado } = req.body;
      const userId = (req as any).user?.id || 'usr-admin-01';

      const backup = await backupEmpresaService.generarBackupZip(
        empresaId,
        (origen as OrigenBackup) || 'MANUAL',
        userId,
        passwordCifrado
      );

      const { archivoZipBuffer, ...metadata } = backup;
      return successResponse(res, metadata, 'Respaldo ZIP generado y cifrado exitosamente.', 201);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error generando respaldo de empresa');
    }
  },

  async autoCheck(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const userId = (req as any).user?.id || 'usr-admin-01';
      const disparado = await backupEmpresaService.verificarYDispararAutoBackup(empresaId, userId);
      return successResponse(res, { autoBackupEjecutado: disparado });
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error en verificación de backup automático');
    }
  },

  descargar(req: Request, res: Response) {
    try {
      const { empresaId, backupId } = req.params;
      const item = backupEmpresaService.obtenerBackupParaDescarga(empresaId, backupId);
      if (!item || !item.archivoZipBuffer) {
        return errorResponse(res, 'El archivo de respaldo solicitado no fue encontrado.', 404);
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${item.nombreArchivo}"`);
      return res.send(item.archivoZipBuffer);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al descargar respaldo');
    }
  },

  async verificar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const { backupId, archivoBase64, passwordCifrado } = req.body;

      let buffer: Buffer | null = null;
      if (archivoBase64) {
        buffer = Buffer.from(archivoBase64, 'base64');
      } else if (backupId) {
        const item = backupEmpresaService.obtenerBackupParaDescarga(empresaId, backupId);
        if (item && item.archivoZipBuffer) buffer = item.archivoZipBuffer;
      }

      if (!buffer) {
        return errorResponse(res, 'Debe adjuntar el archivo o indicar el ID del backup a verificar.');
      }

      const resultado = backupEmpresaService.verificarIntegridadBackup(buffer, passwordCifrado);
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error verificando integridad del respaldo');
    }
  },

  async restaurar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const { backupId, archivoBase64, confirmacionRuc, passwordCifrado } = req.body;
      const userId = (req as any).user?.id || 'usr-admin-01';

      if (!confirmacionRuc) {
        return errorResponse(res, 'Debe escribir el RUC de la empresa para confirmar la restauración.');
      }

      let buffer: Buffer | null = null;
      if (archivoBase64) {
        buffer = Buffer.from(archivoBase64, 'base64');
      } else if (backupId) {
        const item = backupEmpresaService.obtenerBackupParaDescarga(empresaId, backupId);
        if (item && item.archivoZipBuffer) buffer = item.archivoZipBuffer;
      }

      if (!buffer) {
        return errorResponse(res, 'No se proporcionó el archivo ni el ID del respaldo a restaurar.');
      }

      const resultado = await backupEmpresaService.restaurarBackup(
        empresaId,
        buffer,
        confirmacionRuc,
        userId,
        passwordCifrado
      );

      return successResponse(res, resultado, resultado.mensaje);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al restaurar respaldo');
    }
  }
};
