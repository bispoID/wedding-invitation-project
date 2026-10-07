# Google Sheets contingency recovery

The `RSVP` worksheet is a temporary recovery queue, not a second source of
truth. A row is synchronized only after its RSVP has been confirmed in
`public.guests` in Supabase.

## Review pending rows

1. Open the contingency spreadsheet and select the `RSVP` worksheet.
2. Find rows whose `status` is `pending`. Do not delete pending rows.
3. For each row, record and verify its `request_id`, name, email, attendance,
   and companions. Treat these fields as personal data and use only approved
   administrator access.
4. Use `request_id` to trace the contingency row in operational records. The
   current `public.guests` table does not contain a `request_id` column;
   therefore, use the normalized email to check for an existing RSVP in
   Supabase. The email has a uniqueness constraint.

## Synchronize one RSVP

1. Query `public.guests` for the row's email before inserting anything.
2. If a matching RSVP already exists, compare its name, attendance, and
   companions with the pending row:
   - If the values match, do not insert a duplicate. Confirm the existing
     record is persisted, then mark the contingency row `synced`.
   - If the values differ, do not overwrite the RSVP or insert another row.
     Leave the contingency row `pending` and escalate the conflict for
     administrator review.
3. If no RSVP exists, insert the values into `public.guests` using the
   project's authorized administrative procedure (for example, the Supabase
   Dashboard Table Editor or SQL Editor with an authorized administrator
   account). Insert only `name`, normalized `email`, `attendance`, and
   `companions`; let the database generate its ID and timestamps.
4. Query `public.guests` again by email and confirm the inserted values have
   persisted. A successful insert response alone is not a substitute for this
   confirmation.
5. Only after confirming persistence, update the same spreadsheet row:
   - `status`: `synced`
   - `synced_at`: the synchronization time in ISO 8601 UTC format, for example
     `2026-10-07T01:15:17.503Z`
6. Keep the row in the sheet for audit and traceability; do not delete it after
   synchronization.

Never mark a row `synced` before confirming the Supabase record. If insertion
or verification fails, leave it `pending` for another attempt. Use `error` only
for a definitive issue that requires investigation, and record the reason in
`error_type` without putting credentials or Secrets in the sheet.

## Safe retry and deduplication

- Check Supabase by normalized email before every retry. A previous attempt may
  have succeeded even if its response was lost.
- Do not create a second RSVP when the email already exists.
- If a concurrent insert races with recovery, the unique email constraint
  prevents a duplicate. Re-query and compare the existing record before
  updating the contingency row.
- Keep `request_id` with any support or incident note so the pending row can
  be traced even though it is not stored in `public.guests`.
- Never place service-role keys, Google private keys, access tokens, or other
  Secrets in SQL history, logs, support notes, or the spreadsheet.
