import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { RolEstudio } from '../services/authJwtService';
import { periodoService } from '../services/periodoService';
import { requireEmpresaMembership } from './auth';

export interface EmpresaGuardOptions {
  rolesPermitidos?: Array<RolEstudio | string>;
  bloquearPeriodoCerrado?: boolean;
}

export function empresaGuard(options: EmpresaGuardOptions = {}) {
  const membership = requireEmpresaMembership(options.rolesPermitidos);
  return async (req: Request, res: Response, next: NextFunction) => {
    req.empresaId = req.params?.empresaId || req.params?.id || req.empresaId;
    return membership(req, res, async () => {
      try {
        const periodo = req.body?.periodo || req.body?.periodoId || req.query?.periodo;
        if (options.bloquearPeriodoCerrado !== false && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && periodo) {
          const codigo = String(periodo).replace(/^per-/, '');
          const registro = await periodoService.obtenerPorCodigo(req.empresaId!, codigo);
          if (registro && registro.estado !== 'ABIERTO') return errorResponse(res, 'PERIODO_CERRADO', 400);
        }
        return next();
      } catch {
        return errorResponse(res, 'No se pudo verificar el periodo.', 503);
      }
    });
  };
}

export function requireDocumentoEmpresa(obtener: (id: string, empresaId: string) => Promise<any>) {
  const membership = requireEmpresaMembership();
  return async (req: Request, res: Response, next: NextFunction) => {
    return membership(req, res, async () => {
      try {
        const documento = await obtener(String(req.params.id), req.empresaId!);
        if (!documento || (documento.empresaId || documento.empresa_id) !== req.empresaId) {
          return errorResponse(res, 'DOCUMENTO_NO_ENCONTRADO', 404);
        }
        return next();
      } catch {
        return errorResponse(res, 'No se pudo verificar el documento.', 503);
      }
    });
  };
}
