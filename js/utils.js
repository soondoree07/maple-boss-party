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
