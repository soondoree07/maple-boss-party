// config.js — Supabase 연결 (공유 백엔드 2단계)
//
// Publishable 키는 공개돼도 되는 클라이언트용 키(브라우저 코드에 들어가는 게 정상).
// 진짜 방어선은 서버의 RLS 정책 + verify/delete RPC다.
// Secret 키(sb_secret_...)·service_role 은 절대 여기 넣지 않는다.
//
// supabase-js v2 — 빌드 시스템이 없으므로 ESM CDN에서 직접 로드.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://plunswlhklpbyihrnxwo.supabase.co';
// 신규 Publishable 키 (legacy anon JWT 폐기 후 교체).
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QS7kATj00xDO8-4oZ24teg_JWj8dR01';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
