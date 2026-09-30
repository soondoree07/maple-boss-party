// v2/gate.js — 사이트 전체 비밀번호 화면
//
// 한 번 맞히면 그 기기(브라우저)에 기억해서 다시 묻지 않는다.
// 저장소를 못 쓰는 환경(시크릿 창 등)이면 새로고침할 때마다 다시 묻는다.

import { el, clear, pinInput } from '../utils.js';
import { verifySitePw } from './store.js';

const UNLOCK_KEY = 'maple-site-unlocked';
let unlockedInMemory = false;

export function isSiteUnlocked() {
  if (unlockedInMemory) return true;
  try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch (_) { return false; }
}

function rememberUnlock() {
  unlockedInMemory = true;
  try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (_) { /* 메모리로만 기억 */ }
}

/**
 * @param {HTMLElement} container
 * @param {() => void} onUnlocked - 맞히면 호출 (보통 route)
 */
export function renderSiteGate(container, onUnlocked) {
  clear(container);

  const input = pinInput('비밀번호 4자리', 'current-password');
  const errMsg = el('div', { className: 'gate-error' });

  const submit = async (e) => {
    const btn = e?.currentTarget instanceof HTMLButtonElement ? e.currentTarget : null;
    if (btn) btn.disabled = true;
    errMsg.textContent = '';
    const ok = !!input.value && await verifySitePw(input.value);
    if (ok) { rememberUnlock(); onUnlocked(); return; }
    if (btn) btn.disabled = false;
    errMsg.textContent = '비밀번호가 맞지 않아요. 다시 입력해 주세요.';
    input.value = '';
    input.focus();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  container.appendChild(el('main', { className: 'gate-main' },
    el('div', { className: 'gate-card' },
      el('div', { className: 'gate-title' }, '메이플 보스 기록'),
      el('div', { className: 'gate-sub' }, '들어가려면 비밀번호 4자리를 입력해 주세요'),
      input,
      errMsg,
      el('div', { className: 'gate-actions' },
        el('button', { className: 'btn btn-primary', type: 'button', onclick: submit }, '들어가기'),
      ),
    ),
  ));

  setTimeout(() => input.focus(), 50);
}
