// crystals.js — 보스 설정 페이지 (등장 유무 / 기본 난이도 / 난이도별 결정석·전리품 조회)
//
// 라우트: #/crystals
//
// 보스마다 가로로 긴 행 1개 (가나다순):
//   [☑ 보이기] [보스명] [기본 난이도 ▼]   난이도별 [결정석 가격 · 전리품 종류]
//
// 결정석 가격은 data.js의 고정값(조회 전용). 사용자가 정하는 건
//   - 보이기 체크박스   → 회차 폼 보스 드롭다운 노출 여부
//   - 기본 난이도        → 회차 폼 난이도 초기값 후보
// 저장 시 localStorage(bossSettings)에 반영.

import * as Storage from './storage.js';
import { bossesInOrder, difficultyLabel, getBossLoot, getLootImage, getDisplayLootColor } from './data.js';
import { formatMeso, el, clear } from './utils.js';

export function renderCrystalsPage(container) {
  clear(container);

  const settings = Storage.getBossSettings();
  const bosses = bossesInOrder();

  // 드래프트 — 저장 버튼 누를 때까지 화면에만 반영.
  const draftVisible  = {};  // { [id]: boolean }
  const draftDefaults = {};  // { [id]: difficultyKey }
  bosses.forEach(b => {
    draftVisible[b.id]  = settings.visible[b.id] !== false;
    const dft = settings.defaults[b.id];
    draftDefaults[b.id] = (dft && b.difficulties.some(d => d.key === dft))
      ? dft
      : (b.difficulties[0]?.key || '');
  });

  // ── 헤더 ──
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: 'javascript:history.back()', className: 'back-btn' }, '← 뒤로'),
    el('h1', { className: 'page-title' }, '보스 설정 · 결정석'),
    el('div', { className: 'header-actions' }),
  ));

  const main = el('main', { className: 'crystals-main' });

  main.appendChild(el('p', { className: 'crystals-hint' },
    '보이기를 끄면 회차 기록의 보스 드롭다운에서 숨겨져요. ' +
    '기본 난이도는 회차를 처음 기록할 때 미리 선택돼요 (회차마다 바꿀 수 있어요).',
  ));

  main.appendChild(el('div', { className: 'boss-setting-list' },
    bosses.map(b => buildBossRow(b, draftVisible, draftDefaults)),
  ));

  // 저장 버튼 (페이지 하단)
  main.appendChild(el('div', { className: 'crystals-actions' },
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: () => {
        Storage.setBossSettings({ visible: { ...draftVisible }, defaults: { ...draftDefaults } });
        history.back();
      },
    }, '저장'),
  ));

  container.appendChild(main);
}

function buildBossRow(boss, draftVisible, draftDefaults) {
  // 보이기 체크박스
  const visibleCheck = el('input', {
    type: 'checkbox',
    className: 'boss-visible-check',
    checked: draftVisible[boss.id],
  });
  visibleCheck.addEventListener('change', () => {
    draftVisible[boss.id] = visibleCheck.checked;
    card.classList.toggle('boss-hidden', !visibleCheck.checked);
  });

  // 기본 난이도 select
  const defaultSelect = el('select', { className: 'select-input boss-default-select' },
    boss.difficulties.map(d =>
      el('option', { value: d.key }, difficultyLabel(d.key))
    ),
  );
  defaultSelect.value = draftDefaults[boss.id];
  defaultSelect.addEventListener('change', () => {
    draftDefaults[boss.id] = defaultSelect.value;
  });

  // 난이도별 결정석 + 전리품 행
  const diffRows = boss.difficulties.map(d => {
    const loot = getBossLoot(boss.id, d.key);
    const lootNodes = loot.length > 0
      ? loot.map(({ name, group }) => {
          const img   = getLootImage(name);
          const color = getDisplayLootColor(name, group);
          return el('span', { className: 'bsd-loot', title: name },
            img
              ? el('img', { className: 'bsd-loot-img', src: img, alt: name, loading: 'lazy' })
              : null,
            el('span', { className: 'bsd-loot-name', style: color ? { color } : null }, name),
          );
        })
      : [el('span', { className: 'bsd-loot-none' }, '결정석만')];

    return el('div', { className: 'bsd-row' },
      el('span', { className: 'bsd-diff' }, difficultyLabel(d.key)),
      el('span', { className: 'bsd-crystal' }, formatMeso(d.crystal)),
      el('span', { className: 'bsd-loots' }, lootNodes),
    );
  });

  const card = el('div', {
    className: 'boss-setting-card' + (draftVisible[boss.id] ? '' : ' boss-hidden'),
    style: { '--accent': boss.color },
  },
    el('div', { className: 'boss-setting-head' },
      el('label', { className: 'boss-visible-label', title: '회차 기록에 노출' },
        visibleCheck,
        el('span', {}, '보이기'),
      ),
      el('span', { className: 'boss-setting-name' }, boss.name),
      el('span', { className: 'boss-setting-cycle' },
        boss.cycle === 'monthly' ? '월간' : '주간'),
      el('label', { className: 'boss-default-label' },
        el('span', { className: 'boss-default-cap' }, '기본 난이도'),
        defaultSelect,
      ),
    ),
    el('div', { className: 'boss-setting-diffs' }, diffRows),
  );

  return card;
}
