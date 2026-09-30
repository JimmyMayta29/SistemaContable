import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/response';

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(res, {
          message: 'Error de validación en los datos de entrada',
          issues: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }))
        }, 422);
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(res, {
          message: 'Parámetros de consulta no válidos',
          issues: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }))
        }, 422);
      }
      next(error);
    }
  };
}
