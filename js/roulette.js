// roulette.js — 채널 추천 룰렛
//
// 파티 상세 좌측 사이드 카드. 버튼 누르면 슬롯이 굴러가다 멈추며
// CHANNELS 중 1개를 무작위로 추천한다.

import { CHANNELS, channelLabel } from './data.js';
import { el } from './utils.js';

const SPIN_MS    = 1100;   // 전체 회전 시간
const TICK_START = 35;     // 처음에 빠르게 (ms)
const TICK_END   = 180;    // 끝에 느리게

export function renderChannelRoulette() {
  const display = el('div', { className: 'roulette-display' }, '?');
  const button  = el('button', {
    className: 'roulette-btn',
    type: 'button',
    onclick: () => spin(),
  }, '뽑기');

  let spinning = false;

  function spin() {
    if (spinning) return;
    spinning = true;
    button.disabled = true;
    display.classList.remove('roulette-display-final');
    display.classList.add('roulette-display-spinning');

    const start = performance.now();
    let lastTick = 0;
    let final = pickRandom();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SPIN_MS, 1);
      // ease-out: tick 간격을 점점 길게.
      const interval = TICK_START + (TICK_END - TICK_START) * progress * progress;

      if (now - lastTick >= interval) {
        lastTick = now;
        // 매 tick마다 후보를 바꿔 표시 — 마지막엔 미리 정한 final로 고정.
        const showWhich = progress >= 1 ? final : pickRandom();
        display.textContent = channelLabel(showWhich);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        display.textContent = channelLabel(final);
        display.classList.remove('roulette-display-spinning');
        display.classList.add('roulette-display-final');
        spinning = false;
        button.disabled = false;
      }
    };
    requestAnimationFrame(step);
  }

  return el('aside', { className: 'roulette-side' },
    el('div', { className: 'roulette-card' },
      el('div', { className: 'roulette-title' }, '채널 룰렛'),
      el('div', { className: 'roulette-window' }, display),
      button,
      el('div', { className: 'roulette-hint' }, '버튼을 눌러 채널을 추천받으세요'),
    ),
  );
}

function pickRandom() {
  return CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
}
