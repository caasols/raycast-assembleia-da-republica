import { describe, it, expect } from "vitest";
import { displayDate, formatVoteDate, todayInLisbon, PARLIAMENT_TIME_ZONE } from "./dates";

describe("todayInLisbon", () => {
  it("formats as the AAAA-MM-DD the API expects", () => {
    expect(todayInLisbon(new Date("2026-08-18T12:00:00Z"))).toBe("2026-08-18");
  });

  it("zero-pads month and day", () => {
    expect(todayInLisbon(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });

  it("uses Lisbon's day, not UTC's, during summer time", () => {
    // 23:30 UTC on the 18th is 00:30 on the 19th in Lisbon (WEST, UTC+1).
    // Reading UTC here would show the wrong sitting day.
    expect(todayInLisbon(new Date("2026-08-18T23:30:00Z"))).toBe("2026-08-19");
  });

  it("agrees with UTC in winter, when Lisbon is at UTC+0", () => {
    expect(todayInLisbon(new Date("2026-01-18T23:30:00Z"))).toBe("2026-01-18");
  });

  it("gives Lisbon's date for a user whose own clock is on another day", () => {
    // 02:00 UTC is still the 17th in São Paulo; parliament's day is the 18th.
    expect(todayInLisbon(new Date("2026-08-18T02:00:00Z"))).toBe("2026-08-18");
  });

  it("defaults to now when given no instant", () => {
    expect(todayInLisbon()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("names the zone parliament actually sits in", () => {
    expect(PARLIAMENT_TIME_ZONE).toBe("Europe/Lisbon");
  });
});

describe("formatVoteDate", () => {
  it("renders an openAR date in English", () => {
    expect(formatVoteDate("2026-08-18")).toBe("18 August 2026");
  });

  it("does not shift the date across a timezone boundary", () => {
    // Parsed as UTC midnight; a local-time parse could render this as the 31st.
    expect(formatVoteDate("2026-01-01")).toBe("1 January 2026");
  });

  it("returns null for a missing date rather than inventing one", () => {
    expect(formatVoteDate(null)).toBeNull();
    expect(formatVoteDate("")).toBeNull();
  });

  it("returns null for an unparseable date rather than 'Invalid Date'", () => {
    expect(formatVoteDate("not-a-date")).toBeNull();
  });
});

describe("displayDate", () => {
  it("formats a valid date", () => {
    expect(displayDate("2026-08-18")).toBe("18 August 2026");
  });

  it("falls back to the raw value rather than rendering nothing", () => {
    // A view needs a string unconditionally; showing the raw date beats
    // "no votes on null".
    expect(displayDate("not-a-date")).toBe("not-a-date");
  });
});
