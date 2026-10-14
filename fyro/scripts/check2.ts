import { generateAll } from '../src/mocks/recordsGen';
import { buildDerived } from '../src/mocks/derived';
const d = buildDerived(generateAll());
const c: Record<number, number> = {};
d.incidents.forEach((i) => (c[i.severity] = (c[i.severity] ?? 0) + 1));
console.log(c, d.incidents.length, d.incidents.filter((i) => i.severity === 1).slice(0, 8).map((i) => i.storeId + ' ' + i.issue + ' ' + i.count).join(' | '));
console.log('esc', d.incidents.filter((i) => i.severity === 1 || (i.channels.length >= 4 && i.count >= 30 && i.severity <= 2)).length);
