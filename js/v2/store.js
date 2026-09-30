// v2/store.js — 유저 · 캐릭터 · 파티 프리셋 · 기록 (2026-09 개편 구조)
//
// 읽기는 인메모리 캐시에서 동기로, 쓰기는 서버 응답을 기다린 뒤 캐시에 반영한다.
// (옛 storage.js 의 낙관적 쓰기보다 느리지만, 순서 꼬임 걱정이 없다.)
// 다른 사람이 바꾸면 Realtime 으로 다시 불러오고 onRemoteChange 콜백을 부른다.
// 테이블 정의는 sql/v2-schema.sql.

import { supabase } from '../config.js';
import { toast } from '../utils.js';

const cache = { users: [], characters: [], presets: [], runs: [] };
let remoteCb = null;

export function onRemoteChange(cb) { remoteCb = cb; }

// ── row ↔ 앱 객체 ─────────────────────────────────────

const asArray = (v) => (Array.isArray(v) ? v : []);

const userFromRow = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order, isExternal: r.is_external });
const charFromRow = (r) => ({ id: r.id, userId: r.user_id, name: r.name, job: r.job, sortOrder: r.sort_order });
const presetFromRow = (r) => ({ id: r.id, name: r.name, characterIds: asArray(r.character_ids) });
const runFromRow = (r) => ({
  id: r.id,
  date: r.date,
  boss: r.boss,
  difficulty: r.difficulty,
  crystal: r.crystal == null ? 0 : Number(r.crystal),
  characterIds: asArray(r.character_ids),
  loot: asArray(r.loot),
  createdAt: r.created_at,
});
const runToRow = (x) => ({
  id: x.id,
  date: x.date,
  boss: x.boss,
  difficulty: x.difficulty,
  crystal: x.crystal,
  character_ids: x.characterIds,
  loot: x.loot,
  ...(x.createdAt ? { created_at: x.createdAt } : {}), // 수정할 때는 처음 저장한 시각을 그대로 둔다
});

const bySortThenName = (a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'ko');
const byNewest = (a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt));

// ── 로드 + Realtime ───────────────────────────────────

async function loadAll() {
  const [u, c, p, r] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('characters').select('*'),
    supabase.from('party_presets').select('*'),
    supabase.from('runs').select('*'),
  ]);
  const err = u.error || c.error || p.error || r.error;
  if (err) throw err;
  cache.users = (u.data || []).map(userFromRow).sort(bySortThenName);
  cache.characters = (c.data || []).map(charFromRow).sort(bySortThenName);
  cache.presets = (p.data || []).map(presetFromRow).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  cache.runs = (r.data || []).map(runFromRow).sort(byNewest);
}

export async function init() {
  await loadAll();
  try {
    const channel = supabase.channel('maple-boss-v2');
    for (const table of ['users', 'characters', 'party_presets', 'runs']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, reloadFromRemote);
    }
    channel.subscribe();
  } catch (e) {
    console.error('[v2/store] realtime 구독 실패:', e);
  }
}

async function reloadFromRemote() {
  try {
    await loadAll();
    if (remoteCb) remoteCb();
  } catch (e) { console.error('[v2/store] realtime reload 실패:', e); }
}

// ── 읽기 ──────────────────────────────────────────────

export const getUsers = () => cache.users;
export const getUser = (id) => cache.users.find(u => u.id === id) || null;
export const getCharacters = () => cache.characters;
export const getCharacter = (id) => cache.characters.find(c => c.id === id) || null;
export const getCharactersOf = (userId) => cache.characters.filter(c => c.userId === userId);
export const getPresets = () => cache.presets;
export const getRuns = () => cache.runs;

// ── 쓰기 (서버 성공 후 다시 불러와 캐시 갱신) ──────────

/**
 * 서버 작업 하나를 실행하고, 성공하면 전체를 다시 불러온다.
 * @returns {Promise<boolean>} 성공 여부 (실패하면 안내 토스트를 띄운다)
 */
async function write(label, request) {
  const { error } = await request;
  if (error) {
    console.error(`[v2/store] ${label} 실패:`, error);
    toast(`${label}에 실패했어요. 잠시 후 다시 시도해 주세요.`, 'err');
    return false;
  }
  await loadAll();
  return true;
}

export const makeId = (prefix) => `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

export const saveRun = (run) =>
  write('기록 저장', supabase.from('runs').upsert(runToRow(run), { onConflict: 'id' }));
/** 새 기록 여러 개를 한 번에 저장한다. 배열 순서대로 저장 시각을 1ms씩 벌려 카드 안 순서를 지킨다. */
export function saveNewRuns(runs) {
  const base = Date.now();
  const rows = runs.map((run, i) => runToRow({ ...run, createdAt: new Date(base + i).toISOString() }));
  return write('기록 저장', supabase.from('runs').insert(rows));
}
export const deleteRun = (id) =>
  write('기록 삭제', supabase.from('runs').delete().eq('id', id));

export const saveUser = (user) =>
  write('유저 저장', supabase.from('users').upsert({
    id: user.id, name: user.name, sort_order: user.sortOrder ?? 50, is_external: !!user.isExternal,
  }, { onConflict: 'id' }));
export const deleteUser = (id) =>
  write('유저 삭제', supabase.from('users').delete().eq('id', id));

export const saveCharacter = (ch) =>
  write('캐릭터 저장', supabase.from('characters').upsert({
    id: ch.id, user_id: ch.userId, name: ch.name, job: ch.job || '', sort_order: ch.sortOrder ?? 50,
  }, { onConflict: 'id' }));
export const deleteCharacter = (id) =>
  write('캐릭터 삭제', supabase.from('characters').delete().eq('id', id));

export const savePreset = (preset) =>
  write('파티 저장', supabase.from('party_presets').upsert({
    id: preset.id, name: preset.name, character_ids: preset.characterIds,
  }, { onConflict: 'id' }));
export const deletePreset = (id) =>
  write('파티 삭제', supabase.from('party_presets').delete().eq('id', id));

/** 사이트 비밀번호 서버 검사. */
export async function verifySitePw(pin) {
  const { data, error } = await supabase.rpc('verify_site_pw', { p_candidate: String(pin ?? '') });
  if (error) { console.error('[v2/store] verify_site_pw 실패:', error); return false; }
  return data === true;
}
