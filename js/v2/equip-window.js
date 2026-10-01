// v2/equip-window.js — 유저 캐릭터 창의 장비창 (인게임 배치 · 프리셋 1 · 2 · 3 · 마우스 올리면 상세)
//
// 칸 배치는 인게임 장비창(5열 x 6행)을 따른다. 테두리 색 = 잠재 등급.
// 오른쪽 위 세로 버튼으로 프리셋을 바꾼다. 지금 착용 중인 프리셋 버튼에는 "착용"을 붙인다.
// 툴팁은 화면에 하나만 두고 칸마다 내용을 바꿔 끼운다(모바일은 누르면 보이고 다시 누르면 닫힌다).

import { el } from '../utils.js';

const LAYOUT = [
  ['반지4', null, '모자', null, '엠블렘'],
  ['반지3', '펜던트2', '얼굴장식', null, '뱃지'],
  ['반지2', '펜던트', '눈장식', '귀고리', '훈장'],
  ['반지1', '무기', '상의', '어깨장식', '보조무기'],
  ['포켓 아이템', '벨트', '하의', '장갑', '망토'],
  [null, null, '신발', '안드로이드', '기계 심장'],
];
const PRESETS = ['1', '2', '3'];

/**
 * @param {{ current: string, presets: Record<string, object[]> }} equipment - api/_lib/profile.js 의 toEquipment
 */
export function createEquipWindow(equipment) {
  const grid = el('div', { className: 'v2-equip-grid' });
  const presetBox = el('div', { className: 'v2-equip-presets' });
  const node = el('div', { className: 'v2-equip' }, grid, presetBox);

  const show = (presetNo) => {
    hideTooltip(); // 프리셋을 바꾸면 이전 칸의 툴팁은 닫는다
    const bySlot = new Map((equipment.presets[presetNo] || []).map(item => [item.slot, item]));
    grid.replaceChildren(...LAYOUT.flat().map(slot => slotNode(slot, bySlot.get(slot))));
    presetBox.replaceChildren(...PRESETS.map(no => el('button', {
      className: `v2-equip-preset${no === presetNo ? ' on' : ''}`, type: 'button', onclick: () => show(no),
    }, no, el('small', null, no === equipment.current ? '착용' : '프리셋'))));
  };
  hideTooltip(); // 다른 캐릭터 · 다시 그린 화면에서 이전 툴팁이 남지 않게
  show(equipment.current);
  return node;
}

function slotNode(slot, item) {
  if (!slot) return el('div', { className: 'v2-equip-slot empty' });
  if (!item) return el('div', { className: 'v2-equip-slot' }, el('span', { className: 'v2-equip-label' }, slot));
  const node = el('div', { className: 'v2-equip-slot', dataset: { grade: item.potentialGrade || '' }, tabindex: '0' },
    el('img', { src: item.icon, alt: item.name, loading: 'lazy' }));
  bindTooltip(node, item);
  return node;
}

// ── 툴팁 ─────────────────────────────────────────────

let tooltip = null;
let tooltipOwner = null; // 지금 툴팁을 띄운 장비 (터치로 같은 칸을 다시 누르면 닫는다)
const getTooltip = () => {
  if (!tooltip || !tooltip.isConnected) {
    tooltip = el('div', { className: 'v2-equip-tip', hidden: true });
    document.body.appendChild(tooltip);
  }
  return tooltip;
};
const hideTooltip = () => {
  if (tooltip) tooltip.hidden = true;
  tooltipOwner = null;
};
// 툴팁은 body 에 붙어 있어 칸이 화면에서 사라져도 남는다 → 화면을 옮기거나 다른 곳을 누르면 닫는다.
window.addEventListener('hashchange', hideTooltip);
document.addEventListener('pointerdown', (e) => {
  if (tooltipOwner && !e.target.closest?.('.v2-equip-slot')) hideTooltip();
});

function bindTooltip(node, item) {
  const place = (x, y) => {
    const tip = getTooltip();
    tip.style.left = `${Math.max(8, Math.min(x + 16, innerWidth - tip.offsetWidth - 8))}px`;
    tip.style.top = `${Math.max(8, Math.min(y + 16, innerHeight - tip.offsetHeight - 8))}px`;
  };
  const open = (x, y) => {
    const tip = getTooltip();
    tip.replaceChildren(...tooltipContent(item));
    tip.hidden = false;
    tooltipOwner = item;
    place(x, y);
  };
  const close = hideTooltip;

  // 마우스는 올리면 열고 벗어나면 닫는다.
  const isMouse = (e) => e.pointerType === 'mouse';
  node.addEventListener('pointerenter', (e) => { if (isMouse(e)) open(e.clientX, e.clientY); });
  node.addEventListener('pointermove', (e) => { if (isMouse(e)) place(e.clientX, e.clientY); });
  node.addEventListener('pointerleave', (e) => { if (isMouse(e)) close(); });
  // 터치는 누르면 열고, 같은 칸을 다시 누르면 닫는다.
  node.addEventListener('pointerup', (e) => {
    if (isMouse(e)) return;
    const tip = getTooltip();
    if (!tip.hidden && tooltipOwner === item) { close(); return; }
    open(e.clientX, e.clientY);
  });
}

function tooltipContent(item) {
  const section = (title, grade, rows) => (rows.length
    ? el('div', { className: 'v2-tip-sec' },
        el('div', { className: 'v2-tip-grade', dataset: { grade: grade || '' } }, `${title} · ${grade}`),
        rows.map(row => el('p', null, row)))
    : null);
  return [
    starRows(item.star),
    el('h4', null, item.scroll > 0 ? `${item.name} (+${item.scroll})` : item.name),
    item.options.length ? el('div', { className: 'v2-tip-sec' }, item.options.map(row => el('p', null, row))) : null,
    section('잠재옵션', item.potentialGrade, item.potential),
    section('에디셔널', item.additionalGrade, item.additional),
    item.soul ? el('div', { className: 'v2-tip-sec' }, el('p', null, item.soul.name), el('p', null, item.soul.option || '')) : null,
  ].filter(Boolean);
}

/**
 * 스타포스 별 — 5개씩 묶는다.
 *  15성 이하: 한 줄, 있는 별만 가운데 정렬.
 *  16~20성: 윗줄 15개 + 아랫줄 한 묶음이 윗줄 가운데 묶음 아래 가운데.
 *  21성 이상: 아랫줄 묶음이 윗줄 묶음 사이사이 (빈칸으로 5칸 폭을 지켜 자리를 고정, 26성 이상은 세 묶음).
 */
export function starRows(count) {
  if (!count) return null;
  const group = (n, pad) => el('span', { className: 'v2-star-group' },
    ...Array.from({ length: pad ? 5 : n }, (_, i) => el('i', { className: i < n ? '' : 'pad' }, '★')));
  const row = (from, slots, pad) => el('div', { className: 'v2-star-row' },
    ...Array.from({ length: slots }, (_, k) => group(Math.max(0, Math.min(5, count - from - k * 5)), pad)));

  if (count <= 15) return el('div', { className: 'v2-stars' }, row(0, Math.ceil(count / 5), false));
  const lowerSlots = count > 25 ? 3 : count > 20 ? 2 : 1;
  return el('div', { className: 'v2-stars' }, row(0, 3, true), row(15, lowerSlots, lowerSlots > 1));
}
