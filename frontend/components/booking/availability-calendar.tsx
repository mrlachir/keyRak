"use client";

import { DayPicker } from "@daypicker/react";

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function AvailabilityCalendar({ blockedDates }: { blockedDates: string[] }) {
  const today = startOfToday();
  const blocked = blockedDates.map(parseDate);

  return (
    <DayPicker
      className="keyrak-calendar mx-auto"
      defaultMonth={blocked.find((date) => date >= today) ?? today}
      startMonth={new Date(today.getFullYear(), today.getMonth())}
      endMonth={new Date(today.getFullYear() + 2, 11)}
      showOutsideDays
      fixedWeeks
      disabled={[{ before: today }, ...blocked]}
      modifiers={{ blocked }}
      modifiersClassNames={{ blocked: "bg-red-100 text-red-600 line-through" }}
      footer={
        <span className="flex items-center gap-2 text-xs text-sand-700">
          <span className="size-2.5 rounded-full bg-red-300" aria-hidden="true" />
          Red dates are unavailable
        </span>
      }
    />
  );
}
