// utils.js — 공용 유틸 (날짜, 메소 포맷, DOM 헬퍼)

// ── 날짜 ─────────────────────────────────────────────

/**
 * Date → "YYYY-MM-DD" (로컬 타임존 기준)
 *
 * toISOString()은 UTC라 9시 전에는 하루 밀리는 문제가 있음 → 직접 포맷.
 */
export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayStr = () => toDateStr(new Date());

/**
 * "YYYY-MM-DD" → Date (로컬 0시).
 *
 * `new Date('YYYY-MM-DD')`는 UTC 0시로 파싱돼 로컬 타임존이 음수일 때 하루 밀림 → 직접 파싱.
 */
export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 메이플 주차 범위.
 *
 * 주간 리셋: 매주 목요일 0시. 한 주차 = 목/금/토/일/월/화/수.
 * getDay(): 일=0, 월=1, 화=2, 수=3, 목=4, 금=5, 토=6
 */
export function getWeekRange(date) {
  const day = date.getDay();
  // 목(4)→0, 금→1, 토→2, 일→3, 월→4, 화→5, 수→6
  const daysFromThursday = (day - 4 + 7) % 7;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysFromThursday);
  const end   = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);

  return { start: toDateStr(start), end: toDateStr(end) };
}

/**
 * 한 달 범위 (1일 ~ 말일).
 */
export function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateStr(start), end: toDateStr(end) };
}

/**
 * "YYYY-MM-DD a" - "YYYY-MM-DD b" 의 일수 차이 (b - a).
 */
export function dayDiff(aStr, bStr) {
  const a = parseDateStr(aStr);
  const b = parseDateStr(bStr);
  return Math.round((b - a) / 86_400_000);
}

/**
 * "2026-05-04" → "5/4"
 */
