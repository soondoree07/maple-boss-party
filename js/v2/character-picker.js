// v2/character-picker.js — 캐릭터 여러 명 고르기 (유저별로 묶어서 표시)
//
// 기록 창(참여 캐릭터)과 관리 페이지(파티 프리셋 구성)에서 같이 쓴다.
// withPresets 면 위쪽에 파티 프리셋 버튼 — 누르면 그 구성으로 한 번에 바꾼다.
// 외부 인원(기타)은 캐릭터 대신 "기타 - n +" 인원 수로 고른다 (members.js 참고).

import { el } from '../utils.js';
import { getUsers, getCharactersOf, getPresets } from './store.js';
import { externalSlotIds, isExternalCharacter, EXTERNAL_LABEL } from './members.js';

/**
 * @param {object} opts
 * @param {string[]} [opts.initial]   - 처음부터 골라 둘 캐릭터 id
 * @param {boolean} [opts.withPresets]
 * @param {() => void} [opts.onChange]
 * @returns {{ node: HTMLElement, getSelected: () => string[], setSelected: (ids: string[]) => void }}
 */
export function createCharacterPicker({ initial = [], withPresets = false, onChange = () => {} }) {
  const selected = new Set();
  const toggles = new Map(); // 우리 캐릭터 id → button
  const slots = externalSlotIds();
  let externalCount = 0;

  const countLabel = el('span', { className: 'v2-ext-count' });
  const paint = () => {
    for (const [id, btn] of toggles) {
      const on = selected.has(id);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    countLabel.textContent = `${externalCount}명`;
    countLabel.classList.toggle('active', externalCount > 0);
  };
  const changed = () => { paint(); onChange(); };

  const setSelected = (ids) => {
    selected.clear();
    ids.forEach(id => { if (toggles.has(id)) selected.add(id); });
    externalCount = Math.min(ids.filter(isExternalCharacter).length, slots.length);
    paint();
  };

  const ownGroups = getUsers()
    .filter(user => !user.isExternal)
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

  const stepExternal = (delta) => {
    externalCount = Math.max(0, Math.min(slots.length, externalCount + delta));
    changed();
  };
  const externalGroup = slots.length > 0
    ? el('div', { className: 'v2-pick-group' },
        el('span', { className: 'v2-pick-user' }, EXTERNAL_LABEL),
        el('div', { className: 'v2-ext-stepper' },
          el('button', { className: 'v2-pick-char', type: 'button', 'aria-label': '외부 인원 빼기', onclick: () => stepExternal(-1) }, '−'),
          countLabel,
          el('button', { className: 'v2-pick-char', type: 'button', 'aria-label': '외부 인원 더하기', onclick: () => stepExternal(1) }, '+'),
        ),
        el('small', { className: 'v2-ext-hint' }, '같이 간 외부 인원 수'),
      )
    : null;

  const presetRow = withPresets && getPresets().length > 0
    ? el('div', { className: 'v2-pick-presets' },
        getPresets().map(preset => el('button', {
          className: 'btn btn-ghost btn-mini', type: 'button',
          onclick: () => { setSelected(preset.characterIds); onChange(); },
        }, preset.name)),
      )
    : null;

  setSelected(initial);
  const node = el('div', { className: 'v2-picker' }, presetRow, ownGroups, externalGroup);
  // 표시 순서(유저 순 → 캐릭터 순)대로, 외부 인원 자리표는 맨 뒤에.
  const getSelected = () => [
    ...[...toggles.keys()].filter(id => selected.has(id)),
    ...slots.slice(0, externalCount),
  ];
  return { node, getSelected, setSelected };
}
