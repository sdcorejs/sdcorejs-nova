// WCAG 2.x contrast report for the theme Nova palette (src/tokens/tokens.ts), both themes.
// Numbers are computed, never typed: ratios are truncated to two decimals (no rounding up,
// the same rule as meetsContrast), so a printed 4.50 always passes 4.5.
// CLI: `node scripts/report-contrast.mjs` → Markdown on stdout.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTokens } from './build-css.mjs';

const TONES = ['tip', 'info', 'success', 'warning', 'error'];

/** [foreground, background, minimum, role] pairs checked in every theme. */
export function contrastPairs() {
  const pairs = [
    ['text', 'background', 4.5, 'Chữ chính'],
    ['text', 'surface', 4.5, 'Chữ trên surface'],
    ['text', 'surface-hover', 4.5, 'Chữ trên hover/muted'],
    ['text', 'popover', 4.5, 'Chữ trong popup'],
    ['text-muted', 'background', 4.5, 'Chữ phụ'],
    ['text-muted', 'surface', 4.5, 'Chữ phụ trên surface'],
    ['text-muted', 'surface-hover', 4.5, 'Chữ phụ trên muted'],
    ['control-border', 'background', 3, 'Viền control'],
    ['control-border', 'surface', 3, 'Viền control trên surface'],
    ['control-border', 'surface-hover', 3, 'Viền control trên muted'],
    ['control-border-hover', 'background', 3, 'Viền control khi hover'],
    ['focus-ring', 'background', 3, 'Vòng focus'],
    ['disabled-text', 'disabled-surface', 4.5, 'Chữ vô hiệu'],
    ['on-action', 'action', 4.5, 'Nút chính'],
    ['on-action', 'action-hover', 4.5, 'Nút chính hover'],
    ['on-action', 'action-active', 4.5, 'Nút chính pressed'],
    ['on-danger', 'danger', 4.5, 'Nút xóa'],
    ['on-danger', 'danger-hover', 4.5, 'Nút xóa hover'],
  ];
  for (const tone of TONES) {
    pairs.push([`${tone}-text`, `${tone}-surface`, 4.5, `Tone ${tone}: chữ trên nền tone`]);
    pairs.push(['control-border', `${tone}-surface`, 3, `Tone ${tone}: viền control trên nền tone`]);
  }
  return pairs;
}

const truncate = (ratio) => (Math.floor(ratio * 100) / 100).toFixed(2);

export async function contrastReport() {
  const { colorTokens, contrastRatio, meetsContrast } = await loadTokens();
  const rows = contrastPairs().map(([fg, bg, minimum, role]) => {
    const cells = ['light', 'dark'].map((theme) => {
      const ratio = contrastRatio(colorTokens[theme][fg], colorTokens[theme][bg]);
      return { ratio, ok: meetsContrast(ratio, minimum), text: `${truncate(ratio)} (${colorTokens[theme][fg]} / ${colorTokens[theme][bg]})` };
    });
    return { fg, bg, minimum, role, cells };
  });
  const lines = [
    '| Cặp | Vai trò | Ngưỡng | Sáng | Tối |',
    '|---|---|---|---|---|',
    ...rows.map(({ fg, bg, minimum, role, cells }) =>
      `| \`${fg}\` / \`${bg}\` | ${role} | ${minimum}:1 | ${cells[0].ok ? '' : '**FAIL** '}${cells[0].text} | ${cells[1].ok ? '' : '**FAIL** '}${cells[1].text} |`),
  ];
  return { markdown: lines.join('\n'), failures: rows.filter((row) => row.cells.some((cell) => !cell.ok)) };
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const { markdown, failures } = await contrastReport();
  console.log(markdown);
  if (failures.length) {
    console.error(`report-contrast: ${failures.length} pair(s) below the minimum`);
    process.exit(1);
  }
}
