// ladder.js — 사다리타기 (당첨 1명 고정)
//
// UX:
//  1) 입력 단계        — 인원수(2~파티 총원) + 이름 N개 입력. 사다리/결과는 가려져 있음.
//  2) "뽑기" 클릭      — 새 사다리(랜덤 가로줄) + 결과(O 1명, X N-1명) 배치 + 공개.
//                         이름은 클릭 가능한 칩으로 전환.
//  3) 이름 칩 클릭     — 그 사람의 path를 색상 라인으로 그려가며(stroke-dashoffset 애니메이션)
//                         점이 따라가는 모습이 보인다. 도착 컬럼의 결과 셀이 강조.
//  4) "다시 뽑기"      — 1단계로 복귀, 새 사다리.

import { el, clear } from './utils.js';

const ROWS         = 8;
const ROW_HEIGHT   = 22;
const TOP_PAD      = 8;
const BOT_PAD      = 8;
const VB_WIDTH     = 100;
const TRACE_MS     = 1500;
const TRACE_COLORS = ['#4ee5f5', '#a78bff', '#ff7eb6', '#ffd93d', '#34d399', '#f87171'];

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {{members: string[]}} party
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

  // ── 상태 ──
  let count = 2;
  let names = Array(count).fill('');
  let rungs = makeRungs(count);
  /**
   * null         → 입력 단계 (가려진 상태)
   * { paths, results, winnerIdx, focusedIdx } → 공개 단계
   */
  let result = null;
  let cancelTrace = null;

  const card = el('div', { className: 'ladder-card' });

  const repaint = () => {
    if (cancelTrace) { cancelTrace(); cancelTrace = null; }
    clear(card);

    const revealed = !!result;

    card.appendChild(el('div', { className: 'ladder-title' }, '사다리타기'));

    // ── 인원수 ──
    const countInput = el('input', {
      type: 'number',
      className: 'text-input ladder-count',
      min: '2',
      max: String(cap),
      value: String(count),
    });
    countInput.addEventListener('change', () => {
      let n = parseInt(countInput.value, 10);
      if (!Number.isFinite(n)) { countInput.value = String(count); return; }
      n = Math.max(2, Math.min(cap, n));
      if (n === count) { countInput.value = String(count); return; }
      count = n;
      if (names.length < count) names = names.concat(Array(count - names.length).fill(''));
      else names = names.slice(0, count);
      rungs = makeRungs(count);
      result = null;
      repaint();
    });
    card.appendChild(el('div', { className: 'ladder-count-row' },
      el('span', { className: 'ladder-label' }, '인원'),
      countInput,
      el('span', { className: 'ladder-cap-hint' }, `(최대 ${cap})`),
    ));

    // ── 보드 (이름 / SVG / 결과) ──
    const board = el('div', { className: 'ladder-board' + (revealed ? ' revealed' : '') });

    // 이름 행 — 가림 단계엔 input, 공개 단계엔 클릭 칩.
    const namesGrid = el('div', {
      className: 'ladder-grid ladder-names-grid',
      style: { gridTemplateColumns: `repeat(${count}, 1fr)` },
    });
    for (let i = 0; i < count; i++) {
      if (revealed) {
        const isFocused = result.focusedIdx === i;
        const color = TRACE_COLORS[i % TRACE_COLORS.length];
        const label = (names[i] || '').trim() || String(i + 1);
        const chip = el('button', {
          className: 'ladder-name-chip' + (isFocused ? ' focused' : ''),
          type: 'button',
          title: '눌러서 따라가기',
          style: { '--chip-color': color },
          onclick: () => {
            result.focusedIdx = i;
            repaint();
          },
        }, label);
        namesGrid.appendChild(chip);
      } else {
        const input = el('input', {
          type: 'text',
          className: 'text-input ladder-name-input',
          placeholder: String(i + 1),
          value: names[i],
          maxlength: 8,
          lang: 'ko',
        });
        input.addEventListener('input', () => { names[i] = input.value; });
        namesGrid.appendChild(input);
      }
    }
    board.appendChild(namesGrid);

    const geom = makeGeom(count);
    const svgWrap = el('div', { className: 'ladder-svg-wrap' });
    const svgBundle = buildLadderSvg(count, rungs, geom, revealed);
    svgWrap.appendChild(svgBundle.svg);
    if (!revealed) {
      svgWrap.appendChild(el('div', { className: 'ladder-cover' },
        el('div', { className: 'ladder-cover-icon' }, '🎴'),
        el('div', { className: 'ladder-cover-text' }, '사다리 숨김'),
        el('div', { className: 'ladder-cover-hint' }, '뽑기로 공개'),
      ));
    }
    board.appendChild(svgWrap);

    // 결과 행
    const resultsGrid = el('div', {
      className: 'ladder-grid ladder-results-grid',
      style: { gridTemplateColumns: `repeat(${count}, 1fr)` },
    });
    for (let c = 0; c < count; c++) {
      const showResult = revealed;
      const r = showResult ? result.results[c] : '?';
      const isWin = r === 'O';
      // 현재 추적 중인 사람의 도착 컬럼이면 강조.
      const isTraceArrival = revealed
        && result.focusedIdx != null
        && result.paths[result.focusedIdx].endCol === c;
      const cls = 'ladder-result'
        + (r === '?' ? ' ladder-result-pending'
          : isWin ? ' ladder-result-win'
          : ' ladder-result-lose')
        + (isTraceArrival ? ' ladder-result-arrival' : '');
      resultsGrid.appendChild(el('div', { className: cls }, r));
    }
    board.appendChild(resultsGrid);

    card.appendChild(board);

    // ── 뽑기 / 다시 뽑기 ──
    const btn = el('button', {
      className: 'ladder-btn',
      type: 'button',
    }, revealed ? '🎲 다시 뽑기' : '🎲 뽑기');

    btn.addEventListener('click', () => {
      if (!revealed) {
        // 새 사다리 + 결과 셔플.
        rungs = makeRungs(count);
        const paths = [];
        for (let i = 0; i < count; i++) paths.push(traceLadder(rungs, i));

        const winnerIdx = Math.floor(Math.random() * count);
        const winnerEndCol = paths[winnerIdx].endCol;
        const results = Array(count).fill('X');
        results[winnerEndCol] = 'O';

        result = { paths, results, winnerIdx, focusedIdx: null };
        repaint();
      } else {
        // 다시 뽑기 — 공개 상태 해제, 새 사다리.
        rungs = makeRungs(count);
        result = null;
        repaint();
      }
    });
    card.appendChild(btn);

    if (revealed) {
      const winnerName = (names[result.winnerIdx] || '').trim() || `참가자 ${result.winnerIdx + 1}`;
      card.appendChild(el('div', { className: 'ladder-winner' },
        '🏆 ', el('strong', null, winnerName), ' 당첨!'));
      card.appendChild(el('div', { className: 'ladder-trace-hint' },
        result.focusedIdx == null
          ? '👆 이름을 눌러서 사다리를 따라가보세요'
          : '다른 이름을 눌러 다시 추적할 수 있어요'));
    }

    // ── 추적 애니메이션 ──
    if (revealed && result.focusedIdx != null) {
      cancelTrace = traceAlongPath(
        svgBundle,
        result.paths[result.focusedIdx],
        TRACE_COLORS[result.focusedIdx % TRACE_COLORS.length],
        geom,
      );
    }
  };

  repaint();
  return el('aside', { className: 'ladder-side' }, card);
}

