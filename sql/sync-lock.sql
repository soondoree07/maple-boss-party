-- sync-lock.sql — 스케줄러 가져오기를 한 번에 하나만 돌게 하는 잠금 (2026-10-01)
--
-- 두 사람이 거의 동시에 사이트를 열면 가져오기가 두 번 돌아 같은 보스 기록이 두 건 생길 수 있었다.
-- 서버 함수(api/_lib/scheduler-sync.js)가 시작할 때 try_sync_lock 으로 잠그고, 끝나면 잠시 쉬는 시간을 두고 푼다.
-- 잠긴 동안 들어온 가져오기는 아무것도 하지 않는다. 넥슨 호출이 몰리는 것도 이걸로 막는다.
-- 서버(Secret key)만 쓴다: 표 · 함수 모두 anon 권한이 없다.
--
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번 실행한다. 다시 실행해도 안전하다.

create table if not exists sync_locks (
  name         text primary key,
  locked_until timestamptz not null
);

alter table sync_locks enable row level security;
revoke all on table sync_locks from anon, authenticated;

-- 잠금이 비어 있으면(기한이 지났으면) p_seconds 동안 잠그고 true, 누가 잡고 있으면 false.
create or replace function try_sync_lock(p_name text, p_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into sync_locks (name, locked_until)
  values (p_name, now() + make_interval(secs => p_seconds))
  on conflict (name) do update
    set locked_until = excluded.locked_until
    where sync_locks.locked_until < now();
  return found;
end;
$$;

revoke execute on function try_sync_lock(text, int) from public, anon, authenticated;
