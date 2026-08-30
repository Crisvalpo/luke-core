import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(3080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@127.0.0.1:5432/postgres'),
  DB_SSL: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  CORE_ADMIN_API_KEY: z.string().default('luke-core-secret-admin-key-2026'),
  JWT_SECRET: z.string().default('super-secret-jwt-token-with-32-chars'),
  SUPABASE_URL: z.string().default('https://api-oracle.lukeapp.cl'),
  SUPABASE_ANON_KEY: z.string().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTczOTcyOTI3MiwiZXhwIjoyMDU1MDg5MjcyfQ.4wqBiO7twFOgiLPbHQi9pmTWrM1N6FjlI93mWsuyOiE'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiaWF0IjoxNzM5NzI5MjcyLCJleHAiOjIwNTUwODkyNzJ9.OEpjObm93DhWMupkDmBQt-9YqrbD18Go_tsPnLCxtUc'),
  ALLOWED_ORIGINS: z.string().default('*'),
  WA_BRIDGE_URL: z.string().default('http://127.0.0.1:4000'),
  WA_BRIDGE_SECRET: z.string().default('luke2026'),
  WA_SESSION_ID: z.string().default('subastas')
});

export const env = envSchema.parse(process.env);
