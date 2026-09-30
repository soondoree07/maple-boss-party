// v2/boss-block.js — 기록 창 안의 보스 한 칸 (보스 · 난이도 · 결정석 안내 · 그 보스 드랍템)
//
// 기록 창은 이 칸을 여러 개 쌓아 한 번에 여러 보스를 저장한다. 칸 하나 = 기록(run) 하나.
// 결정석은 저장하는 순간의 가격표 값을 쓴다. 수정할 때 보스·난이도를 그대로 두면
// 처음 저장한 결정석을 그대로 쓴다(가격이 바뀌어도 과거 기록 유지).

import { el } from '../utils.js';
import {
  bossesInOrder, isBossVisible, getBossDifficulties, difficultyLabel,
  getEffectiveCrystal, getBossLoot,
} from '../data.js';
import { formatEok } from './calc.js';
import { createLootEditor } from './loot-editor.js';

/**
 * @param {object} opts
 * @param {object} [opts.existing]       - 수정할 기록 (boss · difficulty · crystal · loot)
 * @param {string} [opts.defaultBoss]    - 새 칸의 첫 보스
 * @param {string} [opts.defaultDifficulty]
 * @param {() => {id, name}[]} opts.getParticipants - 독식 대상 목록
 * @param {() => number} opts.getHeadcount          - 나눌 인원 n
 * @param {(() => void) | null} [opts.onRemove]     - 없으면 지우기 버튼을 안 보인다
 */
export function createBossBlock({ existing = null, defaultBoss, defaultDifficulty, getParticipants, getHeadcount, onRemove = null }) {
  const bosses = bossesInOrder().filter(b => isBossVisible(b.id) || b.id === existing?.boss);
  const bossSelect = el('select', { className: 'select-input' },
    bosses.map(b => el('option', { value: b.id }, b.name)));
  const startBoss = existing?.boss || defaultBoss;
  bossSelect.value = bosses.some(b => b.id === startBoss) ? startBoss : bosses[0].id;
  const diffSelect = el('select', { className: 'select-input' });
  const crystalInfo = el('span', { className: 'v2-boss-crystal' });

  const fillDifficulties = (preferred) => {
    const diffs = getBossDifficulties(bossSelect.value);
    diffSelect.replaceChildren(...diffs.map(d => el('option', { value: d.key }, difficultyLabel(d.key))));
    diffSelect.value = diffs.some(d => d.key === preferred) ? preferred : diffs[diffs.length - 1].key;
  };
  fillDifficulties(existing?.difficulty || defaultDifficulty);

  const currentCrystal = () => {
    const unchanged = existing && existing.boss === bossSelect.value && existing.difficulty === diffSelect.value;
    return unchanged ? existing.crystal : getEffectiveCrystal(bossSelect.value, diffSelect.value);
  };

  const lootEditor = createLootEditor({
    getCandidates: () => getBossLoot(bossSelect.value, diffSelect.value).map(l => l.name),
    getParticipants,
    initial: existing?.loot || [],
  });

  const refresh = () => {
    const crystal = currentCrystal();
    const headcount = getHeadcount();
    crystalInfo.textContent = headcount > 0
      ? `결정석 ${formatEok(crystal)} · 1인 ${formatEok(crystal / headcount)}`
      : `결정석 ${formatEok(crystal)}`;
    lootEditor.refresh();
  };
  bossSelect.addEventListener('change', () => { fillDifficulties(diffSelect.value); refresh(); });
  diffSelect.addEventListener('change', refresh);
  refresh();

  const node = el('div', { className: 'v2-boss-block' },
    el('div', { className: 'v2-boss-line' },
      bossSelect,
      diffSelect,
      onRemove
        ? el('button', { className: 'icon-btn icon-btn-sm', type: 'button', title: '이 보스 빼기', onclick: onRemove }, '×')
        : null,
    ),
    crystalInfo,
    lootEditor.node,
  );

  /** @returns {{ error: string } | { boss, difficulty, crystal, loot }} */
  const read = () => {
    const loot = lootEditor.readItems();
    if (loot.error) return loot;
    return { boss: bossSelect.value, difficulty: diffSelect.value, crystal: currentCrystal(), loot: loot.items };
  };

  const current = () => ({ boss: bossSelect.value, difficulty: diffSelect.value });
  return { node, refresh, read, current };
}
