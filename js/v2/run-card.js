// v2/run-card.js — 기록 카드 한 장 (언제 · 무슨 보스 · 누가 · 드랍템 · 수익)

import { el, parseDateStr, confirmDialog } from '../utils.js';
import { getBoss, difficultyLabel, getLootImage } from '../data.js';
import { getCharacter, deleteRun } from './store.js';
import { formatEok, runTotal, lootPrice } from './calc.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-09-30" → "9/30 (수)" */
export function cardDateLabel(dateStr) {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/** 캐릭터 이름. 지워진 캐릭터면 안내 문구. */
export const characterName = (id) => getCharacter(id)?.name || '(지운 캐릭터)';

/**
 * @param {object} run
 * @param {{ onEdit: (run) => void, onDeleted: () => void }} handlers
 */
export function renderRunCard(run, { onEdit, onDeleted }) {
  const boss = getBoss(run.boss);
  const headcount = run.characterIds.length || 1;

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: '기록 삭제',
      message: `${cardDateLabel(run.date)} ${boss?.name || run.boss} 기록을 지울까요?\n지운 기록은 되돌릴 수 없어요.`,
      confirmText: '삭제하기',
      danger: true,
    });
    if (ok && await deleteRun(run.id)) onDeleted();
  };

  return el('article', { className: 'v2-run-card' },
    el('header', { className: 'v2-run-head' },
      el('span', { className: 'v2-run-date' }, cardDateLabel(run.date)),
      el('span', {
        className: 'run-boss-badge',
        style: { background: boss?.color || 'var(--accent-aqua)' },
      }, boss?.name || run.boss),
      el('span', { className: 'v2-run-diff' }, difficultyLabel(run.difficulty)),
      el('span', { className: 'v2-run-total' }, formatEok(runTotal(run))),
    ),
    el('div', { className: 'v2-run-members' },
      run.characterIds.map(id => el('span', { className: 'member-chip' }, characterName(id))),
    ),
    el('div', { className: 'v2-run-line' },
      el('span', { className: 'v2-run-label' }, '결정석'),
      el('span', null, `${formatEok(run.crystal)} · 1인 ${formatEok(run.crystal / headcount)}`),
    ),
    run.loot.map(item => renderLootLine(item, headcount)),
    el('div', { className: 'v2-run-actions' },
      el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => onEdit(run) }, '수정'),
      el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: handleDelete }, '삭제'),
    ),
  );
}

function renderLootLine(item, headcount) {
  const img = getLootImage(item.name);
  const price = lootPrice(item);
  const how = item.mode === 'solo'
    ? `독식 · ${characterName(item.takerCharacterId)}`
    : `분배 · 1인 ${formatEok(price / headcount)}`;
  return el('div', { className: 'v2-run-line' },
    el('span', { className: 'v2-run-label v2-loot-name' },
      img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null,
      item.name,
    ),
    el('span', null, `${formatEok(price)} · ${how}`),
  );
}
