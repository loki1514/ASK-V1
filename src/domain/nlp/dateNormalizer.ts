/**
 * Deterministic Date ISO Normalizer
 * Converts colloquial relative time expressions ("Friday", "tomorrow", "next Monday")
 * into normalized ISO-8601 calendar strings (YYYY-MM-DD).
 */

const DAYS_OF_WEEK: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function normalizeRelativeDate(expression: string, referenceDate: Date = new Date("2026-09-18")): string | null {
  const clean = expression.toLowerCase().trim().replace(/^(by|on|at|before)\s+/, "");

  // Already standard ISO date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const target = new Date(referenceDate);

  if (clean === "today") {
    return formatIso(target);
  }

  if (clean === "tomorrow") {
    target.setDate(target.getDate() + 1);
    return formatIso(target);
  }

  if (clean === "yesterday") {
    target.setDate(target.getDate() - 1);
    return formatIso(target);
  }

  // Handle weekday names (e.g. "friday", "next monday")
  const isNext = clean.startsWith("next ");
  const dayName = clean.replace("next ", "").trim();

  if (DAYS_OF_WEEK[dayName] !== undefined) {
    const targetDay = DAYS_OF_WEEK[dayName];
    const currentDay = target.getDay();
    let daysToAdd = targetDay - currentDay;

    if (daysToAdd <= 0 || isNext) {
      daysToAdd += 7;
    }
    target.setDate(target.getDate() + daysToAdd);
    return formatIso(target);
  }

  return null;
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
