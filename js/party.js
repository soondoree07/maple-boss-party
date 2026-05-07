// party.js — 메인 화면 (파티 카드 목록 + 새 파티 만들기 모달)

import * as Storage from './storage.js';
import { el, clear } from './utils.js';
import { exportToFile, importFromFile } from './backup.js';

/**
 * 메인 화면 전체 그리기.
 * @param {HTMLElement} container - 보통 #app
 */
export function renderPartyList(container) {
  clear(container);

  const parties = Storage.getParties();

  container.appendChild(buildHeader(container));

  const main = el('main', { className: 'party-list-main' });

  if (parties.length === 0) {
    main.appendChild(el('div', { className: 'empty-state' },
      el('p', null, '아직 만든 파티가 없어요'),
      el('p', { className: 'empty-state-sub' }, '아래 버튼으로 첫 파티를 만들어보세요'),
    ));
  } else {
    const grid = el('div', { className: 'party-grid' },
      parties.map(p => renderPartyCard(p, container))
    );
    main.appendChild(grid);
  }

  main.appendChild(el('button', {
    className: 'create-party-btn',
    onclick: () => openCreatePartyModal(container),
  }, '+ 새 파티 만들기'));

  container.appendChild(main);
}

function buildHeader(container) {
  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json',
    style: { display: 'none' },
    onchange: (e) => handleImport(e.target.files[0], container),
  });

  return el('header', { className: 'page-header' },
    el('h1', { className: 'page-title' }, '메이플 보스 파티'),
    el('div', { className: 'header-actions' },
      el('button', {
        className: 'icon-btn',
        title: 'JSON으로 내보내기',
        onclick: () => exportToFile(),
      }, '↓ 백업'),
      el('label', { className: 'icon-btn', title: 'JSON 불러오기' },
        '↑ 복원',
        fileInput,
      ),
    ),
  );
}

function renderPartyCard(party, container) {
  const runCount = Storage.getRunsByParty(party.id).length;

  return el('a', {
    className: 'party-card',
    href: `#/party/${party.id}`,
  },
    el('button', {
      className: 'party-card-delete',
      type: 'button',
      title: '파티 삭제',
      'aria-label': `${party.name} 삭제`,
      onclick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const msg = runCount > 0
          ? `"${party.name}" 파티를 삭제하면 기록 ${runCount}건도 모두 사라져요. 정말 삭제할까요?`
          : `"${party.name}" 파티를 삭제할까요?`;
        if (!confirm(msg)) return;
        Storage.deleteParty(party.id);
        renderPartyList(container);
      },
    }, '×'),
    el('div', { className: 'party-card-name' }, party.name),
    el('div', { className: 'party-card-members' },
      party.members.map(m => el('span', { className: 'member-chip' }, m)),
      el('button', {
        className: 'member-chip member-chip-add',
        type: 'button',
        title: '파티원 추가',
        onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAddMemberModal(party, () => renderPartyList(container));
        },
      }, '+ 추가'),
    ),
    el('div', { className: 'party-card-meta' },
      el('span', null, `${party.members.length}인 파티`),
      el('span', { className: 'dot-sep' }, '·'),
      el('span', null, `기록 ${runCount}건`),
    ),
  );
}

// ── 새 파티 만들기 모달 ─────────────────────────────────

const MAX_MEMBERS = 6;

function openCreatePartyModal(container) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal   = el('div', { className: 'modal' });

  // 6칸 고정 슬롯. 비어있는 칸은 저장 시 무시.
  const memberInputs = Array.from({ length: MAX_MEMBERS }, (_, i) => el('input', {
    type: 'text',
    className: 'text-input',
    placeholder: `파티원 ${i + 1}`,
    maxlength: '20',
  }));

  // Enter로 다음 칸 이동.
  memberInputs.forEach((input, i) => {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = memberInputs[i + 1];
      if (next) next.focus();
      else input.blur();
    });
  });

  const nameInput = el('input', {
    type: 'text',
    className: 'text-input',
    placeholder: '예: 본진 파티',
    maxlength: '40',
  });

  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, '새 파티 만들기'),
    el('button', {
      className: 'icon-btn-close',
      type: 'button',
      onclick: () => overlay.remove(),
      'aria-label': '닫기',
    }, '×'),
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '파티 이름'),
    nameInput,
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, `파티원 (최대 ${MAX_MEMBERS}명)`),
    el('div', { className: 'member-input-grid' }, memberInputs),
  ));

  modal.appendChild(el('div', { className: 'modal-actions' },
    el('button', {
      className: 'btn btn-ghost',
      type: 'button',
      onclick: () => overlay.remove(),
    }, '취소'),
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: () => {
        const members = [];
        const seen = new Set();
        for (const input of memberInputs) {
          const v = input.value.trim();
          if (!v) continue;
          if (seen.has(v)) { alert(`닉네임이 중복돼요: "${v}"`); input.focus(); return; }
          seen.add(v);
          members.push(v);
        }

        const name = nameInput.value.trim();
        if (!name) { alert('파티 이름을 입력해주세요'); nameInput.focus(); return; }
        if (members.length === 0) { alert('파티원을 1명 이상 입력해주세요'); return; }

        Storage.createParty({ name, members });
        overlay.remove();
        renderPartyList(container);
      },
    }, '만들기'),
  ));

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  setTimeout(() => nameInput.focus(), 50);
}

// ── 파티원 추가 모달 (파티 상세에서 호출) ──────────────

/**
 * 기존 파티에 멤버 1명 추가하는 가벼운 모달.
 * 저장 성공 시 onSaved(updatedParty)가 호출된다. 호출부가 화면 재렌더 담당.
 */
export function openAddMemberModal(party, onSaved) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal   = el('div', { className: 'modal' });

  const input = el('input', {
    type: 'text',
    className: 'text-input',
    placeholder: '닉네임',
    maxlength: '20',
  });

  const submit = () => {
    const name = input.value.trim();
    if (!name) { alert('닉네임을 입력해주세요'); input.focus(); return; }
    if (party.members.includes(name)) {
      alert(`"${name}"은(는) 이미 파티에 있어요`);
      input.focus();
      return;
    }
    const updated = Storage.updateParty(party.id, {
      members: [...party.members, name],
    });
    if (!updated) { alert('파티를 찾을 수 없어요'); overlay.remove(); return; }
    overlay.remove();
    onSaved?.(updated);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, '파티원 추가'),
    el('button', {
      className: 'icon-btn-close',
      type: 'button',
      onclick: () => overlay.remove(),
      'aria-label': '닫기',
    }, '×'),
  ));
  modal.appendChild(el('div', { className: 'form-meta' },
    `${party.name} · 현재 ${party.members.length}명`,
  ));
  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '닉네임'),
    input,
  ));
  modal.appendChild(el('div', { className: 'modal-actions' },
    el('button', {
      className: 'btn btn-ghost',
      type: 'button',
      onclick: () => overlay.remove(),
    }, '취소'),
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: submit,
    }, '추가'),
  ));

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(() => input.focus(), 50);
}

// ── 백업/복원 ─────────────────────────────────────────

function handleImport(file, container) {
  if (!file) return;
  if (!confirm('현재 데이터가 모두 덮어써져요. 계속할까요?')) return;
  importFromFile(file,
    () => { alert('불러오기 완료'); renderPartyList(container); },
    (err) => alert('불러오기 실패: ' + err.message),
  );
}