export function shortMD(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${+m}/${+d}`;
}

/**
 * "2026-05-04" → "2026년 5월 4일 (월)"
 */
export function longDateLabel(dateStr) {
  const d = parseDateStr(dateStr);
  const dow = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}

// ── 메소 포맷 ─────────────────────────────────────────
//
// 입력은 "억" 단위 number (소수점 허용). 표시는 소수부를 만 단위로 풀어서.
//
//   13     → "13억"
//   13.5   → "13억 5천만"
//   13.05  → "13억 500만"
//   0.5    → "5천만"
//   0.05   → "500만"
//   0      → "0"

/**
 * 만 단위(0~9999)를 한글 표기로 변환.
 *   5000 → "5천만", 1500 → "1500만", 500 → "500만"
 */
function formatManwon(manwon) {
  if (manwon === 0) return '';
  const cheon  = Math.floor(manwon / 1000);
  const rest   = manwon % 1000;
  if (cheon > 0 && rest === 0) return `${cheon}천만`;
  return `${manwon}만`;
}

export function formatMeso(eok) {
  if (eok == null || isNaN(eok)) return '0';

  // 소수점 부동소수 오차 흡수 — 만 단위까지만 의미 있음.
  const totalManwon = Math.round(Number(eok) * 10_000);
  if (totalManwon === 0) return '0';

  const sign     = totalManwon < 0 ? '-' : '';
  const abs      = Math.abs(totalManwon);
  const eokPart  = Math.floor(abs / 10_000);
  const manPart  = abs % 10_000;

  const parts = [];
  if (eokPart > 0) parts.push(`${eokPart}억`);
  const manStr = formatManwon(manPart);
  if (manStr) parts.push(manStr);

  return sign + parts.join(' ');
}

/**
 * 합계를 인원수로 나눈 1인 분배액 (단위: 억, 소수점 2자리 반올림).
 */
export function divideMeso(totalEok, headcount) {
  if (!headcount || headcount <= 0) return 0;
  return Math.round((totalEok / headcount) * 100) / 100;
}

// ── DOM 헬퍼 ──────────────────────────────────────────

/**
 * createElement 단축. JSX-like.
 *
 *   el('div', { className: 'foo', onclick: fn }, '안녕', child2)
 *   children에 배열을 넘기면 자동으로 평탄화됨.
 */
export function el(tag, props, ...children) {
  const node = document.createElement(tag);
  const p = props || {};

  for (const key of Object.keys(p)) {
    const val = p[key];
    if (val == null || val === false) continue;
    if (key === 'className') {
      node.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      for (const [sk, sv] of Object.entries(val)) {
        if (sk.startsWith('--')) node.style.setProperty(sk, String(sv));
        else node.style[sk] = sv;
      }
    } else if (key === 'dataset' && typeof val === 'object') {
      Object.assign(node.dataset, val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key in node && typeof val !== 'boolean') {
      node[key] = val;
    } else if (typeof val === 'boolean') {
      // disabled / checked / hidden 같은 boolean attribute
      if (val) node.setAttribute(key, '');
    } else {
      node.setAttribute(key, val);
    }
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(node, list) {
  for (const child of list) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) { appendChildren(node, child); continue; }
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
}

/** node를 비움. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ── 모바일 햄버거 메뉴 ────────────────────────────────

/** 모바일 폭 여부 (헤더 액션·룰렛·사다리를 햄버거로 접는 기준). */
export const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

/**
 * 모바일 햄버거 토글 + 드로어. nodes 를 드로어에 담아 반환.
 * 데스크톱에선 호출 안 함(렌더 분기) — 순수 모바일 전용.
 * 아이콘은 이모지 없이 CSS 3선(span) 으로 그린다.
 * @returns {{toggle: HTMLElement, drawer: HTMLElement}}
 */
export function buildMobileMenu(nodes, label = '메뉴') {
  const drawer = el('div', { className: 'mobile-drawer' }, nodes);
  const toggle = el('button', {
    className: 'nav-toggle',
    type: 'button',
    'aria-label': label,
    'aria-expanded': 'false',
    onclick: () => {
      const open = drawer.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    },
  },
    el('span', { className: 'nav-toggle-bar' }),
    el('span', { className: 'nav-toggle-bar' }),
    el('span', { className: 'nav-toggle-bar' }),
  );
  return { toggle, drawer };
}

// ── 파티 비밀번호 = 숫자 4자리 PIN ─────────────────────

/** 값이 정확히 숫자 4자리인지. */
export function isPin(v) {
  return /^\d{4}$/.test(String(v ?? ''));
}

/**
 * 숫자 4자리 PIN 입력 칸. 마스킹(password) + 모바일 숫자 키패드 +
 * 입력 즉시 숫자 외 문자 제거·4자리 컷.
 */
export function pinInput(placeholder, autocomplete = 'off') {
  const node = el('input', {
    type: 'password',
    className: 'text-input',
    placeholder,
    inputmode: 'numeric',
    pattern: '\\d{4}',
    maxlength: '4',
    autocomplete,
  });
  node.addEventListener('input', () => {
    const cleaned = node.value.replace(/\D/g, '').slice(0, 4);
    if (node.value !== cleaned) node.value = cleaned;
  });
  return node;
}

// ── 확인 다이얼로그 (네이티브 confirm/prompt/alert 대체) ──

/**
 * 무드에 맞는 커스텀 확인 모달. 네이티브 confirm/prompt 대체.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message            \n 으로 줄바꿈
 * @param {string} [opts.confirmText='확인']
 * @param {string} [opts.cancelText='취소']
 * @param {boolean} [opts.danger=false]     확인 버튼을 위험(빨강) 스타일로
 * @param {boolean} [opts.pin=false]        4자리 PIN 입력칸 노출
 * @param {string} [opts.pinPlaceholder]
 * @param {(value:string|boolean)=>(true|string|Promise<true|string>)} [opts.onConfirm]
 *        true 반환 → 닫고 resolve(true). 문자열 반환 → 그 문자열을 모달 안
 *        오류 글자로 표시하고 열어둠. 없으면 곧장 resolve(pin? PIN값 : true).
 * @returns {Promise<string|boolean>} 확인 시 true(또는 PIN값), 취소/닫기 시 false
 */
export function confirmDialog(opts = {}) {
  const {
    title = '확인', message = '', confirmText = '확인', cancelText = '취소',
    danger = false, pin = false,
    pinPlaceholder = '비밀번호 (숫자 4자리)', onConfirm,
  } = opts;

  return new Promise((resolve) => {
    const overlay = el('div', { className: 'modal-overlay' });
    const modal   = el('div', { className: 'modal modal-confirm' });

    const errEl    = el('div', { className: 'dialog-error' });
    const pinField = pin ? pinInput(pinPlaceholder, 'current-password') : null;

    let done = false;
    let inFlight = false; // onConfirm 처리 중 — 닫기(취소/ESC/바깥클릭) 차단
    const close = (val) => {
      if (done || inFlight) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(val);
    };

    const confirmBtn = el('button', {
      className: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'),
      type: 'button',
      onclick: async () => {
        errEl.textContent = '';
        if (!onConfirm) { close(pin ? pinField.value : true); return; }
        inFlight = true;
        confirmBtn.disabled = true;
        let res;
        try { res = await onConfirm(pin ? pinField.value : true); }
        catch (e) { console.error('[confirmDialog] onConfirm 실패:', e); res = '처리 중 오류가 발생했어요'; }
        inFlight = false;
        if (res === true) { close(true); return; }
        errEl.textContent = typeof res === 'string' ? res : '다시 시도해주세요';
        confirmBtn.disabled = false;
        if (pinField) { pinField.value = ''; pinField.focus(); }
      },
    }, confirmText);

    const cancelBtn = el('button', {
      className: 'btn btn-ghost', type: 'button', onclick: () => close(false),
    }, cancelText);

    // 다이얼로그가 겹쳐 있어도 최상단 것만 키를 처리(stale 리스너 차단).
    const isTopmost = () => {
      const all = document.querySelectorAll('.modal-overlay');
      return all[all.length - 1] === overlay;
    };
    const onKey = (e) => {
      if (done || !isTopmost()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Enter' && document.activeElement !== cancelBtn) {
        e.preventDefault(); confirmBtn.click();
      }
    };
    document.addEventListener('keydown', onKey);

    const lines = Array.isArray(message) ? message : String(message).split('\n');
    const msgLines = lines.filter(Boolean)
      .map(line => el('p', { className: 'dialog-line' }, line));

    modal.appendChild(el('div', { className: 'modal-header' },
      el('h2', { className: 'modal-title' }, title),
      el('button', {
        className: 'icon-btn-close', type: 'button',
        onclick: () => close(false), 'aria-label': '닫기',
      }, '×'),
    ));
    modal.appendChild(el('div', { className: 'dialog-body' }, ...msgLines));
    if (pinField) modal.appendChild(el('div', { className: 'form-group' }, pinField));
    modal.appendChild(errEl);
    modal.appendChild(el('div', { className: 'modal-actions' }, cancelBtn, confirmBtn));

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.body.appendChild(overlay);
    setTimeout(() => (pinField || confirmBtn).focus(), 50);
  });
}

// ── 토스트 (네이티브 alert 대체 — 일시 알림) ──────────

let _toastWrap = null;

/**
 * 화면 하단 중앙에 잠깐 떴다 사라지는 무드 알림. 네이티브 alert 대체.
 * @param {string} message
 * @param {'ok'|'err'} [kind='err']
 * @param {number} [ms=3500] 자동 사라짐(ms). 클릭하면 즉시 닫힘.
 */
export function toast(message, kind = 'err', ms = 3500) {
  if (!_toastWrap || !_toastWrap.isConnected) {
    _toastWrap = el('div', { className: 'toast-wrap' });
    document.body.appendChild(_toastWrap);
  }
  while (_toastWrap.childElementCount >= 3) _toastWrap.firstChild.remove();
  const t = el('div', { className: 'toast toast-' + (kind === 'ok' ? 'ok' : 'err') }, message);
  _toastWrap.appendChild(t);
  const kill = () => {
    t.classList.add('toast-out');
    setTimeout(() => t.remove(), 200);
  };
  const timer = setTimeout(kill, ms);
  t.addEventListener('click', () => { clearTimeout(timer); kill(); });
  return t;
}

// ── 인라인 폼 안내 (저장 버튼 위 한 줄) ───────────────

/**
 * 폼 인라인 안내 한 줄. node + show 클로저 반환.
 * @returns {{ node: HTMLElement,
 *             show(text:string, ok?:boolean, focusEl?:HTMLElement):void }}
 */
export function inlineMsg() {
  const node = el('div', { className: 'inline-msg' });
  const show = (text, ok = false, focusEl = null) => {
    node.textContent = text;
    node.className = 'inline-msg inline-msg-' + (ok ? 'ok' : 'err');
    focusEl?.focus();
  };
  return { node, show };
}

// ── 해시 ──────────────────────────────────────────────
//
// 파티 비밀번호 저장용. localStorage 기반이라 진짜 보안은 아니고
// (개발자도구로 우회 가능) 평문 저장만 피하는 가벼운 게이트 용도.

/**
 * 문자열 → SHA-256 hex. crypto.subtle은 보안 컨텍스트(https/localhost)에서만
 * 동작하므로, 없으면 단순 sync 해시(FNV-1a류)로 폴백.
 * @returns {Promise<string>}
 */
export async function sha256Hex(str) {
  const s = String(str);
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* fall through */ }
  // 폴백 (비보안 컨텍스트) — 충돌 가능하나 게이트 용도엔 충분.
  let h1 = 0x811c9dc5, h2 = 0x1000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return 'fb' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** HTML 이스케이프 (innerHTML이 꼭 필요할 때만). */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
