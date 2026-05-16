// mood.js — 무드(테마) 적용/선택.
//
// 정책:
//  - 파티 선택 화면(메인 목록)  → 방문(로드)마다 랜덤 (index.html <head> 인라인 스크립트가 픽)
//  - 파티 안 / 게이트 / 보스 설정 → 유저가 고른 무드 (localStorage 'maple-mood')
//
// 무드 링크는 index.html <head>의 <link id="mood-theme-link">. href만 갈아끼운다.
// (style.css 뒤라서 :root 오버라이드가 항상 이김 — 구조/클래스/JS DOM 불변)

import { el } from './utils.js';

const KEY = 'maple-mood';
const DEFAULT_ID = 1;

export const MOOD_IDS = [1, 2, 3, 4, 6, 8];
export const MOOD_LABELS = {
  1: 'Midnight Slate · 다크 블루',
  2: 'Abyss Teal · 다크 청록',
  3: 'Crimson Noir · 다크 레드',
  4: 'Neon Synth · 다크 네온',
  6: 'Royal Plum · 다크 보라골드',
  8: 'Carbon Amber · 다크 앰버',
};

function moodLink() {
  return document.getElementById('mood-theme-link');
}

/** 무드 링크 href 즉시 교체 — 미리보기·적용 공용. */
export function applyMood(id) {
  const l = moodLink();
  if (l) l.href = `css/themes/mood-${id}.css`;
}

export function getSavedMood() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return MOOD_IDS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function setSavedMood(id) {
  try { localStorage.setItem(KEY, String(id)); } catch { /* noop */ }
}

/**
 * 라우트에 맞는 무드 반영.
 * 파티 선택 화면(메인 목록)만 랜덤(로드 시 픽), 그 외는 저장값(없으면 기본).
 */
export function applyRouteMood(hash) {
  const h = hash || location.hash || '#/';
  const inParty = h === '#/crystals' || /^#\/party\//.test(h);
  const id = inParty
    ? (getSavedMood() || DEFAULT_ID)
    : (window.__moodRandomId || DEFAULT_ID);
  applyMood(id);
}

/**
 * 무드 설정 모달 — 고르면 즉시 미리보기, "적용"을 눌러야 저장.
 * 취소/닫기는 원래 무드로 복원.
 */
export function openMoodModal() {
  const current = getSavedMood() || DEFAULT_ID;
  let selected = current;

  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });

  const optWrap = el('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' },
  });
  const optBtns = {};
  MOOD_IDS.forEach((id) => {
    const b = el('button', {
      type: 'button',
      className: 'btn btn-ghost',
      style: {
        justifyContent: 'flex-start',
        textAlign: 'left',
        outline: id === current ? '2px solid var(--accent-gold)' : 'none',
        outlineOffset: '1px',
      },
      onclick: () => {
        selected = id;
        for (const x of Object.values(optBtns)) x.style.outline = 'none';
        b.style.outline = '2px solid var(--accent-gold)';
        applyMood(id); // 미리보기 즉시 반영
      },
    }, `${id} · ${MOOD_LABELS[id]}`);
    optBtns[id] = b;
    optWrap.appendChild(b);
  });

  const closeRevert = () => { applyMood(current); overlay.remove(); };

  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, '무드 설정'),
    el('button', {
      className: 'icon-btn-close',
      type: 'button',
      'aria-label': '닫기',
      onclick: closeRevert,
    }, '×'),
  ));
  modal.appendChild(el('div', { className: 'form-hint' },
    '무드를 고르면 바로 미리보기로 보여요. "적용"을 눌러야 저장됩니다. (파티 선택 화면은 계속 랜덤)'));
  modal.appendChild(optWrap);
  modal.appendChild(el('div', { className: 'modal-actions' },
    el('button', { className: 'btn btn-ghost', type: 'button', onclick: closeRevert }, '취소'),
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: () => { setSavedMood(selected); applyMood(selected); overlay.remove(); },
    }, '적용'),
  ));

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRevert(); });
  document.body.appendChild(overlay);
}
