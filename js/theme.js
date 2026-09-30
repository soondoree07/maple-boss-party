// theme.js — 라이트 / 다크 모드 고르기
//
// 고른 적이 없으면 기기(시스템) 설정을 따른다. 고르면 이 브라우저에만 기억한다.
// 실제 색은 css/theme.css 가 <html data-theme> 를 보고 정한다.
// 첫 화면 깜빡임을 막으려고 index.html <head> 스크립트가 같은 키로 먼저 적용한다.

import { el } from './utils.js';

const KEY = 'maple-theme'; // 'light' | 'dark' (없으면 시스템 따라감)
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** 지금 화면에 보이는 모드. */
export function currentTheme() {
  return document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* 저장이 막혀도 이번 화면에는 적용된다 */ }
}

/** 헤더에 넣는 모드 전환 버튼. 누르면 반대 모드로 바꾸고 글자도 바꾼다. */
export function createThemeToggle() {
  const label = () => (currentTheme() === 'dark' ? '라이트 모드' : '다크 모드');
  const button = el('button', { className: 'icon-btn', type: 'button' }, label());
  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    button.textContent = label();
  });
  return button;
}

