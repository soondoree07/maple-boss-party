// ladder.js — 사다리타기 (SVG 시각화 + 점 진행 애니메이션, 당첨 1명 고정)
//
// 룰렛 밑 사이드 카드. 인원수(2~파티 총원)와 이름 N개를 입력 → "뽑기"를 누르면
// 새 사다리(랜덤 가로줄)와 결과(O 1, X N-1)가 정해지고, N개 색상 점이 동시에 위에서
// 내려가며 가로줄 만날 때마다 옆으로 휘어진다. 도착한 컬럼의 O/X가 결과.

import { el, clear } from './utils.js';

const ROWS         = 8;       // 가로줄 슬롯 수 (행)
const ROW_HEIGHT   = 22;      // SVG 좌표 단위
const TOP_PAD      = 8;
const BOT_PAD      = 8;
const VB_WIDTH     = 100;     // viewBox width — 컬럼 비율로 사용
const ANIM_MS      = 1700;
const DOT_COLORS   = ['#4ee5f5', '#a78bff', '#ff7eb6', '#ffd93d', '#34d399', '#f87171'];

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
   * null  | { paths, results, winnerIdx, animating, animDone, geom }
   *  - paths[i]   = { corners, endCol }    (i=시작 컬럼)
   *  - results[c] = 'O' | 'X'              (끝 컬럼별 결과)
   *  - winnerIdx  = number                 (시작 컬럼 — 누가 당첨인지)
   */
  let result = null;
  let cancelAnim = null;

  const card = el('div', { className: 'ladder-card' });

  const repaint = () => {
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    clear(card);

    card.appendChild(el('div', { className: 'ladder-title' }, '사다리타기'));

    const animating = !!result?.animating;

    // ── 인원수 ──
    const countInput = el('input', {
      type: 'number',
      className: 'text-input ladder-count',
      min: '2',
      max: String(cap),
      value: String(count),
    });
    if (animating) countInput.disabled = true;
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

    // ── 이름 / SVG / 결과 ──
    const board = el('div', { className: 'ladder-board' });

    const namesGrid = el('div', {
      className: 'ladder-grid ladder-names-grid',
      style: { gridTemplateColumns: `repeat(${count}, 1fr)` },
    });
    for (let i = 0; i < count; i++) {
      const input = el('input', {
        type: 'text',
        className: 'text-input ladder-name-input',
        placeholder: String(i + 1),
        value: names[i],
        maxlength: 8,
      });
      if (animating) input.disabled = true;
      input.addEventListener('input', () => { names[i] = input.value; });
      namesGrid.appendChild(input);
    }
    board.appendChild(namesGrid);

    const geom = makeGeom(count);
    const svgBundle = buildLadderSvg(count, rungs, geom);
    board.appendChild(svgBundle.svg);

    const resultsGrid = el('div', {
      className: 'ladder-grid ladder-results-grid',
      style: { gridTemplateColumns: `repeat(${count}, 1fr)` },
    });
    for (let c = 0; c < count; c++) {
      const showResult = result?.animDone;
      const r = showResult ? result.results[c] : '?';
      const isWin = r === 'O';
      const cell = el('div', {
        className: 'ladder-result'
          + (r === '?' ? ' ladder-result-pending'
            : isWin ? ' ladder-result-win'
            : ' ladder-result-lose'),
      }, r);
      resultsGrid.appendChild(cell);
    }
    board.appendChild(resultsGrid);

    card.appendChild(board);

    // ── 뽑기 버튼 ──
    const btn = el('button', {
      className: 'ladder-btn',
      type: 'button',
      disabled: animating,
    }, animating ? '⏳ 진행 중' : (result?.animDone ? '🎲 다시 뽑기' : '🎲 뽑기'));

    btn.addEventListener('click', () => {
      if (result?.animating) return;
      // 새 사다리 + 결과 셔플.
      rungs = makeRungs(count);
      const paths = [];
      for (let i = 0; i < count; i++) paths.push(traceLadder(rungs, i));

      // 한 명만 당첨. 시작 idx 랜덤 → 그 사람이 도착하는 끝 컬럼에 'O' 배치.
      const winnerIdx = Math.floor(Math.random() * count);
      const winnerEndCol = paths[winnerIdx].endCol;
      const results = Array(count).fill('X');
      results[winnerEndCol] = 'O';

      result = { paths, results, winnerIdx, animating: true, animDone: false, geom };
      repaint(); // 새 SVG·dots 그리고 애니메이션 재시작.
    });
    card.appendChild(btn);

    if (result?.animDone) {
      const winnerName = (names[result.winnerIdx] || '').trim() || `참가자 ${result.winnerIdx + 1}`;
      card.appendChild(el('div', { className: 'ladder-winner' },
        '🏆 ', el('strong', null, winnerName), ' 당첨!'));
    }

    // ── 애니메이션이 활성이면 SVG에 dots 붙이고 시작 ──
    if (result?.animating) {
      cancelAnim = animateDots(svgBundle, result.paths, geom, () => {
        result.animating = false;
        result.animDone = true;
        repaint();
      });
    }
  };

  repaint();
  return el('aside', { className: 'ladder-side' }, card);
}

