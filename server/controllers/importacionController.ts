import { Request, Response } from 'express';
import { importacionService, TipoMaestroImportacion, LOTES_HISTORIAL_MEMORIA } from '../services/importacionService';
import { successResponse, errorResponse } from '../utils/response';

export const importacionController = {
  descargarPlantilla(req: Request, res: Response) {
    try {
      const tipo = (req.params.tipo || '').toUpperCase() as TipoMaestroImportacion;
      const plantilla = importacionService.obtenerPlantillaCsv(tipo);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${plantilla.nombreArchivo}"`);
      return res.send(plantilla.contenidoCsv);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al descargar plantilla');
    }
  },

  async analizar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const { tipoMaestro, contenidoBase64, contenidoTexto } = req.body;

      if (!tipoMaestro) {
        return errorResponse(res, 'Debe especificar el tipo de maestro a importar.');
      }

      let texto = contenidoTexto;
      if (!texto && contenidoBase64) {
        texto = Buffer.from(contenidoBase64, 'base64').toString('utf8');
      }

      if (!texto) {
        return errorResponse(res, 'No se proporcionó contenido del archivo.');
      }

      const resultado = await importacionService.analizarArchivo(empresaId, tipoMaestro as TipoMaestroImportacion, texto);
      return successResponse(res, resultado, 'Archivo analizado exitosamente.');
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al analizar archivo de importación');
    }
  },

  async confirmar(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const { loteId, modo, duplicados } = req.body;
      const userId = (req as any).user?.id || 'usr-admin-01';

      if (!loteId) {
        return errorResponse(res, 'Se requiere el identificador de lote para confirmar.');
      }

      const resultado = await importacionService.confirmarImportacion(
        empresaId,
        loteId,
        {
          modo: modo || 'TODO_O_NADA',
          duplicados: duplicados || 'OMITIR'
        },
        userId
      );

      return successResponse(res, resultado, 'Lote importado con éxito.');
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al confirmar importación');
    }
  },

  async deshacer(req: Request, res: Response) {
    try {
      const { empresaId, loteId } = req.params;
      const userId = (req as any).user?.id || 'usr-admin-01';

      const resultado = await importacionService.deshacerLote(empresaId, loteId, userId);
      return successResponse(res, resultado, resultado.mensaje);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al deshacer lote importado');
    }
  },

  listarHistorial(req: Request, res: Response) {
    try {
      const { empresaId } = req.params;
      const lotes = LOTES_HISTORIAL_MEMORIA.filter(l => l.empresaId === empresaId);
      return successResponse(res, lotes);
    } catch (err: any) {
      return errorResponse(res, err.message || 'Error al listar historial de lotes');
    }
  }
};
