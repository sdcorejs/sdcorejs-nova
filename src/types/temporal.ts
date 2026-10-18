/** Civil values remain strings; controls validate their Gregorian/time syntax. */
export type ISODate = string;
export type ISOInstant = string;
export type LocalTime = string;
export type DateRange = { start: ISODate | null; end: ISODate | null };
export type WallTimeResult = { status: 'resolved'; instant: ISOInstant } | { status: 'invalid'; reason: 'gap' | 'ambiguous' | 'invalid-date' | 'invalid-time' | 'invalid-zone' };
export type DateTimeAdapter = { resolve(input: { date: ISODate; time: LocalTime; timeZone: string; disambiguation: 'reject' | 'earlier' | 'later' }): WallTimeResult };
