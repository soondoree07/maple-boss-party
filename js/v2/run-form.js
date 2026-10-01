// v2/run-form.js — 기록 추가 · 수정 창
//
// 날짜 → 참여 캐릭터 → 보스 칸 여러 개(보스 · 난이도 · 그 보스 드랍템).
// 저장하면 보스 칸마다 기록(run)이 하나씩 생긴다. 같은 주·같은 파티 기록은
// 메인 화면에서 카드 한 장으로 묶이므로, 나중에 같은 파티로 또 넣으면 그 카드에 더해진다.
// 수정은 기록 하나만 고친다(보스 칸 하나, 추가 버튼 없음).

import { el, todayStr, toast } from '../utils.js';
import { saveRun, saveNewRuns, makeId } from './store.js';
import { openModal, field } from './modal.js';
import { createCharacterPicker } from './character-picker.js';
import { createBossBlock } from './boss-block.js';
import { takerChoices } from './members.js';
import { createSchedulerSource, scheduleHint } from './scheduler-bosses.js';
import { isAutoRun, removeAutoRun, removeMergedAutoRuns } from './auto-runs.js';

/**
 * @param {object|null} existing - 수정할 기록 (새 기록이면 null)
 * @param {() => void} onSaved
 * @param {{ characterIds?: string[], date?: string }} [prefill] - 새 기록일 때 미리 골라 둘 파티 · 날짜
 */
export function openRunForm(existing, onSaved, prefill = {}) {
  const dateInput = el('input', { className: 'text-input', type: 'date', value: existing?.date || prefill.date || todayStr() });
  const errMsg = el('div', { className: 'dialog-error' });

  const blocks = [];
  const blocksBox = el('div', { className: 'v2-boss-blocks' });
  const refreshBlocks = () => blocks.forEach(block => block.refresh());

  // 고른 캐릭터들의 스케줄러 등록 보스 → 보스 칸 목록 묶음 · 등록 난이도
  const scheduleHintNode = el('p', { className: 'form-hint v2-schedule-hint', hidden: true });
  const schedule = createSchedulerSource((state) => {
    blocks.forEach(block => block.refreshSchedule());
    scheduleHintNode.textContent = scheduleHint(state);
    scheduleHintNode.hidden = !scheduleHintNode.textContent;
  });

  const picker = createCharacterPicker({
    initial: existing?.characterIds || prefill.characterIds || [],
    onChange: () => { refreshBlocks(); schedule.update(picker.getSelected()); },
  });
  schedule.update(picker.getSelected());

  const addBlock = (existingRun = null) => {
    const block = createBossBlock({
      existing: existingRun,
      getParticipants: () => takerChoices(picker.getSelected()),
      getHeadcount: () => picker.getSelected().length,
      getSchedule: schedule.get,
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

  // 넓은 화면에서는 왼쪽 = 날짜 · 파티, 오른쪽 = 보스 칸 (좁으면 위아래로 쌓인다)
  const body = el('div', { className: 'v2-form v2-run-form' },
    el('div', { className: 'v2-run-form-side' },
      el('div', { className: 'v2-date-row' }, el('label', { className: 'form-label' }, '날짜'), dateInput),
      field('참여 캐릭터', picker.node),
    ),
    el('div', { className: 'v2-run-form-main' },
      field(existing ? '보스' : '보스 (잡은 순서대로 추가)', scheduleHintNode, blocksBox,
        existing ? null : el('button', { className: 'btn btn-ghost v2-add-boss', type: 'button', onclick: () => addBlock() }, '+ 보스 추가')),
      errMsg,
    ),
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
    let ok = false;
    try {
      ok = await saveEntries(entries, characterIds);
    } finally {
      button.disabled = false; // 어떤 경우에도 버튼이 잠긴 채 남지 않게
    }
    if (ok) { close(); onSaved(); }
  };

  // 저장 규칙: 자동 기록을 고치면 새 일반 기록으로 바꾸고 자동 기록은 지운다("자동" 표시가 사라진다).
  // 저장한 뒤에는 파티원을 같은 기간 · 같은 보스 자동 기록에서 빼서 결정석이 두 번 잡히지 않게 한다.
  // 새 기록은 이미 저장됐으므로 정리가 실패해도 창은 닫고(다시 누르면 또 생긴다) 직접 지우도록 알린다.
  const saveEntries = async (entries, characterIds) => {
    const date = dateInput.value;
    let saved;
    let cleaned = true;
    if (existing && !isAutoRun(existing)) {
      saved = [{ ...existing, date, characterIds, ...entries[0] }];
      if (!(await saveRun(saved[0]))) return false;
    } else {
      saved = entries.map(entry => ({ id: makeId('r'), date, characterIds, ...entry }));
      if (!(await saveNewRuns(saved))) return false;
      if (existing) cleaned = await removeAutoRun(existing);
    }
    if (!(await removeMergedAutoRuns(saved, saved.map(run => run.id)))) cleaned = false;
    if (!cleaned) toast('기록은 저장했는데 겹치는 자동 기록을 정리하지 못했어요. 메인에서 "자동" 기록을 확인해 지워 주세요.', 'err', 8000);
    return true;
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
