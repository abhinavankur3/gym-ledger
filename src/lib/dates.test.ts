import { describe, expect, it } from "vitest";
import { localDateKey, localDateKeyDaysAgo, localWeekday, startOfLocalDayIso, startOfLocalWeekIso } from "./dates";

describe("startOfLocalDayIso", () => {
  it("handles a fixed-offset zone (Asia/Kolkata, +05:30)", () => {
    expect(startOfLocalDayIso(new Date("2026-10-03T10:00:00Z"), "Asia/Kolkata")).toBe("2026-10-02T18:30:00.000Z");
    // 01:00 IST on Oct 3 is still Oct 2 in UTC
    expect(startOfLocalDayIso(new Date("2026-10-02T19:30:00Z"), "Asia/Kolkata")).toBe("2026-10-02T18:30:00.000Z");
  });

  it("uses the offset at midnight on DST change days (America/New_York)", () => {
    // Spring forward 2026-03-08: midnight is still EST (-05:00)
    expect(startOfLocalDayIso(new Date("2026-03-08T20:00:00Z"), "America/New_York")).toBe("2026-03-08T05:00:00.000Z");
    // Fall back 2026-11-01: midnight is still EDT (-04:00)
    expect(startOfLocalDayIso(new Date("2026-11-01T20:00:00Z"), "America/New_York")).toBe("2026-11-01T04:00:00.000Z");
  });

  it("is UTC midnight for UTC", () => {
    expect(startOfLocalDayIso(new Date("2026-10-03T23:59:00Z"), "UTC")).toBe("2026-10-03T00:00:00.000Z");
  });
});

describe("startOfLocalWeekIso", () => {
  it("returns Monday's local midnight", () => {
    // Saturday 2026-10-03 → Monday 2026-09-28
    expect(startOfLocalWeekIso(new Date("2026-10-03T10:00:00Z"), "Asia/Kolkata")).toBe("2026-09-27T18:30:00.000Z");
  });

  it("is Monday itself on a Monday", () => {
    expect(startOfLocalWeekIso(new Date("2026-09-28T12:00:00Z"), "UTC")).toBe("2026-09-28T00:00:00.000Z");
  });

  it("crosses a DST change without skipping a day", () => {
    // Wednesday 2026-03-11 (EDT) → Monday 2026-03-09 midnight EDT (-04:00)
    expect(startOfLocalWeekIso(new Date("2026-03-11T15:00:00Z"), "America/New_York")).toBe("2026-03-09T04:00:00.000Z");
  });
});

describe("local calendar helpers", () => {
  it("localWeekday is 0 = Monday … 6 = Sunday in the user's zone", () => {
    expect(localWeekday(new Date("2026-09-28T12:00:00Z"), "UTC")).toBe(0);
    // Sunday 23:30 UTC is already Monday in Kolkata
    expect(localWeekday(new Date("2026-10-04T19:00:00Z"), "Asia/Kolkata")).toBe(0);
    expect(localWeekday(new Date("2026-10-04T12:00:00Z"), "UTC")).toBe(6);
  });

  it("localDateKey uses the local date", () => {
    expect(localDateKey("2026-10-02T19:30:00Z", "Asia/Kolkata")).toBe("2026-10-03");
    expect(localDateKey(new Date("2026-10-02T19:30:00Z"), "UTC")).toBe("2026-10-02");
  });

  it("localDateKeyDaysAgo steps by calendar days across DST", () => {
    expect(localDateKeyDaysAgo(new Date("2026-03-09T12:00:00Z"), 1, "America/New_York")).toBe("2026-03-08");
    expect(localDateKeyDaysAgo(new Date("2026-03-09T12:00:00Z"), 6, "America/New_York")).toBe("2026-03-03");
  });
});
