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
  getBoss, getVisibleBosses, getBossLoot, getBossDifficulties, bossOrderIndex,
  sortLoot, difficultyLabel, getLootColor, getDisplayLootColor, getLootImage,
  CHANNELS, channelLabel,
} from './data.js';
import {
  todayStr, longDateLabel, formatMeso, el, clear, confirmDialog, inlineMsg,
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

    if (isFuture) {
      // 미래 날짜 — 예약 UI (하루에 하나만 가능)
      const reservations = Storage.getReservationsByPartyAndDate(party.id, dateStr);

      if (reservations.length === 0) {
        modal.appendChild(el('div', { className: 'empty-state-sm' }, '예약된 일정이 없어요'));
        modal.appendChild(buildReservationForm({
          onAdd: (time) => {
            Storage.createReservation({ partyId: party.id, date: dateStr, time });
            mutated = true;
            repaint();
          },
        }));
      } else {
        modal.appendChild(el('div', { className: 'reservation-list' },
          reservations.map(res => renderReservationCard(res, () => {
            mutated = true; repaint();
          })),
        ));
      }
      return;
    }

    modal.appendChild(buildChannelPicker({
      selected:    lockedChannel,
      locked:      runs.length > 0,
      onPick: (ch) => { pendingChannel = ch; repaint(); },
    }));

    if (runs.length === 0) {
      modal.appendChild(el('div', { className: 'empty-state-sm' }, '이 날 기록이 없어요'));
    } else {
      modal.appendChild(el('div', { className: 'run-list' },
        runs.map(run => renderRunCard(
          run,
          () => { mutated = true; repaint(); },
          () => openEditFor(run),
        )),
      ));
    }

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

  };

  // 회차 카드 ✎ 클릭 → 수정 모드로 폼 열기.
  function openEditFor(run) {
    openRecordForm({
      party, dateStr,
      channel: run.channel,
      existingRun: run,
      onSaved: () => { mutated = true; repaint(); },
    });
  }

  repaint();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  // ESC로 닫기 — 위에 다른 모달(확인 다이얼로그 등)이 겹쳐 있으면 그게 먼저.
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    const all = document.querySelectorAll('.modal-overlay');
    if (all[all.length - 1] !== overlay) return;
    close();
    document.removeEventListener('keydown', onKey);
  };
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

// ── 예약 (미래 일정) ────────────────────────────────

function renderReservationCard(res, refresh) {
  return el('div', { className: 'reservation-card' },
    el('span', { className: 'reservation-time' }, res.time || '—'),
    el('button', {
      className: 'icon-btn-sm',
      type: 'button',
      title: '예약 삭제',
      onclick: () => {
        Storage.deleteReservation(res.id);
        refresh();
      },
    }, '×'),
  );
}

