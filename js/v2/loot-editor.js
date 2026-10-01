// v2/loot-editor.js — 기록 창 안의 드랍템 입력 줄들
//
// 한 줄 = 아이템 이름 · 판매가(억) · 분배/독식 · (독식이면) 가져간 캐릭터.
// 위쪽 아이템 버튼을 누르면 그 이름으로 한 줄이 바로 생긴다(여러 개 연달아 눌러 담기).
// 목록에 없는 아이템은 "+ 직접 입력" 줄에 적는다.
// 반지 상자 버튼은 바로 줄을 만들지 않고, 상자에서 나온 반지(리4 · 컨4 · 꽝)를 고르게 한다.
// 꽝 줄(이름 = 반지 상자 이름)은 0억 고정이라 가격 · 분배 칸을 잠근다.

import { el } from '../utils.js';
import { getLootImage, isRingBox } from '../data.js';
import { isExternalCharacter } from './members.js';
import { closeIcon } from './icons.js';
import { createRingBoxPicker } from './ring-box-picker.js';

let datalistSeq = 0;

// "+ 직접 입력" 줄 추가 버튼. 목록에 있는 아이템만 쓰도록 꺼 둔다 (사용자 결정 2026-10-01). 다시 켜려면 true.
const ALLOW_MANUAL_LOOT = false;

/**
 * @param {object} opts
 * @param {() => string[]} opts.getCandidates   - 지금 보스·난이도의 드랍 아이템 이름들
 * @param {() => {id, name}[]} opts.getParticipants - 지금 고른 참여 캐릭터들
 * @param {object[]} [opts.initial]             - 수정할 때 기존 드랍템
 * @returns {{ node: HTMLElement, refresh: () => void, readItems: () => ({items}|{error}) }}
 */
export function createLootEditor({ getCandidates, getParticipants, initial = [] }) {
  const datalist = el('datalist', { id: `v2-loot-names-${++datalistSeq}` });
  const rowsBox = el('div', { className: 'v2-loot-rows' });
  const quickBox = el('div', { className: 'v2-loot-quick' });
  const rows = [];
  const ringPicker = createRingBoxPicker((name, isMiss) => addRow(isMiss ? { name, price: 0 } : { name }));

  const refresh = () => {
    const names = getCandidates();
    datalist.replaceChildren(...names.filter(name => !isRingBox(name)).map(name => el('option', { value: name })));
    quickBox.replaceChildren(...names.map(name => {
      const img = getLootImage(name);
      const ringBox = isRingBox(name);
      return el('button', {
        className: `v2-loot-chip${ringBox ? ' v2-loot-chip-box' : ''}`, type: 'button',
        title: ringBox ? `${name}에서 나온 반지 고르기` : `${name} 담기`,
        onclick: () => (ringBox ? ringPicker.open(name) : addRow({ name })),
      }, img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null, name);
    }));
    if (!names.some(isRingBox)) ringPicker.close(); // 보스를 바꿔 상자가 없어지면 펼친 줄도 닫는다
    rows.forEach(row => row.syncTakers());
  };

  const addRow = (item = {}) => {
    const row = createRow(item, datalist.id, getParticipants, () => {
      rows.splice(rows.indexOf(row), 1);
      row.node.remove();
    });
    rows.push(row);
    rowsBox.appendChild(row.node);
  };

  initial.forEach(addRow);
  refresh();

  const node = el('div', { className: 'v2-loot-editor' },
    datalist,
    quickBox,
    ringPicker.node,
    rowsBox,
    ALLOW_MANUAL_LOOT ? el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => addRow() }, '+ 직접 입력') : null,
  );

  const readItems = () => {
    const items = [];
    for (const row of rows) {
      const result = row.read();
      if (result.error) return result;
      if (result.item) items.push(result.item);
    }
    return { items };
  };

  return { node, refresh, readItems };
}

