// Typed string catalog (G-I18N, INV-012). P0 namespaces only; values are plain
// strings or plural entries `{ one, other }` with a `{count}` placeholder.
export type PluralEntry = { one: string; other: string };

export type NovaStrings = {
  common: {
    close: string;
    avatarUnknown: string;
  };
  forms: {
    required: string;
    configurationError: string;
    radioEmpty: string;
    errorsTitle: string;
  };
  feedback: {
    loading: string;
    refreshing: string;
    empty: string;
    errorDefault: string;
    retry: string;
    dismiss: string;
  };
  navigation: {
    breadcrumb: string;
    showHidden: string;
    avatarOverflow: PluralEntry;
  };
};

export type NovaStringOverrides = { [N in keyof NovaStrings]?: Partial<NovaStrings[N]> };
