// v2/user-scheduler.js — 유저 캐릭터 창의 "스케줄러" 카드 목록
//
// 그 캐릭터가 스케줄러에 등록한 보스를 한 줄에 4개씩 카드로 보여 준다(초상화 · 이름 · 난이도).
// 이번 주에 잡은 보스(일간 보스 아카이럼은 오늘 잡은 것)는 회색으로 흐리게. 스케줄러는 유저 본인 키가 있어야 열린다.
// 초상화는 png/boss/<공백 뺀 이름>초상화.webp. 없는 보스는 보스 색 네모에 첫 글자.

import { el } from '../utils.js';
import { BOSSES, difficultyLabel } from '../data.js';
import { fetchScheduler } from './nexon.js';

const compact = (name) => String(name).replace(/\s+/g, '');
const BOSS_COLOR = new Map(BOSSES.map(b => [compact(b.name), b.color]));

/**
 * @param {{ id: string }} character
 * @param {Promise<boolean>} connected - 이 캐릭터 주인 유저가 스케줄러 키를 연결했는지
 */
export function renderUserScheduler(character, connected) {
  const body = el('div', { className: 'v2-sched-body' }, el('p', { className: 'form-hint' }, '스케줄러 불러오는 중..'));
  const section = el('section', { className: 'v2-section v2-user-card' },
    el('div', { className: 'v2-section-head' }, el('h2', { className: 'v2-section-title' }, '스케줄러')),
    body);

  connected.then(isConnected => {
    if (!isConnected) {
      body.replaceChildren(el('p', { className: 'form-hint' }, '스케줄러를 연결하면 등록한 보스가 보여요. 유저 관리에서 연결할 수 있어요.'));
      return null;
    }
    return fetchScheduler(character.id);
  }).then(result => {
    if (!result) return;
    if (!result.ok) { body.replaceChildren(el('p', { className: 'form-hint' }, result.message)); return; }
    const bosses = result.data.bosses;
    body.replaceChildren(bosses.length
      ? el('div', { className: 'v2-sched-grid' }, bosses.map(bossCard))
      : el('p', { className: 'form-hint' }, '스케줄러에 등록한 보스가 아직 없어요. 게임에서 보스를 등록하면 여기에 나와요.'));
  });
  return section;
}

function bossCard(boss) {
  const key = compact(boss.name);
  const fallback = el('span', { className: 'v2-sched-fallback', style: { background: BOSS_COLOR.get(key) || 'var(--text-tertiary)' } }, key.slice(0, 1));
  const img = el('img', { src: `png/boss/${key}초상화.webp`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(fallback)); // 초상화가 없는 보스
  const doneTitle = boss.daily ? '오늘 잡았어요' : '이번 주에 잡았어요';
  return el('div', { className: `v2-sched-card${boss.completed ? ' done' : ''}`, title: boss.completed ? doneTitle : '' },
    el('div', { className: 'v2-sched-img' }, img),
    el('strong', null, boss.name),
    el('span', null, difficultyLabel(boss.difficulty)));
}
