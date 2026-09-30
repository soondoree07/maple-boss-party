// theme.js — 라이트 / 다크 모드 고르기
//
// 고른 적이 없으면 기기(시스템) 설정을 따르고, 기기 설정이 바뀌면 같이 바뀐다.
// 버튼으로 고르면 이 브라우저에만 기억하고, 그때부터는 기기 설정을 따르지 않는다.
// 실제 색은 css/theme.css 가 <html data-theme> 를 보고 정한다.
// 첫 화면은 index.html <head> 스크립트가 같은 키·같은 규칙으로 먼저 정한다.

import { el } from './utils.js';

const KEY = 'maple-theme'; // 'light' | 'dark' (없으면 시스템 따라감)
const THEME_COLOR = { light: '#F2F4F6', dark: '#17171C' }; // 폰 주소창 색
const systemQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

const currentTheme = () => document.documentElement.dataset.theme || 'light';

function hasSavedChoice() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

function showTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.content = THEME_COLOR[theme];
}

function chooseTheme(theme) {
  showTheme(theme);
  try { localStorage.setItem(KEY, theme); } catch { /* 저장이 막혀도 이번 화면에는 적용된다 */ }
}

// 고른 적이 없을 때만 기기 설정 변화를 따라간다.
systemQuery?.addEventListener('change', (e) => {
  if (!hasSavedChoice()) showTheme(e.matches ? 'dark' : 'light');
});

/** 헤더에 넣는 모드 전환 버튼. 누르면 반대 모드로 바꾸고 글자도 바꾼다. */
export function createThemeToggle() {
  const label = () => (currentTheme() === 'dark' ? '라이트 모드' : '다크 모드');
  const button = el('button', { className: 'icon-btn', type: 'button' }, label());
  button.addEventListener('click', () => {
    chooseTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    button.textContent = label();
  });
  return button;
}
