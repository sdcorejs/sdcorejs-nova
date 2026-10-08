import type { NovaStrings } from './strings.js';

export const en = {
  common: {
    close: 'Close',
    avatarUnknown: 'User',
  },
  forms: {
    required: 'Required',
    configurationError: 'Configuration error: this component has no valid accessible name.',
    radioEmpty: 'No options available.',
    errorsTitle: 'Please fix the following errors',
  },
  feedback: {
    loading: 'Loading…',
    refreshing: 'Updating…',
    empty: 'No data',
    errorDefault: 'Something went wrong.',
    retry: 'Retry',
    dismiss: 'Dismiss',
  },
  navigation: {
    breadcrumb: 'Breadcrumb',
    showHidden: 'Show hidden items',
    avatarOverflow: { one: 'and {count} more person', other: 'and {count} more people' },
  },
} satisfies NovaStrings;
