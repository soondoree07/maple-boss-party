// party.js — 메인 화면 (파티 카드 목록 + 새 파티 만들기 모달)

import * as Storage from './storage.js';
import { el, clear, pinInput, isPin, isMobile, buildMobileMenu, confirmDialog, toast, inlineMsg } from './utils.js';
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
    onchange: (e) => {
      const f = e.target.files[0];
      e.target.value = ''; // 같은 파일 재선택 가능하도록 초기화
      handleImport(f, container);
    },
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
  const runCount = Storage.getRunsByParty(party.id).length;
  const lines = [
    `정말 "${party.name}" 파티를 삭제할까요?`,
    runCount > 0
      ? `기록 ${runCount}건도 함께 영구 삭제되며 되돌릴 수 없습니다.`
      : '되돌릴 수 없습니다.',
  ];
  if (party.pw) lines.push('계속하려면 비밀번호를 입력하세요.');

  const ok = await confirmDialog({
    title: '파티 삭제',
    message: lines,
    confirmText: '삭제',
    cancelText: '취소',
    danger: true,
    pin: !!party.pw,
    pinPlaceholder: '비밀번호 (숫자 4자리)',
    onConfirm: async (pinVal) => {
      if (party.pw && !isPin(pinVal)) return '비밀번호는 숫자 4자리예요';
      // 서버에서 PIN 검증 후 삭제(비번 없으면 pin 무시). 틀리면 false.
      const deleted = await Storage.deletePartyWithPin(party.id, party.pw ? pinVal : null);
      if (!deleted) return '비밀번호가 올바르지 않아요';
      return true;
    },
  });
  return ok === true;
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
    // 빈칸 제거 결과가 현재와 같으면 스킵 — 불필요한 value 재기록(한글 IME 방해) 방지.
    if (memberInputs.every((input, i) => input.value === (filled[i] ?? ''))) return;
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

  const createMsg = inlineMsg();

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

  modal.appendChild(createMsg.node);

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
          if (seen.has(v)) { createMsg.show(`닉네임이 중복돼요: "${v}"`, false, input); return; }
          seen.add(v);
          members.push(v);
        }

        const name = nameInput.value.trim();
        if (!name) { createMsg.show('파티 이름을 입력해주세요', false, nameInput); return; }
        if (members.length === 0) { createMsg.show('파티원을 1명 이상 입력해주세요'); return; }

        const pwRaw = pwInput.value;
        if (pwRaw && !isPin(pwRaw)) {
          createMsg.show('비밀번호는 숫자 4자리로 입력해주세요', false, pwInput);
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

// ── 파티 설정 페이지 (#/party/:id/settings) — 멤버 관리 + 비밀번호 ──

/**
 * 웹·모바일 공통 파티 설정 페이지. 파티원 추가/삭제 + 비밀번호 설정/해제.
 * @param {HTMLElement} container
 * @param {object} party
 * @param {(updated:object)=>void} [onUnlockChange] - 비번 변경 시 app.js의 unlockedParties 동기화용
 */
export function renderPartySettingsPage(container, party, onUnlockChange) {
  // flash: { section:'mem'|'pw', ok:boolean, text } — 재렌더 후에도 메시지 유지
  const paint = (p, flash) => {
    clear(container);

    container.appendChild(el('header', { className: 'page-header' },
      el('a', { href: `#/party/${p.id}`, className: 'back-btn' }, '← 뒤로'),
      el('h1', { className: 'page-title' }, `파티 설정 — ${p.name}`),
      el('div', { className: 'header-actions' }),
    ));

    const main = el('main', { className: 'widget-page-main' });

    // ── 파티원 ──
    const memMsg = inlineMsg();

    const memberRows = p.members.map(name =>
      el('div', { className: 'member-manage-row' },
        el('span', { className: 'member-manage-name' }, name),
        el('button', {
          className: 'icon-btn-sm',
          type: 'button',
          title: '삭제',
          'aria-label': `${name} 삭제`,
          onclick: async () => {
            if (p.members.length <= 1) {
              memMsg.show('파티원은 최소 1명이어야 해요');
              return;
            }
            const ok = await confirmDialog({
              title: '파티원 삭제',
              message: `"${name}"을(를) 파티원에서 삭제할까요?\n기존 회차 기록은 그대로 유지돼요.`,
              confirmText: '삭제',
              danger: true,
            });
            if (ok !== true) return;
            const updated = Storage.updateParty(p.id, {
              members: p.members.filter(m => m !== name),
            });
            if (!updated) { location.hash = '#/'; return; }
            paint(updated, { section: 'mem', ok: true, text: `"${name}" 삭제됨` });
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
      if (!name) { memMsg.show('닉네임을 입력해주세요', false, addInput); return; }
      if (p.members.includes(name)) {
        memMsg.show(`"${name}"은(는) 이미 파티에 있어요`, false, addInput);
        return;
      }
      const updated = Storage.updateParty(p.id, { members: [...p.members, name] });
      if (!updated) { location.hash = '#/'; return; }
      paint(updated, { section: 'mem', ok: true, text: `"${name}" 추가됨` });
    };
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addMember(); }
    });

    main.appendChild(el('section', { className: 'settings-section' },
      el('h2', { className: 'settings-title' }, `파티원 (${p.members.length}명)`),
      ...memberRows,
      memMsg.node,
      el('div', { className: 'member-add-row' },
        addInput,
        el('button', { className: 'btn btn-ghost', type: 'button', onclick: addMember }, '추가'),
      ),
    ));

    // ── 비밀번호 ──
    const pwInput   = pinInput('새 비밀번호 · 숫자 4자리 (비우면 잠금 해제)', 'new-password');
    const pwConfirm = pinInput('숫자 4자리 확인', 'new-password');
    pwConfirm.style.marginTop = '10px';
    const pwMsg = inlineMsg();
    const savePw = () => {
      const v1 = pwInput.value;
      const v2 = pwConfirm.value;
      if (v1 && !isPin(v1)) { pwMsg.show('비밀번호는 숫자 4자리로 입력해주세요', false, pwInput); return; }
      if (v1 !== v2)        { pwMsg.show('비밀번호를 확인하세요', false, pwConfirm); return; }
      const updated = Storage.updateParty(p.id, { pw: v1 || '' });
      if (!updated) { location.hash = '#/'; return; }
      onUnlockChange?.(updated);
      paint(updated, {
        section: 'pw', ok: true,
        text: v1 ? '비밀번호가 변경되었습니다.' : '비밀번호가 해제되었습니다.',
      });
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
      pwMsg.node,
      el('button', { className: 'btn btn-primary', type: 'button', onclick: savePw }, '비밀번호 저장'),
    ));

    container.appendChild(main);

    if (flash) {
      (flash.section === 'pw' ? pwMsg : memMsg).show(flash.text, flash.ok);
    }
  };

  paint(party);
}

// ── 백업/복원 ─────────────────────────────────────────

async function handleImport(file, container) {
  if (!file) return;
  const ok = await confirmDialog({
    title: '백업 복원',
    message: '현재 데이터가 모두 백업 파일 내용으로 덮어써집니다.\n계속할까요?',
    confirmText: '복원',
    cancelText: '취소',
    danger: true,
  });
  if (ok !== true) return;
  importFromFile(file,
    () => { toast('백업을 불러왔어요', 'ok'); renderPartyList(container); },
    (err) => toast('불러오기 실패: ' + err.message, 'err'),
  );
}
