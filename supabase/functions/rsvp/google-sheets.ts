import {
  appendContingencyRsvp,
  type ContingencyRsvp,
} from "../_shared/google-sheets.ts";

export type { ContingencyRsvp };

export function saveToGoogleSheets(rsvp: ContingencyRsvp): Promise<void> {
  return appendContingencyRsvp(rsvp);
}
