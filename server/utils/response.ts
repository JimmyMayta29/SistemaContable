import { Response } from 'express';

export function successResponse<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

export function errorResponse(res: Response, error: string | any, statusCode = 400, details?: any) {
  return res.status(statusCode).json({
    success: false,
    error: typeof error === 'string' ? error : error?.message || 'Error interno del servidor',
    details: details !== undefined ? details : (typeof error === 'object' ? error : undefined),
    timestamp: new Date().toISOString()
  });
}
