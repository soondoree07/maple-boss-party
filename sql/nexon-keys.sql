-- nexon-keys.sql — 유저별 넥슨 API 키 (스케줄러 연결, 2026-10-01)
--
-- 스케줄러 API 는 키 주인 계정의 캐릭터만 열어 주므로 유저마다 자기 키를 둔다.
-- RLS 를 켜고 정책을 하나도 두지 않는다 → 사이트(publishable 키)로는 읽기 · 쓰기 모두 막힌다.
-- 서버 함수(api/_lib/db.js)만 Secret key 로 읽고 쓴다.
--
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번 실행한다. 다시 실행해도 안전하다.

create table if not exists nexon_keys (
  user_id    text primary key references users(id) on delete cascade,
  api_key    text not null,
  updated_at timestamptz not null default now()
);

alter table nexon_keys enable row level security;
revoke all on table nexon_keys from anon, authenticated;
