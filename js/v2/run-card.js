// v2/run-card.js — 기록 카드 한 장 = 같은 주 · 같은 파티가 잡은 보스들
//
// 카드 머리: 파티원 · 날짜 · 카드 전체 수익.
// 보스 한 줄마다: 보스 · 난이도 · 결정석 · 수익 / 드랍템 / 수정·삭제.
// 맨 아래 "+ 이 파티로 보스 추가" 는 같은 파티를 골라 둔 채로 기록 창을 연다.

import { el, parseDateStr, confirmDialog, todayStr, getWeekRange } from '../utils.js';
import { getBoss, difficultyLabel, getLootImage } from '../data.js';
import { removeRun, isAutoRun } from './auto-runs.js';
import { formatEok, runTotal, lootPrice } from './calc.js';
import { characterName, memberLabels } from './members.js';
import { renderBossTag } from './boss-tag.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-09-30" → "9/30 (수)" */
export function cardDateLabel(dateStr) {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/**
 * @param {{ characterIds: string[], runs: object[] }} group - calc.groupRunsByParty 결과 하나
 * @param {{ onEdit: (run) => void, onDeleted: () => void, onAddMore: (characterIds, date) => void }} handlers
 */
export function renderRunGroupCard(group, handlers) {
  const dates = [...new Set(group.runs.map(run => run.date))];
  const dateLabel = dates.length === 1
    ? cardDateLabel(dates[0])
    : `${cardDateLabel(dates[0])} ~ ${cardDateLabel(dates[dates.length - 1])}`;
  const groupTotal = group.runs.reduce((sum, run) => sum + runTotal(run), 0);

  return el('article', { className: 'v2-run-card' },
    el('header', { className: 'v2-run-head' },
      el('span', { className: 'v2-run-date' }, dateLabel),
      el('span', { className: 'v2-run-total' }, formatEok(groupTotal)),
    ),
    el('div', { className: 'v2-run-members' },
      memberLabels(group.characterIds).map(name => el('span', { className: 'member-chip' }, name)),
    ),
    group.runs.map(run => renderBossEntry(run, dates.length > 1, handlers)),
    el('button', {
      className: 'btn btn-ghost btn-mini v2-run-add', type: 'button',
      onclick: () => handlers.onAddMore(group.characterIds, addMoreDate(group)),
    }, '+ 이 파티로 보스 추가'),
  );
}

/**
 * "이 파티로 보스 추가"의 날짜. 이번 주 카드면 오늘, 지난 주 카드면 그 카드의 마지막 날
 * (오늘로 넣으면 이번 주 새 카드로 가 버려서 그 카드에 붙지 않는다).
 */
function addMoreDate(group) {
  const today = todayStr();
  if (getWeekRange(parseDateStr(today)).start === group.weekStart) return today;
  return group.runs[group.runs.length - 1].date;
}

function renderBossEntry(run, showDate, { onEdit, onDeleted }) {
  const boss = getBoss(run.boss);
  const headcount = run.characterIds.length || 1;

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: '기록 삭제',
      message: `${cardDateLabel(run.date)} ${boss?.name || run.boss} 기록을 지울까요?\n지운 기록은 되돌릴 수 없어요.`,
      confirmText: '삭제하기',
      danger: true,
    });
    if (ok && await removeRun(run)) onDeleted();
  };

  return el('section', { className: 'v2-boss-entry' },
    el('div', { className: 'v2-run-head' },
      showDate ? el('span', { className: 'v2-run-diff' }, cardDateLabel(run.date)) : null,
      renderBossTag(run.boss),
      el('span', { className: 'v2-run-diff' }, difficultyLabel(run.difficulty)),
      isAutoRun(run) ? el('span', { className: 'v2-auto-badge', title: '스케줄러에서 자동으로 넣은 기록이에요. 파티 · 드랍템을 확인하고 수정해 주세요.' }, '자동') : null,
      el('span', { className: 'v2-entry-crystal' }, `결정석 ${formatEok(run.crystal)}`),
      el('span', { className: 'v2-entry-total' }, formatEok(runTotal(run))),
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
    ? `${formatEok(price)} ${characterName(item.takerCharacterId)} 독식`
    : `${formatEok(price)} 1인당 ${formatEok(price / headcount)} 분배`;
  return el('div', { className: 'v2-run-line' },
    el('span', { className: 'v2-run-label v2-loot-name' },
      img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null,
      item.name,
    ),
    el('span', null, how),
  );
}
