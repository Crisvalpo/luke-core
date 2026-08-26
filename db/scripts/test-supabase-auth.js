import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://api-oracle.lukeapp.cl';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseLogin() {
  console.log(`📡 Probando Supabase Auth en: ${supabaseUrl}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'cluke@eimontajes.cl',
    password: 'LukeAdmin2026!'
  });

  if (error) {
    console.error('❌ Error de login en Supabase:', error.message);
  } else {
    console.log('✅ ¡Login 100% Real y Exitoso en Supabase Auth!');
    console.log('👤 Usuario:', data.user?.email, '| ID:', data.user?.id);
    console.log('🔑 JWT Token Emitido:', data.session?.access_token.substring(0, 40) + '...');
  }
}

testSupabaseLogin();
