// v2/modal.js — 입력 창 공용 틀 (제목 · 본문 · 버튼 줄, 바깥 클릭/ESC 닫기)

import { el } from '../utils.js';
import { closeIcon } from './icons.js';

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {HTMLElement} opts.body
 * @param {HTMLElement[]} opts.actions - 아래 버튼들
 * @param {boolean} [opts.wide]
 * @returns {() => void} close 함수
 */
export function openModal({ title, body, actions, wide = false }) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: `modal${wide ? ' modal-wide' : ''}` });

  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    const all = document.querySelectorAll('.modal-overlay');
    if (e.key === 'Escape' && all[all.length - 1] === overlay) close();
  };
  document.addEventListener('keydown', onKey);

  modal.append(
    el('div', { className: 'modal-header' },
      el('h2', { className: 'modal-title' }, title),
      el('button', { className: 'icon-btn-close', type: 'button', 'aria-label': '닫기', onclick: close }, closeIcon()),
    ),
    body,
    el('div', { className: 'modal-actions' }, actions),
  );
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  return close;
}

/** 모달 본문 안의 "라벨 + 입력" 한 칸. */
export const field = (label, ...controls) =>
  el('div', { className: 'form-group' }, el('label', { className: 'form-label' }, label), ...controls);
