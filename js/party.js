// party.js — 메인 화면 (파티 카드 목록 + 새 파티 만들기 모달)

import * as Storage from './storage.js';
import { el, clear, pinInput, isPin, isMobile, buildMobileMenu } from './utils.js';
import { exportToFile, importFromFile } from './backup.js';

/**
 * 메인 화면 전체 그리기.
 * @param {HTMLElement} container - 보통 #app
 */
export function renderPartyList(container) {
  clear(container);

  const parties = Storage.getParties();

  buildHeader(container);

  const main = el('main', { className: 'party-list-main' });

  if (parties.length === 0) {
    main.appendChild(el('div', { className: 'empty-state' },
      el('p', null, '아직 만든 파티가 없어요'),
      el('p', { className: 'empty-state-sub' }, '아래 버튼으로 첫 파티를 만들어보세요'),
    ));
  } else {
    const grid = el('div', { className: 'party-grid' },
      parties.map(p => renderPartyCard(p))
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

  const actionNodes = [
    el('button', {
      className: 'icon-btn',
      title: 'JSON으로 내보내기',
      onclick: () => exportToFile(),
    }, '↓ 백업'),
    el('label', { className: 'icon-btn', title: 'JSON 불러오기' },
      '↑ 복원',
      fileInput,
    ),
  ];

  const header = el('header', { className: 'page-header' },
    el('h1', { className: 'page-title' }, '메이플 보스 파티'),
  );

  if (isMobile()) {
    const { toggle, drawer } = buildMobileMenu([
      el('div', { className: 'drawer-actions' }, actionNodes),
    ]);
    header.appendChild(toggle);
    container.appendChild(header);
    container.appendChild(drawer);
  } else {
    header.appendChild(el('div', { className: 'header-actions' }, actionNodes));
    container.appendChild(header);
  }
}

/**
 * 파티 삭제 가드 — 비번이 있으면 ① 비번 입력·검증 → ② 최종 경고 확인 → 삭제.
 * 비번 없는 파티는 ②만. 두 삭제 진입점(메인 카드 ×, 파티 상세 헤더)이 공용으로 쓴다.
 * @returns {Promise<boolean>} 실제로 삭제됐으면 true
 */
export async function confirmAndDeleteParty(party) {
  let pin = null;
  if (party.pw) {
    const entered = prompt(`"${party.name}" 삭제 — 비밀번호(숫자 4자리)를 입력하세요`);
    if (entered == null || entered === '') return false;            // 취소/빈값
    if (!isPin(entered)) {
      alert('비밀번호는 숫자 4자리예요. 삭제가 취소됐어요.');
      return false;
    }
    pin = entered;
  }
  const runCount = Storage.getRunsByParty(party.id).length;
  const warn = runCount > 0
    ? `정말 "${party.name}" 파티를 삭제하시겠습니까?\n기록 ${runCount}건도 함께 영구 삭제되며 되돌릴 수 없습니다.`
    : `정말 "${party.name}" 파티를 삭제하시겠습니까?\n되돌릴 수 없습니다.`;
  if (!confirm(warn)) return false;
  // 서버에서 PIN 검증 후 삭제(비번 없으면 pin 무시). 틀리면 false.
  const ok = await Storage.deletePartyWithPin(party.id, pin);
  if (!ok) {
    alert('비밀번호가 올바르지 않아 삭제가 취소됐어요.');
    return false;
  }
  return true;
}

function renderPartyCard(party) {
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

  // 6칸 고정 슬롯. 순서대로만 입력 가능 — 직전 칸이 비어 있으면 다음 칸은 잠금.
  // 중간 칸을 비우면 뒤 값이 자동으로 위로 당겨져 빈칸 없이 채워진다.
  const memberInputs = Array.from({ length: MAX_MEMBERS }, (_, i) => el('input', {
    type: 'text',
    className: 'text-input',
    placeholder: `파티원 ${i + 1}`,
    maxlength: '20',
    lang: 'ko',
  }));

  // 슬롯 i 는 i===0 이거나 직전 슬롯이 채워졌을 때만 활성화.
  const refreshLocks = () => {
    memberInputs.forEach((input, i) => {
      input.disabled = i > 0 && memberInputs[i - 1].value.trim() === '';
    });
  };

  // 채워진 값만 모아 위에서부터 다시 배치(빈칸 제거) — 포커스 떠날 때 실행.
  const compactSlots = () => {
    const filled = memberInputs.map(v => v.value).filter(v => v.trim() !== '');
    memberInputs.forEach((input, i) => { input.value = filled[i] ?? ''; });
    refreshLocks();
  };

  memberInputs.forEach((input, i) => {
    input.addEventListener('input', refreshLocks);
    input.addEventListener('blur', compactSlots);
    // Enter로 다음(활성) 칸 이동.
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      refreshLocks();
      const next = memberInputs[i + 1];
      if (next && !next.disabled) next.focus();
      else input.blur();
    });
  });

  refreshLocks(); // 초기: 파티원 1만 활성, 나머지 잠금

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
        // 평문 PIN 전달 — 서버(set_party_pw RPC)가 해시.
        Storage.createParty({ name, members, pw: pwRaw || null });
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
  pwConfirm.style.marginTop = '10px'; // 두 입력칸 너무 붙어 보여 간격

  const submit = async (e) => {
    const v1 = pwInput.value;
    const v2 = pwConfirm.value;
    if (v1 && !isPin(v1)) { alert('비밀번호는 숫자 4자리로 입력해주세요'); pwInput.focus(); return; }
    if (v1 !== v2) { alert('두 비밀번호가 일치하지 않아요'); pwConfirm.focus(); return; }
    const btn = e?.currentTarget;
    if (btn) btn.disabled = true;
    // 평문 PIN(빈문자열="" = 해제) 전달 — 서버(set_party_pw RPC)가 해시.
    const updated = Storage.updateParty(party.id, { pw: v1 || '' });
    if (!updated) { alert('파티를 찾을 수 없어요'); overlay.remove(); return; }
    overlay.remove();
    alert(v1 ? '비밀번호가 설정됐어요' : '비밀번호가 해제됐어요');
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

// ── 파티 설정 페이지 (#/party/:id/settings) — 멤버 관리 + 비밀번호 ──

/**
 * 웹·모바일 공통 파티 설정 페이지. 파티원 추가/삭제 + 비밀번호 설정/해제.
 * @param {HTMLElement} container
 * @param {object} party
 * @param {(updated:object)=>void} [onUnlockChange] - 비번 변경 시 app.js의 unlockedParties 동기화용
 */
export function renderPartySettingsPage(container, party, onUnlockChange) {
  const paint = (p) => {
    clear(container);

    container.appendChild(el('header', { className: 'page-header' },
      el('a', { href: `#/party/${p.id}`, className: 'back-btn' }, '← 뒤로'),
      el('h1', { className: 'page-title' }, `파티 설정 — ${p.name}`),
      el('div', { className: 'header-actions' }),
    ));

    const main = el('main', { className: 'widget-page-main' });

    // ── 파티원 ──
    const memberRows = p.members.map(name =>
      el('div', { className: 'member-manage-row' },
        el('span', { className: 'member-manage-name' }, name),
        el('button', {
          className: 'icon-btn-sm',
          type: 'button',
          title: '삭제',
          'aria-label': `${name} 삭제`,
          onclick: () => {
            if (p.members.length <= 1) {
              alert('파티원은 최소 1명이어야 해요');
              return;
            }
            if (!confirm(`"${name}"을(를) 파티원에서 삭제할까요?\n(기존 회차 기록은 그대로 유지돼요)`)) return;
            const updated = Storage.updateParty(p.id, {
              members: p.members.filter(m => m !== name),
            });
            if (!updated) { location.hash = '#/'; return; }
            paint(updated);
          },
        }, '×'),
      ),
    );

    const addInput = el('input', {
      type: 'text',
      className: 'text-input',
      placeholder: '닉네임',
      maxlength: '20',
      lang: 'ko',
    });
    const addMember = () => {
      const name = addInput.value.trim();
      if (!name) { alert('닉네임을 입력해주세요'); addInput.focus(); return; }
      if (p.members.includes(name)) {
        alert(`"${name}"은(는) 이미 파티에 있어요`);
        addInput.focus();
        return;
      }
      const updated = Storage.updateParty(p.id, { members: [...p.members, name] });
      if (!updated) { location.hash = '#/'; return; }
      paint(updated);
    };
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addMember(); }
    });

    main.appendChild(el('section', { className: 'settings-section' },
      el('h2', { className: 'settings-title' }, `파티원 (${p.members.length}명)`),
      ...memberRows,
      el('div', { className: 'member-add-row' },
        addInput,
        el('button', { className: 'btn btn-ghost', type: 'button', onclick: addMember }, '추가'),
      ),
    ));

    // ── 비밀번호 ──
    const pwInput   = pinInput('새 비밀번호 · 숫자 4자리 (비우면 잠금 해제)', 'new-password');
    const pwConfirm = pinInput('숫자 4자리 확인', 'new-password');
    pwConfirm.style.marginTop = '10px';
    const savePw = () => {
      const v1 = pwInput.value;
      const v2 = pwConfirm.value;
      if (v1 && !isPin(v1)) { alert('비밀번호는 숫자 4자리로 입력해주세요'); pwInput.focus(); return; }
      if (v1 !== v2) { alert('두 비밀번호가 일치하지 않아요'); pwConfirm.focus(); return; }
      const updated = Storage.updateParty(p.id, { pw: v1 || '' });
      if (!updated) { location.hash = '#/'; return; }
      onUnlockChange?.(updated);
      alert(v1 ? '비밀번호가 설정됐어요' : '비밀번호가 해제됐어요');
      paint(updated);
    };
    pwConfirm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); savePw(); }
    });

    main.appendChild(el('section', { className: 'settings-section' },
      el('h2', { className: 'settings-title' }, '비밀번호'),
      el('div', { className: 'form-meta' },
        `현재 ${p.pw ? '비밀번호 설정됨' : '잠금 없음'}`),
      el('div', { className: 'form-group' },
        el('label', { className: 'form-label' }, '새 비밀번호 (숫자 4자리)'),
        pwInput,
        pwConfirm,
        el('div', { className: 'form-hint' }, '숫자 4자리. 비워두고 저장하면 비밀번호가 해제돼요'),
      ),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: savePw }, '비밀번호 저장'),
    ));

    container.appendChild(main);
  };

  paint(party);
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
