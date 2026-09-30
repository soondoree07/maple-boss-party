// v2/character-picker.js — 캐릭터 여러 명 고르기 (유저별로 묶어서 표시)
//
// 기록 창(참여 캐릭터)과 관리 페이지(파티 프리셋 구성)에서 같이 쓴다.
// withPresets 면 위쪽에 파티 프리셋 버튼 — 누르면 그 구성으로 한 번에 바꾼다.

import { el } from '../utils.js';
import { getUsers, getCharactersOf, getPresets } from './store.js';

/**
 * @param {object} opts
 * @param {string[]} [opts.initial]   - 처음부터 골라 둘 캐릭터 id
 * @param {boolean} [opts.withPresets]
 * @param {() => void} [opts.onChange]
 * @returns {{ node: HTMLElement, getSelected: () => string[] }}
 */
export function createCharacterPicker({ initial = [], withPresets = false, onChange = () => {} }) {
  const selected = new Set(initial);
  const toggles = new Map(); // characterId → button

  const paint = () => {
    for (const [id, btn] of toggles) {
      const on = selected.has(id);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  };
  const changed = () => { paint(); onChange(); };

  const userGroups = getUsers()
    .map(user => ({ user, characters: getCharactersOf(user.id) }))
    .filter(group => group.characters.length > 0)
    .map(({ user, characters }) => el('div', { className: 'v2-pick-group' },
      el('span', { className: 'v2-pick-user' }, user.name),
      characters.map(ch => {
        const btn = el('button', {
          className: 'v2-pick-char', type: 'button',
          onclick: () => {
            if (selected.has(ch.id)) selected.delete(ch.id); else selected.add(ch.id);
            changed();
          },
        }, ch.name, ch.job ? el('small', null, ch.job) : null);
        toggles.set(ch.id, btn);
        return btn;
      }),
    ));

  const presetRow = withPresets && getPresets().length > 0
    ? el('div', { className: 'v2-pick-presets' },
        getPresets().map(preset => el('button', {
          className: 'btn btn-ghost btn-mini', type: 'button',
          onclick: () => {
            selected.clear();
            preset.characterIds.forEach(id => { if (toggles.has(id)) selected.add(id); });
            changed();
          },
        }, preset.name)),
      )
    : null;

  paint();
  const node = el('div', { className: 'v2-picker' }, presetRow, userGroups);
  // 표시 순서(유저 순 → 캐릭터 순)대로 돌려준다.
  const getSelected = () => [...toggles.keys()].filter(id => selected.has(id));
  return { node, getSelected };
}
