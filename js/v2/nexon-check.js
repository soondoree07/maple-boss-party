// v2/nexon-check.js — 유저 관리 캐릭터 줄의 "넥슨 확인" 버튼과 결과 표시
//
// 버튼을 누르면 닉네임으로 넥슨에서 캐릭터를 찾아, 레벨 · 직업 · 월드 · 이미지를 보여 준다.
// 못 찾으면 이유(닉네임 확인, 점검 중 등)를 그 자리에 보여 준다.

import { el, clear } from '../utils.js';
import { fetchCharacterProfile } from './nexon.js';

/**
 * @param {{name: string}} character
 * @returns {{button: HTMLElement, result: HTMLElement}} 버튼은 줄 오른쪽, 결과는 줄 아래에 붙인다
 */
export function createNexonCheck(character) {
  const result = el('div', { className: 'v2-nexon-result', hidden: true });

  const button = el('button', {
    className: 'btn btn-ghost btn-mini', type: 'button',
    onclick: async () => {
      button.disabled = true;
      showMessage(result, '넥슨에서 찾는 중..');
      const res = await fetchCharacterProfile(character.name);
      button.disabled = false;
      if (res.ok) showProfile(result, res.data);
      else showMessage(result, res.message, true);
    },
  }, '넥슨 확인');

  return { button, result };
}

function showMessage(result, text, isError = false) {
  clear(result);
  result.hidden = false;
  result.classList.toggle('is-error', isError);
  result.appendChild(el('span', null, text));
}

function showProfile(result, profile) {
  clear(result);
  result.hidden = false;
  result.classList.remove('is-error');
  if (profile.image) result.appendChild(el('img', { className: 'v2-nexon-avatar', src: profile.image, alt: '', loading: 'lazy' }));
  result.appendChild(
    el('span', null,
      el('strong', null, profile.name),
      el('small', null, `Lv.${profile.level} ${profile.job} · ${profile.world}`)),
  );
}
