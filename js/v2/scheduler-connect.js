// v2/scheduler-connect.js — 유저 관리의 "스케줄러 연결" 버튼과 연결 창
//
// 스케줄러 API 는 키 주인 계정의 캐릭터만 열어 주므로, 유저마다 자기 넥슨 계정으로 발급한 키를 넣는다.
// 키는 서버(Supabase nexon_keys)에만 저장되고 화면에는 "연결됨" 상태만 보인다.
// 등록 · 해제할 때는 사이트 비밀번호를 한 번 더 받는다(서버가 확인).

import { el, pinInput, toast } from '../utils.js';
import { openModal, field } from './modal.js';
import { fetchConnectedUserIds, connectScheduler, disconnectScheduler } from './nexon.js';

const NEXON_OPEN_API_URL = 'https://openapi.nexon.com/ko/';
const SITE_URL = 'https://maplebossparty.vercel.app';

/**
 * 유저 카드 머리에 붙는 버튼. 연결 상태는 서버에서 받아 오는 대로 글자를 바꾼다.
 * @param {{id, name}} user
 * @param {() => void} rerender
 */
export function createSchedulerButton(user, rerender) {
  const button = el('button', { className: 'btn btn-ghost btn-mini v2-scheduler-btn', type: 'button' }, '스케줄러 연결');
  let connected = false;
  fetchConnectedUserIds().then(ids => {
    connected = ids.has(user.id);
    button.textContent = connected ? '스케줄러 연결됨' : '스케줄러 연결';
    button.classList.toggle('is-connected', connected);
  });
  button.addEventListener('click', () => openConnectDialog(user, connected, rerender));
  return button;
}

function keyGuide() {
  return el('ol', { className: 'v2-key-guide' },
    el('li', null, el('a', { href: NEXON_OPEN_API_URL, target: '_blank', rel: 'noopener' }, '넥슨 오픈 API'), '에 본인 넥슨 계정으로 로그인해요.'),
    el('li', null, '마이 페이지 → 애플리케이션 등록에서 게임은 메이플스토리, 단계는 개발 단계, 개발 환경은 WEB, URL 은 ', el('code', null, SITE_URL), ' 를 넣어요. 서비스명은 자유예요.'),
    el('li', null, '애플리케이션 목록에서 방금 만든 이름을 눌러, 기본 정보의 API Key 를 복사해요.'),
    el('li', null, '아래 칸에 붙여 넣고 사이트 비밀번호를 적으면 끝이에요.'),
  );
}

function openConnectDialog(user, connected, rerender) {
  const keyInput = el('input', {
    className: 'text-input', type: 'password', autocomplete: 'off', spellcheck: false,
    placeholder: connected ? '새 키로 바꿀 때만 붙여 넣어요' : '넥슨 API Key 붙여 넣기',
  });
  const pin = pinInput('사이트 비밀번호 4자리');
  const errMsg = el('div', { className: 'dialog-error' });

  // 버튼을 누르는 동안 잠그고, 실패 문구는 창 안에 보여 준다.
  const run = (task) => async (e) => {
    const button = e.currentTarget;
    errMsg.textContent = '';
    button.disabled = true;
    try { await task(); } finally { button.disabled = false; }
  };

  const save = run(async () => {
    if (!keyInput.value.trim()) { errMsg.textContent = '넥슨 API 키를 붙여 넣어 주세요.'; return; }
    if (pin.value.length !== 4) { errMsg.textContent = '사이트 비밀번호 4자리를 적어 주세요.'; return; }
    const result = await connectScheduler(user.id, keyInput.value.trim(), pin.value);
    if (!result.ok) { errMsg.textContent = result.message; return; }
    toast(`${user.name}님 스케줄러를 연결했어요. 캐릭터 ${result.data.matched.length}개: ${result.data.matched.join(', ')}`, 'ok', 5000);
    close();
    rerender();
  });

  const remove = run(async () => {
    if (pin.value.length !== 4) { errMsg.textContent = '해제하려면 사이트 비밀번호 4자리를 적어 주세요.'; return; }
    const result = await disconnectScheduler(user.id, pin.value);
    if (!result.ok) { errMsg.textContent = result.message; return; }
    toast(`${user.name}님 스케줄러 연결을 해제했어요.`, 'ok');
    close();
    rerender();
  });

  const close = openModal({
    title: `${user.name}님 스케줄러 연결`,
    body: el('div', { className: 'v2-form' },
      el('p', { className: 'form-hint' }, connected
        ? '연결돼 있어요. 기록 창에서 이 유저 캐릭터의 스케줄러 보스가 위에 나와요.'
        : '연결하면 기록 창에서 이 유저 캐릭터가 스케줄러에 등록한 보스와 난이도가 먼저 나와요.'),
      connected ? null : keyGuide(),
      field('넥슨 API Key', keyInput),
      field('사이트 비밀번호', pin),
      errMsg,
    ),
    actions: [
      connected ? el('button', { className: 'btn btn-danger', type: 'button', onclick: remove }, '연결 해제하기') : null,
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '취소'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: save }, connected ? '새 키로 바꾸기' : '연결하기'),
    ].filter(Boolean),
  });
}
