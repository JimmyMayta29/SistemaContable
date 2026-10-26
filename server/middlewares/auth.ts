import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { authJwtService, RolEstudio } from '../services/authJwtService';
import { totpService } from '../services/totpService';

export interface AuthUser {
  id: string;
  email: string;
  tenantId?: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  rolGlobal?: RolEstudio | string;
  mfaVerificado?: boolean;
  empresasPermitidas?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      empresaId?: string;
      userRolEnEmpresa?: RolEstudio | string;
    }
  }
}

export const ROLES_ESCRITURA: RolEstudio[] = ['ADMINISTRADOR', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE'];
export const ROLES_LECTURA: RolEstudio[] = [...ROLES_ESCRITURA, 'AUDITOR_REVISOR'];

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
  try {
    const claims = authJwtService.verificarAccessToken(header.slice(7));
    const usuario = await authJwtService.obtenerUsuarioPorId(claims.sub);
    if (!usuario?.isActive) return errorResponse(res, 'SESION_INVALIDA', 401);
    req.user = {
      id: usuario.id, email: usuario.email, nombre: usuario.nombre,
      rolGlobal: usuario.rolGlobal, mfaVerificado: claims.mfaVerificado,
      empresasPermitidas: claims.empresasPermitidas
    };
    req.empresaId = claims.empresaId;
    req.userRolEnEmpresa = undefined;
    return next();
  } catch {
    return errorResponse(res, 'SESION_INVALIDA: Inicie sesión de nuevo.', 401);
  }
}

export function requireRol(roles: Array<RolEstudio | string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
    if (!roles.includes(req.user.rolGlobal!)) return errorResponse(res, 'PERMISO_INSUFICIENTE', 403);
    return next();
  };
}

export function requireEmpresaMembership(rolesPermitidos?: Array<RolEstudio | string>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
    const rutaEmpresa = req.route?.path?.startsWith('/empresas/') || req.baseUrl?.endsWith('/empresas');
    const empresaId = req.params?.empresaId || (rutaEmpresa ? req.params?.id : undefined) || req.empresaId;
    if (!empresaId) return errorResponse(res, 'EMPRESA_REQUERIDA', 400);
    try {
      const membresias = await authJwtService.obtenerMembresias(req.user.id);
      const rol = membresias.find(m => m.empresaId === empresaId && m.estado === 'ACTIVO')?.rolEnEmpresa;
      const esLectura = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      const permitidos = rolesPermitidos ?? (esLectura ? ROLES_LECTURA : ROLES_ESCRITURA);
      if (!rol || !permitidos.includes(rol)) return errorResponse(res, 'PERMISO_INSUFICIENTE', 403);
      req.empresaId = String(empresaId);
      req.userRolEnEmpresa = rol;
      return next();
    } catch {
      return errorResponse(res, 'No se pudo verificar el acceso a la empresa.', 503);
    }
  };
}

export function requireMfa() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
    if (req.user.rolGlobal !== 'ADMINISTRADOR') return errorResponse(res, 'PERMISO_INSUFICIENTE', 403);
    const codigo = req.headers['x-totp-code'];
    if (!codigo && req.user.mfaVerificado) return next();
    try {
      const usuario = await authJwtService.obtenerUsuarioPorId(req.user.id);
      if (typeof codigo !== 'string' || !usuario?.mfaSecret || !totpService.validarToken(usuario.mfaSecret, codigo)) {
        return errorResponse(res, 'MFA_CODIGO_INVALIDO', 403);
      }
      return next();
    } catch {
      return errorResponse(res, 'No se pudo verificar el segundo factor.', 503);
    }
  };
}
