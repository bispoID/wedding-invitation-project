// Keep these rules equivalent to backend _shared/guest-validation.ts.
export function validateGuest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'INVALID_NAME' };
  if (typeof value.name !== 'string' || !value.name.trim() || [...value.name.trim()].length > 200) return { error: 'INVALID_NAME' };
  if (typeof value.email !== 'string') return { error: 'INVALID_EMAIL' };
  const email = value.email.trim().toLowerCase();
  if (!email || [...email].length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'INVALID_EMAIL' };
  if (typeof value.attendance !== 'boolean') return { error: 'INVALID_ATTENDANCE' };
  if (!Number.isInteger(value.companions) || value.companions < 0 || value.companions > 15) return { error: 'INVALID_COMPANIONS' };
  return { guest: { name: value.name.trim(), email, attendance: value.attendance, companions: value.attendance ? value.companions : 0 } };
}
