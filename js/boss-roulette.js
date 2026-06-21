// boss-roulette.js — 보스 추천 룰렛
//
// 파티 상세 좌측 사이드 카드(채널 룰렛과 사다리타기 사이). 디자인·동작은
// 채널 룰렛(roulette.js)과 동일하며, 후보는 그 파티에서 활성화(보이기 ON)된
// 보스만(getVisibleBosses) 대상으로 한다.

import { getVisibleBosses } from './data.js';
import * as Storage from './storage.js';
import { el } from './utils.js';

const SPIN_MS    = 1100;   // 전체 회전 시간
const TICK_START = 35;     // 처음에 빠르게 (ms)
const TICK_END   = 180;    // 끝에 느리게

export function renderBossRoulette(party) {
  const settings   = Storage.getBossSettings(party.id);
  // 활성화된 보스 중 월간 보스(검은 마법사)는 룰렛에서 항상 제외 — 주간 보스 순서용.
  const candidates = getVisibleBosses(settings.visible).filter(b => b.cycle !== 'monthly');
  const hasBoss    = candidates.length > 0;

  const display = el('div', { className: 'roulette-display' }, '?');
  const button  = el('button', {
    className: 'roulette-btn',
    type: 'button',
    disabled: !hasBoss,
    onclick: () => spin(),
  }, '뽑기');

  let spinning = false;

  function spin() {
    if (spinning || !hasBoss) return;
    spinning = true;
    button.disabled = true;
    display.classList.remove('roulette-display-final');
    display.classList.add('roulette-display-spinning');

    const start = performance.now();
    let lastTick = 0;
    const final = pickRandom(candidates);

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SPIN_MS, 1);
      // ease-out: tick 간격을 점점 길게.
      const interval = TICK_START + (TICK_END - TICK_START) * progress * progress;

      if (now - lastTick >= interval) {
        lastTick = now;
        // 매 tick마다 후보를 바꿔 표시 — 마지막엔 미리 정한 final로 고정.
        const showWhich = progress >= 1 ? final : pickRandom(candidates);
        display.textContent = showWhich.name;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        display.textContent = final.name;
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
      el('div', { className: 'roulette-title' }, '보스 룰렛'),
      el('div', { className: 'roulette-window' }, display),
      button,
      el('div', { className: 'roulette-hint' },
        hasBoss ? '버튼을 눌러 보스를 추천받으세요' : '활성화된 보스가 없어요'),
    ),
  );
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
