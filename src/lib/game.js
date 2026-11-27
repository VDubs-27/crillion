// Shared game constants and helpers
export const BALL_SECONDS = 20;
export const GRACE_SECONDS = 3.5; // server allows 23s; wait slightly longer before asking for the reveal

export const TIERS = [
  { runs: 6, label: "SIX" },
  { runs: 4, label: "FOUR" },
  { runs: 2, label: "TWO" },
  { runs: 1, label: "SINGLE" },
  { runs: 0, label: "DOT" },
];

// Today's date in New Zealand as YYYY-MM-DD (matches today_nz() in Postgres)
export function nzToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
  }).format(new Date());
}

// Seconds left on the on-screen clock (can go negative)
export function secondsLeft(startedAt) {
  return BALL_SECONDS - (Date.now() - Date.parse(startedAt)) / 1000;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