function buildReservationForm({ onAdd }) {
  const input = el('input', {
    type: 'time',
    className: 'text-input',
    step: '60',
  });

  const msg = inlineMsg();

  const submit = () => {
    const time = input.value;
    if (!time) { msg.show('시간을 입력해주세요', false, input); return; }
    onAdd(time);
    input.value = '';
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  return el('div', { className: 'reservation-form' },
    el('label', { className: 'form-label' }, '예약 시간'),
    el('div', { className: 'reservation-form-row' },
      input,
      el('button', {
        className: 'btn btn-primary',
        type: 'button',
        onclick: submit,
      }, '+ 추가'),
    ),
    msg.node,
  );
}

// ── 한 회차 카드 (조회용) ────────────────────────────

function renderRunCard(run, refresh, onEdit) {
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
        run.difficulty
          ? el('span', { className: 'run-difficulty' }, difficultyLabel(run.difficulty))
          : null,
        el('span', { className: 'run-channel' }, channelLabel(run.channel)),
      ),
      el('div', { className: 'run-card-actions' },
        onEdit
          ? el('button', {
              className: 'icon-btn-sm icon-btn-edit',
              type: 'button',
              title: '회차 수정',
              onclick: () => onEdit(),
            }, '✎')
          : null,
        el('button', {
          className: 'icon-btn-sm',
          type: 'button',
          title: '회차 삭제',
          onclick: async () => {
            const ok = await confirmDialog({
              title: '회차 삭제',
              message: `${bossName} 회차 기록을 삭제할까요?\n되돌릴 수 없습니다.`,
              confirmText: '삭제',
              danger: true,
            });
            if (ok !== true) return;
            Storage.deleteRun(run.id);
            refresh();
          },
        }, '×'),
      ),
    ),

    el('div', { className: 'run-meta-row' },
      el('span', { className: 'meta-label' }, '상자 연 사람'),
      el('span', { className: 'meta-value' }, run.opener || '—'),
    ),

    el('div', { className: 'run-meta-row' },
      el('span', { className: 'meta-label' }, '기본 보상'),
      el('span', { className: 'meta-value' }, run.baseReward || '—'),
    ),

    run.memberSnapshot && run.memberSnapshot.length > 0
      ? el('div', { className: 'run-meta-row' },
          el('span', { className: 'meta-label' }, '참여자'),
          el('span', { className: 'meta-value run-members' },
            `${run.memberSnapshot.join(', ')} (${run.memberSnapshot.length}인)`
          ),
        )
      : null,

    run.loot && run.loot.length > 0
      ? el('div', { className: 'run-section' },
          el('div', { className: 'run-section-label' }, '전리품'),
          el('div', { className: 'loot-list' },
            sortLoot(run.loot).map(lt => {
              const color = getDisplayLootColor(lt.item);
              const img   = getLootImage(lt.item);
              // shared가 명시적으로 true면 분배. 미정의(기존 데이터)는 단독(taker 전액)으로 해석.
              const shared = lt.shared === true;
              const takerLabel = shared
                ? `분배 ÷${run.memberSnapshot?.length || 1}`
                : (lt.taker || '—');
              return el('div', { className: 'loot-item' },
                img
                  ? el('img', { className: 'loot-img', src: img, alt: lt.item, loading: 'lazy' })
                  : el('span', { className: 'loot-img loot-img-fallback' }),
                el('span', {
                  className: 'loot-name',
                  style: color ? { color } : null,
                }, lt.item),
                el('span', {
                  className: 'loot-taker' + (shared ? ' loot-taker-shared' : ''),
                }, takerLabel),
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
 * @param {{
 *   party, dateStr: string, channel: string, onSaved: () => void,
 *   existingRun?: object,   // 있으면 수정 모드 (값 prefill + updateRun)
 * }} opts
 *
 * channel은 날짜 모달에서 정해진 값(필수). 폼에서는 잠긴 값으로 표시되고 저장에 그대로 사용.
 */
function openRecordForm({ party, dateStr, channel, onSaved, existingRun }) {
  const isEdit = !!existingRun;

  const overlay = el('div', { className: 'modal-overlay modal-overlay-top' });
  const modal   = el('div', { className: 'modal modal-wide' });

  // 같은 날 직전 회차 — 추가 모드에서만 미리 채움 용도. 수정 모드에선 existingRun이 우선.
  const existingRuns = Storage.getRunsByPartyAndDate(party.id, dateStr);
  const prevRun = isEdit ? null : (existingRuns[existingRuns.length - 1] || null);

  const bossSettings = Storage.getBossSettings(party.id);

  /**
   * 회차 폼 난이도 초기값.
   *  1) (수정) existingRun.difficulty 가 유효하면
   *  2) 이 파티가 그 보스를 마지막으로 기록했을 때의 난이도
   *  3) 보스 설정 페이지의 기본 난이도
   *  4) 보스의 첫(가장 낮은) 난이도
   */
  function computeInitialDifficulty(bossId) {
    const diffs = getBossDifficulties(bossId);
    if (diffs.length === 0) return '';
    const has = (k) => diffs.some(d => d.key === k);

    if (isEdit && existingRun.boss === bossId && has(existingRun.difficulty)) {
      return existingRun.difficulty;
    }
    const prior = Storage.getRunsByParty(party.id)
      .filter(r => r.boss === bossId && r.difficulty && (!isEdit || r.id !== existingRun.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .find(r => has(r.difficulty));
    if (prior) return prior.difficulty;

    const dft = bossSettings.defaults[bossId];
    if (dft && has(dft)) return dft;
    return diffs[0].key;
  }

  // ── 상태 ──
  let selectedBossId = isEdit ? existingRun.boss : null;
  let selectedDifficulty = selectedBossId ? computeInitialDifficulty(selectedBossId) : '';
  // 수정 모드: 기존 loot prefill. price는 string 입력으로 유지. shared는 명시적 boolean.
  let lootEntries = isEdit
    ? (existingRun.loot || []).map(lt => ({
        item:   lt.item,
        taker:  lt.taker || '',
        price:  lt.price != null ? String(lt.price) : '',
        // legacy 데이터 호환 — shared 미정의면 단독(false)으로 prefill (원래 의미 보존).
        shared: lt.shared === true,
      }))
    : [];

  // 회차 참여자 — 수정 모드에선 기존 memberSnapshot, 추가 모드에선 직전 회차/파티 전체.
  const selectedMembers = new Set(
    isEdit
      ? (existingRun.memberSnapshot || []).filter(m => party.members.includes(m))
      : (prevRun?.memberSnapshot && prevRun.memberSnapshot.length > 0
          ? prevRun.memberSnapshot.filter(m => party.members.includes(m))
          : party.members)
  );
  const visibleMembers = () => party.members.filter(m => selectedMembers.has(m));

  // ── 보스 select — 보이는 보스만, 가나다순 ──
  // 수정 모드에선 자기 보스가 숨겨졌더라도 옵션에 포함시킨다.
  const bossSelect = buildBossSelect(bossSettings.visible, isEdit ? existingRun.boss : null);
  if (isEdit) bossSelect.value = existingRun.boss;

  // ── 난이도 select — 보스 선택 후 노출 ──
  const diffSlot = el('div', { className: 'select-slot' });
  const paintDifficulty = () => {
    clear(diffSlot);
    if (!selectedBossId) {
      diffSlot.appendChild(el('div', { className: 'form-hint' }, '보스를 먼저 선택해주세요'));
      return;
    }
    const diffs = getBossDifficulties(selectedBossId);
    const sel = el('select', { className: 'select-input' },
      diffs.map(d => el('option', { value: d.key }, difficultyLabel(d.key))),
    );
    sel.value = selectedDifficulty || (diffs[0]?.key || '');
    selectedDifficulty = sel.value;
    sel.addEventListener('change', () => {
      if (sel.value === selectedDifficulty) return;
      selectedDifficulty = sel.value;
      lootEntries = []; // 난이도가 바뀌면 전리품 목록이 달라지므로 비움.
      paintLoot();
    });
    diffSlot.appendChild(sel);
  };

  bossSelect.addEventListener('change', () => {
    const newBoss = bossSelect.value || null;
    if (newBoss !== selectedBossId) {
      selectedBossId = newBoss;
      selectedDifficulty = newBoss ? computeInitialDifficulty(newBoss) : '';
      lootEntries = []; // 다른 보스의 전리품은 의미가 없으니 비움.
      paintDifficulty();
      paintLoot();
    }
  });

  // ── 회차 참여자 picker ──
  const memberGrid = el('div', { className: 'member-toggle-grid' });
  const paintMembers = () => {
    clear(memberGrid);
    party.members.forEach(m => {
      const active = selectedMembers.has(m);
      memberGrid.appendChild(el('button', {
        className: 'member-toggle' + (active ? ' active' : ''),
        type: 'button',
        onclick: () => {
          if (selectedMembers.has(m)) selectedMembers.delete(m);
          else selectedMembers.add(m);
          paintMembers();
          paintOpenerReward();
          paintLoot(); // taker select도 회차 참여자만으로 좁힘
        },
      }, m));
    });
  };

  // ── 상자 연 사람 / 기본 보상 — 회차 참여자만 옵션 ──
  // slot 안에 매번 새로 만들어서 끼워넣는 방식. 현재 select는 .firstElementChild로 접근.
  const openerSlot = el('div', { className: 'select-slot' });
  const rewardSlot = el('div', { className: 'select-slot' });

  const paintOpenerReward = () => {
    // 첫 paint 시점(slot이 비어있을 때) — 수정 모드는 existingRun, 추가 모드는 prevRun으로 prefill.
    const fallbackOpener = isEdit ? existingRun.opener : prevRun?.opener;
    const fallbackReward = isEdit ? existingRun.baseReward : prevRun?.baseReward;

    const prevOpener = openerSlot.firstElementChild?.value
      || (selectedMembers.has(fallbackOpener) ? fallbackOpener : '');
    const prevReward = rewardSlot.firstElementChild?.value
      || (selectedMembers.has(fallbackReward) ? fallbackReward : '');

    clear(openerSlot);
    clear(rewardSlot);
    const opSel = buildMemberSelect(visibleMembers(), '선택...');
    const rwSel = buildMemberSelect(visibleMembers(), '선택...');
    if (selectedMembers.has(prevOpener)) opSel.value = prevOpener;
    if (selectedMembers.has(prevReward)) rwSel.value = prevReward;
    openerSlot.appendChild(opSel);
    rewardSlot.appendChild(rwSel);
  };

  paintMembers();
  paintOpenerReward();

  // ── 전리품 영역 ──
  const lootGrid    = el('div', { className: 'loot-grid' });
  const lootRowList = el('div', { className: 'loot-form-list' });

  const findEntryIdx = (itemName) => lootEntries.findIndex(e => e.item === itemName);

  const paintLoot = () => {
    clear(lootGrid);
    if (!selectedBossId) {
      lootGrid.appendChild(el('div', { className: 'empty-state-sm' }, '보스를 먼저 선택해주세요'));
    } else {
      const lootList = getBossLoot(selectedBossId, selectedDifficulty);
      if (lootList.length === 0) {
        lootGrid.appendChild(el('div', { className: 'empty-state-sm' },
          '이 난이도는 전리품 없이 결정석만 기록돼요'));
      }
      lootList.forEach(loot => {
        const isSelected = findEntryIdx(loot.name) >= 0;
        lootGrid.appendChild(buildLootTile(loot, isSelected, () => {
          const idx = findEntryIdx(loot.name);
          if (idx >= 0) lootEntries.splice(idx, 1);
          // 신규 entry: 분배 디폴트 ON.
          else lootEntries.push({ item: loot.name, taker: '', price: '', shared: true });
          paintLoot();
        }));
      });
    }

    clear(lootRowList);
    if (lootEntries.length === 0) {
      lootRowList.appendChild(el('div', { className: 'empty-state-sm' }, '아직 선택된 전리품이 없어요'));
    } else {
      lootEntries.forEach((entry, idx) => {
        lootRowList.appendChild(buildLootRow({
          entry,
          bossId: selectedBossId,
          members: visibleMembers(),
          onRemove: () => { lootEntries.splice(idx, 1); paintLoot(); },
          onChange: () => paintLoot(), // shared 토글 시 taker 표시 갱신
        }));
      });
    }
  };
  paintDifficulty();
  paintLoot();

  // ── 모달 조립 ──
  modal.appendChild(el('div', { className: 'modal-header' },
    el('h2', { className: 'modal-title' }, isEdit ? '보스 기록 수정' : '보스 기록 추가'),
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

  modal.appendChild(el('div', { className: 'form-row' },
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '보스'),
      bossSelect,
    ),
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '난이도'),
      diffSlot,
    ),
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '이번 회차 참여자 (눌러서 토글)'),
    memberGrid,
  ));

  modal.appendChild(el('div', { className: 'form-row' },
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '상자 연 사람'),
      openerSlot,
    ),
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, '기본 보상'),
      rewardSlot,
    ),
  ));

  modal.appendChild(el('div', { className: 'form-group' },
    el('label', { className: 'form-label' }, '전리품 (눌러서 선택)'),
    lootGrid,
    lootRowList,
  ));

  const formMsg = inlineMsg();
  modal.appendChild(formMsg.node);

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
    }, isEdit ? '수정 저장' : '저장'),
  ));

  function save() {
    const bossId     = bossSelect.value;
    const opener     = openerSlot.firstElementChild?.value || '';
    const baseReward = rewardSlot.firstElementChild?.value || '';

    if (!bossId) { formMsg.show('보스를 선택해주세요'); return; }
    const difficulty = selectedDifficulty;
    if (!difficulty || !getBossDifficulties(bossId).some(d => d.key === difficulty)) {
      formMsg.show('난이도를 선택해주세요'); return;
    }
    if (selectedMembers.size === 0) { formMsg.show('회차 참여자를 1명 이상 선택해주세요'); return; }
    if (!opener) { formMsg.show('상자 연 사람을 선택해주세요'); return; }

    // 전리품 검증 — 분배 OFF인 경우만 taker 필요.
    const validLoot = [];
    for (const e of lootEntries) {
      if (!e.item) continue;
      const priceTrim = (e.price ?? '').toString().trim();
      const priceNum  = priceTrim === '' ? null : Number(priceTrim);
      if (priceNum != null && Number.isNaN(priceNum)) {
        formMsg.show(`"${e.item}" 가격이 숫자가 아니에요`);
        return;
      }
      const shared = !!e.shared;
      if (!shared && !e.taker) {
        formMsg.show(`"${e.item}" — 분배 안 함이면 먹은 사람을 선택해주세요`);
        return;
      }
      validLoot.push({
        item:   e.item,
        taker:  shared ? '' : e.taker,
        price:  priceNum,
        shared,
      });
    }

    const payload = {
      partyId:        party.id,
      date:           dateStr,
      boss:           bossId,
      difficulty,
      channel,
      opener,
      baseReward,
      memberSnapshot: visibleMembers(),
      loot:           validLoot,
    };

    if (isEdit) Storage.updateRun(existingRun.id, payload);
    else        Storage.createRun(payload);

    overlay.remove();
    onSaved?.();
  }

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  setTimeout(() => bossSelect.focus(), 50);
}

