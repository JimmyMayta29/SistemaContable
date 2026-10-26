import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../config/database';
import { env } from '../config/env';
import { REFRESH_TOKENS_MEMORIA, USUARIOS_ESTUDIO_MEMORIA, authJwtService, UsuarioEstudioModel } from './authJwtService';
import { totpService } from './totpService';

export interface DatosEstudioContable {
  tenantId: string;
  nombreEstudio: string;
  rucEstudio: string;
  emailContacto: string;
  telefonoContacto: string;
  direccionFiscal?: string;
  fechaRegistro: string;
}

const setupInicialSchema = z.object({
  nombreEstudio: z.string().trim().min(3).max(150),
  rucEstudio: z.string().trim().regex(/^\d{11}$/),
  emailContacto: z.string().trim().email().max(150),
  telefonoContacto: z.string().trim().min(6).max(40),
  direccionFiscal: z.string().trim().max(500).optional(),
  adminNombre: z.string().trim().min(3).max(150),
  adminEmail: z.string().trim().toLowerCase().email().max(120),
  adminPassword: z.string().min(8).refine(p => Buffer.byteLength(p, 'utf8') <= 72, 'La contraseña admite hasta 72 bytes.'),
  mfaSecret: z.string().trim().regex(/^[A-Z2-7]{16,64}$/),
  mfaCodigoVerificacion: z.string().trim().regex(/^\d{6}$/)
});

export interface SetupInicialInput {
  nombreEstudio: string;
  rucEstudio: string;
  emailContacto: string;
  telefonoContacto: string;
  direccionFiscal?: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
  mfaSecret: string;
  mfaCodigoVerificacion: string;
}

// Almacén en memoria del estudio contable (persistible en BD si PostgreSQL está conectado)
let ESTUDIO_CONFIGURADO: DatosEstudioContable | null = null;

