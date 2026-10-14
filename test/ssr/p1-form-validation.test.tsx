import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import { useFormValidation } from '../../src/hooks/form-validation/index.js';

it('F14 does not validate on render and exposes deterministic idle server markup', () => {
  const validate = vi.fn(() => []);
  function Form() {
    const state = useFormValidation<{name: string}>({validate, createSnapshot: values => ({...values})});
    return <form aria-busy={state.pending}><output>{state.issues.length}</output></form>;
  }
  expect(typeof document).toBe('undefined');
  const html = renderToString(<Form/>);
  expect(renderToString(<Form/>)).toBe(html);
  expect(html).toContain('aria-busy="false"');
  expect(html).toContain('<output>0</output>');
  expect(validate).not.toHaveBeenCalled();
});
