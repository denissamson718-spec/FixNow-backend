# FixNow on Supabase

The backend uses PostgreSQL whenever `DATABASE_URL` is configured. Without it,
it continues to use the existing JSON file. An invalid configured connection
stops startup; it never silently switches back to JSON.

## View your records

Open the Supabase project, select **Table Editor**, and choose schema **public**.
The tables are `fixnow_accounts`, `fixnow_service_requests`, `fixnow_offers`,
`fixnow_ratings`, `fixnow_payments`, and `fixnow_password_reset_tokens`.
Each record retains its existing fields in the `data` JSONB column. Account
name/email/role and request issue/status also have readable generated columns.
Those generated columns are read-only; changes belong in `data`.

RLS is enabled without public client policies and access is revoked from the
`anon` and `authenticated` roles. Use the existing Express API for app requests.
Do not expose the database password in the Expo or Vite environment. The database
owner can browse records in Table Editor. The private revision table protects
backend writes against concurrent stale updates; conflicts return HTTP 409.

## Connection and first import

In `backend/.env`, set `DATABASE_URL` to the project's Session pooler connection
string. Replace the entire password placeholder, including its square brackets,
and percent-encode reserved characters in the password. The bundled public
Supabase CA certificate allows verified TLS. To use another trusted CA, set
`DATABASE_SSL_CA_FILE` to its path (relative to backend/ or absolute).

From backend/:

```sh
npm ci
npm test
npm run db:check
npm run db:import -- data/render-before-supabase.json
npm start
```

`db:check` creates missing tables and prints counts, never record contents.
`db:import` accepts an optional JSON file; without one it reads the existing local
JSON database. It refuses to import into nonempty tables and never overwrites its
source. Schema setup and writes use transactions. Keep JSON backups private.

The Render snapshot is a point-in-time export of the five public API collections;
reset tokens are intentionally not copied. Uploaded documents remain on their
original file server. The original local JSON database is not changed.

## Make the live Render backend save future records here

1. Deploy this backend code and package-lock.json to the existing Render service.
2. In Render's Environment settings, add the same `DATABASE_URL` as backend/.env.
   A local .env file is not automatically transferred to Render.
3. Restart/deploy and open `/api/health`. It must return `storage: "postgres"`.
4. Keep mobile and dashboard pointed at the existing Render URL.

Until this deployment and environment change, Render continues writing its old
JSON file; importing a snapshot does not synchronize future changes. Pause writes
while taking a final snapshot for cutover. If data has changed since the import,
reconcile records by ID before cutover; do not clear tables or blindly re-import.

## Current design limits

This is a compatibility migration preserving the existing data model. It reads
collections for current controllers and uses a global revision for stale-write
protection; it is not yet optimized for a large/high-traffic database. Database
schema constraints do not replace the existing API's validation or authorization.
Existing account/password handling is unchanged. Uploaded documents still need
persistent backend storage; this change does not move files to Supabase Storage.

Connection reference: https://supabase.com/docs/guides/database/connecting-to-postgres
TLS reference: https://node-postgres.com/features/ssl
