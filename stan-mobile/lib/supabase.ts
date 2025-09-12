import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zcxsjxnecztynidmqpee.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHNqeG5lY3p0eW5pZG1xcGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNzg2MDEsImV4cCI6MjA3Mjg1NDYwMX0.YVPW39mLLkrFmtj0CEd6gnPkQtqbSlloKWOCKZCC67A';

console.log('Supabase config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
});