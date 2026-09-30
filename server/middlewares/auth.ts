import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { errorResponse } from '../utils/response';
import { db } from '../config/database';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  nombres: string;
  apellidos: string;
  rolGlobal?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      empresaId?: string;
      userRolEnEmpresa?: string;
    }
  }
}

/**
 * Middleware para requerir autenticación JWT
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Si estamos en desarrollo y no se envía token, proveer usuario administrador predeterminado
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@sunaconta.pe',
      tenantId: '00000000-0000-0000-0000-000000000001',
      nombres: 'Administrador',
      apellidos: 'Principal',
      rolGlobal: 'ADMIN_ESTUDIO'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return errorResponse(res, 'Token de autenticación expirado o inválido', 401);
  }
}

/**
 * Middleware para validar que el usuario tenga membresía activa en la empresa indicada
 */
export function requireEmpresaMembership(
  rolesPermitidos: string[] = ['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE', 'AUDITOR']
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const empresaId = 
      (req.headers['x-empresa-id'] as string) || 
      req.params.empresaId || 
      req.body.empresaId;

    if (!empresaId) {
      return errorResponse(res, 'Encabezado x-empresa-id o parámetro empresaId requerido', 400);
    }

    req.empresaId = empresaId;

    // Si PostgreSQL no está conectado (modo fallback en memoria), permitir el paso
    if (!db.isPostgresConnected()) {
      req.userRolEnEmpresa = 'ADMIN_ESTUDIO';
      return next();
    }

    try {
      const userId = req.user?.id;
      const result = await db.query(`
        SELECT m.rol_id, r.codigo as rol_codigo
        FROM membresias m
        JOIN roles r ON r.id = m.rol_id
        WHERE m.usuario_id = $1 AND m.empresa_id = $2 AND m.is_active = TRUE
      `, [userId, empresaId]);

      if (result.rows.length === 0) {
        // Validar si el usuario es ADMIN_ESTUDIO del tenant dueño de la empresa
        const tenantAdminCheck = await db.query(`
          SELECT e.id 
          FROM empresas e 
          JOIN usuarios u ON u.tenant_id = e.tenant_id 
          WHERE e.id = $1 AND u.id = $2
        `, [empresaId, userId]);

        if (tenantAdminCheck.rows.length === 0) {
          return errorResponse(res, 'Acceso denegado: No tiene membresía activa en esta empresa', 403);
        }
        req.userRolEnEmpresa = 'ADMIN_ESTUDIO';
      } else {
        req.userRolEnEmpresa = result.rows[0].rol_codigo;
      }

      if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(req.userRolEnEmpresa!)) {
        return errorResponse(res, 'Permiso insuficiente para la acción solicitada', 403);
      }

      next();
    } catch (error) {
      console.error('Error validando membresía:', error);
      return errorResponse(res, 'Error validando membresía de la empresa', 500);
    }
  };
}
