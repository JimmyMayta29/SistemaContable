import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().min(32).default('development-only-access-secret-change-before-deploy'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-only-refresh-secret-change-before-deploy'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SUNAT_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'SUNAT_ENCRYPTION_KEY debe contener 32 bytes hexadecimales').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
}).superRefine((config, ctx) => {
  if (config.JWT_SECRET === config.JWT_REFRESH_SECRET) {
    ctx.addIssue({ code: 'custom', path: ['JWT_REFRESH_SECRET'], message: 'Las claves de acceso y renovación deben ser diferentes' });
  }
  if (config.NODE_ENV !== 'production') return;
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SUNAT_ENCRYPTION_KEY'] as const) {
    if (!process.env[key] || config[key].startsWith('development-only-') || (key === 'SUNAT_ENCRYPTION_KEY' && config[key] === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')) {
      ctx.addIssue({ code: 'custom', path: [key], message: `${key} requiere un valor propio de la instalación en producción` });
    }
  }
});

export const env = envSchema.parse(process.env);
