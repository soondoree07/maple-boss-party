// api/_lib/profile.js — 유저 캐릭터 창용 넥슨 조회 묶음
//
// 캐릭터 하나에 넥슨을 8번 부른다(닉네임 찾기 + 기본 · 스탯 · 장비 · 유니온 · 유니온 챔피언 · 링크 · 어빌리티).
// 개발 단계 키는 초당 5건이라 두 번에 나눠 부르고, 넥슨 응답은 화면에 쓰는 값만 남겨 줄인다(장비 원본은 수백 KB).

import { callNexon, findOcid } from './nexon-client.js';

// 장비 옵션 합계 중 툴팁에 보여 줄 것 (넥슨 키 → 표시 이름, % 단위 여부)
const OPTION_LABELS = [
  ['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luk', 'LUK'], ['max_hp', '최대 HP'], ['max_mp', '최대 MP'],
  ['attack_power', '공격력'], ['magic_power', '마력'], ['armor', '방어력'],
  ['boss_damage', '보스 몬스터 공격 시 데미지', true], ['ignore_monster_armor', '몬스터 방어율 무시', true],
  ['damage', '데미지', true], ['all_stat', '올스탯', true], ['max_hp_rate', '최대 HP', true], ['max_mp_rate', '최대 MP', true],
];

const lines = (...values) => values.filter(Boolean);
const PRESET_NOS = ['1', '2', '3'];
/** 넥슨의 프리셋 번호를 '1' · '2' · '3' 중 하나로 (모르는 값이면 1) */
const presetNo = (value) => (PRESET_NOS.includes(String(value)) ? String(value) : '1');

/** 없어도 화면을 그릴 수 있는 조회 — 실패하면 빈 값으로 두고 나머지는 보여 준다(유니온 없는 캐릭터 등). */
const optional = (request) => request.catch((e) => {
  console.error('[profile] 선택 조회 실패:', e.code || e);
  return {};
});

function toItem(raw) {
  const total = raw.item_total_option || {};
  return {
    slot: raw.item_equipment_slot,
    name: raw.item_name,
    icon: raw.item_icon,
    star: Number(raw.starforce) || 0,
    scroll: Number(raw.scroll_upgrade) || 0,
    options: OPTION_LABELS
      .filter(([key]) => Number(total[key]) > 0)
      .map(([key, label, percent]) => `${label} : +${total[key]}${percent ? '%' : ''}`),
    potentialGrade: raw.potential_option_grade,
    potential: lines(raw.potential_option_1, raw.potential_option_2, raw.potential_option_3),
    additionalGrade: raw.additional_potential_option_grade,
    additional: lines(raw.additional_potential_option_1, raw.additional_potential_option_2, raw.additional_potential_option_3),
    soul: raw.soul_name ? { name: raw.soul_name, option: raw.soul_option } : null,
  };
}

function toEquipment(raw) {
  const current = presetNo(raw.preset_no);
  const presets = {};
  for (const no of PRESET_NOS) {
    // 프리셋 칸이 비어 오면(프리셋을 안 쓰는 캐릭터) 지금 착용 장비로 채운다.
    const list = raw[`item_equipment_preset_${no}`] || (no === current ? raw.item_equipment : null) || [];
    presets[no] = list.map(toItem);
  }
  return { current, presets };
}

function toAbility(raw) {
  const presets = {};
  for (const no of PRESET_NOS) {
    const preset = raw[`ability_preset_${no}`];
    presets[no] = (preset?.ability_info || []).map(a => ({ grade: a.ability_grade, value: a.ability_value }));
  }
  return { current: presetNo(raw.preset_no), presets };
}

const finalStat = (stat, name) => stat.final_stat?.find(s => s.stat_name === name)?.stat_value ?? null;

/** 닉네임 → 유저 캐릭터 창에 필요한 정보 전부 */
export async function loadProfile(name) {
  const ocid = await findOcid(name);
  const [basic, stat, equipment, union] = await Promise.all([
    callNexon('/character/basic', { ocid }),
    callNexon('/character/stat', { ocid }),
    callNexon('/character/item-equipment', { ocid }),
    optional(callNexon('/user/union', { ocid })),
  ]);
  const [champion, link, ability] = await Promise.all([
    optional(callNexon('/user/union-champion', { ocid })),
    optional(callNexon('/character/link-skill', { ocid })),
    optional(callNexon('/character/ability', { ocid })),
  ]);

  return {
    ocid,
    name: basic.character_name,
    job: basic.character_class,
    level: basic.character_level,
    world: basic.world_name,
    image: basic.character_image,
    power: Number(finalStat(stat, '전투력')) || 0,
    arcane: Number(finalStat(stat, '아케인포스')) || 0,
    authentic: Number(finalStat(stat, '어센틱포스')) || 0,
    unionLevel: union.union_level ?? null,
    champions: (champion.union_champion || []).map(c => ({ name: c.champion_name, job: c.champion_class, grade: c.champion_grade })),
    links: (link.character_link_skill || []).map(s => ({ name: s.skill_name, level: s.skill_level, icon: s.skill_icon })),
    ability: toAbility(ability),
    equipment: toEquipment(equipment),
  };
}
