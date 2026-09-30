// v2/icons.js — 글자 대신 쓰는 작은 SVG 아이콘 (글꼴마다 위치가 달라지는 "×" 대신 정확히 가운데에 놓인다)

const SVG_NS = 'http://www.w3.org/2000/svg';

/** X 모양 닫기·지우기 아이콘. 색은 버튼 글자색(currentColor)을 따른다. */
export function closeIcon(size = 12) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M2 2 L10 10 M10 2 L2 10');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}
