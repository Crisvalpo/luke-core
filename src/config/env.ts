import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@127.0.0.1:5432/postgres'),
  DB_SSL: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  CORE_ADMIN_API_KEY: z.string().default('luke-core-secret-admin-key-2026'),
  ALLOWED_ORIGINS: z.string().default('*')
});

export const env = envSchema.parse(process.env);