// ────────────────────────────────────────────────────
// 사다리 생성·길찾기
// ────────────────────────────────────────────────────

/**
 * 가로줄을 랜덤 배치.
 * 같은 행에 인접 가로줄(c와 c+1) 중복 금지 — 사다리 룰.
 * 반환: rungs[r] = [c, ...]  (가로줄이 c와 c+1을 잇는다)
 */
function makeRungs(N) {
  const rungs = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    let last = -2;
    for (let c = 0; c < N - 1; c++) {
      if (c === last + 1) continue; // 인접 금지
      if (Math.random() < 0.45) {
        row.push(c);
        last = c;
      }
    }
    rungs.push(row);
  }
  return rungs;
}

/**
 * 시작 컬럼 startCol에서 출발해 사다리를 따라 끝까지 이동.
 * 각 가로줄에서 직각으로 휘어지는 corner points를 만든다.
 *
 * 좌표는 (r, c)의 분수형 — r은 0~ROWS, c는 0~N-1.
 * SVG 좌표 변환은 호출부의 geom이 담당.
 */
function traceLadder(rungs, startCol) {
  let col = startCol;
  const corners = [{ r: 0, c: col }];

  for (let r = 0; r < ROWS; r++) {
    let newCol = col;
    if (rungs[r].includes(col - 1))      newCol = col - 1;
    else if (rungs[r].includes(col))     newCol = col + 1;

    if (newCol !== col) {
      // 가로줄은 r과 r+1 사이의 정중앙(r + 0.5)에 있다고 본다.
      corners.push({ r: r + 0.5, c: col });
      corners.push({ r: r + 0.5, c: newCol });
      col = newCol;
    }
  }

  corners.push({ r: ROWS, c: col });
  return { corners, endCol: col };
}

// ────────────────────────────────────────────────────
// SVG
// ────────────────────────────────────────────────────

function makeGeom(N) {
  const VB_H = ROWS * ROW_HEIGHT + TOP_PAD + BOT_PAD;
  const colX = (c) => N <= 1 ? VB_WIDTH / 2 : (c / (N - 1)) * VB_WIDTH;
  const rowY = (r) => TOP_PAD + r * ROW_HEIGHT;
  return { VB_W: VB_WIDTH, VB_H, colX, rowY };
}

function buildLadderSvg(N, rungs, geom) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${geom.VB_W} ${geom.VB_H}`);
  svg.setAttribute('class', 'ladder-svg');
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

  // 가로줄 (rung)
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

  // dots layer
  const dotsLayer = document.createElementNS(SVG_NS, 'g');
  dotsLayer.setAttribute('class', 'ladder-dots');
  svg.appendChild(dotsLayer);

  return { svg, dotsLayer };
}

/**
 * 점들이 동시에 path를 따라 이동. 누적 길이 기반 보간.
 */
function animateDots({ dotsLayer }, paths, geom, onDone) {
  const N = paths.length;

  const dots = paths.map((p, i) => {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', 2.4);
    dot.setAttribute('class', 'ladder-dot');
    dot.setAttribute('fill', DOT_COLORS[i % DOT_COLORS.length]);
    dot.setAttribute('cx', geom.colX(p.corners[0].c));
    dot.setAttribute('cy', geom.rowY(p.corners[0].r));
    dotsLayer.appendChild(dot);
    return dot;
  });

  // 각 path의 SVG 좌표 점 시퀀스 + 누적 segment 길이.
  const ptsList = paths.map(p =>
    p.corners.map(({ r, c }) => ({ x: geom.colX(c), y: geom.rowY(r) }))
  );
  const lenList = ptsList.map(pts => {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const l  = Math.hypot(dx, dy);
      segs.push(l);
      total += l;
    }
    return { segs, total };
  });

  const start = performance.now();
  let raf = null;

  const step = (now) => {
    const t = Math.min((now - start) / ANIM_MS, 1);
    const e = easeInOutCubic(t);

    for (let i = 0; i < N; i++) {
      const pts  = ptsList[i];
      const { segs, total } = lenList[i];
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
      dots[i].setAttribute('cx', pos.x);
      dots[i].setAttribute('cy', pos.y);
    }

    if (t < 1) raf = requestAnimationFrame(step);
    else { raf = null; onDone?.(); }
  };

  raf = requestAnimationFrame(step);
  return () => { if (raf != null) cancelAnimationFrame(raf); };
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