// ────────────────────────────────────────────────────
// 사다리 생성·길찾기
// ────────────────────────────────────────────────────

function makeRungs(N) {
  const rungs = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    let last = -2;
    for (let c = 0; c < N - 1; c++) {
      if (c === last + 1) continue; // 인접 가로줄 금지
      if (Math.random() < 0.45) {
        row.push(c);
        last = c;
      }
    }
    rungs.push(row);
  }
  return rungs;
}

function traceLadder(rungs, startCol) {
  let col = startCol;
  const corners = [{ r: 0, c: col }];

  for (let r = 0; r < ROWS; r++) {
    let newCol = col;
    if (rungs[r].includes(col - 1))      newCol = col - 1;
    else if (rungs[r].includes(col))     newCol = col + 1;

    if (newCol !== col) {
      corners.push({ r: r + 0.5, c: col });
      corners.push({ r: r + 0.5, c: newCol });
      col = newCol;
    }
  }

  corners.push({ r: ROWS, c: col });
  return { corners, endCol: col };
}

// ────────────────────────────────────────────────────
// SVG 그리기
// ────────────────────────────────────────────────────

function makeGeom(N) {
  const VB_H = ROWS * ROW_HEIGHT + TOP_PAD + BOT_PAD;
  const colX = (c) => N <= 1 ? VB_WIDTH / 2 : (c / (N - 1)) * VB_WIDTH;
  const rowY = (r) => TOP_PAD + r * ROW_HEIGHT;
  return { VB_W: VB_WIDTH, VB_H, colX, rowY };
}

