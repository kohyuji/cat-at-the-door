/* 머리 중심이 (x, y)인 공통 SVG 조각. 서 있는 인물: drawHead(0, -68).
   기본 크기의 보수적인 경계: x -16..16, y -18..14.
   기존 반경 10의 침대 속 머리에는 scale: 10 / 14를 사용한다. */
function drawHead(x, y, opts = {}) {
  const px = Number.isFinite(x) ? x : 0;
  const py = Number.isFinite(y) ? y : 0;
  const scale = Number.isFinite(opts.scale) && opts.scale > 0 ? opts.scale : 1;
  const face = opts.face === 'happy' || opts.face === 'sad' ? opts.face : 'neutral';
  const eyes = opts.closed
    ? '<path d="M-7,0 q2.5,2 5,0 M2,0 q2.5,2 5,0" fill="none" stroke="var(--paw)" stroke-width="1.5" stroke-linecap="round"/>'
    : '<circle cx="-4.5" cy="0" r="1.5" fill="var(--paw)"/><circle cx="4.5" cy="0" r="1.5" fill="var(--paw)"/>';
  const mouth = face === 'happy'
    ? 'M-4.5,5 q4.5,5 9,0'
    : face === 'sad'
      ? 'M-4,7 q4,-4 8,0'
      : 'M-3.5,6 h7';

  return `<g transform="translate(${px},${py}) scale(${scale})">
    <path d="M-14,5 C-16,1 -16,-9 -10,-14 C-5,-18 5,-18 10,-14 C16,-9 16,1 14,5 L10,7 H-10 Z" fill="var(--hair)"/>
    <ellipse cx="-13" cy="2" rx="2.5" ry="3.5" fill="var(--skin)"/>
    <ellipse cx="13" cy="2" rx="2.5" ry="3.5" fill="var(--skin)"/>
    <circle cx="0" cy="0" r="14" fill="var(--skin)"/>
    <path d="M-14,0 C-15,-8 -10,-16 -1,-17 C9,-18 16,-10 14,1 L11,-4 C8,-2 5,-4 3,-6 C0,-2 -5,-3 -7,-5 L-10,-2 Z" fill="var(--hair)"/>
    ${eyes}
    <path d="${mouth}" fill="none" stroke="var(--paw)" stroke-width="1.7" stroke-linecap="round"/>
  </g>`;
}
