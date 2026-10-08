// Imperative DOM utility for submit handlers (Q-13, §11). Not pure, not for
// the server; touches no globals at import. Nova never calls it on edit.

type Validatable = HTMLElement & { willValidate: boolean; validity: ValidityState };

function isValidatable(element: Element): element is Validatable {
  return 'willValidate' in element && 'validity' in element;
}

function isInvalid(element: Element): boolean {
  if (element.getAttribute('aria-invalid') === 'true') return true;
  return isValidatable(element) && element.willValidate && !element.validity.valid;
}

const NATIVELY_FOCUSABLE = /^(?:INPUT|SELECT|TEXTAREA|BUTTON)$/u;

/** Disabled by itself or by an ancestor <fieldset disabled> (except inside its first <legend>). */
function isDisabled(element: Element): boolean {
  if (element.hasAttribute('disabled') && NATIVELY_FOCUSABLE.test(element.tagName)) return true;
  if (element.hasAttribute('data-disabled') || element.getAttribute('aria-disabled') === 'true') return true;
  for (let fieldset = element.closest('fieldset[disabled]'); fieldset; fieldset = fieldset.parentElement?.closest('fieldset[disabled]') ?? null) {
    const legend = [...fieldset.children].find((child) => child.tagName === 'LEGEND');
    if (!legend?.contains(element)) return true;
  }
  return false;
}

/** Something a user can actually land on: focusable, enabled, rendered and not inert. */
function isUsable(element: Element): element is HTMLElement {
  if (!('focus' in element)) return false;
  if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'hidden') return false;
  if (element.closest('[hidden], [inert]')) return false;
  if (isDisabled(element)) return false;
  const tabIndex = element.getAttribute('tabindex');
  return NATIVELY_FOCUSABLE.test(element.tagName)
    || (element.tagName === 'A' && element.hasAttribute('href'))
    || element.hasAttribute('contenteditable')
    || (tabIndex !== null && Number.isInteger(Number(tabIndex)));
}

/**
 * What the user should land on for an element, in order of preference: inside a
 * Nova control root (Checkbox/Switch/RadioGroup) the visible controls — the
 * checked focus target first, then the other usable ones — instead of a hidden
 * native input.
 */
function focusCandidates(element: Element): HTMLElement[] {
  const controlRoot = element.closest('[data-nova-control-root]');
  if (controlRoot) {
    const targets = [...controlRoot.querySelectorAll('[data-nova-focus-target]')].filter(isUsable);
    const isChecked = (target: Element) => target.getAttribute('aria-checked') === 'true' || target.hasAttribute('data-checked');
    return [...targets.filter(isChecked), ...targets.filter((target) => !isChecked(target))];
  }
  return isUsable(element) ? [element] : [];
}

/**
 * Focuses the first candidate for `element` that really takes focus (a CSS-hidden
 * one does not) and returns it; `null` when none does.
 */
export function focusResolvedTarget(element: Element): HTMLElement | null {
  for (const target of focusCandidates(element)) {
    target.focus();
    if (target.ownerDocument.activeElement === target) return target;
  }
  return null;
}

/**
 * Focuses the first invalid element of `root` (DOM order) that can really take
 * focus and returns it; unusable invalid elements are skipped. `null` when none.
 */
export function focusFirstInvalid(root: HTMLElement): HTMLElement | null {
  const walker = root.ownerDocument.createTreeWalker(root, 1 /* NodeFilter.SHOW_ELEMENT */);
  for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
    const element = node as Element;
    if (!isInvalid(element)) continue;
    const target = focusResolvedTarget(element);
    if (target) return target;
  }
  return null;
}
