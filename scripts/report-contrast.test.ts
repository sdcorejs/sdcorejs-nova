// @vitest-environment node
import { describe, expect, it } from 'vitest';

type Row = { fg: string; bg: string };
type ReportContrast = {
  contrastPairs: () => readonly unknown[];
  contrastReport: () => Promise<{ markdown: string; failures: readonly Row[] }>;
};

const { contrastPairs, contrastReport } = (await import(new URL('./report-contrast.mjs', import.meta.url).href)) as ReportContrast;

describe('report-contrast', () => {
  it('every reported pair meets its minimum in both themes', async () => {
    const { failures } = await contrastReport();
    expect(failures.map((row) => `${row.fg} / ${row.bg}`)).toEqual([]);
  });

  it('prints one Markdown row per pair, truncated to two decimals', async () => {
    const { markdown } = await contrastReport();
    const rows = markdown.split('\n').slice(2);
    expect(rows).toHaveLength(contrastPairs().length);
    for (const row of rows) expect(row).toMatch(/\| \d+\.\d{2} \(#[0-9a-f]{6} \/ #[0-9a-f]{6}\) \| \d+\.\d{2} \(#[0-9a-f]{6} \/ #[0-9a-f]{6}\) \|$/);
  });
});
