import { Router, Request, Response } from 'express';
import { authJwtService } from '../services/authJwtService';
import { auditoriaChainService } from '../services/auditoriaChainService';
import { cryptoService } from '../services/cryptoService';
import { requireAuth, requireMfa } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';
import { sireService, CONEXIONES_SUNAT_MEMORIA } from '../services/sireService';

const router = Router();

/**
 * POST /api/auth/login
 * Autenticación de usuario con contraseña, TOTP para ADMIN_ESTUDIO y emisión de JWT
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, totpCode, empresaPreferencia } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'El correo electrónico y la contraseña son obligatorios.', 400);
    }

    const resultado = await authJwtService.login(email, password, totpCode, empresaPreferencia);
    return successResponse(res, resultado, 'Autenticación exitosa.');
  } catch (err: any) {
    const status = err.message.includes('MFA_') ? 403 : err.message.includes('CREDENCIALES_') ? 401 : 400;
    return errorResponse(res, err.message, status);
  }
});

/**
 * POST /api/auth/refresh
 * Renovación de Access Token mediante Refresh Token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 'El refresh token es obligatorio.', 400);
    }

    const resultado = await authJwtService.refreshAccessToken(refreshToken);
    return successResponse(res, resultado, 'Token renovado exitosamente.');
  } catch (err: any) {
    return errorResponse(res, err.message, 401);
  }
});

/**
 * POST /api/auth/seleccionar-empresa
 * Cambia la empresa activa en el servidor y emite nuevo Access Token
 */
router.post('/seleccionar-empresa', requireAuth, async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.body;
    if (!empresaId) {
      return errorResponse(res, 'Debe especificar el identificador de la empresa.', 400);
    }

    const resultado = await authJwtService.cambiarEmpresaActiva(req.user!.id, empresaId);
    return successResponse(res, resultado, `Empresa activa actualizada a '${empresaId}'.`);
  } catch (err: any) {
    return errorResponse(res, err.message, 403);
  }
});

/**
 * GET /api/auth/perfil
 * Retorna los datos del usuario y sus permisos asignados
 */
router.get('/perfil', requireAuth, async (req: Request, res: Response) => {
  return successResponse(res, {
    usuario: req.user,
    empresaActivaId: req.empresaId,
    rolEnEmpresa: req.userRolEnEmpresa
  });
});

/**
 * GET /api/auditoria/verificar-integridad
 * Valida la integridad criptográfica de la cadena de auditoría (Fase 7.5)
 */
router.get('/auditoria/verificar-integridad', requireAuth, async (req: Request, res: Response) => {
  try {
    const empresaId = req.empresaId!;
    const resultado = await auditoriaChainService.verificarIntegridad(empresaId);
    return successResponse(res, resultado, resultado.mensaje);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

/**
 * POST /api/sunat/recifrar-v2
 * Job de migración para recifrar credenciales de v1 a v2 con Envelope Encryption y AAD (Fase 7.4)
 */
router.post('/sunat/recifrar-v2', requireAuth, requireMfa(), async (req: Request, res: Response) => {
  try {
    const empresaId = req.empresaId!;
    const conexion = CONEXIONES_SUNAT_MEMORIA[empresaId];
    if (!conexion) {
      return errorResponse(res, 'No existen credenciales registradas para esta empresa.', 404);
    }

    const reporte = await cryptoService.reencriptarV1aV2(empresaId, {
      usuarioSol: conexion.usuarioSolEncrypted,
      claveSol: conexion.claveSolEncrypted,
      clientId: conexion.clientIdEncrypted,
      clientSecret: conexion.clientSecretEncrypted
    });

    // Actualizar registro en memoria/BD
    if (reporte.resultados.usuarioSol) conexion.usuarioSolEncrypted = reporte.resultados.usuarioSol;
    if (reporte.resultados.claveSol) conexion.claveSolEncrypted = reporte.resultados.claveSol;
    if (reporte.resultados.clientId) conexion.clientIdEncrypted = reporte.resultados.clientId;
    if (reporte.resultados.clientSecret) conexion.clientSecretEncrypted = reporte.resultados.clientSecret;

    return successResponse(res, {
      empresaId,
      migrados: reporte.migrados,
      yaEnV2: reporte.yaEnV2,
      estado: 'COMPLETADO_SIN_DOWNTIME'
    }, 'Credenciales migradas exitosamente a Envelope Encryption v2.');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

/**
 * GET /api/sunat/recomendacion-seguridad
 * Documentación y perfil recomendado para usuario secundario SOL
 */
router.get('/sunat/recomendacion-seguridad', (req: Request, res: Response) => {
  const recomendacion = cryptoService.obtenerRecomendacionSeguridadSol();
  return successResponse(res, recomendacion);
});

export const authRoutes = router;
