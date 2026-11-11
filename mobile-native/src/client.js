import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// These two client-facing values are already published in the repository's
// public config.js. They are NOT secret/service_role keys. RLS is essential.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://tqnvvrgrsxrvzxbjbsgl.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_94x0ozPL38-3HJer2l5tqQ_BrpQZYH-';

export const db = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') db.auth.startAutoRefresh();
  else db.auth.stopAutoRefresh();
});

export function displayHandle(handle) {
  const value = String(handle || '');
  return /^patiyiz_[0-9a-f]{12}$/i.test(value)
    ? 'buchee_' + value.slice(8) : value;
}
export function readableError(error) {
  const message = String(error?.message || error || 'Bir hata oluştu.');
  if (/Failed to fetch|Network request failed/i.test(message)) return 'İnternet bağlantını kontrol et.';
  if (/Invalid login credentials/i.test(message)) return 'E-posta veya şifre hatalı.';
  if (/Email not confirmed/i.test(message)) return 'Önce e-posta adresini doğrula.';
  if (/already registered/i.test(message)) return 'Bu e-posta zaten kayıtlı.';
  if (/row.level security|permission denied/i.test(message)) return 'Bu işlem için yetkin bulunmuyor.';
  if (/exceed_cached_egress_quota|restricted|quota/i.test(message)) return 'Sunucuda geçici kullanım limiti var.';
  return message;
}
