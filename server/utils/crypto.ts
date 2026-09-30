import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';

// Derivar clave de 32 bytes a partir de SUNAT_ENCRYPTION_KEY
function getKey(): Buffer {
  return crypto.createHash('sha256').update(env.SUNAT_ENCRYPTION_KEY).digest();
}

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
}

/**
 * Cifra un texto confidencial (ej. Clave SOL, Client Secret) usando AES-256-GCM
 */
export function encryptSensitive(plainText: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
}

/**
 * Descifra el texto confidencial autenticado usando AES-256-GCM
 */
export function decryptSensitive(data: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    getKey(), 
    Buffer.from(data.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  
  let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
