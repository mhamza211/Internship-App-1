import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bvonjwljasqmtanifioc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2b25qd2xqYXNxbXRhbmlmaW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTgzODAsImV4cCI6MjA5Njc3NDM4MH0.VIqC_bgi8l1uncpdzFM1sK6iA8HCdHC3V_YF8BkQ1S4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
  global: {
    headers: {},
  },
});

