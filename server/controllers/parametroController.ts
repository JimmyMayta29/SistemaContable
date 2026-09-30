import { Request, Response } from 'express';
import { parametroRepository } from '../repositories/parametroRepository';
import { successResponse, errorResponse } from '../utils/response';

export const parametroController = {
  async listar(req: Request, res: Response) {
    try {
      const parametros = await parametroRepository.obtenerParametros();
      return successResponse(res, parametros);
    } catch (error) {
      return errorResponse(res, 'Error consultando parámetros tributarios');
    }
  },

  async obtenerCronograma(req: Request, res: Response) {
    try {
      const { periodo = '2026-09', digito = '0' } = req.query as { periodo?: string; digito?: string };
      const cronograma = await parametroRepository.obtenerCronograma(periodo, digito);
      return successResponse(res, cronograma);
    } catch (error) {
      return errorResponse(res, 'Error consultando cronograma de vencimientos');
    }
  }
};
