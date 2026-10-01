// app.js — 해시 라우팅 (진입점)
//
// 라우트:
//   #/          메인 — 수익 순위 · 이번 달 전리품 · 기록 카드
//   #/manage    유저 · 캐릭터 관리
//   #/archive   과거 기록 — 개편 전 옛 파티 기록 달별 요약 (읽기 전용, data/archive-2026.json)
//   #/user/<id> 유저 캐릭터 창 — 수익 · 파티별 수익 · 캐릭터별 넥슨 정보(장비 · 스케줄러 등)
//   그 밖의 주소는 메인으로 보여 준다.
// 모든 화면은 사이트 비밀번호(v2/gate.js)를 먼저 통과해야 한다.

import { toast } from './utils.js';
import * as Store from './v2/store.js';
import { isSiteUnlocked, renderSiteGate } from './v2/gate.js';
import { renderHome } from './v2/home.js';
import { renderManage } from './v2/manage.js';
import { renderArchive } from './v2/archive.js';
import { renderUserPage } from './v2/user-page.js';

const root = document.getElementById('app');

function route() {
  const hash = location.hash || '#/';
  if (!isSiteUnlocked()) { renderSiteGate(root, route); return; }
  if (hash === '#/manage') { renderManage(root, route); return; }
  if (hash === '#/archive') { renderArchive(root); return; }
  if (hash.startsWith('#/user/')) { renderUserPage(root, decodeURIComponent(hash.slice('#/user/'.length))); return; }
  renderHome(root, route);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  // Supabase 에서 전체를 한 번 불러온 뒤 그린다. 실패해도 화면은 뜨게 하고 안내만 띄운다.
  try {
    await Store.init();
  } catch (e) {
    console.error('[app] 불러오기 실패:', e);
    toast('서버 연결에 실패했어요. 네트워크를 확인하고 새로고침해 주세요.', 'err', 6000);
  }
  // 다른 사람이 고치면 Realtime 으로 다시 불러와 지금 화면을 다시 그린다.
  Store.onRemoteChange(route);
  route();
});