export const setupService = {
  /**
   * Valida RUC peruano según algoritmo oficial Módulo 11
   */
  validarRucModulo11(ruc: string): boolean {
    if (!ruc || typeof ruc !== 'string') return false;
    const clean = ruc.trim();
    if (!/^(10|15|17|20)\d{9}$/.test(clean)) return false;

    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += parseInt(clean[i], 10) * factores[i];
    }
    const residuo = suma % 11;
    let digitoEsperado = 11 - residuo;
    if (digitoEsperado === 10) digitoEsperado = 0;
    else if (digitoEsperado === 11) digitoEsperado = 1;

    return parseInt(clean[10], 10) === digitoEsperado;
  },

  /**
   * Valida complejidad de contraseña según políticas de seguridad (Fase 7 & 13)
   */
  validarPasswordSegura(password: string): { valida: boolean; mensaje?: string } {
    if (!password || password.length < 8) {
      return { valida: false, mensaje: 'La contraseña debe contener al menos 8 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valida: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valida: false, mensaje: 'La contraseña debe contener al menos una letra minúscula.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valida: false, mensaje: 'La contraseña debe contener al menos un dígito numérico.' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { valida: false, mensaje: 'La contraseña debe contener al menos un carácter especial.' };
    }
    return { valida: true };
  },

  /**
   * Verifica si el sistema ya fue configurado inicialmente con un ADMINISTRADOR
   */
  async estaConfigurado(): Promise<boolean> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT COUNT(*) as count FROM usuarios_estudio WHERE rol_global = 'ADMINISTRADOR'
      `);
      const count = parseInt(res.rows[0]?.count || '0', 10);
      return count > 0;
    }
    if (env.NODE_ENV !== 'test' || env.DATABASE_URL) throw new Error('DATABASE_NO_DISPONIBLE');
    return USUARIOS_ESTUDIO_MEMORIA.some(u => u.rolGlobal === 'ADMINISTRADOR');
  },

  /**
   * Obtiene la información del estudio o estado no configurado
   */
  async obtenerEstadoSetup() {
    const configurado = await this.estaConfigurado();
    if (db.isPostgresConnected()) {
      const resultado = await db.query(`
        SELECT tenant_id AS "tenantId", nombre_estudio AS "nombreEstudio", ruc_estudio AS "rucEstudio",
               email_contacto AS "emailContacto", telefono_contacto AS "telefonoContacto",
               direccion_fiscal AS "direccionFiscal", fecha_registro AS "fechaRegistro"
        FROM estudio_configuracion WHERE id = TRUE
      `);
      return { configurado, estudio: (resultado.rows[0] as DatosEstudioContable) || null };
    }
    return {
      configurado,
      estudio: configurado ? ESTUDIO_CONFIGURADO : null
    };
  },

  /**
   * Genera un nuevo secreto MFA TOTP (RFC 6238) en Base32 para el asistente de primer arranque
   */
  generarMfaSecret(email: string) {
    return totpService.generarSecreto(z.string().trim().email().parse(email), 'SUNAConta PRO');
  },

  /**
   * Inicializa el estudio contable y crea el usuario ADMINISTRADOR principal
   */
  async inicializarEstudio(datos: SetupInicialInput) {
    const input = setupInicialSchema.parse(datos);
    const yaConfigurado = await this.estaConfigurado();
    if (yaConfigurado) {
      throw new Error('SISTEMA_YA_CONFIGURADO: El estudio ya cuenta con un usuario Administrador configurado.');
    }

    // 1. Validar RUC del Estudio
    if (!this.validarRucModulo11(input.rucEstudio)) {
      throw new Error('RUC_INVALIDO: El RUC del estudio no cumple con el algoritmo Módulo 11 de SUNAT.');
    }

    // 2. Validar contraseña
    const checkPass = this.validarPasswordSegura(input.adminPassword);
    if (!checkPass.valida) {
      throw new Error(`PASSWORD_INSEGURA: ${checkPass.mensaje}`);
    }

    // 3. Validar MFA obligatorio para ADMINISTRADOR
    if (!input.mfaSecret || !input.mfaCodigoVerificacion) {
      throw new Error('MFA_OBLIGATORIO: Se requiere configurar el segundo factor de autenticación TOTP para el rol Administrador.');
    }
    const mfaValido = authJwtService.verificarTotp(input.mfaSecret, input.mfaCodigoVerificacion);
    if (!mfaValido) {
      throw new Error('MFA_CODIGO_INVALIDO: El código de 6 dígitos ingresado no coincide con el generador de autenticación.');
    }

    // 4. Crear ADMINISTRADOR
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(input.adminPassword, 10);
    const fechaActual = new Date().toISOString();

    const nuevoAdmin: UsuarioEstudioModel = {
      id: userId,
      email: input.adminEmail.toLowerCase().trim(),
      passwordHash,
      nombre: input.adminNombre.trim(),
      rolGlobal: 'ADMINISTRADOR',
      mfaSecret: input.mfaSecret,
      mfaActivado: true,
      isActive: true,
      createdAt: fechaActual
    };

    const estudio: DatosEstudioContable = {
      tenantId: crypto.randomUUID(),
      nombreEstudio: input.nombreEstudio.trim(),
      rucEstudio: input.rucEstudio.trim(),
      emailContacto: input.emailContacto.trim(),
      telefonoContacto: input.telefonoContacto.trim(),
      direccionFiscal: input.direccionFiscal?.trim(),
      fechaRegistro: fechaActual
    };

    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        // Serializa el primer arranque entre procesos y evita dos administradores iniciales.
        await client.query('SELECT pg_advisory_xact_lock(1398099539)');
        const existente = await client.query("SELECT id FROM usuarios_estudio WHERE rol_global = 'ADMINISTRADOR' LIMIT 1");
        if (existente.rows.length) throw new Error('SISTEMA_YA_CONFIGURADO: El estudio ya cuenta con un usuario Administrador configurado.');
        await client.query('INSERT INTO tenants (id, nombre) VALUES ($1, $2)', [estudio.tenantId, estudio.nombreEstudio]);
        await client.query(`
          INSERT INTO usuarios_estudio (id, email, password_hash, nombre, rol_global, mfa_secret, mfa_activado, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7)
        `, [nuevoAdmin.id, nuevoAdmin.email, nuevoAdmin.passwordHash, nuevoAdmin.nombre, nuevoAdmin.rolGlobal, nuevoAdmin.mfaSecret, fechaActual]);
        await client.query(`
          INSERT INTO estudio_configuracion (id, tenant_id, nombre_estudio, ruc_estudio, email_contacto, telefono_contacto, direccion_fiscal, fecha_registro)
          VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7)
        `, [estudio.tenantId, estudio.nombreEstudio, estudio.rucEstudio, estudio.emailContacto, estudio.telefonoContacto, estudio.direccionFiscal || null, fechaActual]);
        const sesion = await authJwtService.emitirSesion(nuevoAdmin, true, undefined, client);
        await client.query('COMMIT');
        return { estudio, ...sesion };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (env.NODE_ENV !== 'test' || env.DATABASE_URL) throw new Error('DATABASE_NO_DISPONIBLE');
    if (USUARIOS_ESTUDIO_MEMORIA.some(u => u.rolGlobal === 'ADMINISTRADOR')) throw new Error('SISTEMA_YA_CONFIGURADO: El estudio ya cuenta con un usuario Administrador configurado.');
    USUARIOS_ESTUDIO_MEMORIA.push(nuevoAdmin);
    const estudioAnterior = ESTUDIO_CONFIGURADO;
    try {
      const sesion = await authJwtService.emitirSesion(nuevoAdmin, true);
      ESTUDIO_CONFIGURADO = estudio;
      return { estudio, ...sesion };
    } catch (err) {
      USUARIOS_ESTUDIO_MEMORIA.splice(USUARIOS_ESTUDIO_MEMORIA.indexOf(nuevoAdmin), 1);
      for (let i = REFRESH_TOKENS_MEMORIA.length - 1; i >= 0; i--) {
        if (REFRESH_TOKENS_MEMORIA[i].usuarioId === nuevoAdmin.id) REFRESH_TOKENS_MEMORIA.splice(i, 1);
      }
      ESTUDIO_CONFIGURADO = estudioAnterior;
      throw err;
    }
  }
};
