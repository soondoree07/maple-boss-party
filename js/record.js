// record.js — 날짜별 회차 조회 모달 + 기록 추가 폼
//
// 흐름:
//   1) 캘린더 셀 클릭 → openDateModal({party, dateStr, onChanged?})
//      - 그날의 BossRun 목록을 카드로 렌더
//      - "+ 보스 기록 추가" 버튼으로 폼 모달 띄움
//   2) openRecordForm({party, dateStr, onSaved})
//      - 보스 선택 → 전리품 드롭다운이 그 보스 목록으로 갈리는 식
//      - 저장 시 memberSnapshot으로 현재 파티원 명단을 박제

import * as Storage from './storage.js';
import {
  getEnabledBosses, getBoss, BOSS_LOOT, getLootDef, getLootColor, getDisplayLootColor, getLootImage,
  CHANNELS, channelLabel,
} from './data.js';
import {
  todayStr, longDateLabel, formatMeso, el, clear,
  parseDateStr, getWeekRange, getMonthRange,
} from './utils.js';

/**
 * 캘린더 셀 클릭 시 열리는 모달.
 *
 * @param {{party, dateStr: string, onChanged?: () => void}} opts
 */
export function openDateModal({ party, dateStr, onChanged }) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal   = el('div', { className: 'modal modal-wide' });
  overlay.appendChild(modal);

  // 회차 추가/삭제가 한 번이라도 있었는지 추적 — 닫을 때 onChanged 호출 여부 결정.
  let mutated = false;

  // 그 날에 회차가 0건일 때 사용자가 미리 고른 채널 (회차가 생기는 순간 그 회차의 channel이 진짜 출처가 됨).
  let pendingChannel = null;

  const close = () => {
    overlay.remove();
    if (mutated) onChanged?.();
  };

  const repaint = () => {
    clear(modal);
    const runs     = Storage.getRunsByPartyAndDate(party.id, dateStr);
    const isToday  = dateStr === todayStr();
    const isFuture = dateStr > todayStr();

    // 회차가 1건이라도 있으면 그 채널이 진짜. 없으면 pendingChannel 사용.
    const lockedChannel = runs[0]?.channel || pendingChannel;

    modal.appendChild(el('div', { className: 'modal-header' },
      el('h2', { className: 'modal-title' }, longDateLabel(dateStr)),
      el('button', {
        className: 'icon-btn-close',
        type: 'button',
        onclick: close,
        'aria-label': '닫기',
      }, '×'),
    ));

    if (!isFuture) {
      modal.appendChild(buildChannelPicker({
        selected:    lockedChannel,
        locked:      runs.length > 0,
        onPick: (ch) => { pendingChannel = ch; repaint(); },
      }));
    }

    if (runs.length === 0) {
      modal.appendChild(el('div', { className: 'empty-state-sm' },
        isFuture ? '아직 오지 않은 날짜에요' : '이 날 기록이 없어요'
      ));
    } else {
      modal.appendChild(el('div', { className: 'run-list' },
        runs.map(run => renderRunCard(run, () => { mutated = true; repaint(); })),
      ));
    }

    if (!isFuture) {
      const canAdd = !!lockedChannel;
      modal.appendChild(el('div', { className: 'modal-actions modal-actions-center' },
        el('button', {
          className: isToday ? 'btn btn-primary' : 'btn btn-ghost',
          type: 'button',
          disabled: !canAdd,
          title: canAdd ? '' : '먼저 채널을 선택해주세요',
          onclick: () => openRecordForm({
            party, dateStr,
            channel: lockedChannel,
            onSaved: () => { mutated = true; repaint(); },
          }),
        }, isToday ? '+ 보스 기록 추가' : '+ 이 날 기록 추가'),
      ));
    }
  };

  repaint();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  // ESC로 닫기
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ── 채널 picker (버튼 그리드) ────────────────────────

