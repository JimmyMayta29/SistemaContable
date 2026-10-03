import crypto from 'crypto';

/**
 * Proveedor abstracto de Llaves Maestras (KEK - Key Encryption Key)
 * Compatible con AWS KMS, Google Cloud KMS, Azure Key Vault o Proveedor Local.
 */
export interface KeyProvider {
  obtenerKek(version?: number): Promise<Buffer>;
  cifrarDek(dek: Buffer, version?: number): Promise<{ encryptedDek: string; keyVersion: number }>;
  descifrarDek(encryptedDek: string, keyVersion: number): Promise<Buffer>;
}

const DEFAULT_KEY_V1 = 'SUNACONTA_AES256_PRO_KEY_V1_SECRET_2026_MASTER!';
const MASTER_KEY_V1 = crypto.createHash('sha256').update(process.env.SUNAT_ENCRYPTION_KEY || DEFAULT_KEY_V1).digest();

const KEY_REGISTRY: Record<number, Buffer> = {
  1: MASTER_KEY_V1,
  2: crypto.createHash('sha256').update((process.env.SUNAT_ENCRYPTION_KEY || DEFAULT_KEY_V1) + '_V2_ROTATED').digest()
};

/**
 * Proveedor local de KEK con versionado y soporte de rotación
 */
export class LocalMasterKeyProvider implements KeyProvider {
  async obtenerKek(version = 2): Promise<Buffer> {
    return KEY_REGISTRY[version] || KEY_REGISTRY[1];
  }

  async cifrarDek(dek: Buffer, version = 2): Promise<{ encryptedDek: string; keyVersion: number }> {
    const kek = await this.obtenerKek(version);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    let enc = cipher.update(dek);
    enc = Buffer.concat([enc, cipher.final()]);
    const tag = cipher.getAuthTag();
    const encryptedDek = `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
    return { encryptedDek, keyVersion: version };
  }

  async descifrarDek(encryptedDek: string, keyVersion = 2): Promise<Buffer> {
    const kek = await this.obtenerKek(keyVersion);
    const [ivHex, tagHex, dataHex] = encryptedDek.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let dec = decipher.update(Buffer.from(dataHex, 'hex'));
    dec = Buffer.concat([dec, decipher.final()]);
    return dec;
  }
}

// Almacén en memoria de DEKs por empresa (en BD se persiste en tabla sunat_empresa_keys)
export const EMPRESA_DEK_CACHE: Record<string, { encryptedDek: string; keyVersion: number; rawDek?: Buffer }> = {};

const defaultKeyProvider: KeyProvider = new LocalMasterKeyProvider();
const CURRENT_KEY_VERSION = 1;

export const cryptoService = {
  CURRENT_KEY_VERSION,
  keyProvider: defaultKeyProvider,

  /**
   * Configura un proveedor de KEK alternativo (ej. Cloud KMS)
   */
  setKeyProvider(provider: KeyProvider) {
    this.keyProvider = provider;
  },

  /**
   * Obtiene o genera la Data Encryption Key (DEK) única para una empresa específica.
   */
  async obtenerOGenerarDek(empresaId: string): Promise<Buffer> {
    const cached = EMPRESA_DEK_CACHE[empresaId];
    if (cached) {
      if (cached.rawDek) return cached.rawDek;
      const dec = await this.keyProvider.descifrarDek(cached.encryptedDek, cached.keyVersion);
      cached.rawDek = dec;
      return dec;
    }

    // Generar nueva DEK de 256 bits (32 bytes)
    const rawDek = crypto.randomBytes(32);
    const { encryptedDek, keyVersion } = await this.keyProvider.cifrarDek(rawDek, 2);

    EMPRESA_DEK_CACHE[empresaId] = {
      encryptedDek,
      keyVersion,
      rawDek
    };

    return rawDek;
  },

  /**
   * Cifrado con Envelope Encryption (Fase 7):
   * - Llave DEK única por empresa
   * - IV aleatorio criptográfico de 12 bytes por operación
   * - AAD (Additional Authenticated Data) vincula criptográficamente el texto cifrado a `empresa_id:campo`
   * - Formato: "v2:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}"
   */
  async cifrarConEnvelope(empresaId: string, campo: string, textoPlano: string): Promise<string> {
    if (!textoPlano) return '';
    const dek = await this.obtenerOGenerarDek(empresaId);
    const iv = crypto.randomBytes(12); // IV único e impredecible
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    // AAD previene ataques de swapping de campos o de empresa
    const aad = `${empresaId}:${campo}`;
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    let encrypted = cipher.update(textoPlano, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `v2:${iv.toString('hex')}:${authTag}:${encrypted}`;
  },

  /**
   * Descifra credenciales con Envelope Encryption y verificación de AAD.
   * Si el payload proviene de v1 (legacy), realiza descifrado compatible sin downtime.
   */
  async descifrarConEnvelope(empresaId: string, campo: string, payloadCifrado: string): Promise<string> {
    if (!payloadCifrado) return '';

    if (payloadCifrado.startsWith('v2:')) {
      const dek = await this.obtenerOGenerarDek(empresaId);
      const partes = payloadCifrado.split(':');
      if (partes.length !== 4) {
        throw new Error('FORMATO_ENVELOPE_INVALIDO: Estructura v2 de Envelope Encryption incorrecta.');
      }

      const iv = Buffer.from(partes[1], 'hex');
      const authTag = Buffer.from(partes[2], 'hex');
      const ciphertext = partes[3];

      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
      const aad = `${empresaId}:${campo}`;
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // Fallback retrocompatible para registros v1:
    return this.descifrar(payloadCifrado);
  },

  /**
   * Job de migración y recifrado v1 -> v2 sin downtime
   */
  async reencriptarV1aV2(
    empresaId: string,
    credencialesCifradas: {
      usuarioSol?: string;
      claveSol?: string;
      clientId?: string;
      clientSecret?: string;
    }
  ): Promise<{
    migrados: number;
    yaEnV2: number;
    resultados: Record<string, string>;
  }> {
    let migrados = 0;
    let yaEnV2 = 0;
    const resultados: Record<string, string> = {};

    for (const [campo, valorCifrado] of Object.entries(credencialesCifradas)) {
      if (!valorCifrado) continue;

      if (valorCifrado.startsWith('v2:')) {
        yaEnV2++;
        resultados[campo] = valorCifrado;
        continue;
      }

      // Descifrar con v1 si está cifrado, o tomar texto plano
      const plano = valorCifrado.startsWith('v1:') ? this.descifrar(valorCifrado) : valorCifrado;
      const nuevoV2 = await this.cifrarConEnvelope(empresaId, campo, plano);
      resultados[campo] = nuevoV2;
      migrados++;
    }

    return { migrados, yaEnV2, resultados };
  },

  /**
   * Cifra un texto en claro usando AES-256-GCM v1 (Mantenido para compatibilidad con suites previas)
   */
  cifrar(textoPlano: string, keyVersion: number = CURRENT_KEY_VERSION): string {
    if (!textoPlano) return '';
    const key = KEY_REGISTRY[keyVersion] || KEY_REGISTRY[1];
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(textoPlano, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `v${keyVersion}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  },

