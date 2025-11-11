import { createClient } from '@supabase/supabase-js';

// Force correct Supabase credentials (override Bolt.new environment)
const CORRECT_SUPABASE_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const CORRECT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabaseUrl = CORRECT_SUPABASE_URL;
const supabaseAnonKey = CORRECT_SUPABASE_ANON_KEY;

console.log('🔧 Using CORRECTED Supabase URL:', supabaseUrl);
console.log('📍 Project URL from env would have been:', import.meta.env.VITE_SUPABASE_URL);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
