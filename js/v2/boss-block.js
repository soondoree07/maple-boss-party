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
import { closeIcon } from './icons.js';

/**
 * @param {object} opts
 * @param {object} [opts.existing]       - 수정할 기록 (boss · difficulty · crystal · loot)
 * @param {() => {id, name}[]} opts.getParticipants - 독식 대상 목록
 * @param {() => number} opts.getHeadcount          - 나눌 인원 n
 * @param {(() => void) | null} [opts.onRemove]     - 없으면 지우기 버튼을 안 보인다
 */
export function createBossBlock({ existing = null, getParticipants, getHeadcount, onRemove = null }) {
  const bosses = bossesInOrder().filter(b => isBossVisible(b.id) || b.id === existing?.boss);
  // 새 칸은 비어 있는 "보스 선택"에서 시작한다 (수정일 때만 원래 보스).
  const bossSelect = el('select', { className: 'select-input' },
    el('option', { value: '', disabled: true }, '보스 선택'),
    bosses.map(b => el('option', { value: b.id }, b.name)));
  bossSelect.value = existing?.boss || '';
  const diffSelect = el('select', { className: 'select-input' });
  const crystalInfo = el('span', { className: 'v2-boss-crystal' });

  const fillDifficulties = (preferred) => {
    diffSelect.disabled = !bossSelect.value;
    if (!bossSelect.value) {
      diffSelect.replaceChildren(el('option', { value: '' }, '난이도'));
      return;
    }
    const diffs = getBossDifficulties(bossSelect.value);
    diffSelect.replaceChildren(...diffs.map(d => el('option', { value: d.key }, difficultyLabel(d.key))));
    diffSelect.value = diffs.some(d => d.key === preferred) ? preferred : diffs[diffs.length - 1].key;
  };
  fillDifficulties(existing?.difficulty);

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
    lootEditor.refresh();
    lootEditor.node.hidden = !bossSelect.value; // 보스를 고르기 전엔 드랍템 칸을 숨긴다
    if (!bossSelect.value) { crystalInfo.textContent = ''; return; }
    const crystal = currentCrystal();
    const headcount = getHeadcount();
    crystalInfo.textContent = headcount > 0
      ? `결정석 ${formatEok(crystal)} · 1인 ${formatEok(crystal / headcount)}`
      : `결정석 ${formatEok(crystal)}`;
  };
  bossSelect.addEventListener('change', () => { fillDifficulties(diffSelect.value); refresh(); });
  diffSelect.addEventListener('change', refresh);
  refresh();

  const node = el('div', { className: 'v2-boss-block' },
    el('div', { className: 'v2-boss-line' },
      bossSelect,
      diffSelect,
      crystalInfo,
      onRemove
        ? el('button', { className: 'icon-btn icon-btn-sm', type: 'button', title: '이 보스 빼기', 'aria-label': '이 보스 빼기', onclick: onRemove }, closeIcon())
        : el('span'),
    ),
    lootEditor.node,
  );

  /** @returns {{ error: string } | { boss, difficulty, crystal, loot }} */
  const read = () => {
    if (!bossSelect.value) return { error: '보스를 골라 주세요.' };
    const loot = lootEditor.readItems();
    if (loot.error) return loot;
    return { boss: bossSelect.value, difficulty: diffSelect.value, crystal: currentCrystal(), loot: loot.items };
  };

  return { node, refresh, read };
}
