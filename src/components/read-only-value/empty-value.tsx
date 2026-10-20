'use client';
import { en } from '../../i18n/en.js';
import { languageOf } from '../../i18n/resolve-strings.js';
import { vi } from '../../i18n/vi.js';
import { useNovaScope } from '../../providers/nova/context.js';

/** Visible `--` for an empty value; assistive technology reads the localized "unavailable" text instead. */
export function EmptyValue() {
  const scope = useNovaScope();
  const text = scope.strings.feedback.unavailable ?? (languageOf(scope.locale) === 'vi' ? vi : en).feedback.unavailable;
  return <><span aria-hidden="true" className="nova-read-only-value__empty">--</span><span className="nova-visually-hidden">{text}</span></>;
}
