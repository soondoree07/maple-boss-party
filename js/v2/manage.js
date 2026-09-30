// v2/manage.js — 유저 · 캐릭터 · 파티 프리셋 관리 페이지 (#/manage)

import { el, clear, confirmDialog } from '../utils.js';
import {
  getUsers, getCharactersOf, getPresets,
  saveUser, deleteUser, saveCharacter, deleteCharacter, deletePreset, makeId,
} from './store.js';
import { memberLabels } from './members.js';
import { openModal, field } from './modal.js';
import { openPresetForm } from './preset-form.js';

export function renderManage(container, rerender) {
  clear(container);

  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 기록으로'),
    el('h1', { className: 'page-title' }, '유저·파티 관리'),
    el('div', { className: 'header-actions' }),
  ));

  container.appendChild(el('main', { className: 'v2-home' },
    el('section', { className: 'v2-section' },
      el('div', { className: 'v2-section-head' },
        el('h2', { className: 'v2-section-title' }, '유저와 캐릭터'),
        el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openUserForm(null, rerender) }, '+ 유저 추가'),
      ),
      el('div', { className: 'v2-manage-grid' }, getUsers().map(user => renderUserCard(user, rerender))),
    ),
    el('section', { className: 'v2-section' },
      el('div', { className: 'v2-section-head' },
        el('h2', { className: 'v2-section-title' }, '파티'),
        el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openPresetForm(null, rerender) }, '+ 파티 만들기'),
      ),
      getPresets().length === 0
        ? el('p', { className: 'form-hint' }, '자주 같이 가는 캐릭터를 파티로 묶어 두면 기록할 때 한 번에 고를 수 있어요.')
        : el('div', { className: 'v2-manage-grid' }, getPresets().map(preset => renderPresetCard(preset, rerender))),
    ),
  ));
}

function renderUserCard(user, rerender) {
  return el('div', { className: 'v2-manage-card' },
    el('div', { className: 'v2-manage-card-head' },
      el('strong', null, user.name),
      user.isExternal ? el('small', null, '수익 합계에서 빠져요') : null,
      el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openUserForm(user, rerender) }, '수정'),
    ),
    // 외부 인원은 기록할 때 인원 수로만 고르므로 자리표 캐릭터를 보여 주지 않는다.
    user.isExternal
      ? el('p', { className: 'form-hint' }, `기록할 때 외부 인원 수(최대 ${getCharactersOf(user.id).length}명)만 골라요.`)
      : [
          ...getCharactersOf(user.id).map(ch => el('div', { className: 'v2-manage-row' },
            el('span', null, ch.name, ch.job ? el('small', null, ch.job) : null),
            el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openCharacterForm(ch, user.id, rerender) }, '수정'),
          )),
          el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openCharacterForm(null, user.id, rerender) }, '+ 캐릭터'),
        ],
  );
}

function renderPresetCard(preset, rerender) {
  const remove = async () => {
    const ok = await confirmDialog({
      title: '파티 삭제', message: `"${preset.name}" 파티를 지울까요?\n지금까지 남긴 기록은 그대로 남아요.`,
      confirmText: '삭제하기', danger: true,
    });
    if (ok && await deletePreset(preset.id)) rerender();
  };
  return el('div', { className: 'v2-manage-card' },
    el('div', { className: 'v2-manage-card-head' },
      el('strong', null, preset.name),
      el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openPresetForm(preset, rerender) }, '수정'),
      el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: remove }, '삭제'),
    ),
    el('div', { className: 'v2-run-members' },
      memberLabels(preset.characterIds).map(name => el('span', { className: 'member-chip' }, name))),
  );
}

function openUserForm(user, rerender) {
  const nameInput = el('input', { className: 'text-input', type: 'text', value: user?.name || '', placeholder: '유저 이름' });
  const errMsg = el('div', { className: 'dialog-error' });

  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) { errMsg.textContent = '이름을 적어 주세요.'; return; }
    if (await saveUser({ ...(user || { id: makeId('u'), sortOrder: 50 }), name })) { close(); rerender(); }
  };
  const remove = async () => {
    const ok = await confirmDialog({
      title: '유저 삭제', message: `"${user.name}"와 캐릭터를 모두 지울까요?\n지난 기록에는 캐릭터 이름 대신 "(지운 캐릭터)"로 나와요.`,
      confirmText: '삭제하기', danger: true,
    });
    if (ok && await deleteUser(user.id)) { close(); rerender(); }
  };

  const close = openModal({
    title: user ? '유저 수정' : '유저 추가',
    body: el('div', { className: 'v2-form' }, field('이름', nameInput), errMsg),
    actions: [
      user ? el('button', { className: 'btn btn-danger', type: 'button', onclick: remove }, '삭제하기') : null,
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '취소'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: save }, '저장하기'),
    ],
  });
}

function openCharacterForm(character, userId, rerender) {
  const nameInput = el('input', { className: 'text-input', type: 'text', value: character?.name || '', placeholder: '닉네임' });
  const jobInput = el('input', { className: 'text-input', type: 'text', value: character?.job || '', placeholder: '직업' });
  const errMsg = el('div', { className: 'dialog-error' });

  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) { errMsg.textContent = '닉네임을 적어 주세요.'; return; }
    const base = character || { id: makeId('c'), userId, sortOrder: getCharactersOf(userId).length + 1 };
    if (await saveCharacter({ ...base, name, job: jobInput.value.trim() })) { close(); rerender(); }
  };
  const remove = async () => {
    const ok = await confirmDialog({
      title: '캐릭터 삭제', message: `"${character.name}"을(를) 지울까요?\n지난 기록에는 "(지운 캐릭터)"로 나와요.`,
      confirmText: '삭제하기', danger: true,
    });
    if (ok && await deleteCharacter(character.id)) { close(); rerender(); }
  };

  const close = openModal({
    title: character ? '캐릭터 수정' : '캐릭터 추가',
    body: el('div', { className: 'v2-form' }, field('닉네임', nameInput), field('직업', jobInput), errMsg),
    actions: [
      character ? el('button', { className: 'btn btn-danger', type: 'button', onclick: remove }, '삭제하기') : null,
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '취소'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: save }, '저장하기'),
    ],
  });
}
