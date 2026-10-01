// v2/user-page.js — 유저 캐릭터 창 (#/user/<유저 id>)
//
// 위: 이번 주 수익(캐릭터별 + 합계) · 파티별 수익(이번 주 / 이번 달) — 우리 기록 기준
// 아래: 캐릭터 탭 → 캐릭터 정보 · 장비 · 스케줄러 · 유니온 챔피언 · 링크 · 어빌리티 — 넥슨 기준
// 넥슨 데이터를 보여 주므로 맨 아래에 출처 문구를 단다(넥슨 이용 조건).

import { el, clear } from '../utils.js';
import { getUser, getCharactersOf } from './store.js';
import { renderWeekIncome, renderPartyIncome } from './user-income.js';
import { renderCharacterPanel } from './character-panel.js';
import { fetchConnectedUserIds } from './nexon.js';

const selectedCharacter = new Map(); // 유저 id → 보던 캐릭터 id (다시 그려도 유지)

export function renderUserPage(container, userId) {
  clear(container);
  const user = getUser(userId);
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 기록으로'),
    el('h1', { className: 'page-title' }, user ? user.name : '유저'),
    el('div', { className: 'header-actions' }),
  ));
  if (!user || user.isExternal) {
    container.appendChild(el('main', { className: 'v2-home' },
      el('p', { className: 'form-hint' }, '찾는 유저가 없어요. 메인 화면에서 다시 골라 주세요.')));
    return;
  }

  const characters = getCharactersOf(user.id);
  const panelBox = el('div');
  const tabs = el('div', { className: 'v2-char-tabs' });

  const select = async (characterId) => {
    selectedCharacter.set(user.id, characterId);
    tabs.querySelectorAll('.v2-char-tab').forEach(tab => tab.classList.toggle('on', tab.dataset.id === characterId));
    const connected = (await fetchConnectedUserIds()).has(user.id);
    if (selectedCharacter.get(user.id) !== characterId) return; // 그새 다른 탭을 눌렀으면 버린다
    panelBox.replaceChildren(renderCharacterPanel(characters.find(c => c.id === characterId), connected));
  };
  tabs.append(...characters.map(c => el('button', {
    className: 'v2-char-tab', type: 'button', dataset: { id: c.id }, onclick: () => select(c.id),
  }, c.name, c.job ? el('small', null, c.job) : null)));

  container.appendChild(el('main', { className: 'v2-home v2-user-page' },
    el('div', { className: 'v2-user-grid' }, renderWeekIncome(user), renderPartyIncome(user)),
    characters.length ? tabs : el('p', { className: 'form-hint' }, '아직 캐릭터가 없어요. 유저 관리에서 캐릭터를 추가해 주세요.'),
    panelBox,
    el('footer', { className: 'v2-home-footer' }, el('small', { className: 'v2-api-credit' }, 'Data based on NEXON Open API')),
  ));

  const remembered = selectedCharacter.get(user.id);
  if (characters.length) select(characters.some(c => c.id === remembered) ? remembered : characters[0].id);
}