function buildChannelPicker({ selected, locked, onPick }) {
  const wrap = el('div', { className: 'channel-picker' },
    el('div', { className: 'channel-picker-label' },
      locked
        ? `채널: ${selected ? channelLabel(selected) : '—'} (회차가 있어 잠김)`
        : (selected ? `채널: ${channelLabel(selected)}` : '이 날의 채널을 선택하세요'),
    ),
  );

  if (locked) return wrap;  // 회차가 이미 있으면 변경 불가, 텍스트만.

  const grid = el('div', { className: 'channel-grid' });
  CHANNELS.forEach(ch => {
    grid.appendChild(el('button', {
      className: 'channel-btn' + (ch === selected ? ' active' : ''),
      type: 'button',
      onclick: () => onPick(ch),
    }, channelLabel(ch)));
  });
  wrap.appendChild(grid);
  return wrap;
}

// ── 한 회차 카드 (조회용) ────────────────────────────

function renderRunCard(run, refresh) {
  const boss      = getBoss(run.boss);
  const bossName  = boss ? boss.name : run.boss;
  const bossColor = boss ? boss.color : '#666';

  return el('div', { className: 'run-card', style: { '--accent': bossColor } },
    el('div', { className: 'run-card-header' },
      el('div', { className: 'run-card-title' },
        el('span', {
          className: 'run-boss-badge',
          style: { backgroundColor: bossColor },
        }, bossName),
        el('span', { className: 'run-channel' }, channelLabel(run.channel)),
      ),
      el('button', {
        className: 'icon-btn-sm',
        type: 'button',
        title: '회차 삭제',
        onclick: () => {
          if (confirm('이 회차 기록을 삭제할까요?')) {
            Storage.deleteRun(run.id);
            refresh();
          }
        },
      }, '×'),
    ),

    el('div', { className: 'run-meta-row' },
      el('span', { className: 'meta-label' }, '상자 연 사람'),
      el('span', { className: 'meta-value' }, run.opener || '—'),
    ),

    el('div', { className: 'run-meta-row' },
      el('span', { className: 'meta-label' }, '기본 보상'),
      el('span', { className: 'meta-value' }, run.baseReward || '—'),
    ),

    run.loot && run.loot.length > 0
      ? el('div', { className: 'run-section' },
          el('div', { className: 'run-section-label' }, '전리품'),
          el('div', { className: 'loot-list' },
            run.loot.map(lt => {
              const def   = getLootDef(run.boss, lt.item);
              const color = getDisplayLootColor(lt.item, def?.group);
              return el('div', { className: 'loot-item' },
                el('span', {
                  className: 'loot-name',
                  style: color ? { color } : null,
                }, lt.item),
                el('span', { className: 'loot-taker' }, lt.taker || '—'),
                el('span', { className: 'loot-price' },
                  lt.price != null ? formatMeso(lt.price) : ''
                ),
              );
            }),
          ),
        )
      : null,
  );
}

// ── 기록 추가 폼 ─────────────────────────────────────

/**
 * @param {{party, dateStr: string, channel: string, onSaved: () => void}} opts
 *
 * channel은 날짜 모달에서 정해진 값(필수). 폼에서는 잠긴 값으로 표시되고 저장에 그대로 사용.
 */
