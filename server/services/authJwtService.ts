import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { db } from '../config/database';
import { env } from '../config/env';
import { totpService } from './totpService';

export type RolEstudio = 'ADMINISTRADOR' | 'CONTADOR_SENIOR' | 'ASISTENTE_CONTABLE' | 'AUDITOR_REVISOR';

export interface UsuarioEstudioModel {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  rolGlobal: RolEstudio;
  mfaSecret?: string;
  mfaActivado: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface UsuarioEmpresaModel {
  id: string;
  usuarioId: string;
  empresaId: string;
  rolEnEmpresa: RolEstudio;
  estado: 'ACTIVO' | 'INACTIVO' | 'REVOCADO';
  createdAt: string;
}

export interface AccessTokenClaims {
  tokenType: 'access';
  sub: string; // userId
  email: string;
  nombre: string;
  rolGlobal: RolEstudio;
  empresaId: string; // Empresa activa actual
  rolEnEmpresa: RolEstudio;
  mfaVerificado: boolean;
  empresasPermitidas: string[];
}

export interface RefreshTokenModel {
  tokenId: string;
  usuarioId: string;
  empresaId: string;
  expiresAt: number;
  revoked: boolean;
  mfaVerificado: boolean;
}

export interface SesionUsuario {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  usuario: { id: string; email: string; nombre: string; rolGlobal: RolEstudio };
  empresaActivaId: string;
  empresasPermitidas: string[];
  rolEnEmpresa: RolEstudio;
}

// --------------------------------------------------------------------------
// Almacén en Memoria Transaccional para Autenticación y Membresías (Fase 13)
// --------------------------------------------------------------------------
export const USUARIOS_ESTUDIO_MEMORIA: UsuarioEstudioModel[] = [];
export const USUARIOS_EMPRESA_MEMORIA: UsuarioEmpresaModel[] = [];

/**
 * Fixture exclusivo para pruebas automatizadas (Fase 7, 7B, 13)
 * Solo se invoca en contextos de testing, nunca en arranque de producción.
 */
export function sembrarUsuariosPrueba() {
  if (USUARIOS_ESTUDIO_MEMORIA.length > 0) return;
  const HASH_DEFAULT = bcrypt.hashSync('Sunaconta2026!', 8);
  const MFA_SECRET_ADMIN_DEMO = 'JBSWY3DPEHPK3PXP'; // Base32 predeterminado para pruebas

  USUARIOS_ESTUDIO_MEMORIA.push(
    {
      id: 'usr-admin-01',
      email: 'admin@sunaconta.pe',
      passwordHash: HASH_DEFAULT,
      nombre: 'Administrador General',
      rolGlobal: 'ADMINISTRADOR',
      mfaSecret: MFA_SECRET_ADMIN_DEMO,
      mfaActivado: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'usr-contador-01',
      email: 'contador@sunaconta.pe',
      passwordHash: HASH_DEFAULT,
      nombre: 'Contador Senior',
      rolGlobal: 'CONTADOR_SENIOR',
      mfaActivado: false,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'usr-asistente-01',
      email: 'asistente@sunaconta.pe',
      passwordHash: HASH_DEFAULT,
      nombre: 'Asistente Contable',
      rolGlobal: 'ASISTENTE_CONTABLE',
      mfaActivado: false,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'usr-auditor-01',
      email: 'auditor@sunaconta.pe',
      passwordHash: HASH_DEFAULT,
      nombre: 'Auditor Tributario Revisor',
      rolGlobal: 'AUDITOR_REVISOR',
      mfaActivado: false,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  );

  USUARIOS_EMPRESA_MEMORIA.push(
    { id: 'ue-01', usuarioId: 'usr-admin-01', empresaId: 'emp-01', rolEnEmpresa: 'ADMINISTRADOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-02', usuarioId: 'usr-admin-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'ADMINISTRADOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-03', usuarioId: 'usr-admin-01', empresaId: '00000000-0000-0000-0000-000000000002', rolEnEmpresa: 'ADMINISTRADOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-04', usuarioId: 'usr-contador-01', empresaId: 'emp-01', rolEnEmpresa: 'CONTADOR_SENIOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-05', usuarioId: 'usr-contador-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'CONTADOR_SENIOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-06', usuarioId: 'usr-asistente-01', empresaId: 'emp-01', rolEnEmpresa: 'ASISTENTE_CONTABLE', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-07', usuarioId: 'usr-asistente-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'ASISTENTE_CONTABLE', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-08', usuarioId: 'usr-auditor-01', empresaId: 'emp-01', rolEnEmpresa: 'AUDITOR_REVISOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' }
  );
}

export const REFRESH_TOKENS_MEMORIA: RefreshTokenModel[] = [];

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const COLUMNAS_USUARIO = `id, email, password_hash AS "passwordHash", nombre, rol_global AS "rolGlobal",
  mfa_secret AS "mfaSecret", mfa_activado AS "mfaActivado", is_active AS "isActive", created_at AS "createdAt"`;

function consultarControl(sql: string, parametros: any[], client?: PoolClient) {
  return client ? client.query(sql, parametros) : db.query(sql, parametros);
}

function exigirAlmacenDisponible() {
  if (!db.isPostgresConnected() && (env.NODE_ENV !== 'test' || env.DATABASE_URL)) throw new Error('DATABASE_NO_DISPONIBLE');
}

export function normalizarRol(rol: string): RolEstudio {
  const roles: Record<string, RolEstudio> = {
    ADMINISTRADOR: 'ADMINISTRADOR', ADMIN_ESTUDIO: 'ADMINISTRADOR',
    CONTADOR: 'CONTADOR_SENIOR', CONTADOR_SENIOR: 'CONTADOR_SENIOR',
    ASISTENTE: 'ASISTENTE_CONTABLE', ASISTENTE_CONTABLE: 'ASISTENTE_CONTABLE',
    AUDITOR: 'AUDITOR_REVISOR', AUDITOR_REVISOR: 'AUDITOR_REVISOR'
  };
  if (!roles[rol]) throw new Error('ROL_INVALIDO: El usuario no tiene un rol reconocido.');
  return roles[rol];
}

export const authJwtService = {
  ACCESS_EXPIRATION_SECONDS: 15 * 60,
  REFRESH_EXPIRATION_DAYS: 7,

  async obtenerUsuarioPorId(id: string, client?: PoolClient): Promise<UsuarioEstudioModel | null> {
    exigirAlmacenDisponible();
    if (db.isPostgresConnected()) {
      const resultado = await consultarControl(
        `SELECT ${COLUMNAS_USUARIO} FROM usuarios_estudio WHERE id = $1 AND is_active = TRUE`, [id], client
      );
      const usuario = resultado.rows[0];
      return usuario ? { ...usuario, rolGlobal: normalizarRol(usuario.rolGlobal) } : null;
    }
    return USUARIOS_ESTUDIO_MEMORIA.find(u => u.id === id && u.isActive) || null;
  },

  async obtenerMembresias(usuarioId: string, client?: PoolClient): Promise<UsuarioEmpresaModel[]> {
    exigirAlmacenDisponible();
    if (db.isPostgresConnected()) {
      const resultado = await consultarControl(`
        SELECT COALESCE(ue.id, e.id) AS id, u.id AS "usuarioId", e.id AS "empresaId",
               CASE WHEN u.rol_global = 'ADMINISTRADOR' THEN 'ADMINISTRADOR' ELSE ue.rol_en_empresa END AS "rolEnEmpresa",
               'ACTIVO' AS estado, COALESCE(ue.created_at, e.created_at) AS "createdAt"
        FROM empresas e JOIN usuarios_estudio u ON u.id = $1 AND u.is_active = TRUE
        LEFT JOIN usuario_empresa ue ON ue.empresa_id = e.id AND ue.usuario_id = u.id
        WHERE e.is_active = TRUE AND (ue.estado = 'ACTIVO' OR (
          u.rol_global = 'ADMINISTRADOR' AND e.tenant_id = (SELECT tenant_id FROM estudio_configuracion WHERE id = TRUE)
        ))
        ORDER BY COALESCE(ue.created_at, e.created_at), e.id
      `, [usuarioId], client);
      return resultado.rows.map(m => ({ ...m, rolEnEmpresa: normalizarRol(m.rolEnEmpresa) }));
    }
    const membresias = USUARIOS_EMPRESA_MEMORIA.filter(m => m.usuarioId === usuarioId && m.estado === 'ACTIVO');
    if (USUARIOS_ESTUDIO_MEMORIA.some(u => u.id === usuarioId && u.isActive && u.rolGlobal === 'ADMINISTRADOR')) {
      const { empresaRepository } = await import('../repositories/empresaRepository');
      const { setupService } = await import('./setupService');
      const { estudio } = await setupService.obtenerEstadoSetup();
      const empresas = await empresaRepository.listarPorUsuario(usuarioId);
      for (const empresa of empresas.filter(e => e.tenantId === estudio?.tenantId && !membresias.some(m => m.empresaId === e.id))) {
        membresias.push({ id: empresa.id, usuarioId, empresaId: empresa.id, rolEnEmpresa: 'ADMINISTRADOR', estado: 'ACTIVO', createdAt: empresa.createdAt });
      }
      return membresias.map(m => ({ ...m, rolEnEmpresa: 'ADMINISTRADOR' }));
    }
    return membresias;
  },

  async emitirSesion(usuario: UsuarioEstudioModel, mfaVerificado: boolean, empresaPreferencia?: string, client?: PoolClient): Promise<SesionUsuario> {
    const membresias = await this.obtenerMembresias(usuario.id, client);
    if (!membresias.length && usuario.rolGlobal !== 'ADMINISTRADOR') {
      throw new Error('SIN_EMPRESAS_ASIGNADAS: El usuario no tiene empresas asignadas en el estudio contable.');
    }
    const empresasPermitidas = membresias.map(m => m.empresaId);
    const empresaActivaId = empresaPreferencia && empresasPermitidas.includes(empresaPreferencia)
      ? empresaPreferencia : empresasPermitidas[0] || '';
    const rolEnEmpresa = membresias.find(m => m.empresaId === empresaActivaId)?.rolEnEmpresa || usuario.rolGlobal;
    const claims: AccessTokenClaims = {
      tokenType: 'access', sub: usuario.id, email: usuario.email, nombre: usuario.nombre,
      rolGlobal: usuario.rolGlobal, empresaId: empresaActivaId, rolEnEmpresa, mfaVerificado, empresasPermitidas
    };
    const accessToken = jwt.sign(claims, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: this.ACCESS_EXPIRATION_SECONDS });
    const tokenId = crypto.randomUUID();
    const expiresAt = Date.now() + this.REFRESH_EXPIRATION_DAYS * 24 * 3600 * 1000;
    const refreshToken = jwt.sign(
      { tokenType: 'refresh', sub: usuario.id, jti: tokenId, empresaId: empresaActivaId },
      REFRESH_SECRET, { algorithm: 'HS256', expiresIn: `${this.REFRESH_EXPIRATION_DAYS}d` }
    );
    if (db.isPostgresConnected()) {
      await consultarControl(`
        INSERT INTO refresh_tokens (token_id, usuario_id, empresa_id, expires_at, revoked, mfa_verificado)
        VALUES ($1, $2, $3, $4, FALSE, $5)
      `, [tokenId, usuario.id, empresaActivaId, new Date(expiresAt), mfaVerificado], client);
    } else {
      REFRESH_TOKENS_MEMORIA.push({ tokenId, usuarioId: usuario.id, empresaId: empresaActivaId, expiresAt, revoked: false, mfaVerificado });
    }
    return {
      accessToken, refreshToken, expiresIn: this.ACCESS_EXPIRATION_SECONDS,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rolGlobal: usuario.rolGlobal },
      empresaActivaId, empresasPermitidas, rolEnEmpresa
    };
  },

  async login(email: string, passwordPlano: string, totpCode?: string, empresaPreferencia?: string): Promise<SesionUsuario> {
    exigirAlmacenDisponible();
    if (typeof email !== 'string' || typeof passwordPlano !== 'string') throw new Error('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos.');
    const emailNormalizado = email.toLowerCase().trim();
    let usuario: UsuarioEstudioModel | undefined;
    if (db.isPostgresConnected()) {
      const resultado = await db.query(`SELECT ${COLUMNAS_USUARIO} FROM usuarios_estudio WHERE lower(email) = $1 AND is_active = TRUE`, [emailNormalizado]);
      if (resultado.rows[0]) usuario = { ...resultado.rows[0], rolGlobal: normalizarRol(resultado.rows[0].rolGlobal) };
    } else {
      usuario = USUARIOS_ESTUDIO_MEMORIA.find(u => u.email.toLowerCase() === emailNormalizado && u.isActive);
    }
    if (!usuario || !await bcrypt.compare(passwordPlano, usuario.passwordHash)) throw new Error('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos.');
    let mfaVerificado = false;
    if (usuario.rolGlobal === 'ADMINISTRADOR' || usuario.mfaActivado) {
      if (!usuario.mfaSecret) throw new Error('MFA_NO_CONFIGURADO: El usuario requiere configuración inicial de MFA.');
      if (!totpCode) throw new Error('MFA_REQUERIDO: Ingrese código TOTP de 6 dígitos para completar la autenticación.');
      if (!totpService.validarToken(usuario.mfaSecret, totpCode)) throw new Error('MFA_CODIGO_INVALIDO: Código de autenticación TOTP incorrecto o expirado.');
      mfaVerificado = true;
    }
    return this.emitirSesion(usuario, mfaVerificado, empresaPreferencia);
  },

  async cambiarEmpresaActiva(userId: string, nuevaEmpresaId: string, mfaVerificado = false): Promise<SesionUsuario> {
    const usuario = await this.obtenerUsuarioPorId(userId);
    if (!usuario) throw new Error('USUARIO_NO_ENCONTRADO: Usuario no existe o está inactivo.');
    if (!(await this.obtenerMembresias(userId)).some(m => m.empresaId === nuevaEmpresaId)) {
      throw new Error(`ACCESO_DENEGADO_EMPRESA: El usuario no tiene permisos asignados para la empresa '${nuevaEmpresaId}'.`);
    }
    return this.emitirSesion(usuario, mfaVerificado, nuevaEmpresaId);
  },

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    exigirAlmacenDisponible();
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || decoded.tokenType !== 'refresh' || !decoded.sub || !decoded.jti) throw new Error('REFRESH_TOKEN_INVALIDO: Estructura de sesión inválida.');
      let tokenStored: RefreshTokenModel | undefined;
      if (db.isPostgresConnected()) {
        const resultado = await db.query(`
          SELECT token_id AS "tokenId", usuario_id AS "usuarioId", empresa_id AS "empresaId",
                 expires_at AS "expiresAt", revoked, mfa_verificado AS "mfaVerificado"
          FROM refresh_tokens WHERE token_id = $1 AND usuario_id = $2 AND revoked = FALSE
        `, [decoded.jti, decoded.sub]);
        if (resultado.rows[0]) tokenStored = { ...resultado.rows[0], expiresAt: new Date(resultado.rows[0].expiresAt).getTime() };
      } else {
        tokenStored = REFRESH_TOKENS_MEMORIA.find(r => r.tokenId === decoded.jti && r.usuarioId === decoded.sub && !r.revoked);
      }
      if (!tokenStored || tokenStored.expiresAt <= Date.now() || tokenStored.empresaId !== decoded.empresaId) throw new Error('REFRESH_TOKEN_INVALIDO: Sesión expirada o revocada.');
      const usuario = await this.obtenerUsuarioPorId(decoded.sub);
      if (!usuario) throw new Error('USUARIO_INACTIVO: El usuario ha sido dado de baja.');
      const membresias = await this.obtenerMembresias(usuario.id);
      const empresasPermitidas = membresias.map(m => m.empresaId);
      if (tokenStored.empresaId && !empresasPermitidas.includes(tokenStored.empresaId)) throw new Error('REFRESH_TOKEN_INVALIDO: Se ha revocado el acceso a la empresa de esta sesión.');
      if (!tokenStored.empresaId && usuario.rolGlobal !== 'ADMINISTRADOR') throw new Error('SIN_EMPRESAS_ASIGNADAS: El usuario no tiene empresa activa.');
      const rolEnEmpresa = membresias.find(m => m.empresaId === tokenStored.empresaId)?.rolEnEmpresa || usuario.rolGlobal;
      const claims: AccessTokenClaims = {
        tokenType: 'access', sub: usuario.id, email: usuario.email, nombre: usuario.nombre, rolGlobal: usuario.rolGlobal,
        empresaId: tokenStored.empresaId, rolEnEmpresa, mfaVerificado: tokenStored.mfaVerificado, empresasPermitidas
      };
      return {
        accessToken: jwt.sign(claims, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: this.ACCESS_EXPIRATION_SECONDS }),
        expiresIn: this.ACCESS_EXPIRATION_SECONDS
      };
    } catch (err: any) {
      throw new Error(`REFRESH_FALLIDO: ${err.message || 'Token de refresco inválido'}`);
    }
  },

  async revocarRefreshToken(refreshToken: string, usuarioId: string): Promise<void> {
    exigirAlmacenDisponible();
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || decoded.tokenType !== 'refresh' || decoded.sub !== usuarioId || !decoded.jti) throw new Error('REFRESH_TOKEN_INVALIDO: La sesión no pertenece al usuario autenticado.');
    if (db.isPostgresConnected()) {
      await db.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_id = $1 AND usuario_id = $2', [decoded.jti, usuarioId]);
    } else {
      const registro = REFRESH_TOKENS_MEMORIA.find(r => r.tokenId === decoded.jti && r.usuarioId === usuarioId);
      if (registro) registro.revoked = true;
    }
  },

  verificarAccessToken(token: string): AccessTokenClaims {
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || decoded.tokenType !== 'access' || typeof decoded.sub !== 'string' ||
          typeof decoded.email !== 'string' || typeof decoded.nombre !== 'string' ||
          typeof decoded.empresaId !== 'string' || typeof decoded.mfaVerificado !== 'boolean' ||
          !Array.isArray(decoded.empresasPermitidas) || !decoded.empresasPermitidas.every(e => typeof e === 'string')) throw new Error('Estructura de sesión inválida.');
      return { ...decoded, rolGlobal: normalizarRol(decoded.rolGlobal), rolEnEmpresa: normalizarRol(decoded.rolEnEmpresa) } as AccessTokenClaims;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') throw new Error('TOKEN_EXPIRADO: El token de sesión ha expirado.');
      throw new Error('TOKEN_INVALIDO: Firma o estructura de token no válida.');
    }
  },

  validarSegregacionContabilizacion(creadorBorradorId: string, usuarioActualId: string, rolActual: RolEstudio): void {
    if (creadorBorradorId && creadorBorradorId === usuarioActualId) throw new Error('SEGREGACION_FUNCIONES: El usuario que registró el borrador no puede contabilizarlo.');
    if (rolActual === 'ASISTENTE_CONTABLE' || rolActual === 'AUDITOR_REVISOR') throw new Error(`PERMISO_DENEGADO: El rol '${rolActual}' no está autorizado para contabilizar asientos ni comprobantes.`);
  },

  validarCierrePeriodo(usuarioActualId: string, rolActual: RolEstudio, usuariosBorradoresCreados: string[]): void {
    if (rolActual === 'ASISTENTE_CONTABLE' || rolActual === 'AUDITOR_REVISOR') throw new Error(`PERMISO_DENEGADO: El rol '${rolActual}' no puede realizar cierres contables de período.`);
    if (usuariosBorradoresCreados.includes(usuarioActualId)) throw new Error('SEGREGACION_FUNCIONES: Quien registra borradores en el período no puede ejecutar el cierre contable del mismo.');
  },

  verificarTotp(secret: string, code: string): boolean {
    return totpService.validarToken(secret, code);
  }
};