function buildLadderSvg(N, rungs, geom, revealed) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${geom.VB_W} ${geom.VB_H}`);
  svg.setAttribute('class', 'ladder-svg' + (revealed ? '' : ' hidden'));
  svg.setAttribute('preserveAspectRatio', 'none');

  // 세로줄 (spine)
  for (let c = 0; c < N; c++) {
    const x = geom.colX(c);
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', geom.rowY(0));
    line.setAttribute('y2', geom.rowY(ROWS));
    line.setAttribute('class', 'ladder-spine');
    svg.appendChild(line);
  }

  // 가로줄
  for (let r = 0; r < ROWS; r++) {
    for (const c of rungs[r]) {
      const y = geom.rowY(r + 0.5);
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', geom.colX(c));
      line.setAttribute('x2', geom.colX(c + 1));
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'ladder-rung');
      svg.appendChild(line);
    }
  }

  // trace path layer (한 번에 하나만)
  const traceLayer = document.createElementNS(SVG_NS, 'g');
  traceLayer.setAttribute('class', 'ladder-trace-layer');
  svg.appendChild(traceLayer);

  return { svg, traceLayer };
}

/**
 * 한 사람의 path를 stroke로 그려가며 점이 따라가는 애니메이션.
 * 이전 trace는 호출 전에 cancelAnim으로 정리되어야 함 — 여기서는 새 layer 자식만 추가.
 *
 * stroke-dashoffset으로 path 그리기 + 별도 circle을 rAF로 누적 길이 비례 보간 위치로 이동.
 */
function traceAlongPath({ traceLayer }, path, color, geom) {
  // 이전 trace 정리.
  while (traceLayer.firstChild) traceLayer.removeChild(traceLayer.firstChild);

  const pts = path.corners.map(({ r, c }) => ({ x: geom.colX(c), y: geom.rowY(r) }));
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const l  = Math.hypot(dx, dy);
    segs.push(l);
    total += l;
  }

  // path d
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', d);
  pathEl.setAttribute('class', 'ladder-trace-path');
  pathEl.setAttribute('stroke', color);
  pathEl.setAttribute('fill', 'none');
  pathEl.style.strokeDasharray  = String(total);
  pathEl.style.strokeDashoffset = String(total);
  traceLayer.appendChild(pathEl);

  // dot
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('r', 2.6);
  dot.setAttribute('class', 'ladder-trace-dot');
  dot.setAttribute('fill', color);
  dot.setAttribute('cx', pts[0].x);
  dot.setAttribute('cy', pts[0].y);
  traceLayer.appendChild(dot);

  // 다음 frame에서 transition 적용 (reflow 보장).
  requestAnimationFrame(() => {
    pathEl.style.transition = `stroke-dashoffset ${TRACE_MS}ms cubic-bezier(.5,0,.4,1)`;
    pathEl.style.strokeDashoffset = '0';
  });

  // dot rAF 보간.
  const start = performance.now();
  let raf = null;
  const step = (now) => {
    const t = Math.min((now - start) / TRACE_MS, 1);
    const e = easeInOutCubic(t);
    let target = total * e;
    let pos = pts[pts.length - 1];
    for (let s = 0; s < segs.length; s++) {
      if (target <= segs[s]) {
        const r = segs[s] === 0 ? 0 : (target / segs[s]);
        pos = {
          x: pts[s].x + (pts[s + 1].x - pts[s].x) * r,
          y: pts[s].y + (pts[s + 1].y - pts[s].y) * r,
        };
        break;
      }
      target -= segs[s];
    }
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);
    if (t < 1) raf = requestAnimationFrame(step);
    else raf = null;
  };
  raf = requestAnimationFrame(step);

  return () => {
    if (raf != null) cancelAnimationFrame(raf);
    while (traceLayer.firstChild) traceLayer.removeChild(traceLayer.firstChild);
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
