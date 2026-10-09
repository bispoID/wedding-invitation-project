export interface AdminAlert {
  request_id: string;
  occurred_at: string;
  failure_type: string;
  contingency_status: "pending" | "failed";
}

export function notifyAdmin(alert: AdminAlert): void {
  try {
    console.error("RSVP contingency alert", {
      request_id: alert.request_id,
      occurred_at: alert.occurred_at,
      failure_type: alert.failure_type,
      contingency_status: alert.contingency_status,
    });
  } catch {
    // Logging is best-effort and must not change the RSVP response.
    console.warn(
      "Could not write RSVP contingency alert to Supabase Logs",
    );
  }
}
