// v2/run-form.js — 기록 추가 · 수정 창
//
// 날짜 → 보스 → 난이도 → 참여 캐릭터(프리셋 가능) → 드랍템.
// 결정석은 저장하는 순간의 가격표 값을 기록에 같이 저장한다(가격이 바뀌어도 과거 기록 유지).
// 수정할 때 보스·난이도를 그대로 두면 처음 저장한 결정석을 그대로 쓴다.

import { el, todayStr } from '../utils.js';
import {
  bossesInOrder, isBossVisible, getBossDifficulties, difficultyLabel,
  getEffectiveCrystal, getBossLoot,
} from '../data.js';
import { saveRun, makeId, getCharacter, getRuns } from './store.js';
import { formatEok } from './calc.js';
import { openModal, field } from './modal.js';
import { createCharacterPicker } from './character-picker.js';
import { createLootEditor } from './loot-editor.js';

/**
 * @param {object|null} existing - 수정할 기록 (새 기록이면 null)
 * @param {() => void} onSaved
 */
export function openRunForm(existing, onSaved) {
  const lastRun = getRuns()[0];
  const bosses = bossesInOrder().filter(b => isBossVisible(b.id) || b.id === existing?.boss);

  const dateInput = el('input', { className: 'text-input', type: 'date', value: existing?.date || todayStr() });
  const bossSelect = el('select', { className: 'select-input' },
    bosses.map(b => el('option', { value: b.id }, b.name)));
  bossSelect.value = existing?.boss || lastRun?.boss || bosses[0].id;
  const diffSelect = el('select', { className: 'select-input' });
  const crystalInfo = el('div', { className: 'form-hint' });
  const errMsg = el('div', { className: 'dialog-error' });

  const fillDifficulties = (preferred) => {
    const diffs = getBossDifficulties(bossSelect.value);
    diffSelect.replaceChildren(...diffs.map(d => el('option', { value: d.key }, difficultyLabel(d.key))));
    diffSelect.value = diffs.some(d => d.key === preferred) ? preferred : diffs[diffs.length - 1].key;
  };
  fillDifficulties(existing?.difficulty || lastRun?.difficulty);

  const currentCrystal = () => {
    const unchanged = existing && existing.boss === bossSelect.value && existing.difficulty === diffSelect.value;
    return unchanged ? existing.crystal : getEffectiveCrystal(bossSelect.value, diffSelect.value);
  };

  let picker = null;
  const participants = () => picker.getSelected().map(id => ({ id, name: getCharacter(id)?.name || id }));

  const lootEditor = createLootEditor({
    getCandidates: () => getBossLoot(bossSelect.value, diffSelect.value).map(l => l.name),
    getParticipants: participants,
    initial: existing?.loot || [],
  });

  const refreshInfo = () => {
    const crystal = currentCrystal();
    const headcount = picker.getSelected().length;
    crystalInfo.textContent = headcount > 0
      ? `결정석 ${formatEok(crystal)} · ${headcount}명이면 1인 ${formatEok(crystal / headcount)}`
      : `결정석 ${formatEok(crystal)}`;
    lootEditor.refresh();
  };

  picker = createCharacterPicker({ initial: existing?.characterIds || [], withPresets: true, onChange: refreshInfo });
  bossSelect.addEventListener('change', () => { fillDifficulties(diffSelect.value); refreshInfo(); });
  diffSelect.addEventListener('change', refreshInfo);
  refreshInfo();

  const body = el('div', { className: 'v2-form' },
    el('div', { className: 'form-row' },
      field('날짜', dateInput),
      field('보스', bossSelect),
      field('난이도', diffSelect),
    ),
    crystalInfo,
    field('참여 캐릭터', picker.node),
    field('드랍템', lootEditor.node),
    errMsg,
  );

  const save = async (e) => {
    const button = e.currentTarget; // await 뒤에는 currentTarget 이 비므로 미리 잡아 둔다
    errMsg.textContent = '';
    const characterIds = picker.getSelected();
    if (!dateInput.value) { errMsg.textContent = '날짜를 골라 주세요.'; return; }
    if (characterIds.length === 0) { errMsg.textContent = '참여한 캐릭터를 한 명 이상 골라 주세요.'; return; }
    const loot = lootEditor.readItems();
    if (loot.error) { errMsg.textContent = loot.error; return; }

    button.disabled = true;
    const ok = await saveRun({
      id: existing?.id || makeId('r'),
      date: dateInput.value,
      boss: bossSelect.value,
      difficulty: diffSelect.value,
      crystal: currentCrystal(),
      characterIds,
      loot: loot.items,
    });
    button.disabled = false;
    if (ok) { close(); onSaved(); }
  };

  const close = openModal({
    title: existing ? '기록 수정' : '기록 추가',
    body,
    wide: true,
    actions: [
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '취소'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: save }, existing ? '수정하기' : '기록하기'),
    ],
  });
}
