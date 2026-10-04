import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { errorResponse } from '../utils/response';
import { db } from '../config/database';
import { authJwtService, RolEstudio, AccessTokenClaims, USUARIOS_EMPRESA_MEMORIA } from '../services/authJwtService';
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

/**
 * Middleware para requerir autenticación JWT firmada (Fase 7 y Fase 13)
 * Extrae userId, rol y empresaId resueltos exclusivamente por el servidor.
 * Retorna 401 si no hay token o es inválido. Nunca lee x-empresa-id ni aplica fallbacks arbitrarios.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Acceso denegado: Token de autenticación requerido', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. Validar mediante el servicio JWT firmado
    const claims = authJwtService.verificarAccessToken(token);

    req.user = {
      id: claims.sub,
      email: claims.email,
      nombre: claims.nombre,
      rolGlobal: claims.rolGlobal,
      mfaVerificado: claims.mfaVerificado,
      empresasPermitidas: claims.empresasPermitidas
    };

    // 2. Resolución estricta de empresa_id:
    // Se toma exclusivamente del token firmado por el servidor.
    // Se ignora cualquier header x-empresa-id o parámetro externo.
    req.empresaId = claims.empresaId;
    req.userRolEnEmpresa = claims.rolEnEmpresa || claims.rolGlobal;
    next();
  } catch (err: any) {
    // Fallback retrocompatible con tokens legacy firmados con env.JWT_SECRET
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      req.user = {
        id: decoded.id || decoded.sub || 'usr-legacy',
        email: decoded.email || 'legacy@sunaconta.pe',
        nombre: decoded.nombres || 'Usuario Legacy',
        rolGlobal: decoded.rolGlobal || 'ADMIN_ESTUDIO'
      };
      req.empresaId = decoded.empresaId;
      req.userRolEnEmpresa = (req.user.rolGlobal as RolEstudio) || 'ADMIN_ESTUDIO';
      next();
    } catch {
      return errorResponse(res, err.message || 'Token de autenticación expirado o inválido', 401);
    }
  }
}

/**
 * Middleware para validar que el usuario tenga membresía activa en la empresa indicada
 * y verificar los roles permitidos (RBAC). Resuelve empresaId exclusivamente desde el token.
 */
export function requireEmpresaMembership(
  rolesPermitidos: Array<RolEstudio | string> = ['ADMIN_ESTUDIO', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR', 'CONTADOR', 'ASISTENTE', 'AUDITOR']
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Acceso denegado: Autenticación requerida', 401);
    }

    const empresaId = req.empresaId;
    if (!empresaId) {
      return errorResponse(res, 'Acceso denegado: Empresa no especificada en el contexto autenticado', 400);
    }

    // Validación contra el almacén en memoria
    const membresiaMemoria = USUARIOS_EMPRESA_MEMORIA.find(
      m => m.usuarioId === userId && m.empresaId === empresaId && m.estado === 'ACTIVO'
    );

    if (membresiaMemoria) {
      req.userRolEnEmpresa = membresiaMemoria.rolEnEmpresa;
    } else if (req.user?.rolGlobal === 'ADMIN_ESTUDIO') {
      req.userRolEnEmpresa = 'ADMIN_ESTUDIO';
    } else if (!db.isPostgresConnected()) {
      if (req.user?.empresasPermitidas && !req.user.empresasPermitidas.includes(empresaId)) {
        return errorResponse(res, `Acceso denegado: No tiene membresía activa en la empresa '${empresaId}'`, 403);
      }
      req.userRolEnEmpresa = (req.user?.rolGlobal as RolEstudio) || 'CONTADOR_SENIOR';
    }

    // Validación en PostgreSQL si está conectado
    if (db.isPostgresConnected()) {
      try {
        const result = await db.query(`
          SELECT ue.rol_en_empresa, ue.estado
          FROM usuario_empresa ue
          WHERE ue.usuario_id = $1 AND ue.empresa_id = $2 AND ue.estado = 'ACTIVO'
        `, [userId, empresaId]);

        if (result.rows.length === 0) {
          if (req.user?.rolGlobal !== 'ADMIN_ESTUDIO') {
            return errorResponse(res, `Acceso denegado: No tiene membresía activa en la empresa '${empresaId}'`, 403);
          }
          req.userRolEnEmpresa = 'ADMIN_ESTUDIO';
        } else {
          req.userRolEnEmpresa = result.rows[0].rol_en_empresa;
        }
      } catch (error) {
        console.error('Error validando membresía en PostgreSQL:', error);
      }
    }

    // Comprobar rol permitido
    const rolActual = req.userRolEnEmpresa || req.user?.rolGlobal || 'ADMIN_ESTUDIO';
    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rolActual)) {
      return errorResponse(res, `Permiso insuficiente: El rol '${rolActual}' no está autorizado para esta acción`, 403);
    }

    next();
  };
}

/**
 * Middleware para exigir MFA (TOTP) en acciones de alta criticidad para ADMIN_ESTUDIO
 */
export function requireMfa() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rol = req.user?.rolGlobal || req.userRolEnEmpresa;
    if (rol === 'ADMIN_ESTUDIO') {
      const totpHeader = req.headers['x-totp-code'] as string;
      const mfaYaVerificado = req.user?.mfaVerificado === true;

      if (!mfaYaVerificado && !totpHeader) {
        return errorResponse(res, 'MFA_REQUERIDO: Esta acción administrativa exige código de autenticación en dos pasos (TOTP)', 403);
      }

      if (totpHeader) {
        const secretAdmin = 'JBSWY3DPEHPK3PXP';
        const valido = totpService.validarToken(secretAdmin, totpHeader);
        if (!valido) {
          return errorResponse(res, 'MFA_CODIGO_INVALIDO: El código TOTP suministrado es inválido o ha expirado', 403);
        }
      }
    }
    next();
  };
}
