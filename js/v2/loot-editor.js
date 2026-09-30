// v2/loot-editor.js — 기록 창 안의 드랍템 입력 줄들
//
// 한 줄 = 아이템 이름 · 판매가(억) · 분배/독식 · (독식이면) 가져간 캐릭터.
// 아이템 이름은 그 보스·난이도 드랍 목록에서 고르거나 직접 적는다.

import { el } from '../utils.js';

let datalistSeq = 0;

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
  const rows = [];

  const refresh = () => {
    datalist.replaceChildren(...getCandidates().map(name => el('option', { value: name })));
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
    rowsBox,
    el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => addRow() }, '+ 드랍템 추가'),
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
    className: 'text-input v2-price-input', type: 'number', inputmode: 'decimal',
    step: '0.01', min: '0', placeholder: '판매가(억)', value: item.price ?? '',
  });
  const modeSelect = el('select', { className: 'select-input' },
    el('option', { value: 'split' }, '분배'),
    el('option', { value: 'solo' }, '독식'),
  );
  modeSelect.value = item.mode === 'solo' ? 'solo' : 'split';
  const takerSelect = el('select', { className: 'select-input' });
  let takerId = item.takerCharacterId || '';

  const syncTakers = () => {
    const people = getParticipants();
    takerSelect.replaceChildren(
      el('option', { value: '' }, '가져간 캐릭터'),
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
    el('button', { className: 'icon-btn icon-btn-sm', type: 'button', title: '이 줄 지우기', onclick: onRemove }, '×'),
  );

  const read = () => {
    const name = nameInput.value.trim();
    if (!name) return { item: null }; // 빈 줄은 무시
    const price = priceInput.value === '' ? 0 : Number(priceInput.value);
    if (!Number.isFinite(price) || price < 0) return { error: `${name}의 판매가를 숫자로 적어 주세요.` };
    if (modeSelect.value === 'solo' && !takerSelect.value) {
      return { error: `${name}을(를) 가져간 캐릭터를 골라 주세요.` };
    }
    return {
      item: modeSelect.value === 'solo'
        ? { name, price, mode: 'solo', takerCharacterId: takerSelect.value }
        : { name, price, mode: 'split' },
    };
  };

  return { node, syncTakers, read };
}
