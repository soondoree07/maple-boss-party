// v2/ring-box-picker.js — 드랍템 칸 안의 "반지 상자에서 나온 반지 고르기" 줄
//
// 반지 상자 버튼을 누르면 버튼 줄 바로 아래에 펼쳐진다(떠 있는 메뉴가 아니라 칸 안에 끼워 넣어 잘리지 않는다).
// 리레 4 · 컨티 4 · 꽝 중 하나를 누르면 그 이름으로 드랍템 한 줄이 생기고 닫힌다.

import { el } from '../utils.js';
import { RING_BOX_CONTENTS, getLootImage } from '../data.js';

/**
 * @param {(name: string) => void} onPick - 고른 반지 이름 (리4 · 컨4 · 반지 꽝)
 * @returns {{ node: HTMLElement, open: (boxName: string) => void, close: () => void }}
 */
export function createRingBoxPicker(onPick) {
  const node = el('div', { className: 'v2-ring-picker', hidden: true });

  const close = () => { node.hidden = true; node.replaceChildren(); };

  const open = (boxName) => {
    const boxImg = getLootImage(boxName);
    node.replaceChildren(
      el('div', { className: 'v2-ring-picker-head' },
        boxImg ? el('img', { className: 'v2-loot-img', src: boxImg, alt: '' }) : null,
        el('span', null, `${boxName}에서 나온 반지를 골라요`),
        el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: close }, '닫기'),
      ),
      el('div', { className: 'v2-ring-picker-options' }, RING_BOX_CONTENTS.map(({ name, label }) => {
        const img = getLootImage(name);
        return el('button', {
          className: 'v2-loot-chip', type: 'button',
          onclick: () => { onPick(name); close(); },
        }, img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null, label);
      })),
    );
    node.hidden = false;
  };

  return { node, open, close };
}
