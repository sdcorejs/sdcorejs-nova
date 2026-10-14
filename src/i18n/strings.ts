// Typed string catalog (G-I18N, INV-012). P0 namespaces only; values are plain
// strings or plural entries `{ one, other }` with a `{count}` placeholder.
export type PluralEntry = { one: string; other: string };

export type NovaStrings = {
  common: {
    copy?: string;
    close: string;
    avatarUnknown: string;
  };
  forms: {
    editValue?: string;
    saveEdit?: string;
    syncingEdit?: string;
    editConflict?: string;
    time?: string;
    date?: string;
    nextDay?: string;
    startTime?: string;
    endTime?: string;
    invalidTime?: string;
    invalidTimeRange?: string;
    invalidDateTime?: string;
    calendar?: string;
    openCalendar?: string;
    previousMonth?: string;
    nextMonth?: string;
    startDate?: string;
    endDate?: string;
    invalidDate?: string;
    invalidDateRange?: string;
    removeChip?: string;
    duplicateChip?: string;
    invalidChip?: string;
    maxItemsReached?: string;
    selectPlaceholder?: string;
    unresolvedSelection?: string;
    noResults?: string;
    invalidNumber?: string;
    numberInputRole?: string;
    decreaseNumber?: string;
    increaseNumber?: string;
    clear?: string;
    clearSelection?: string;
    required: string;
    configurationError: string;
    radioEmpty: string;
    errorsTitle: string;
  };
  feedback: {
    confirm?: string;
    cancel?: string;
    notifications?: string;
    copied?: string;
    copyFailed?: string;
    /** Optional to preserve existing complete P0 catalogs. Bundled fallback remains available. */
    unavailable?: string;
    loading: string;
    refreshing: string;
    empty: string;
    errorDefault: string;
    retry: string;
    dismiss: string;
  };
  navigation: {
    scrollArea?: string;
    steps?: string;
    stepPending?: string;
    stepComplete?: string;
    stepError?: string;
    breadcrumb: string;
    showHidden: string;
    avatarOverflow: PluralEntry;
  };
};

export type NovaStringOverrides = { [N in keyof NovaStrings]?: Partial<NovaStrings[N]> };
