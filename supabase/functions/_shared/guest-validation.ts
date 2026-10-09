export interface GuestData {
  name: string;
  email: string;
  attendance: boolean;
  companions: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type GuestValidation = { guest: GuestData } | { error: string };

export function validateGuest(value: unknown): GuestValidation {
  if (!isRecord(value)) return { error: "INVALID_NAME" };
  if (
    typeof value.name !== "string" || !value.name.trim() ||
    [...value.name.trim()].length > 200
  ) return { error: "INVALID_NAME" };
  if (typeof value.email !== "string") return { error: "INVALID_EMAIL" };
  const email = value.email.trim().toLowerCase();
  if (
    !email || [...email].length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { error: "INVALID_EMAIL" };
  }
  if (typeof value.attendance !== "boolean") {
    return { error: "INVALID_ATTENDANCE" };
  }
  if (
    typeof value.companions !== "number" ||
    !Number.isInteger(value.companions) ||
    value.companions < 0 || value.companions > 15
  ) return { error: "INVALID_COMPANIONS" };
  return {
    guest: {
      name: value.name.trim(),
      email,
      attendance: value.attendance,
      companions: value.attendance ? value.companions : 0,
    },
  };
}
