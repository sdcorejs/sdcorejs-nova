// Internal decorative icons (design round 2): 16×16 viewBox, 1.5 stroke,
// currentColor, always aria-hidden and unfocusable. They replace text glyphs
// (×, ›, ‹, ↑, ↓, +, −, ⌄, ✓, ▦, ↘, …) whose baseline shifts with the font.
// Not exported from the package; server-compatible (no hooks, no randomness).
import { cx } from './cx.js';

type IconDef = { d: string; width?: number };

const ICONS = {
  'chevron-down': { d: 'M4 6l4 4 4-4' },
  'chevron-up': { d: 'M4 10l4-4 4 4' },
  'chevron-left': { d: 'M10 4L6 8l4 4' },
  'chevron-right': { d: 'M6 4l4 4-4 4' },
  close: { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' },
  check: { d: 'M3.5 8.5l3 3 6-7' },
  plus: { d: 'M8 3.5v9M3.5 8h9' },
  minus: { d: 'M3.5 8h9' },
  more: { d: 'M3.5 8h.01M8 8h.01M12.5 8h.01', width: 2.5 },
  'sort-asc': { d: 'M8 12.5v-9M4.5 7L8 3.5 11.5 7' },
  'sort-desc': { d: 'M8 3.5v9M4.5 9L8 12.5 11.5 9' },
  'arrow-up': { d: 'M8 12.5v-9M4.5 7L8 3.5 11.5 7' },
  'arrow-down': { d: 'M8 3.5v9M4.5 9L8 12.5 11.5 9' },
  calendar: { d: 'M3 4.5h10v9H3zM3 7.5h10M5.5 2.5v3M10.5 2.5v3' },
  clock: { d: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zM8 5v3.25l2 1.25' },
  grip: { d: 'M13 8.5l-4.5 4.5M13 4.5L4.5 13' },
  search: { d: 'M7 2.75a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5zM10.25 10.25l3.25 3.25' },
  copy: { d: 'M5.75 5.75h7v7h-7zM3.25 10.25v-7h7' },
  upload: { d: 'M8 13.25v-7.5M4.75 8.75L8 5.5l3.25 3.25M3 2.75h10' },
  trash: { d: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.75h6l.5-8.75' },
  edit: { d: 'M10.25 3.25l2.5 2.5-7 7h-2.5v-2.5zM9 4.5l2.5 2.5' },
  folder: { d: 'M2.25 4.25h4l1.5 1.5h6v7H2.25z' },
  file: { d: 'M4 2.25h5l3 3v8.5H4zM9 2.25v3h3' },
  'zoom-in': { d: 'M7 2.75a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5zM10.25 10.25l3.25 3.25M5 7h4M7 5v4' },
  'zoom-out': { d: 'M7 2.75a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5zM10.25 10.25l3.25 3.25M5 7h4' },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export type IconProps = { name: IconName; className?: string };

/** Decorative 16×16 icon; size it with CSS on the wrapper or this class. */
export function Icon({ name, className }: IconProps) {
  const icon: IconDef = ICONS[name];
  return (
    <svg
      className={cx('nova-icon', className)}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.width ?? 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icon.d} />
    </svg>
  );
}