  /**
   * Descifra una cadena previamente cifrada con AES-256-GCM v1
   */
  descifrar(payloadCifrado: string): string {
    if (!payloadCifrado) return '';
    const partes = payloadCifrado.split(':');
    if (partes.length !== 4) {
      throw new Error('FORMATO_CIFRADO_INVALIDO: El payload no tiene la estructura AES-256-GCM esperada.');
    }

    const versionStr = partes[0].replace('v', '');
    const version = parseInt(versionStr, 10) || 1;
    const key = KEY_REGISTRY[version] || KEY_REGISTRY[1];

    const iv = Buffer.from(partes[1], 'hex');
    const authTag = Buffer.from(partes[2], 'hex');
    const ciphertext = partes[3];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  rotarCifrado(payloadCifrado: string, nuevaVersion: number): { nuevoPayload: string; nuevaVersion: number } {
    const textoOriginal = this.descifrar(payloadCifrado);
    const nuevoPayload = this.cifrar(textoOriginal, nuevaVersion);
    return { nuevoPayload, nuevaVersion };
  },

  sanitizarError(error: any): string {
    if (!error) return 'Error desconocido';
    let msg = typeof error === 'string' ? error : error?.message || String(error);

    msg = msg.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTADO]');
    msg = msg.replace(/(clave_sol|claveSol|client_secret|clientSecret|password|token)=\S+/gi, '$1=[REDACTADO]');
    msg = msg.replace(/"(claveSol|clientSecret|token|password)":\s*"[^"]+"/gi, '"$1":"[REDACTADO]"');
    return msg;
  },

  sanitizarObjeto<T extends Record<string, any>>(obj: T): Partial<T> {
    if (!obj || typeof obj !== 'object') return obj;
    const clon: Record<string, any> = { ...obj };
    const camposSensibles = [
      'claveSol', 'clave_sol', 'clientSecret', 'client_secret',
      'clave_sol_encrypted', 'client_secret_encrypted', 'access_token',
      'accessToken', 'token', 'tokenSunat', 'authTag'
    ];

    for (const key of Object.keys(clon)) {
      if (camposSensibles.includes(key)) {
        delete clon[key];
      } else if (typeof clon[key] === 'object' && clon[key] !== null) {
        clon[key] = this.sanitizarObjeto(clon[key]) as any;
      }
    }
    return clon as Partial<T>;
  },

  /**
   * Recomendaciones normativas y de seguridad para credenciales SOL
   */
  obtenerRecomendacionSeguridadSol(): {
    recomendacion: string;
    perfilMinimo: string[];
    normativaReferencia: string;
  } {
    return {
      recomendacion: 'NUNCA utilice el usuario SOL principal (administrador tributario). Cree en SUNAT Operaciones en Línea un USUARIO SECUNDARIO con perfiles limitados exclusivamente al SIRE.',
      perfilMinimo: [
        'Consulta de RUC y Estado de Contribuyente',
        'Sistema Integrado de Registros Electrónicos (SIRE) - Módulo RCE y RVIE',
        'Descarga de Propuestas y Consulta de Constancias'
      ],
      normativaReferencia: 'Resolución de Superintendencia N° 190-2020/SUNAT y RS N° 040-2022/SUNAT (Creación y alcance de Usuarios Secundarios SOL).'
    };
  }
};
