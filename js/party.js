// party.js — 메인 화면 (파티 카드 목록 + 새 파티 만들기 모달)

import * as Storage from './storage.js';
import { el, clear, sha256Hex, pinInput, isPin } from './utils.js';
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

/**
 * 파티 삭제 가드 — 비번이 있으면 ① 비번 입력·검증 → ② 최종 경고 확인 → 삭제.
 * 비번 없는 파티는 ②만. 두 삭제 진입점(메인 카드 ×, 파티 상세 헤더)이 공용으로 쓴다.
 * @returns {Promise<boolean>} 실제로 삭제됐으면 true
 */
export async function confirmAndDeleteParty(party) {
  if (party.pw) {
    const entered = prompt(`"${party.name}" 삭제 — 비밀번호(숫자 4자리)를 입력하세요`);
    if (entered == null || entered === '') return false;            // 취소/빈값
    if (!isPin(entered) || (await sha256Hex(entered)) !== party.pw) {
      alert('비밀번호가 올바르지 않아요. 삭제가 취소됐어요.');
      return false;
    }
  }
  const runCount = Storage.getRunsByParty(party.id).length;
  const warn = runCount > 0
    ? `정말 "${party.name}" 파티를 삭제하시겠습니까?\n기록 ${runCount}건도 함께 영구 삭제되며 되돌릴 수 없습니다.`
    : `정말 "${party.name}" 파티를 삭제하시겠습니까?\n되돌릴 수 없습니다.`;
  if (!confirm(warn)) return false;
  Storage.deleteParty(party.id);
  return true;
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
      onclick: async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (await confirmAndDeleteParty(party)) {
          renderPartyList(container);
        }
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
      party.pw
        ? [el('span', { className: 'dot-sep' }, '·'),
           el('span', { className: 'party-card-lock' }, '비밀번호')]
        : null,
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
    lang: 'ko',
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
    lang: 'ko',
  });

  const pwInput = pinInput('숫자 4자리 (비워두면 잠금 없음)', 'new-password');

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

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '비밀번호 (선택 · 숫자 4자리)'),
    pwInput,
    el('div', { className: 'form-hint' },
      '설정하면 이 파티에 들어올 때 숫자 4자리를 입력해야 해요'),
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
      onclick: async (e) => {
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

        const pwRaw = pwInput.value;
        if (pwRaw && !isPin(pwRaw)) {
          alert('비밀번호는 숫자 4자리로 입력해주세요');
          pwInput.focus();
          return;
        }

        const btn = e.currentTarget;
        btn.disabled = true;
        const pw = pwRaw ? await sha256Hex(pwRaw) : null;
        Storage.createParty({ name, members, pw });
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
    lang: 'ko',
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

// ── 비밀번호 변경/설정 모달 (파티 상세에서 호출) ──────

/**
 * 파티 비밀번호 설정/변경/해제. 비우고 저장하면 잠금 해제.
 * 저장 성공 시 onSaved(updatedParty) 호출. (이미 파티 안이므로 현재 비번 재확인은 생략)
 */
export function openChangePasswordModal(party, onSaved) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal   = el('div', { className: 'modal' });

  const pwInput = pinInput('새 비밀번호 · 숫자 4자리 (비우면 잠금 해제)', 'new-password');
  const pwConfirm = pinInput('숫자 4자리 확인', 'new-password');

  const submit = async (e) => {
    const v1 = pwInput.value;
    const v2 = pwConfirm.value;
    if (v1 && !isPin(v1)) { alert('비밀번호는 숫자 4자리로 입력해주세요'); pwInput.focus(); return; }
    if (v1 !== v2) { alert('두 비밀번호가 일치하지 않아요'); pwConfirm.focus(); return; }
    const btn = e?.currentTarget;
    if (btn) btn.disabled = true;
    const pw = v1 ? await sha256Hex(v1) : null;
    const updated = Storage.updateParty(party.id, { pw });
    if (!updated) { alert('파티를 찾을 수 없어요'); overlay.remove(); return; }
    overlay.remove();
    alert(pw ? '비밀번호가 설정됐어요' : '비밀번호가 해제됐어요');
    onSaved?.(updated);
  };

  pwConfirm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(e); }
  });

  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, '비밀번호 변경'),
    el('button', {
      className: 'icon-btn-close',
      type: 'button',
      onclick: () => overlay.remove(),
      'aria-label': '닫기',
    }, '×'),
  ));
  modal.appendChild(el('div', { className: 'form-meta' },
    `${party.name} · 현재 ${party.pw ? '비밀번호 설정됨' : '잠금 없음'}`,
  ));
  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '새 비밀번호 (숫자 4자리)'),
    pwInput,
    pwConfirm,
    el('div', { className: 'form-hint' }, '숫자 4자리. 비워두고 저장하면 비밀번호가 해제돼요'),
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
    }, '저장'),
  ));

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(() => pwInput.focus(), 50);
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
