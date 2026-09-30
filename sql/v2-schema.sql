-- v2-schema.sql — 유저 · 캐릭터 · 기록 구조 (2026-09-30 개편)
-- (party_presets 는 처음에 만들었지만 화면에서는 쓰지 않는다. 테이블만 남아 있다.)
--
-- 기존 테이블(parties / boss_runs / reservations / boss_settings)은 건드리지 않는다.
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번 실행한다. 다시 실행해도 안전하다.

create extension if not exists pgcrypto;

-- ── 유저 ────────────────────────────────────────────
-- is_external = true 인 유저(기타)는 수익 총합·순위에서 제외한다.
create table if not exists users (
  id          text primary key,
  name        text not null,
  sort_order  int  not null default 0,
  is_external boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── 캐릭터 ──────────────────────────────────────────
create table if not exists characters (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  name        text not null,
  job         text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 파티 프리셋 (자주 같이 가는 캐릭터 묶음) ────────
create table if not exists party_presets (
  id            text primary key,
  name          text not null,
  character_ids jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- ── 보스 기록 ───────────────────────────────────────
-- crystal       : 기록 시점의 결정석 가격(억). 가격표가 바뀌어도 과거 기록은 그대로.
-- character_ids : 참여 캐릭터 id 배열. 결정석은 crystal ÷ 인원수 로 캐릭터마다 나눈다.
-- loot          : [{ name, price, mode: 'split' | 'solo', takerCharacterId? }]
create table if not exists runs (
  id            text primary key,
  date          date not null,
  boss          text not null,
  difficulty    text not null,
  crystal       numeric,
  character_ids jsonb not null default '[]'::jsonb,
  loot          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists runs_date_idx on runs (date desc);

-- ── 사이트 전체 비밀번호 ────────────────────────────
-- pw_hash 는 클라이언트가 읽을 수 없다(정책 없음). 검사는 verify_site_pw RPC 로만.
create table if not exists site_settings (
  id      int primary key default 1 check (id = 1),
  pw_hash text
);
insert into site_settings (id, pw_hash)
values (1, encode(digest('1212', 'sha256'), 'hex'))
on conflict (id) do nothing; -- 다시 실행해도 바꾼 비밀번호를 되돌리지 않는다

create or replace function verify_site_pw(p_candidate text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from site_settings
    where id = 1 and pw_hash = encode(digest(coalesce(p_candidate, ''), 'sha256'), 'hex')
  );
$$;
grant execute on function verify_site_pw(text) to anon, authenticated;

-- ── RLS: 기존과 같은 "그냥 공유" (링크 가진 사람은 읽고 쓰기) ──
alter table users         enable row level security;
alter table characters    enable row level security;
alter table party_presets enable row level security;
alter table runs          enable row level security;
alter table site_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['users', 'characters', 'party_presets', 'runs'] loop
    execute format('grant select, insert, update, delete on %I to anon, authenticated', t);
    execute format('drop policy if exists "shared_all" on %I', t);
    execute format('create policy "shared_all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime: 다른 사람이 기록하면 화면이 바로 갱신되도록.
do $$
declare t text;
begin
  foreach t in array array['users', 'characters', 'party_presets', 'runs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ── 초기 데이터: 유저 7명 · 캐릭터 9개 ─────────────
insert into users (id, name, sort_order, is_external) values
  ('u-ingjjang', '잉짱', 1, false),
  ('u-gombeom',  '곰범', 2, false),
  ('u-mimdu',    '밈두', 3, false),
  ('u-jjuhi',    '쭈히', 4, false),
  ('u-myerin',   '몌린', 5, false),
  ('u-hyeokju',  '혁쥬', 6, false),
  ('u-etc',      '기타', 99, true)
on conflict (id) do nothing;

insert into characters (id, user_id, name, job, sort_order) values
  ('c-ingjjang',       'u-ingjjang', '잉짱',         '아델',           1),
  ('c-idoluingjjang',  'u-ingjjang', '아이도루잉짱', '엔젤릭버스터',   2),
  ('c-mimdu',          'u-mimdu',    '밈두',         '나이트워커',     1),
  ('c-gungduya',       'u-mimdu',    '궁두야',       '보우마스터',     2),
  ('c-hwinggombeom',   'u-gombeom',  '휭곰범',       '보우마스터',     1),
  ('c-jjuhi',          'u-jjuhi',    '쭈히',         '아델',           1),
  ('c-hyeokju',        'u-hyeokju',  '혁쥬',         '비숍',           1),
  ('c-minmyerin',      'u-myerin',   '민몌린',       '히어로',         1),
  ('c-minhyeoksulsa',  'u-myerin',   '민혁술사',     '레테',           2),
  -- 외부 인원 자리표: 기록 창의 "기타 − n +" 가 인원 수만큼 채워 쓴다(화면에는 이름 대신 "기타").
  ('c-ext1', 'u-etc', '외부1', '', 1), ('c-ext2', 'u-etc', '외부2', '', 2), ('c-ext3', 'u-etc', '외부3', '', 3),
  ('c-ext4', 'u-etc', '외부4', '', 4), ('c-ext5', 'u-etc', '외부5', '', 5)
on conflict (id) do nothing;
