/**
 * One clock for the whole server process.
 *
 * The simulator derives every bus position from "seconds since the server
 * started". If each module captured its own `Date.now()`, the page and the
 * polling endpoint would compute different times and buses would visibly jump
 * backwards on the first refresh. Storing it on globalThis also survives
 * dev-mode hot reloads.
 */

const KEY = "__safiri_server_start__";

type GlobalWithClock = typeof globalThis & { [KEY]?: number };

const g = globalThis as GlobalWithClock;

export const SERVER_START_MS: number = g[KEY] ?? (g[KEY] = Date.now());
