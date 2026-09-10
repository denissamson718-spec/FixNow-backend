# Deploy FixNow backend to Render

The repository includes `render.yaml` for this backend. Nothing has been deployed to your Render account yet. Use either the Blueprint method or the manual method below, not both.

## Before deploying

This backend uses a JSON database and uploaded files, not PostgreSQL or MongoDB. Use a **paid web service plus a persistent disk**. Free Render services lose local changes across restarts/deployments and block common SMTP ports. See [persistent disks](https://render.com/docs/disks) and [free limitations](https://render.com/docs/free).

**Public launch blockers:** the existing application stores passwords in plain text, has no server-side session/token authorization on account/admin operations, and serves uploaded identity documents publicly. These require application security changes before collecting real user data. Deploy with synthetic test data only until fixed. Payments and other existing demo behavior do not become real payment integrations by hosting the API.

1. Put the project in a private GitHub repository accessible to Render. Include the backend source, `backend/package.json`, `backend/package-lock.json`, and root `render.yaml`.
2. Exclude `.env`, `backend/.env`, `node_modules`, and `backend/data`. The ignore rules now cover runtime data. If those files were already tracked, `.gitignore` does not untrack them: remove them from tracking before pushing. If secrets were previously published, rotate them.
3. Have your SMTP provider's host, port, username, password and verified sender ready. Keep the password in Render, never in source control.
4. This deployment starts with an empty database. It does not copy local accounts/documents. Preserve a private backup of `backend/data` if you need a later controlled migration.

## Option A: Blueprint (fewest clicks)

1. Sign in at [Render Dashboard](https://dashboard.render.com/).
2. Click **New + → Blueprint**.
3. Connect GitHub and grant access to the repository. Select **Connect** next to it.
4. Select the branch containing these changes. Use `render.yaml` as the Blueprint path if asked.
5. Give the Blueprint a name, for example `fixnow`.
6. Enter values for `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. The file defaults to port 587 with STARTTLS (`SMTP_SECURE=false`); edit those settings if your provider requires otherwise.
7. Review the paid service and 1 GB disk charges displayed by Render, then click **Deploy Blueprint** (or **Apply**, depending on the screen).
8. Open `fixnow-backend` and watch **Events / Logs** until the deploy is Live.
9. Copy the actual HTTPS service URL shown by Render. The name may have a suffix; do not assume the example URL is yours.

The Blueprint creates one Node service in Frankfurt with a disk mounted at `/var/data`. [Blueprint reference](https://render.com/docs/blueprint-spec).

## Option B: Manual Web Service setup

1. Click **New + → Web Service**.
2. Choose the Git provider, authorize repository access, and connect your FixNow repository.
3. Enter these settings:

| Render field | Value |
| --- | --- |
| Name | `fixnow-backend` (or an available name) |
| Branch | Your branch containing the prepared changes |
| Region | Frankfurt (or your chosen region) |
| Language / Runtime | Node |
| Root Directory | `backend` |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | Paid 0.5 CPU / 512 MB or larger |
| Health Check Path (Advanced) | `/api/health` |

4. Add the environment variables below.
5. Under **Advanced → Add Disk**, set name `fixnow-data`, mount path `/var/data`, size `1 GB`. If the creation screen does not show disk controls, create the service, then go to **Disks → Add Disk** and attach it before testing or adding accounts. Redeploy after attaching.
6. Click **Deploy Web Service / Create Web Service**. Inspect Events and Logs until Live.
7. Keep one instance and one Node process. This file database is not suitable for multiple instances or clustered workers.

[Render's web service instructions](https://render.com/docs/web-services).

## Environment variables

Open the service → **Environment → Add Environment Variable**, then **Save, rebuild, and deploy** (or the save/deploy option shown).

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `DATA_DIR` | `/var/data/fixnow` |
| `APP_NAME` | `FixNow` |
| `ALLOW_RESET_LINK_FALLBACK` | `false` |
| `SMTP_HOST` | Your provider's SMTP hostname |
| `SMTP_PORT` | `587` for STARTTLS, or provider's specified port |
| `SMTP_SECURE` | `false` for 587; `true` for 465 |
| `SMTP_USER` | Your SMTP login |
| `SMTP_PASS` | Your SMTP password / app password |
| `SMTP_FROM` | `FixNow <your-verified-sender@example.com>` |
| `PUBLIC_BASE_URL` | Optional: actual HTTPS backend URL; set this if using a custom domain |
| `ADMIN_WEB_URL` | Optional: deployed admin frontend URL |

Do not enter quotes around dashboard values. Do not set `PORT`: Render supplies it. No `DATABASE_URL` is needed. Render automatically supplies `RENDER_EXTERNAL_URL`, which the backend uses for emailed reset links when `PUBLIC_BASE_URL` is unset.

For Gmail, use `smtp.gmail.com`, port `587`, secure `false`, your full Gmail address, and an app password if your account supports one. Use that same address in `SMTP_FROM`. A normal account password may not work. Other SMTP providers should supply their own exact values.

## Connect the mobile app

1. In the project root `.env`, set:

   ```dotenv
   EXPO_PUBLIC_BACKEND_URL=https://YOUR-ACTUAL-SERVICE.onrender.com
   ```

2. Use the actual Render URL, without `/api` and without `:4010`.
3. Restart Expo with `npx expo start --clear`. Test from a phone using mobile data to confirm it no longer depends on your computer.
4. Before making an APK, set `EXPO_PUBLIC_BACKEND_URL` to the same URL in the EAS `preview` environment using your Expo project's environment variable settings. For production builds, set it in the production environment too. Rebuild with your existing APK build workflow. The old hardcoded preview LAN override has been removed from `eas.json`.
5. Install the newly built APK. An already installed APK does not automatically pick up a changed backend URL.

## Admin dashboard

Deploying this backend does not deploy `web/`. Until an admin frontend is hosted, you can keep running it locally. Change the `/api` proxy `target` in `web/vite.config.ts` to the actual HTTPS Render backend URL, then restart `cd web && npm run dev`.

For a separately hosted dashboard, it needs a production `/api` proxy or configurable API base URL; Vite's development proxy is not included in the built frontend. Set `ADMIN_WEB_URL` only after that frontend works. This variable controls the backend's `/admin` redirect; it does not host or configure the frontend itself.

## Verify the deployment

1. Open `https://YOUR-ACTUAL-SERVICE.onrender.com/api/health`: expect `{"ok":true}`.
2. Open the service root `/`: expect the FixNow backend JSON response.
3. Register a synthetic driver in the app and log in again.
4. Register a synthetic mechanic with dummy credential files; confirm the admin dashboard can display the uploads and approve the mechanic.
5. Exercise a service request and offer from driver/mechanic accounts.
6. Request a password reset for an email inbox you control. Confirm the email arrives, its link uses the Render HTTPS URL, and the new password works. SMTP delivery has to be checked with your real credentials.
7. Use **Manual Deploy → Deploy latest commit**, then repeat login and upload viewing. Records and files must survive redeployment. If they disappear, verify both the disk mount and `DATA_DIR` immediately.

## Operating notes and troubleshooting

- Build cannot find package.json: Root Directory must be `backend`, not `backend/src`.
- No open port: check start logs; start command is `npm start`. The server binds to `0.0.0.0` and Render's `PORT`.
- Mobile network error: check the HTTPS URL, remove `/api` suffix, restart Expo or rebuild the APK.
- Reset email fails: inspect logs and verify SMTP credentials, sender and port. Free instances block common SMTP ports; returning reset links is disabled in production intentionally.
- `/admin` gives 404: the frontend is hosted separately; configure `ADMIN_WEB_URL` after hosting it.
- Existing local users missing: the persistent disk starts empty. Local data is not automatically imported.
- Take private backups of the entire data directory, including uploads. Keep backups outside the service and verify restores. Disk-backed services have deployment downtime; plan updates accordingly.
- Growing usage: migrate to a managed database and private object storage before horizontal scaling. A disk keeps files across redeploys but does not solve authorization, concurrency, or backup strategy.

Prepared against Render's documentation on September 10, 2026. Actual account pricing and UI labels may differ; review the displayed charges before deploying.
