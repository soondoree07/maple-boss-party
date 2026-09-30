// v2/character-picker.js — 캐릭터 여러 명 고르기 (유저별로 묶어서 표시)
//
// 한 줄 = 왼쪽 유저 이름 + 오른쪽 캐릭터 버튼들(넘치면 같은 세로선에서 다음 줄로).
// 외부 인원(기타)은 캐릭터 대신 "기타 - n +" 인원 수로 고른다 (members.js 참고).
// 지워진 캐릭터가 들어 있던 옛 기록을 고칠 때는 그 캐릭터를 그대로 남긴다(빼면 몫이 다시 나뉜다).

import { el } from '../utils.js';
import { getUsers, getCharactersOf } from './store.js';
import { externalSlotIds, isExternalCharacter, EXTERNAL_LABEL } from './members.js';

/**
 * @param {object} opts
 * @param {string[]} [opts.initial]   - 처음부터 골라 둘 캐릭터 id
 * @param {() => void} [opts.onChange]
 * @returns {{ node: HTMLElement, getSelected: () => string[], setSelected: (ids: string[]) => void }}
 */
export function createCharacterPicker({ initial = [], onChange = () => {} }) {
  const selected = new Set();
  const toggles = new Map(); // 우리 캐릭터 id → button
  const slots = externalSlotIds();
  let externalCount = 0;
  let deletedIds = []; // 지금은 없는 캐릭터 — 고를 수는 없고 그대로 유지만 한다
  const deletedRow = el('div', { className: 'v2-pick-group' });

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
    deletedIds = ids.filter(id => !toggles.has(id) && !isExternalCharacter(id));
    deletedRow.hidden = deletedIds.length === 0;
    deletedRow.replaceChildren(
      el('span', { className: 'v2-pick-user' }, '지운'),
      el('div', { className: 'v2-pick-chars' },
        deletedIds.map(() => el('span', { className: 'v2-pick-char active', 'aria-disabled': 'true' }, '(지운 캐릭터)')),
        el('small', { className: 'v2-ext-hint' }, '지금은 없는 캐릭터라 그대로 두고 나눠요'),
      ),
    );
    paint();
  };

  const ownGroups = getUsers()
    .filter(user => !user.isExternal)
    .map(user => ({ user, characters: getCharactersOf(user.id) }))
    .filter(group => group.characters.length > 0)
    .map(({ user, characters }) => el('div', { className: 'v2-pick-group' },
      el('span', { className: 'v2-pick-user' }, user.name),
      el('div', { className: 'v2-pick-chars' }, characters.map(ch => {
        const btn = el('button', {
          className: 'v2-pick-char', type: 'button',
          onclick: () => {
            if (selected.has(ch.id)) selected.delete(ch.id); else selected.add(ch.id);
            changed();
          },
        }, ch.name, ch.job ? el('small', null, ch.job) : null);
        toggles.set(ch.id, btn);
        return btn;
      })),
    ));

  const stepExternal = (delta) => {
    externalCount = Math.max(0, Math.min(slots.length, externalCount + delta));
    changed();
  };
  const externalGroup = slots.length > 0
    ? el('div', { className: 'v2-pick-group' },
        el('span', { className: 'v2-pick-user' }, EXTERNAL_LABEL),
        el('div', { className: 'v2-pick-chars' },
          el('div', { className: 'v2-ext-stepper' },
            el('button', { className: 'v2-pick-char', type: 'button', 'aria-label': '외부 인원 빼기', onclick: () => stepExternal(-1) }, '−'),
            countLabel,
            el('button', { className: 'v2-pick-char', type: 'button', 'aria-label': '외부 인원 더하기', onclick: () => stepExternal(1) }, '+'),
          ),
          el('small', { className: 'v2-ext-hint' }, '같이 간 외부 인원 수'),
        ),
      )
    : null;

  setSelected(initial);
  const node = el('div', { className: 'v2-picker' }, ownGroups, deletedRow, externalGroup);
  // 표시 순서(유저 순 → 캐릭터 순)대로, 외부 인원 자리표는 맨 뒤에.
  const getSelected = () => [
    ...[...toggles.keys()].filter(id => selected.has(id)),
    ...deletedIds,
    ...slots.slice(0, externalCount),
  ];
  return { node, getSelected, setSelected };
}
