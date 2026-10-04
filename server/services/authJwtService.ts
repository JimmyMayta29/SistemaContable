import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { env } from '../config/env';
import { totpService } from './totpService';

export type RolEstudio = 'ADMIN_ESTUDIO' | 'CONTADOR_SENIOR' | 'ASISTENTE_CONTABLE' | 'AUDITOR_REVISOR';

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
      rolGlobal: 'ADMIN_ESTUDIO',
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
    { id: 'ue-01', usuarioId: 'usr-admin-01', empresaId: 'emp-01', rolEnEmpresa: 'ADMIN_ESTUDIO', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-02', usuarioId: 'usr-admin-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'ADMIN_ESTUDIO', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-03', usuarioId: 'usr-admin-01', empresaId: '00000000-0000-0000-0000-000000000002', rolEnEmpresa: 'ADMIN_ESTUDIO', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-04', usuarioId: 'usr-contador-01', empresaId: 'emp-01', rolEnEmpresa: 'CONTADOR_SENIOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-05', usuarioId: 'usr-contador-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'CONTADOR_SENIOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-06', usuarioId: 'usr-asistente-01', empresaId: 'emp-01', rolEnEmpresa: 'ASISTENTE_CONTABLE', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-07', usuarioId: 'usr-asistente-01', empresaId: '00000000-0000-0000-0000-000000000001', rolEnEmpresa: 'ASISTENTE_CONTABLE', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ue-08', usuarioId: 'usr-auditor-01', empresaId: 'emp-01', rolEnEmpresa: 'AUDITOR_REVISOR', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z' }
  );
}

export const REFRESH_TOKENS_MEMORIA: RefreshTokenModel[] = [];

const ACCESS_SECRET = process.env.JWT_SECRET || env.JWT_SECRET || 'SUNACONTA_ACCESS_SECRET_KEY_PRO_2026!';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'SUNACONTA_REFRESH_SECRET_KEY_PRO_2026_MASTER!';