function createRow(item, datalistId, getParticipants, onRemove) {
  const nameInput = el('input', {
    className: 'text-input', type: 'text', placeholder: '아이템', value: item.name || '',
  });
  nameInput.setAttribute('list', datalistId); // input.list 는 읽기 전용이라 속성으로 건다
  const priceInput = el('input', {
    className: 'text-input v2-price-input', type: 'text', inputmode: 'decimal',
    autocomplete: 'off', placeholder: '가격(억)', value: item.price ?? '',
  });
  const modeSelect = el('select', { className: 'select-input' },
    el('option', { value: 'split' }, '분배'),
    el('option', { value: 'solo' }, '독식'),
  );
  modeSelect.value = item.mode === 'solo' ? 'solo' : 'split';
  // 꽝(반지 상자 이름)은 0억 고정 — 이름 · 가격 · 분배를 못 바꾸게 잠근다.
  const isMiss = isRingBox(item.name);
  if (isMiss) {
    nameInput.readOnly = true;
    priceInput.value = '0';
    priceInput.disabled = true;
    modeSelect.value = 'split';
  }
  const takerSelect = el('select', { className: 'select-input' });
  let takerId = item.takerCharacterId || '';
  let forcedSolo = false;

  const syncTakers = () => {
    const people = getParticipants();
    // 파티원 없이 혼자면 무조건 그 사람 독식이다 (사용자 결정 2026-10-01). 두 명 이상이 되면 다시 고를 수 있다.
    // 혼자라서 자동으로 독식이 된 줄은, 파티원이 생기면 기본값(분배)으로 되돌린다.
    const alone = people.length === 1;
    if (alone) { modeSelect.value = 'solo'; takerId = people[0].id; forcedSolo = true; }
    else if (forcedSolo) { modeSelect.value = 'split'; takerId = ''; forcedSolo = false; }
    modeSelect.disabled = alone || isMiss;
    takerSelect.disabled = alone;
    // 외부 인원은 "기타" 하나로 합쳐 보이므로, 다른 자리표로 저장된 값도 그 칸으로 맞춘다.
    const externalChoice = people.find(p => isExternalCharacter(p.id));
    if (externalChoice && takerId && !people.some(p => p.id === takerId) && isExternalCharacter(takerId)) {
      takerId = externalChoice.id;
    }
    takerSelect.replaceChildren(
      el('option', { value: '' }, '가져간 사람'),
      ...people.map(p => el('option', { value: p.id }, p.name)),
    );
    takerSelect.value = people.some(p => p.id === takerId) ? takerId : '';
    takerSelect.hidden = modeSelect.value !== 'solo';
  };
  takerSelect.addEventListener('change', () => { takerId = takerSelect.value; });
  modeSelect.addEventListener('change', syncTakers);
  syncTakers();

  const node = el('div', { className: 'v2-loot-row' },
    nameInput, priceInput, modeSelect, takerSelect,
    el('button', { className: 'icon-btn icon-btn-sm', type: 'button', title: '이 줄 지우기', 'aria-label': '이 줄 지우기', onclick: onRemove }, closeIcon()),
  );

  const read = () => {
    const name = nameInput.value.trim();
    if (!name) return { item: null }; // 빈 줄은 무시
    if (isMiss) {
      return { item: modeSelect.value === 'solo' && takerSelect.value
        ? { name, price: 0, mode: 'solo', takerCharacterId: takerSelect.value }
        : { name, price: 0, mode: 'split' } };
    }
    const raw = priceInput.value.trim().replace(/억$/, '').replace(/,/g, '');
    const price = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(price) || price < 0) return { error: `${name}의 판매가를 숫자로 적어 주세요.` };
    if (modeSelect.value === 'solo' && !takerSelect.value) {
      return { error: `${name}을(를) 가져간 사람을 골라 주세요.` };
    }
    return {
      item: modeSelect.value === 'solo'
        ? { name, price, mode: 'solo', takerCharacterId: takerSelect.value }
        : { name, price, mode: 'split' },
    };
  };

  return { node, syncTakers, read };
}
