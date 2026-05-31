import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  todayLocalISO, localISO, daysAgoLocalISO,
  mondayOfLocal, relativeLabel, parseLocalDate,
} from "./date";

describe("localISO", () => {
  it("formats a date as YYYY-MM-DD using local timezone", () => {
    const d = new Date(2024, 2, 5); // March 5 2024 local midnight
    expect(localISO(d)).toBe("2024-03-05");
  });

  it("zero-pads month and day", () => {
    expect(localISO(new Date(2024, 0, 9))).toBe("2024-01-09");
  });
});

describe("todayLocalISO", () => {
  it("returns today in YYYY-MM-DD format (local)", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(todayLocalISO()).toBe(expected);
  });
});

describe("daysAgoLocalISO", () => {
  it("returns 0 days ago == today", () => {
    expect(daysAgoLocalISO(0)).toBe(todayLocalISO());
  });

  it("returns correct date for N days ago", () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    expect(daysAgoLocalISO(7)).toBe(localISO(d));
  });
});

describe("mondayOfLocal", () => {
  it("returns Monday for a Wednesday input", () => {
    const wed = new Date(2024, 0, 10); // Jan 10 2024 is Wednesday
    const monday = mondayOfLocal(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(localISO(monday)).toBe("2024-01-08");
  });

  it("returns Monday for a Sunday input", () => {
    const sun = new Date(2024, 0, 14); // Sunday
    const monday = mondayOfLocal(sun);
    expect(localISO(monday)).toBe("2024-01-08");
  });

  it("returns same Monday for a Monday input", () => {
    const mon = new Date(2024, 0, 8);
    expect(localISO(mondayOfLocal(mon))).toBe("2024-01-08");
  });
});

describe("relativeLabel", () => {
  it("returns 'Today' for today", () => {
    expect(relativeLabel(todayLocalISO())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    expect(relativeLabel(daysAgoLocalISO(1))).toBe("Yesterday");
  });

  it("returns 'N days ago' for recent dates", () => {
    expect(relativeLabel(daysAgoLocalISO(5))).toBe("5 days ago");
  });
});

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD without timezone shift", () => {
    const d = parseLocalDate("2024-03-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("handles full ISO strings by using only the date part", () => {
    const d = parseLocalDate("2024-03-15T12:00:00.000Z");
    expect(d.getDate()).toBe(15);
  });
});
