import {useFormatter,formatRelative,useRelativeTime} from '@sdcorejs/nova/formatter';
export function Formats(){const f=useFormatter({timeZone:'UTC'});return <>{f.number(0)}{f.date('2024-02-29')}{f.instant('2024-02-29T00:00:00Z')}{useRelativeTime('2024-02-29T00:00:00Z',{now:'2024-03-01T00:00:00Z'})}</>;}
formatRelative('2024-01-01T00:00:00Z',{locale:'vi',now:'2024-01-02T00:00:00Z'});
// @ts-expect-error now must be deterministic and explicit
formatRelative('2024-01-01T00:00:00Z',{locale:'vi'});
