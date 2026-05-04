// crystals.js — 보스 결정석 가격 편집 페이지
//
// 라우트: #/crystals
//
// 상단: 주간 보스 카드들 (가로 2열)
// 하단: 월간 보스(검마) 카드 한 개 (별도 섹션)
// 페이지 하단: 저장 버튼 한 개 — 한 번에 모두 저장.

import * as Storage from './storage.js';
import { BOSSES, getEffectiveCrystal } from './data.js';
import { el, clear } from './utils.js';

export function renderCrystalsPage(container) {
  clear(container);

  // 입력 상태 — bossId → string (사용자 타이핑 그대로)
  const overrides = Storage.getCrystalOverrides();
  const draft = {};
  BOSSES.forEach(b => {
    const eff = getEffectiveCrystal(b.id, overrides);
    draft[b.id] = String(eff);
  });

  // ── 헤더 ──
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: 'javascript:history.back()', className: 'back-btn' }, '← 뒤로'),
    el('h1', { className: 'page-title' }, '결정석 가격 수정'),
    el('div', { className: 'header-actions' }),
  ));

  // ── 본문 ──
  const main = el('main', { className: 'crystals-main' });

  const weekly  = BOSSES.filter(b => b.cycle === 'weekly');
  const monthly = BOSSES.filter(b => b.cycle === 'monthly');

  // 주간 섹션
  main.appendChild(el('section', { className: 'crystals-section' },
    el('h2', { className: 'crystals-section-title' }, '주간 보스'),
    el('div', { className: 'crystals-grid' },
      weekly.map(b => buildBossCard(b, draft)),
    ),
  ));

  // 월간 섹션
  if (monthly.length > 0) {
    main.appendChild(el('section', { className: 'crystals-section' },
      el('h2', { className: 'crystals-section-title' }, '월간 보스'),
      el('div', { className: 'crystals-grid' },
        monthly.map(b => buildBossCard(b, draft)),
      ),
    ));
  }

  // 저장 버튼 (페이지 하단)
  main.appendChild(el('div', { className: 'crystals-actions' },
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: () => {
        const map = {};
        for (const b of BOSSES) map[b.id] = draft[b.id];
        Storage.setCrystalOverrides(map);
        history.back();
      },
    }, '저장'),
  ));

  container.appendChild(main);
}

function buildBossCard(boss, draft) {
  const input = el('input', {
    type: 'number',
    step: '0.1',
    min: '0',
    inputmode: 'decimal',
    className: 'text-input crystal-input',
    value: draft[boss.id],
    placeholder: '0',
  });
  input.addEventListener('input', () => { draft[boss.id] = input.value; });

  return el('div', {
    className: 'crystal-card',
    style: { '--accent': boss.color },
  },
    el('div', { className: 'crystal-card-name' }, boss.name),
    el('div', { className: 'crystal-card-input-row' },
      input,
      el('span', { className: 'crystal-card-unit' }, '억'),
    ),
  );
}
