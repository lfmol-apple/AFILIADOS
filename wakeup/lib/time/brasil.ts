const TZ = "America/Sao_Paulo";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * The instant of 00:00 (São Paulo) of the day `now` falls in. The server runs
 * in UTC, so `setHours(0,0,0,0)` made every "hoje" counter restart at 21:00
 * Brasília; this anchors the day to the owner's clock instead. Brazil has no
 * daylight saving time, and the day is derived from the clock time in the zone
 * (not a fixed offset), so it stays right if that ever changes.
 */
export function startOfDayInBrasil(now: Date = new Date()): Date {
  const map: Record<string, number> = {};
  for (const p of parts.formatToParts(now)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const sinceMidnightMs =
    ((map.hour! * 60 + map.minute!) * 60 + map.second!) * 1000 +
    now.getMilliseconds();
  return new Date(now.getTime() - sinceMidnightMs);
}

/** Same, `days` days back (whole days, São Paulo). */
export function startOfDayInBrasilDaysAgo(
  days: number,
  now: Date = new Date(),
): Date {
  return startOfDayInBrasil(
    new Date(
      startOfDayInBrasil(now).getTime() -
        days * 24 * 60 * 60 * 1000 +
        12 * 60 * 60 * 1000,
    ),
  );
}