function openRecordForm({ party, dateStr, channel, onSaved }) {
  const overlay = el('div', { className: 'modal-overlay modal-overlay-top' });
  const modal   = el('div', { className: 'modal modal-wide' });

  // 폼 상태
  let selectedBossId = null;
  let lootEntries = []; // [{ item, taker, price }] - price는 string으로 보관 (입력 그대로)

  // 같은 주(주간 보스) / 같은 달(월간 보스)에 이미 클리어한 보스 ID 모음.
  // 그 보스들은 드롭다운에서 가린다.
  const dateObj   = parseDateStr(dateStr);
  const week      = getWeekRange(dateObj);
  const month     = getMonthRange(dateObj);
  const weekRuns  = Storage.getRunsByPartyInRange(party.id, week.start,  week.end);
  const monthRuns = Storage.getRunsByPartyInRange(party.id, month.start, month.end);
  const clearedBossIds = new Set();
  weekRuns.forEach(r => {
    const b = getBoss(r.boss);
    if (b?.cycle === 'weekly') clearedBossIds.add(r.boss);
  });
  monthRuns.forEach(r => {
    const b = getBoss(r.boss);
    if (b?.cycle === 'monthly') clearedBossIds.add(r.boss);
  });

  // ── 보스 ──
  const bossSelect = buildBossSelect(clearedBossIds);
  bossSelect.addEventListener('change', () => {
    selectedBossId = bossSelect.value || null;
    // 보스가 바뀌면 다른 보스의 전리품 항목은 의미가 없으니 비움.
    lootEntries = [];
    paintLoot();
  });

  // 같은 날 이미 회차가 있으면 상자 연 사람/기본 보상은 직전 값으로 미리 채움.
  const existingRuns = Storage.getRunsByPartyAndDate(party.id, dateStr);
  const prevRun = existingRuns[existingRuns.length - 1] || null;

  // ── 상자 연 사람 ──
  const openerSelect = buildMemberSelect(party.members, '선택...');
  if (prevRun?.opener) openerSelect.value = prevRun.opener;

  // ── 기본 보상 ──
  // (보스 기본 보상을 받아간 사람)
  const baseRewardSelect = buildMemberSelect(party.members, '선택...');
  if (prevRun?.baseReward) baseRewardSelect.value = prevRun.baseReward;

  // ── 전리품 영역 ──
  // 위: 보스 전리품 타일 그리드 (이미지 + 이름, 클릭 토글)
  // 아래: 선택된 전리품마다 [먹은 사람] [가격] 입력행
  const lootGrid    = el('div', { className: 'loot-grid' });
  const lootRowList = el('div', { className: 'loot-form-list' });

  const findEntryIdx = (itemName) => lootEntries.findIndex(e => e.item === itemName);

  const paintLoot = () => {
    // ── 그리드 ──
    clear(lootGrid);
    if (!selectedBossId) {
      lootGrid.appendChild(el('div', { className: 'empty-state-sm' }, '보스를 먼저 선택해주세요'));
    } else {
      const lootList = BOSS_LOOT[selectedBossId] || [];
      lootList.forEach(loot => {
        const isSelected = findEntryIdx(loot.name) >= 0;
        lootGrid.appendChild(buildLootTile(loot, isSelected, () => {
          const idx = findEntryIdx(loot.name);
          if (idx >= 0) lootEntries.splice(idx, 1);
          else lootEntries.push({ item: loot.name, taker: '', price: '' });
          paintLoot();
        }));
      });
    }

    // ── 선택된 전리품 입력 행 ──
    clear(lootRowList);
    if (lootEntries.length === 0) {
      lootRowList.appendChild(el('div', { className: 'empty-state-sm' }, '아직 선택된 전리품이 없어요'));
    } else {
      lootEntries.forEach((entry, idx) => {
        lootRowList.appendChild(buildLootRow({
          entry,
          bossId: selectedBossId,
          members: party.members,
          onRemove: () => { lootEntries.splice(idx, 1); paintLoot(); },
        }));
      });
    }
  };
  paintLoot();

  // ── 모달 조립 ──
  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, '보스 기록 추가'),
    el('button', {
      className: 'icon-btn-close',
      type: 'button',
      onclick: () => overlay.remove(),
      'aria-label': '닫기',
    }, '×'),
  ));

  modal.appendChild(el('div', { className: 'form-meta' },
    `${longDateLabel(dateStr)} · ${channelLabel(channel)}`
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '보스'),
    bossSelect,
  ));

  modal.appendChild(el('div', { className: 'form-row' },
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '상자 연 사람'),
      openerSelect,
    ),
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '기본 보상'),
      baseRewardSelect,
    ),
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '전리품 (눌러서 선택)'),
    lootGrid,
    lootRowList,
  ));

  modal.appendChild(el('div', { className: 'modal-actions' },
    el('button', {
      className: 'btn btn-ghost',
      type: 'button',
      onclick: () => overlay.remove(),
    }, '취소'),
    el('button', {
      className: 'btn btn-primary',
      type: 'button',
      onclick: () => save(),
    }, '저장'),
  ));

  function save() {
    const bossId     = bossSelect.value;
    const opener     = openerSelect.value;
    const baseReward = baseRewardSelect.value;

    if (!bossId) { alert('보스를 선택해주세요'); return; }
    if (!opener) { alert('상자 연 사람을 선택해주세요'); return; }
    // 기본 보상 / 전리품은 비워도 저장 가능

    // 빈 행은 스킵, 나머지는 검증.
    const validLoot = [];
    for (const e of lootEntries) {
      if (!e.item) continue;
      const priceTrim = (e.price ?? '').toString().trim();
      const priceNum  = priceTrim === '' ? null : Number(priceTrim);
      if (priceNum != null && Number.isNaN(priceNum)) {
        alert(`"${e.item}" 가격이 숫자가 아니에요`);
        return;
      }
      validLoot.push({ item: e.item, taker: e.taker, price: priceNum });
    }

    Storage.createRun({
      partyId:        party.id,
      date:           dateStr,
      boss:           bossId,
      channel,
      opener,
      baseReward,
      memberSnapshot: [...party.members],
      loot:           validLoot,
    });

    overlay.remove();
    onSaved?.();
  }

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  setTimeout(() => bossSelect.focus(), 50);
}

