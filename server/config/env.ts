import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().default('sunaconta_enterprise_jwt_secure_secret_2026_xyz!#'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SUNAT_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') // 32 bytes hex
});

export const env = envSchema.parse(process.env);
