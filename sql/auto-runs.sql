-- auto-runs.sql — 스케줄러 자동 기록에서 "다시 만들지 않을" 기록 목록 (2026-10-01)
--
-- 스케줄러에서 잡은 보스는 혼자 잡은 기록(id = r-auto-<캐릭터>-<보스>-<주 시작일>)으로 자동 저장된다.
-- 사용자가 그 자동 기록을 지우거나, 파티 기록으로 합치거나, 수정해서 새 기록으로 바꾸면
-- 그 id 를 여기에 남겨 다음 가져오기에서 같은 기록을 다시 만들지 않는다.
-- runs 와 같은 "그냥 공유" 정책 (사이트에서 읽고 쓴다).
--
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번 실행한다. 다시 실행해도 안전하다.

create table if not exists auto_run_skips (
  id         text primary key,
  created_at timestamptz not null default now()
);

alter table auto_run_skips enable row level security;
grant select, insert, update, delete on auto_run_skips to anon, authenticated;
drop policy if exists "shared_all" on auto_run_skips;
create policy "shared_all" on auto_run_skips for all using (true) with check (true);
