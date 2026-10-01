// v2/character-panel.js — 유저 캐릭터 창의 캐릭터 탭 한 개 분량
//
// 넥슨 profile 조회 하나로 캐릭터 정보 · 장비 · 유니온 챔피언 · 링크 · 어빌리티를 그리고,
// 스케줄러는 따로 불러온다. 최근 드랍템은 우리 기록에서 계산한다.

import { el } from '../utils.js';
import { getLootImage } from '../data.js';
import { fetchProfile } from './nexon.js';
import { createEquipWindow } from './equip-window.js';
import { renderUserScheduler } from './user-scheduler.js';
import { recentDrops } from './user-stats.js';
import { cardDateLabel } from './run-card.js';

const PRESETS = ['1', '2', '3'];
const RECENT_DROP_COUNT = 16; // 한 줄에 8개씩 두 줄

/** 2억 4,257만 */
function formatPower(power) {
  const eok = Math.floor(power / 1e8);
  const man = Math.floor((power % 1e8) / 1e4);
  return eok > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${man.toLocaleString()}만`;
}

/**
 * @param {{ id, name, job }} character
 * @param {Promise<boolean>} connected - 스케줄러 연결 여부
 */
export function renderCharacterPanel(character, connected) {
  const infoCard = card('캐릭터 정보', el('p', { className: 'form-hint' }, '넥슨에서 불러오는 중..'));
  const equipCard = card('장비', el('p', { className: 'form-hint' }, '넥슨에서 불러오는 중..'), '마우스를 올리면 상세 정보');
  const extraCard = card('유니온 챔피언', el('p', { className: 'form-hint' }, '넥슨에서 불러오는 중..'));

  fetchProfile(character.name).then(result => {
    if (!result.ok) {
      [infoCard, equipCard, extraCard].forEach(c => c.setBody(el('p', { className: 'form-hint' }, result.message)));
      return;
    }
    const profile = result.data;
    // 넥슨 데이터 모양이 예상과 달라 한 카드가 실패해도, 그 카드만 안내를 띄우고 나머지는 그린다.
    const fill = (target, render) => {
      try { target.setBody(render()); } catch (e) {
        console.error('[character-panel] 그리기 실패:', e);
        target.setBody(el('p', { className: 'form-hint' }, '이 정보를 보여 주지 못했어요. 새로고침해 주세요.'));
      }
    };
    fill(infoCard, () => renderInfo(profile, character.id));
    fill(equipCard, () => createEquipWindow(profile.equipment));
    fill(extraCard, () => renderExtras(profile));
  });

  return el('div', { className: 'v2-user-grid' },
    infoCard.node, equipCard.node, renderUserScheduler(character, connected), extraCard.node);
}

function card(title, body, sub = '') {
  const bodyBox = el('div', { className: 'v2-user-card-body' }, body);
  const node = el('section', { className: 'v2-section v2-user-card' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, title),
      sub ? el('span', { className: 'v2-section-sub' }, sub) : null),
    bodyBox);
  return { node, setBody: (content) => bodyBox.replaceChildren(content) };
}

function renderInfo(profile, characterId) {
  const rows = [
    ['직업', profile.job], ['레벨', `Lv.${profile.level}`], ['월드', profile.world],
    ['전투력', formatPower(profile.power)],
    ['유니온', profile.unionLevel ? `Lv.${profile.unionLevel.toLocaleString()}` : '-'],
    ['아케인포스', profile.arcane.toLocaleString()], ['어센틱포스', profile.authentic.toLocaleString()],
  ];
  const drops = recentDrops(characterId, RECENT_DROP_COUNT);
  return el('div', null,
    el('div', { className: 'v2-profile' },
      el('div', { className: 'v2-profile-avatar' }, el('img', { src: profile.image, alt: '' })),
      el('div', null,
        el('p', { className: 'v2-profile-name' }, profile.name),
        el('dl', { className: 'v2-profile-list' }, rows.flatMap(([k, v]) => [el('dt', null, k), el('dd', null, v)])))),
    el('h3', { className: 'v2-user-subtitle' }, '최근에 먹은 드랍템'),
    drops.length
      ? el('div', { className: 'v2-recent-drops' }, drops.map(({ name, date }) => {
          const img = getLootImage(name);
          return el('span', { className: 'v2-recent-drop', title: `${cardDateLabel(date)} · ${name}` },
            img ? el('img', { src: img, alt: name }) : el('small', null, name.slice(0, 2)));
        }))
      : el('p', { className: 'form-hint' }, '아직 먹은 드랍템이 없어요. 기록에 드랍템을 넣으면 여기에 모여요.'),
  );
}

function renderExtras(profile) {
  const abilityBox = el('div', { className: 'v2-ability' });
  const abilityPresets = el('div', { className: 'v2-ability-presets' });
  const showAbility = (no) => {
    abilityPresets.replaceChildren(...PRESETS.map(n => el('button', {
      className: `v2-ability-preset${n === no ? ' on' : ''}`, type: 'button', onclick: () => showAbility(n),
      title: n === profile.ability.current ? '지금 적용 중' : '',
    }, n === profile.ability.current ? `${n}·적용` : n)));
    const lines = profile.ability.presets[no] || [];
    abilityBox.replaceChildren(...(lines.length
      ? lines.map(a => el('div', { className: 'v2-ability-line', dataset: { grade: a.grade } }, a.value))
      : [el('p', { className: 'form-hint' }, '이 프리셋엔 어빌리티가 없어요.')]));
  };
  showAbility(profile.ability.current);

  return el('div', null,
    profile.champions.length
      ? el('div', { className: 'v2-champions' }, profile.champions.map(c => el('div', { className: 'v2-user-row' },
          el('span', null, c.name, el('small', null, c.job)), el('strong', null, c.grade))))
      : el('p', { className: 'form-hint' }, '등록한 유니온 챔피언이 아직 없어요.'),
    el('h3', { className: 'v2-user-subtitle' }, '적용된 링크 스킬'),
    el('div', { className: 'v2-user-chips' }, profile.links.map(s => el('span', { className: 'v2-user-chip v2-link-chip' },
      s.icon ? el('img', { src: s.icon, alt: '' }) : null, `${s.name} Lv.${s.level}`))),
    el('div', { className: 'v2-user-subhead' }, el('h3', { className: 'v2-user-subtitle' }, '어빌리티'), abilityPresets),
    abilityBox,
  );
}
