import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { USUARIOS_ESTUDIO_MEMORIA, authJwtService, UsuarioEstudioModel } from './authJwtService';

export interface DatosEstudioContable {
  nombreEstudio: string;
  rucEstudio: string;
  emailContacto: string;
  telefonoContacto: string;
  direccionFiscal?: string;
  fechaRegistro: string;
}

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
   * Verifica si el sistema ya fue configurado inicialmente con un ADMIN_ESTUDIO
   */
  async estaConfigurado(): Promise<boolean> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT COUNT(*) as count FROM usuarios_estudio WHERE rol_global = 'ADMIN_ESTUDIO'
      `);
      const count = parseInt(res.rows[0]?.count || '0', 10);
      return count > 0;
    }
    return USUARIOS_ESTUDIO_MEMORIA.some(u => u.rolGlobal === 'ADMIN_ESTUDIO');
  },

  /**
   * Obtiene la información del estudio o estado no configurado
   */
  async obtenerEstadoSetup() {
    const configurado = await this.estaConfigurado();
    return {
      configurado,
      estudio: configurado ? ESTUDIO_CONFIGURADO : null
    };
  },

  /**
   * Genera un nuevo secreto MFA TOTP (RFC 6238) en Base32 para el asistente de primer arranque
   */
  generarMfaSecret(email: string) {
    // Generar 20 bytes aleatorios y convertir a Base32
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += alphabet[bytes[i] % alphabet.length];
    }
    const issuer = encodeURIComponent('SUNAConta PRO');
    const account = encodeURIComponent(email);
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      otpauthUrl
    };
  },

  /**
   * Inicializa el estudio contable y crea el usuario ADMIN_ESTUDIO principal
   */
  async inicializarEstudio(input: SetupInicialInput) {
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

    // 3. Validar MFA obligatorio para ADMIN_ESTUDIO
    if (!input.mfaSecret || !input.mfaCodigoVerificacion) {
      throw new Error('MFA_OBLIGATORIO: Se requiere configurar el segundo factor de autenticación TOTP para el rol Administrador.');
    }
    const mfaValido = authJwtService.verificarTotp(input.mfaSecret, input.mfaCodigoVerificacion);
    if (!mfaValido) {
      throw new Error('MFA_CODIGO_INVALIDO: El código de 6 dígitos ingresado no coincide con el generador de autenticación.');
    }

    // 4. Crear ADMIN_ESTUDIO
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(input.adminPassword, 10);
    const fechaActual = new Date().toISOString();

    const nuevoAdmin: UsuarioEstudioModel = {
      id: userId,
      email: input.adminEmail.toLowerCase().trim(),
      passwordHash,
      nombre: input.adminNombre.trim(),
      rolGlobal: 'ADMIN_ESTUDIO',
      mfaSecret: input.mfaSecret,
      mfaActivado: true,
      isActive: true,
      createdAt: fechaActual
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO usuarios_estudio (
          id, email, password_hash, nombre, rol_global, mfa_secret, mfa_activado, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        nuevoAdmin.id, nuevoAdmin.email, nuevoAdmin.passwordHash, nuevoAdmin.nombre,
        nuevoAdmin.rolGlobal, nuevoAdmin.mfaSecret, nuevoAdmin.mfaActivado, nuevoAdmin.isActive, nuevoAdmin.createdAt
      ]);
    } else {
      USUARIOS_ESTUDIO_MEMORIA.push(nuevoAdmin);
    }

    ESTUDIO_CONFIGURADO = {
      nombreEstudio: input.nombreEstudio.trim(),
      rucEstudio: input.rucEstudio.trim(),
      emailContacto: input.emailContacto.trim(),
      telefonoContacto: input.telefonoContacto.trim(),
      direccionFiscal: input.direccionFiscal?.trim(),
      fechaRegistro: fechaActual
    };

    // 5. Emitir sesión JWT inicial
    const loginResultado = await authJwtService.login(
      input.adminEmail,
      input.adminPassword,
      input.mfaCodigoVerificacion
    );

    return {
      mensaje: 'Estudio contable configurado exitosamente.',
      estudio: ESTUDIO_CONFIGURADO,
      ...loginResultado
    };
  }
};
