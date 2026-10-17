import type {Key} from '../types/index.js';
export type FilterValue = string | number | boolean | null | readonly Key[];
export type FilterField = {id:string;label:string;kind:'text'|'number'|'boolean'|'date'|'choice';operators:readonly string[];comparisonGroup?:string};
export type FilterRule = {fieldId:string;operator:string;value:FilterValue};
