import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Cliente Supabase Estándar (para autenticación de usuarios)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Cliente Supabase Admin (para creación y gestión de usuarios con Service Role)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
