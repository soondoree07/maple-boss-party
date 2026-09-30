// v2/manage.js — 유저 · 캐릭터 관리 페이지 (#/manage)

import { el, clear, confirmDialog } from '../utils.js';
import {
  getUsers, getCharactersOf,
  saveUser, deleteUser, saveCharacter, deleteCharacter, makeId,
} from './store.js';
import { openModal, field } from './modal.js';

export function renderManage(container, rerender) {
  clear(container);

  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 기록으로'),
    el('h1', { className: 'page-title' }, '유저 관리'),
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
      // 기타(외부 인원) 유저는 지우면 외부 인원이 섞인 기록이 모두 깨지므로 삭제를 막는다.
      user && !user.isExternal ? el('button', { className: 'btn btn-danger', type: 'button', onclick: remove }, '삭제하기') : null,
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
