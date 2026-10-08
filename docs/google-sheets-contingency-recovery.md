# Google Sheets contingency recovery

The `RSVP` worksheet is a temporary recovery queue, not a second source of
truth. Automated recovery is handled only by the
`admin-recover-contingency` Supabase Edge Function. The administrative browser
must never access Google Sheets or its credentials directly.

## Dashboard listing

The dashboard loads pending rows through the separate
`admin-list-contingency` Edge Function. It verifies the JWT and administrator
UUID, reads the worksheet on the backend, and returns only the request ID,
creation date, name, email, attendance, companions, status, error type, and
sync timestamp. Rows whose status is not `pending` are not returned. The
`attendance` field accepts either `attendance` or `presence` as its worksheet
header.

The browser sends only the `request_id` when it invokes
`admin-recover-contingency`. A conflict or failure leaves the row visible; the
dashboard refreshes the list only after the function confirms successful
reconciliation and removal.

## Automated recovery contract

The administrator submits only a `request_id`, together with the Supabase
Auth JWT. The Edge Function verifies the JWT and checks the user ID against
the backend-only `ADMIN_AUTH_USER_IDS` configuration before creating a
service-role client or accessing Google credentials. The secret contains a
comma-separated list of UUIDs for permitted Supabase Auth users; malformed or
missing configuration fails closed.

The function serializes recoveries for the worksheet with the persisted
`google_sheets_rsvp_recovery` lock. The lock lease is 180 seconds; the function
maximum duration is configured as 120 seconds. Expired locks can be acquired
by a later request, and only the lock owner can release a lock.

For one request:

1. Read the `RSVP` worksheet and map the fields from its header row. The
   attendance field accepts either `attendance` or the existing `presence`
   header name.
2. Require exactly one row with the submitted `request_id` and require its
   status to be `pending`.
3. Trim and lowercase its email. Validate name, email, attendance, and
   companions before writing anything.
4. Query `public.guests` by the normalized email:
   - If no row exists, insert only `name`, `email`, `attendance`, and
     `companions`. PostgreSQL generates the ID and timestamps.
   - If a row exists and its name, attendance, and companions match, reuse
     that persisted row without another insert.
   - If any of those values differ, return a data conflict. Do not insert,
     overwrite, or remove the contingency row.
5. After an insert or a unique-email race, query `public.guests` again and
   confirm that the persisted values match the contingency record.
6. Only after that confirmation, read the worksheet again and locate the
   `request_id` again. Require exactly one matching pending row with unchanged
   data.
7. Delete that row using its freshly read row index and the worksheet's
   `sheetId`.
8. Read the worksheet again and confirm that the `request_id` is absent.

The row is physically removed only after the database record has been
confirmed. If persistence succeeds but the final removal or its verification
fails, the function returns `CLEANUP_PENDING` with `persisted: true` and
`contingency_removed: false`; it does not report complete success.

## Safe retries and conflicts

- `public.guests.email` remains protected by its unique constraint. If a
  concurrent RSVP inserts the same email, recovery re-queries the record and
  proceeds only if its name, attendance, and companions match.
- If the same email has different data, leave the contingency row in place for
  manual review. The recovery function never overwrites a guest.
- If a request is repeated after its row has already been removed, no second
  insert or deletion occurs; the function reports that the request ID was not
  found. A retry after a lost Google delete response first checks whether the
  row is still present before attempting another deletion.
- Missing or duplicate request IDs, a non-pending status, invalid data, an
  occupied lock, or any unconfirmed database result prevent deletion.
- A lost insert response is safe to retry: the next attempt first queries the
  normalized email and confirms matching data before considering cleanup.

## Backend configuration

Configure these values only for the Supabase Edge Functions:

- `ADMIN_AUTH_USER_IDS`: comma-separated UUIDs of the Supabase Auth users
  permitted to access administrative functions, including contingency recovery.
- `ADMIN_ALLOWED_ORIGINS`: comma-separated exact browser origins allowed to
  call the function; do not include paths or wildcard origins.
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: existing service-account JSON secret.
- `GOOGLE_SPREADSHEET_ID`: existing spreadsheet identifier.

The Google service account must have permission to read the spreadsheet and
delete rows from the `RSVP` worksheet. The recovery function verifies the
calling user through Supabase Auth before creating its service-role client or
accessing the Google configuration. `service_role`, the Google service-account
credential, OAuth tokens, and spreadsheet data are never returned to the
browser or logged.

The endpoint requires a JWT and separately checks membership in the
administrator UUID list. CORS is restricted to the configured exact origins;
CORS is not a substitute for JWT and administrator validation.

## Operational limits

The persisted lock serializes recoveries performed through this Edge Function.
It cannot prevent a person or a separate integration from manually inserting,
deleting, or moving rows in Google Sheets while recovery is in progress. The
function re-reads by `request_id` immediately before deletion and verifies the
result afterward, but Google Sheets does not provide a conditional
“delete-by-request_id” operation. Avoid manually rearranging the worksheet
during automated recovery.

The `request_id` is stored in the contingency worksheet, not in
`public.guests`; the normalized email is the idempotency key across the two
systems. Never place service-role keys, Google credentials, or access tokens
in SQL history, browser code, logs, or support notes.
