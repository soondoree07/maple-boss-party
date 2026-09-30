// v2/run-form.js — 기록 추가 · 수정 창
//
// 날짜 → 참여 캐릭터(프리셋 가능) → 보스 칸 여러 개(보스 · 난이도 · 그 보스 드랍템).
// 저장하면 보스 칸마다 기록(run)이 하나씩 생긴다. 같은 주·같은 파티 기록은
// 메인 화면에서 카드 한 장으로 묶이므로, 나중에 같은 파티로 또 넣으면 그 카드에 더해진다.
// 수정은 기록 하나만 고친다(보스 칸 하나, 추가 버튼 없음).

import { el, todayStr } from '../utils.js';
import { saveRun, saveNewRuns, makeId, getRuns } from './store.js';
import { openModal, field } from './modal.js';
import { createCharacterPicker } from './character-picker.js';
import { createBossBlock } from './boss-block.js';
import { takerChoices } from './members.js';

/**
 * @param {object|null} existing - 수정할 기록 (새 기록이면 null)
 * @param {() => void} onSaved
 * @param {{ characterIds?: string[] }} [prefill] - 새 기록일 때 미리 골라 둘 파티
 */
export function openRunForm(existing, onSaved, prefill = {}) {
  const lastRun = getRuns()[0];
  const dateInput = el('input', { className: 'text-input', type: 'date', value: existing?.date || todayStr() });
  const errMsg = el('div', { className: 'dialog-error' });

  const blocks = [];
  const blocksBox = el('div', { className: 'v2-boss-blocks' });
  const refreshBlocks = () => blocks.forEach(block => block.refresh());

  const picker = createCharacterPicker({
    initial: existing?.characterIds || prefill.characterIds || [],
    withPresets: true,
    onChange: refreshBlocks,
  });

  const addBlock = (existingRun = null) => {
    const previous = blocks[blocks.length - 1]?.current();
    const block = createBossBlock({
      existing: existingRun,
      defaultBoss: previous ? undefined : lastRun?.boss,
      defaultDifficulty: previous ? undefined : lastRun?.difficulty,
      getParticipants: () => takerChoices(picker.getSelected()),
      getHeadcount: () => picker.getSelected().length,
      onRemove: existing ? null : () => {
        if (blocks.length === 1) return; // 보스 칸은 하나 이상 남긴다
        blocks.splice(blocks.indexOf(block), 1);
        block.node.remove();
      },
    });
    blocks.push(block);
    blocksBox.appendChild(block.node);
  };
  addBlock(existing);

  const body = el('div', { className: 'v2-form' },
    field('날짜', dateInput),
    field('참여 캐릭터', picker.node),
    field(existing ? '보스' : '보스 (잡은 순서대로 추가)', blocksBox,
      existing ? null : el('button', { className: 'btn btn-ghost btn-mini v2-add-boss', type: 'button', onclick: () => addBlock() }, '+ 보스 추가')),
    errMsg,
  );

  const save = async (e) => {
    const button = e.currentTarget; // await 뒤에는 currentTarget 이 비므로 미리 잡아 둔다
    errMsg.textContent = '';
    const characterIds = picker.getSelected();
    if (!dateInput.value) { errMsg.textContent = '날짜를 골라 주세요.'; return; }
    if (characterIds.length === 0) { errMsg.textContent = '참여한 캐릭터를 한 명 이상 골라 주세요.'; return; }

    const entries = [];
    for (const block of blocks) {
      const entry = block.read();
      if (entry.error) { errMsg.textContent = entry.error; return; }
      entries.push(entry);
    }

    button.disabled = true;
    const ok = existing
      ? await saveRun({ ...existing, date: dateInput.value, characterIds, ...entries[0] })
      : await saveNewRuns(entries.map(entry => ({ id: makeId('r'), date: dateInput.value, characterIds, ...entry })));
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
