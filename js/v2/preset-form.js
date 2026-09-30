// v2/preset-form.js — 파티 프리셋 만들기 · 수정 창 (이름 + 캐릭터 고르기)

import { el } from '../utils.js';
import { savePreset, makeId } from './store.js';
import { openModal, field } from './modal.js';
import { createCharacterPicker } from './character-picker.js';

export function openPresetForm(preset, rerender) {
  const nameInput = el('input', { className: 'text-input', type: 'text', value: preset?.name || '', placeholder: '예: 칼로스 팟' });
  const picker = createCharacterPicker({ initial: preset?.characterIds || [] });
  const errMsg = el('div', { className: 'dialog-error' });

  const save = async () => {
    const name = nameInput.value.trim();
    const characterIds = picker.getSelected();
    if (!name) { errMsg.textContent = '파티 이름을 적어 주세요.'; return; }
    if (characterIds.length === 0) { errMsg.textContent = '캐릭터를 한 명 이상 골라 주세요.'; return; }
    if (await savePreset({ id: preset?.id || makeId('p'), name, characterIds })) { close(); rerender(); }
  };

  const close = openModal({
    title: preset ? '파티 수정' : '파티 만들기',
    wide: true,
    body: el('div', { className: 'v2-form' }, field('파티 이름', nameInput), field('캐릭터', picker.node), errMsg),
    actions: [
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '취소'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: save }, '저장하기'),
    ],
  });
}
