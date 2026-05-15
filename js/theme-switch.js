/* theme-switch.js — 무드 미리보기 전용 (임시 / dev only)
 *
 * ⚠️ 이 파일과 index.html 의 <script src="js/theme-switch.js"> 한 줄은
 *    무드 확정 후 삭제한다. 사이트 구조/클래스/JS 로직은 전혀 안 건드림 —
 *    css/style.css 뒤에 <link> 하나를 얹어 :root 토큰만 덮어쓰는 방식.
 *
 * 선택값은 localStorage 에 저장돼 페이지 이동/새로고침해도 유지된다.
 */
(function () {
  var STORAGE_KEY = 'maple-mood-preview';

  var MOODS = [
    { id: '',  label: '기본 (원본 / 배경이미지)' },
    { id: '1', label: '1 · Midnight Slate (다크)' },
    { id: '2', label: '2 · Pure Paper (라이트)' },
    { id: '3', label: '3 · Warm Sand (라이트·웜)' },
    { id: '4', label: '4 · Forest Night (다크)' },
    { id: '5', label: '5 · Mono Ink (라이트·모노)' },
    { id: '6', label: '6 · Royal Plum (다크)' },
    { id: '7', label: '7 · Nordic Frost (라이트)' },
    { id: '8', label: '8 · Carbon Amber (다크)' },
  ];

  // style.css 보다 뒤에 와야 :root 오버라이드가 이긴다 → <head> 끝에 append.
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.id = 'mood-theme-link';
  document.head.appendChild(link);

  function apply(id) {
    if (id) {
      link.href = 'css/themes/mood-' + id + '.css';
      link.disabled = false;
    } else {
      link.removeAttribute('href');
      link.disabled = true;
    }
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
  }

  var saved = '';
  try { saved = localStorage.getItem(STORAGE_KEY) || ''; } catch (e) {}
  apply(saved);

  function mountUI() {
    if (document.getElementById('mood-switch-ui')) return;

    var box = document.createElement('div');
    box.id = 'mood-switch-ui';
    box.style.cssText = [
      'position:fixed', 'right:14px', 'bottom:14px', 'z-index:2147483647',
      'background:#111418', 'color:#f1f5f9',
      'border:1px solid #3a4452', 'border-radius:10px',
      'padding:9px 11px', 'font:13px/1.3 system-ui, sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.45)', 'display:flex',
      'flex-direction:column', 'gap:6px', 'max-width:240px',
    ].join(';');

    var cap = document.createElement('div');
    cap.textContent = '무드 미리보기 (임시)';
    cap.style.cssText = 'font-weight:700;font-size:11px;letter-spacing:.04em;opacity:.7';

    var sel = document.createElement('select');
    sel.style.cssText = [
      'background:#1b1f26', 'color:#f1f5f9',
      'border:1px solid #3a4452', 'border-radius:6px',
      'padding:6px 8px', 'font:13px system-ui, sans-serif',
      'max-width:218px',
    ].join(';');

    MOODS.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.label;
      if (m.id === saved) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { apply(sel.value); });

    var hint = document.createElement('div');
    hint.textContent = '고른 무드를 알려주면 전체 적용 후 이 컨트롤은 제거됩니다.';
    hint.style.cssText = 'font-size:10px;opacity:.55;line-height:1.4';

    box.appendChild(cap);
    box.appendChild(sel);
    box.appendChild(hint);
    document.body.appendChild(box);
  }

  if (document.body) mountUI();
  else window.addEventListener('DOMContentLoaded', mountUI);
})();