// ── select 빌더들 ─────────────────────────────────────

function buildBossSelect(excludeIds = new Set()) {
  const available = getEnabledBosses().filter(b => !excludeIds.has(b.id));
  const placeholder = available.length === 0
    ? '이번 주/달에 모두 클리어 ✓'
    : '보스 선택...';
  return el('select', { className: 'select-input' },
    el('option', { value: '' }, placeholder),
    available.map(b => el('option', { value: b.id }, b.name)),
  );
}

function buildMemberSelect(members, placeholder) {
  return el('select', { className: 'select-input' },
    el('option', { value: '' }, placeholder),
    members.map(m => el('option', { value: m }, m)),
  );
}

// ── 전리품 한 행 ──────────────────────────────────────

function buildLootRow({ entry, bossId, members, onRemove }) {
  // 아이템 — 타일에서 이미 정해졌으므로 라벨로만 표시.
  const def = getLootDef(bossId, entry.item);
  const color = getDisplayLootColor(entry.item, def?.group);
  const itemLabel = el('div', { className: 'loot-row-name' });
  if (color) itemLabel.style.color = color;
  itemLabel.textContent = entry.item;

  // 먹은 사람
  const takerSelect = el('select', { className: 'select-input' });
  takerSelect.appendChild(el('option', { value: '' }, '먹은 사람...'));
  members.forEach(m => {
    const opt = el('option', { value: m }, m);
    if (entry.taker === m) opt.selected = true;
    takerSelect.appendChild(opt);
  });
  takerSelect.addEventListener('change', () => { entry.taker = takerSelect.value; });

  // 가격 (단위: 억)
  const priceInput = el('input', {
    type: 'number',
    step: '0.01',
    min: '0',
    inputmode: 'decimal',
    className: 'text-input price-input',
    placeholder: '가격(억)',
    value: entry.price,
  });
  priceInput.addEventListener('input', () => { entry.price = priceInput.value; });

  return el('div', { className: 'loot-form-row' },
    itemLabel,
    takerSelect,
    priceInput,
    el('button', {
      className: 'icon-btn-sm',
      type: 'button',
      title: '선택 해제',
      onclick: onRemove,
    }, '×'),
  );
}

// ── 전리품 타일 ───────────────────────────────────────

function buildLootTile(loot, isSelected, onClick) {
  // 보더/하이라이트 색은 항목별 override 우선, 없으면 그룹 색.
  const color = getDisplayLootColor(loot.name, loot.group) || getLootColor(loot.group);
  const img   = getLootImage(loot.name);

  // 이미지가 있으면 <img>, 없으면 group 색상 그라디언트 박스 fallback.
  const imageNode = img
    ? el('img', { src: img, alt: loot.name, className: 'loot-tile-img', loading: 'lazy' })
    : el('div', {
        className: 'loot-tile-img loot-tile-img-fallback',
        style: { background: color },
      }, loot.name.charAt(0));

  return el('button', {
    className: 'loot-tile' + (isSelected ? ' selected' : ''),
    type: 'button',
    title: loot.name,
    style: isSelected ? { '--tile-color': color } : null,
    onclick: onClick,
  },
    imageNode,
    el('div', { className: 'loot-tile-name' }, loot.name),
  );
}
