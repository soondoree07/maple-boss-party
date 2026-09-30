// v2/members.js — 참여 캐릭터 표시 규칙 (외부 인원 "기타" 묶기)
//
// 외부 인원은 기타 유저 밑의 자리표 캐릭터(외부1~5)로 저장한다.
// 결정석·분배를 실제 인원 n 으로 나누려면 한 명당 id 하나가 필요해서다.
// 화면에서는 이름 대신 "기타 ×n" 하나로 묶어 보여 준다.

import { getCharacter, getUser, getUsers, getCharactersOf } from './store.js';

export const EXTERNAL_LABEL = '기타';

/** 외부 인원 자리표 캐릭터인지. */
export function isExternalCharacter(id) {
  const character = getCharacter(id);
  return !!character && !!getUser(character.userId)?.isExternal;
}

/** 외부 인원 자리표 캐릭터 id 들 (정렬 순서대로). */
export function externalSlotIds() {
  return getUsers()
    .filter(user => user.isExternal)
    .flatMap(user => getCharactersOf(user.id).map(ch => ch.id));
}

/** 캐릭터 하나의 이름. 외부 인원은 "기타", 지워진 캐릭터면 안내 문구. */
export function characterName(id) {
  if (isExternalCharacter(id)) return EXTERNAL_LABEL;
  return getCharacter(id)?.name || '(지운 캐릭터)';
}

/** 참여 캐릭터 목록 → 표시 이름들. 외부 인원은 맨 뒤에 "기타" 또는 "기타 ×n" 하나로. */
export function memberLabels(characterIds) {
  const ours = characterIds.filter(id => !isExternalCharacter(id)).map(characterName);
  const externalCount = characterIds.length - ours.length;
  if (externalCount === 0) return ours;
  return [...ours, externalCount === 1 ? EXTERNAL_LABEL : `${EXTERNAL_LABEL} ×${externalCount}`];
}

/**
 * 독식 대상 고르기용 목록. 외부 인원은 "기타" 하나로 합친다.
 * @returns {{ id: string, name: string }[]}
 */
export function takerChoices(characterIds) {
  const choices = characterIds
    .filter(id => !isExternalCharacter(id))
    .map(id => ({ id, name: characterName(id) }));
  const firstExternal = characterIds.find(isExternalCharacter);
  if (firstExternal) choices.push({ id: firstExternal, name: EXTERNAL_LABEL });
  return choices;
}
