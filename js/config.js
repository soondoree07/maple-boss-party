// config.js — Supabase 연결 (공유 백엔드 2단계)
//
// URL · anon 키는 공개돼도 되는 값(브라우저 코드에 들어가는 게 정상).
// 진짜 방어선은 서버의 RLS 정책이다. service_role 키는 절대 여기 넣지 않는다.
//
// supabase-js v2 — 빌드 시스템이 없으므로 ESM CDN에서 직접 로드.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://plunswlhklpbyihrnxwo.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdW5zd2xoa2xwYnlpaHJueHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTk4MjUsImV4cCI6MjA5NDQ5NTgyNX0.gtOq2kxPEKa4rjHmxxWWiLLBcfnnlS4K6HKsimtxaks';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
