// Per-day practice-minutes log, persisted in localStorage. Powers the
// GitHub-style practice heatmap. Keyed per user so accounts don't mix.
const keyFor = (userId) => `polylingo_activity_${userId || "guest"}`;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local-ish)
}

export function getActivityLog(userId) {
  try { return JSON.parse(localStorage.getItem(keyFor(userId))) || {}; }
  catch { return {}; }
}

export function logActivityMinutes(userId, minutes) {
  if (!minutes) return;
  try {
    const log = getActivityLog(userId);
    const d = todayStr();
    log[d] = (log[d] || 0) + minutes;
    localStorage.setItem(keyFor(userId), JSON.stringify(log));
  } catch (_) { /* ignore */ }
}

// Build a grid of the last `weeks` weeks (columns = weeks, rows = Sun..Sat),
// each cell { date, minutes }. Today's live minutes can be merged in by caller.
export function buildHeatmap(userId, weeks = 12) {
  const log = getActivityLog(userId);
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (weeks * 7 - 1));
  // align start to the previous Sunday
  start.setDate(start.getDate() - start.getDay());
  const cells = [];
  const cur = new Date(start);
  while (cur <= today) {
    const ds = cur.toISOString().slice(0, 10);
    cells.push({ date: ds, minutes: log[ds] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}
