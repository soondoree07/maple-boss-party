// ladder.js — 사다리타기 (당첨 1명 고정)
//
// 룰렛 밑에 sticky 사이드 카드로 배치. 인원수(≤ 파티 총원)를 정한 만큼 이름 입력칸을
// 만들고, "뽑기" 버튼을 누르면 1명만 O, 나머지는 X로 결과를 셔플해서 표시한다.

import { el, clear } from './utils.js';

/**
 * @param {{members: string[]}} party — 인원수 상한으로 사용
 */
export function renderLadder(party) {
  const cap = Math.max(party.members.length, 1);
  if (cap < 2) {
    return el('aside', { className: 'ladder-side' },
      el('div', { className: 'ladder-card' },
        el('div', { className: 'ladder-title' }, '사다리타기'),
        el('div', { className: 'empty-state-sm' }, '2명 이상부터 가능해요'),
      ),
    );
  }
  let count = 2;  // 디폴트 2명
  let names = Array(count).fill('');
  let result = null;             // null | string[] ('O' | 'X')

  const card = el('div', { className: 'ladder-card' });

  const repaint = () => {
    clear(card);

    // 헤더
    card.appendChild(el('div', { className: 'ladder-title' }, '사다리타기'));

    // 인원수 입력
    const countInput = el('input', {
      type: 'number',
      className: 'text-input ladder-count',
      min: '2',
      max: String(cap),
      value: String(count),
    });
    countInput.addEventListener('input', () => {
      let n = parseInt(countInput.value, 10);
      if (!Number.isFinite(n)) return;
      n = Math.max(2, Math.min(cap, n));
      if (n === count) return;
      count = n;
      // 이름 배열 길이 맞추기 — 기존 값 보존.
      if (names.length < count) names = names.concat(Array(count - names.length).fill(''));
      else names = names.slice(0, count);
      result = null;
      repaint();
    });

    card.appendChild(el('div', { className: 'ladder-count-row' },
      el('span', { className: 'ladder-label' }, '인원'),
      countInput,
      el('span', { className: 'ladder-cap-hint' }, `(최대 ${cap}명)`),
    ));

    // 이름 입력 + 결과 그리드
    const list = el('div', { className: 'ladder-name-list' });
    for (let i = 0; i < count; i++) {
      const input = el('input', {
        type: 'text',
        className: 'text-input ladder-name-input',
        placeholder: `참가자 ${i + 1}`,
        value: names[i],
      });
      input.addEventListener('input', () => { names[i] = input.value; });

      const cell = el('div', { className: 'ladder-name-row' }, input);
      if (result) {
        const r = result[i];
        cell.appendChild(el('span', {
          className: 'ladder-result' + (r === 'O' ? ' ladder-result-win' : ' ladder-result-lose'),
        }, r));
      }
      list.appendChild(cell);
    }
    card.appendChild(list);

    // 뽑기 버튼
    const btn = el('button', {
      className: 'ladder-btn',
      type: 'button',
      onclick: () => {
        // 당첨 1명 고정. 나머지 X.
        const arr = Array(count).fill('X');
        const winIdx = Math.floor(Math.random() * count);
        arr[winIdx] = 'O';
        result = arr;
        repaint();
      },
    }, result ? '🎲 다시 뽑기' : '🎲 뽑기');
    card.appendChild(btn);

    if (result) {
      const winnerIdx = result.indexOf('O');
      const winnerName = (names[winnerIdx] || '').trim() || `참가자 ${winnerIdx + 1}`;
      card.appendChild(el('div', { className: 'ladder-winner' },
        '🏆 ', el('strong', null, winnerName), ' 당첨!'));
    }
  };

  repaint();

  return el('aside', { className: 'ladder-side' }, card);
}
