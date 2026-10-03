import crypto from 'crypto';

/**
 * Servicio TOTP (Time-Based One-Time Password) basado estrictamente en RFC 6238 y RFC 4226.
 * Implementado directamente con Node.js crypto para garantizar cero dependencias externas,
 * máxima portabilidad y compatibilidad 100% con Google Authenticator / Microsoft Authenticator.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const totpService = {
  /**
   * Codifica un buffer en Base32 estándar RFC 4648 sin padding
   */
  encodeBase32(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  },

  /**
   * Decodifica una cadena Base32 a Buffer
   */
  decodeBase32(base32Str: string): Buffer {
    const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) {
        throw new Error(`CARACTER_BASE32_INVALIDO: '${cleaned[i]}' no es un carácter Base32 válido.`);
      }
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  },

  /**
   * Genera un nuevo secreto TOTP de 160 bits (20 bytes) en Base32
   */
  generarSecreto(usuarioEmail: string, emisor = 'SunaConta ERP'): { secret: string; otpauthUrl: string } {
    const randomBytes = crypto.randomBytes(20);
    const secret = this.encodeBase32(randomBytes);
    const label = encodeURIComponent(`${emisor}:${usuarioEmail}`);
    const issuer = encodeURIComponent(emisor);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpauthUrl };
  },

  /**
   * Calcula el código TOTP de 6 dígitos para un contador de tiempo específico
   */
  generarTokenParaContador(secretBase32: string, counter: number): string {
    const key = this.decodeBase32(secretBase32);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const token = (binary % 1000000).toString().padStart(6, '0');
    return token;
  },

  /**
   * Genera el token TOTP para el timestamp actual (o con offset en períodos)
   */
  generarToken(secretBase32: string, offsetPeriodos = 0, timestampMs = Date.now()): string {
    const step = 30; // 30 segundos según RFC 6238
    const counter = Math.floor(timestampMs / 1000 / step) + offsetPeriodos;
    return this.generarTokenParaContador(secretBase32, counter);
  },

  /**
   * Valida un token de 6 dígitos contra un secreto con tolerancia de desvío temporal (window)
   */
  validarToken(secretBase32: string, token: string, window = 1, timestampMs = Date.now()): boolean {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return false;
    }

    const step = 30;
    const currentCounter = Math.floor(timestampMs / 1000 / step);

    for (let offset = -window; offset <= window; offset++) {
      const generated = this.generarTokenParaContador(secretBase32, currentCounter + offset);
      if (crypto.timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(generated, 'utf8'))) {
        return true;
      }
    }

    return false;
  }
};
