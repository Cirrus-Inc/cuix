import { albersUsa } from "./albersUsa.js";
const byName = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
const round = (n) => Math.round(n * 10) / 10;
/**
 * Projects items into the map's space and collapses those in one grid cell into
 * one point at their mean position, with a `count` UsMap draws as a number badge.
 * A group's id is its first member's (by name).
 */
export function groupPoints(items, options = {}) {
    const { cell = 0.1, project = albersUsa } = options;
    const name = options.name ?? ((m) => `${m[0].name} and ${String(m.length - 1)} more`);
    const cells = new Map();
    for (const item of items) {
        const xy = project(item.lng, item.lat);
        if (!xy)
            continue;
        const key = `${String(Math.round(xy[0] / cell))},${String(Math.round(xy[1] / cell))}`;
        const c = cells.get(key);
        if (c) {
            c.sx += xy[0];
            c.sy += xy[1];
            c.list.push(item);
        }
        else
            cells.set(key, { sx: xy[0], sy: xy[1], list: [item] });
    }
    return [...cells.values()].map(({ sx, sy, list }) => {
        const members = [...list].sort(byName);
        const first = members[0];
        const n = members.length;
        return { id: first.id, x: round(sx / n), y: round(sy / n), name: n === 1 ? first.name : name(members), members, count: n };
    });
}