// ── select 빌더들 ─────────────────────────────────────

function buildBossSelect(visibleMap = {}, keepId = null) {
  const available = getVisibleBosses(visibleMap);
  // 수정 모드에서 자기 보스가 숨겨졌어도 옵션엔 남긴다.
  if (keepId && !available.some(b => b.id === keepId)) {
    const kept = getBoss(keepId);
    if (kept) available.push(kept);
  }
  available.sort((a, b) => bossOrderIndex(a.id) - bossOrderIndex(b.id));
  return el('select', { className: 'select-input' },
    el('option', { value: '' }, '보스 선택...'),
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

function buildLootRow({ entry, members, onRemove, onChange }) {
  const color = getDisplayLootColor(entry.item);
  const itemLabel = el('div', { className: 'loot-row-name' });
  if (color) itemLabel.style.color = color;
  itemLabel.textContent = entry.item;

  // 먹은 사람 — 분배 ON일 땐 비활성화 (의미 없음).
  const takerSelect = el('select', { className: 'select-input' });
  takerSelect.appendChild(el('option', { value: '' }, entry.shared ? '분배: 전원 N등분' : '먹은 사람...'));
  members.forEach(m => {
    const opt = el('option', { value: m }, m);
    if (entry.taker === m) opt.selected = true;
    takerSelect.appendChild(opt);
  });
  if (entry.shared) takerSelect.disabled = true;
  takerSelect.addEventListener('change', () => { entry.taker = takerSelect.value; });

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

  // 분배 체크박스 — ON이면 taker 비활성화 + 가격 ÷ 회차 인원 자동.
  const sharedCheck = el('input', {
    type: 'checkbox',
    className: 'loot-shared-check',
    checked: !!entry.shared,
  });
  sharedCheck.addEventListener('change', () => {
    entry.shared = sharedCheck.checked;
    onChange?.();
  });
  const sharedLabel = el('label', {
    className: 'loot-shared-label',
    title: '체크 시 가격을 회차 참여자 N명에게 나눔',
  }, sharedCheck, '분배');

  return el('div', { className: 'loot-form-row' },
    itemLabel,
    takerSelect,
    priceInput,
    sharedLabel,
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
