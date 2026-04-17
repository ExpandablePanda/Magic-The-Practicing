import { createClient } from '@supabase/supabase-js';

// These should be moved to environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing! Cloud sync will be disabled.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { 
      auth: { 
        getSession: async () => ({ data: { session: null } }), 
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {},
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ error: { message: 'Supabase not configured' } }),
        getUser: async () => ({ data: { user: null } })
      },
      from: () => ({ upsert: async () => ({ error: { message: 'Supabase not configured' } }) })
    };

