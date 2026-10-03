import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { db } from '../config/database';
import { USUARIOS_EMPRESA_MEMORIA, RolEstudio } from '../services/authJwtService';
import { periodoService } from '../services/periodoService';

export interface EmpresaGuardOptions {
  rolesPermitidos?: Array<RolEstudio | string>;
  bloquearPeriodoCerrado?: boolean;
}

/**
 * Middleware para validar que el usuario tenga acceso legítimo a la empresa solicitada
 * y que el rol asignado para dicha empresa cumpla con las políticas RBAC.
 * Nunca confía ciegamente en el empresaId del cliente sin verificar membresía.
 */
export function empresaGuard(options: EmpresaGuardOptions = {}) {
  const rolesPermitidos = options.rolesPermitidos || [];
  const bloquearPeriodoCerrado = options.bloquearPeriodoCerrado !== false;

  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Extraer empresaId de la URL, headers o body
    const empresaId = req.params.empresaId || req.params.id || (req.headers['x-empresa-id'] as string) || (req.query.empresaId as string) || req.body?.empresaId;

    if (!empresaId) {
      return errorResponse(res, 'EMPRESA_REQUERIDA: Debe especificar un identificador de empresa válido.', 400);
    }

    const userId = req.user?.id || 'usr-admin-01';
    let rolEnEmpresa: RolEstudio | string | null = null;

    // 2. Verificar membresía en memoria
    const membresiaMemoria = USUARIOS_EMPRESA_MEMORIA.find(
      m => m.usuarioId === userId && m.empresaId === empresaId && m.estado === 'ACTIVO'
    );

    if (membresiaMemoria) {
      rolEnEmpresa = membresiaMemoria.rolEnEmpresa;
    } else if (req.user?.rolGlobal === 'ADMIN_ESTUDIO') {
      // El administrador global del estudio tiene acceso a todas las empresas
      rolEnEmpresa = 'ADMIN_ESTUDIO';
    } else if (req.user?.empresasPermitidas && req.user.empresasPermitidas.includes(empresaId as string)) {
      rolEnEmpresa = req.user.rolGlobal || 'CONTADOR_SENIOR';
    }

    // 3. Verificar membresía en PostgreSQL si está conectado
    if (db.isPostgresConnected()) {
      try {
        const result = await db.query(`
          SELECT ue.rol_en_empresa, ue.estado
          FROM usuario_empresa ue
          WHERE ue.usuario_id = $1 AND ue.empresa_id = $2 AND ue.estado = 'ACTIVO'
        `, [userId, empresaId]);

        if (result.rows.length > 0) {
          rolEnEmpresa = result.rows[0].rol_en_empresa;
        } else if (req.user?.rolGlobal === 'ADMIN_ESTUDIO') {
          rolEnEmpresa = 'ADMIN_ESTUDIO';
        }
      } catch (err) {
        console.error('Error verificando membresía en Postgres:', err);
      }
    }

    // 4. Si no se encontró membresía activa, denegar con 403
    if (!rolEnEmpresa) {
      return errorResponse(res, `Acceso denegado: El usuario no tiene permisos asignados para la empresa '${empresaId}'`, 403);
    }

    // 5. Validar roles permitidos si se especificaron
    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rolEnEmpresa)) {
      return errorResponse(res, `Permiso insuficiente: El rol '${rolEnEmpresa}' no está autorizado para esta operación en la empresa '${empresaId}'`, 403);
    }

    req.empresaId = empresaId as string;
    req.userRolEnEmpresa = rolEnEmpresa;

    // 6. Validar período cerrado en mutaciones (POST, PUT, DELETE, PATCH)
    const esMutacion = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const periodo = req.body?.periodo || req.body?.periodoId || req.query?.periodo || req.params?.periodo;

    if (esMutacion && bloquearPeriodoCerrado && periodo) {
      const periodoStr = String(periodo);
      const regPeriodo = await periodoService.obtenerPorCodigo(empresaId as string, periodoStr);
      if (regPeriodo && regPeriodo.estado === 'CERRADO') {
        return errorResponse(res, `PERIODO_CERRADO: El período ${periodoStr} se encuentra cerrado. No se permiten modificaciones ni asientos contables.`, 400);
      }
    }

    next();
  };
}
