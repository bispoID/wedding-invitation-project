import {
  appendContingencyRsvp,
  type ContingencyRsvp,
} from "../_shared/google-sheets.ts";

export type { ContingencyRsvp };

/** Compatibilidade histórica: o provider compartilhado concentra a seleção. */
export function saveToGoogleSheets(rsvp: ContingencyRsvp): Promise<void> {
  return appendContingencyRsvp(rsvp);
}