export const authJwtService = {
  ACCESS_EXPIRATION_SECONDS: 15 * 60, // 15 minutos
  REFRESH_EXPIRATION_DAYS: 7,

  /**
   * Autenticación con credenciales, validación MFA para ADMIN_ESTUDIO y emisión de par JWT
   */
  async login(
    email: string,
    passwordPlano: string,
    totpCode?: string,
    empresaPreferencia?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    usuario: { id: string; email: string; nombre: string; rolGlobal: RolEstudio };
    empresaActivaId: string;
    empresasPermitidas: string[];
  }> {
    const usuario = USUARIOS_ESTUDIO_MEMORIA.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.isActive);
    if (!usuario) {
      throw new Error('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos.');
    }

    const passwordValido = bcrypt.compareSync(passwordPlano, usuario.passwordHash);
    if (!passwordValido) {
      throw new Error('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos.');
    }

    // Validación MFA obligatoria para ADMIN_ESTUDIO
    let mfaVerificado = false;
    if (usuario.rolGlobal === 'ADMIN_ESTUDIO' || usuario.mfaActivado) {
      if (!usuario.mfaSecret) {
        throw new Error('MFA_NO_CONFIGURADO: El usuario administrador requiere configuración inicial de MFA.');
      }
      if (!totpCode) {
        throw new Error('MFA_REQUERIDO: Ingrese código TOTP de 6 dígitos para completar la autenticación.');
      }
      const esValido = totpService.validarToken(usuario.mfaSecret, totpCode);
      if (!esValido) {
        throw new Error('MFA_CODIGO_INVALIDO: Código de autenticación TOTP incorrecto o expirado.');
      }
      mfaVerificado = true;
    }

    // Obtener membresías en empresas activas
    const membresias = USUARIOS_EMPRESA_MEMORIA.filter(
      m => m.usuarioId === usuario.id && m.estado === 'ACTIVO'
    );
    if (membresias.length === 0) {
      throw new Error('SIN_EMPRESAS_ASIGNADAS: El usuario no tiene empresas asignadas en el estudio contable.');
    }

    const empresasPermitidas = membresias.map(m => m.empresaId);
    let empresaActivaId = empresasPermitidas[0];
    if (empresaPreferencia && empresasPermitidas.includes(empresaPreferencia)) {
      empresaActivaId = empresaPreferencia;
    }

    const membresiaActual = membresias.find(m => m.empresaId === empresaActivaId)!;

    // Generar tokens
    const claims: AccessTokenClaims = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rolGlobal: usuario.rolGlobal,
      empresaId: empresaActivaId,
      rolEnEmpresa: membresiaActual.rolEnEmpresa,
      mfaVerificado,
      empresasPermitidas
    };

    const accessToken = jwt.sign(claims, ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRATION_SECONDS
    });

    const refreshTokenId = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const refreshToken = jwt.sign(
      { sub: usuario.id, jti: refreshTokenId, empresaId: empresaActivaId },
      REFRESH_SECRET,
      { expiresIn: `${this.REFRESH_EXPIRATION_DAYS}d` }
    );

    REFRESH_TOKENS_MEMORIA.push({
      tokenId: refreshTokenId,
      usuarioId: usuario.id,
      empresaId: empresaActivaId,
      expiresAt: Date.now() + this.REFRESH_EXPIRATION_DAYS * 24 * 3600 * 1000,
      revoked: false
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_EXPIRATION_SECONDS,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rolGlobal: usuario.rolGlobal
      },
      empresaActivaId,
      empresasPermitidas
    };
  },

  /**
   * Cambia la empresa activa en el servidor generando un nuevo token firmado.
   * Ignora cualquier petición de empresa que no esté autorizada en usuario_empresa.
   */
  async cambiarEmpresaActiva(userId: string, nuevaEmpresaId: string): Promise<{ accessToken: string; empresaActivaId: string; rolEnEmpresa: RolEstudio }> {
    const usuario = USUARIOS_ESTUDIO_MEMORIA.find(u => u.id === userId && u.isActive);
    if (!usuario) throw new Error('USUARIO_NO_ENCONTRADO: Usuario no existe o está inactivo.');

    const membresia = USUARIOS_EMPRESA_MEMORIA.find(
      m => m.usuarioId === userId && m.empresaId === nuevaEmpresaId && m.estado === 'ACTIVO'
    );
    if (!membresia) {
      throw new Error(`ACCESO_DENEGADO_EMPRESA: El usuario no tiene permisos asignados para la empresa '${nuevaEmpresaId}'.`);
    }

    const membresias = USUARIOS_EMPRESA_MEMORIA.filter(m => m.usuarioId === userId && m.estado === 'ACTIVO');
    const empresasPermitidas = membresias.map(m => m.empresaId);

    const claims: AccessTokenClaims = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rolGlobal: usuario.rolGlobal,
      empresaId: nuevaEmpresaId,
      rolEnEmpresa: membresia.rolEnEmpresa,
      mfaVerificado: true,
      empresasPermitidas
    };

    const accessToken = jwt.sign(claims, ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRATION_SECONDS
    });

    return {
      accessToken,
      empresaActivaId: nuevaEmpresaId,
      rolEnEmpresa: membresia.rolEnEmpresa
    };
  },

  /**
   * Refresca un token de acceso usando el Refresh Token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { sub: string; jti: string; empresaId: string };
      const tokenStored = REFRESH_TOKENS_MEMORIA.find(r => r.tokenId === decoded.jti && !r.revoked);
      if (!tokenStored || tokenStored.expiresAt < Date.now()) {
        throw new Error('REFRESH_TOKEN_INVALIDO: Sesión expirada o revocada.');
      }

      const usuario = USUARIOS_ESTUDIO_MEMORIA.find(u => u.id === decoded.sub && u.isActive);
      if (!usuario) throw new Error('USUARIO_INACTIVO: El usuario ha sido dado de baja.');

      const membresias = USUARIOS_EMPRESA_MEMORIA.filter(m => m.usuarioId === usuario.id && m.estado === 'ACTIVO');
      const empresasPermitidas = membresias.map(m => m.empresaId);
      const empresaId = empresasPermitidas.includes(decoded.empresaId) ? decoded.empresaId : empresasPermitidas[0];
      const membresia = membresias.find(m => m.empresaId === empresaId)!;

      const claims: AccessTokenClaims = {
        sub: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rolGlobal: usuario.rolGlobal,
        empresaId,
        rolEnEmpresa: membresia.rolEnEmpresa,
        mfaVerificado: true,
        empresasPermitidas
      };

      const accessToken = jwt.sign(claims, ACCESS_SECRET, {
        expiresIn: this.ACCESS_EXPIRATION_SECONDS
      });

      return {
        accessToken,
        expiresIn: this.ACCESS_EXPIRATION_SECONDS
      };
    } catch (err: any) {
      throw new Error(`REFRESH_FALLIDO: ${err.message || 'Token de refresco inválido'}`);
    }
  },

  /**
   * Valida un token JWT de acceso y retorna los claims
   */
  verificarAccessToken(token: string): AccessTokenClaims {
    try {
      return jwt.verify(token, ACCESS_SECRET) as AccessTokenClaims;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('TOKEN_EXPIRADO: El token de sesión ha expirado.');
      }
      throw new Error('TOKEN_INVALIDO: Firma o estructura de token no válida.');
    }
  },

  /**
   * Valida segregación de funciones: quien registró un borrador no puede contabilizarlo
   */
  validarSegregacionContabilizacion(creadorBorradorId: string, usuarioActualId: string, rolActual: RolEstudio): void {
    if (creadorBorradorId && creadorBorradorId === usuarioActualId) {
      throw new Error('SEGREGACION_FUNCIONES: El usuario que registró el borrador no puede contabilizarlo (Separación obligatoria de funciones).');
    }
    if (rolActual === 'ASISTENTE_CONTABLE' || rolActual === 'AUDITOR_REVISOR') {
      throw new Error(`PERMISO_DENEGADO: El rol '${rolActual}' no está autorizado para contabilizar asientos ni comprobantes.`);
    }
  },

  /**
   * Valida segregación de funciones para cierre de período
   */
  validarCierrePeriodo(usuarioActualId: string, rolActual: RolEstudio, usuariosBorradoresCreados: string[]): void {
    if (rolActual === 'ASISTENTE_CONTABLE' || rolActual === 'AUDITOR_REVISOR') {
      throw new Error(`PERMISO_DENEGADO: El rol '${rolActual}' no puede realizar cierres contables de período.`);
    }
    if (usuariosBorradoresCreados.includes(usuarioActualId)) {
      throw new Error('SEGREGACION_FUNCIONES: Quien registra borradores en el período no puede ejecutar el cierre contable del mismo.');
    }
  }
};
