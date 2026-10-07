export interface AdminAlert {
  request_id: string;
  occurred_at: string;
  failure_type: string;
  contingency_status: "pending" | "failed";
  email: string;
  name: string;
  companions: number;
}

export function notifyAdmin(alert: AdminAlert): void {
  try {
    console.error("RSVP contingency alert", alert);
  } catch (error) {
    // Logging is best-effort and must not change the RSVP response.
    console.warn(
      "Could not write RSVP contingency alert to Supabase Logs",
      error instanceof Error ? error.message : "Unknown logging error",
    );
  }
}
