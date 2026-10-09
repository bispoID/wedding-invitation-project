import { isRecord } from "./guest-validation.ts";

export const EVENT_FIELDS = [
  "bride_name",
  "groom_name",
  "event_date",
  "event_time",
  "city",
  "state",
  "ceremony_name",
  "ceremony_address",
  "ceremony_maps_url",
  "reception_name",
  "reception_address",
  "reception_city",
  "reception_state",
  "reception_maps_url",
] as const;
export type EventField = typeof EVENT_FIELDS[number];
export type EventConfig = Record<EventField, string | null>;

const requiredText: Record<string, number> = {
  bride_name: 200,
  groom_name: 200,
  city: 150,
  state: 100,
  ceremony_name: 200,
};
const optionalText: Record<string, number> = {
  ceremony_address: 500,
  reception_name: 200,
  reception_address: 500,
  reception_city: 150,
  reception_state: 100,
  ceremony_maps_url: 2048,
  reception_maps_url: 2048,
};

export function isHttpsUrl(value: string): boolean {
  if (
    !/^https:\/\/[^/]/i.test(value) || /[\s\\]/.test(value) ||
    /%(?![a-f\d]{2})/i.test(value)
  ) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username &&
      !url.password;
  } catch {
    return false;
  }
}

export function validateEventConfig(
  value: unknown,
): { config: EventConfig } | { error: string; field?: string } {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) =>
      !EVENT_FIELDS.includes(key as EventField)
    ) ||
    EVENT_FIELDS.some((field) => !Object.hasOwn(value, field))
  ) {
    return { error: "INVALID_EVENT_CONFIG" };
  }
  const config = {} as EventConfig;
  for (const field of EVENT_FIELDS) {
    const raw = value[field];
    if (raw === null && field in optionalText) {
      config[field] = null;
      continue;
    }
    if (typeof raw !== "string") {
      return { error: "INVALID_EVENT_CONFIG", field };
    }
    const normalized = raw.trim();
    const limit = requiredText[field] ?? optionalText[field];
    if (
      limit &&
      ([...normalized].length > limit || (!normalized && field in requiredText))
    ) {
      return { error: "INVALID_EVENT_CONFIG", field };
    }
    config[field] = !normalized && field in optionalText ? null : normalized;
  }
  const date = config.event_date!;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000") ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    return { error: "INVALID_EVENT_CONFIG", field: "event_date" };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(config.event_time!)) {
    return { error: "INVALID_EVENT_CONFIG", field: "event_time" };
  }
  config.event_time = config.event_time!.slice(0, 5);
  for (const field of ["ceremony_maps_url", "reception_maps_url"] as const) {
    if (config[field] && !isHttpsUrl(config[field])) {
      return { error: "INVALID_EVENT_CONFIG", field };
    }
  }
  if (config.reception_address && !config.reception_name) {
    return { error: "INVALID_EVENT_CONFIG", field: "reception_name" };
  }
  return { config };
}

export function eventDto(row: Record<string, unknown>): EventConfig {
  const candidate = Object.fromEntries(
    EVENT_FIELDS.map((field) => [field, row[field]]),
  );
  const parsed = validateEventConfig(candidate);
  if ("error" in parsed) throw new Error("INVALID_STORED_EVENT_CONFIG");
  return parsed.config;
}
