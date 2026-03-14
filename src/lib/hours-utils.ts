import type { StructuredHourSlot, DayOfWeek } from "./types";
import { DAYS_OF_WEEK } from "./types";

/** Convert 24h "HH:mm" to 12h display "h:mm am" */
export function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "pm" : "am";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

/** Convert 12h "h:mm AM" to 24h "HH:mm" */
export function to24Hour(time12: string): string {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return "00:00";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toLowerCase();
  if (period === "pm" && h !== 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

/** Generate time options in 30-min increments for dropdowns */
export function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
      const value = `${String(h).padStart(2, "0")}:${m}`;
      options.push({ value, label: to12Hour(value) });
    }
  }
  return options;
}

/** Sort slots by day order then open time */
export function sortSlots(slots: StructuredHourSlot[]): StructuredHourSlot[] {
  return [...slots].sort((a, b) => {
    const dayDiff = DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.open.localeCompare(b.open);
  });
}

/** Parse legacy Google Places hours strings to structured slots */
export function parseStringHoursToStructured(hours: string[]): StructuredHourSlot[] {
  const slots: StructuredHourSlot[] = [];
  for (const line of hours) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx === -1) continue;
    const dayStr = line.slice(0, colonIdx).trim();
    const timeStr = line.slice(colonIdx + 2).trim();

    // Match day name to DayOfWeek
    const day = DAYS_OF_WEEK.find(
      (d) => d.toLowerCase() === dayStr.toLowerCase() || d.slice(0, 3).toLowerCase() === dayStr.toLowerCase().slice(0, 3)
    );
    if (!day) continue;

    if (/closed/i.test(timeStr)) continue;

    if (/open 24 hours/i.test(timeStr)) {
      slots.push({ day, open: "00:00", close: "23:59" });
      continue;
    }

    // Match time ranges: "9:00 AM – 9:00 PM" or "9:00 AM - 9:00 PM"
    const rangePattern = /(\d{1,2}:\d{2}\s*[AP]M)\s*[–\-]\s*(\d{1,2}:\d{2}\s*[AP]M)/gi;
    let match;
    while ((match = rangePattern.exec(timeStr)) !== null) {
      slots.push({
        day,
        open: to24Hour(match[1]),
        close: to24Hour(match[2]),
      });
    }
  }
  return sortSlots(slots);
}

/** Convert structured hours back to legacy string array */
export function structuredHoursToStringArray(slots: StructuredHourSlot[]): string[] {
  return DAYS_OF_WEEK.map((day) => {
    const daySlots = slots.filter((s) => s.day === day);
    if (daySlots.length === 0) return `${day}: Closed`;
    const ranges = daySlots
      .sort((a, b) => a.open.localeCompare(b.open))
      .map((s) => `${to12Hour(s.open)} – ${to12Hour(s.close)}`)
      .join(", ");
    return `${day}: ${ranges}`;
  });
}

/** Check if business is currently open using structured hours */
export function isOpenStructured(slots: StructuredHourSlot[]): boolean | null {
  if (slots.length === 0) return null;
  const now = new Date();
  const days: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[now.getDay()];
  const todaySlots = slots.filter((s) => s.day === today);
  if (todaySlots.length === 0) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const slot of todaySlots) {
    const [oh, om] = slot.open.split(":").map(Number);
    const [ch, cm] = slot.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    if (closeMin > openMin) {
      if (nowMin >= openMin && nowMin <= closeMin) return true;
    } else {
      // Overnight
      if (nowMin >= openMin || nowMin <= closeMin) return true;
    }
  }
  return false;
}
