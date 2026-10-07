# Hosting, backups and recovery

## Local use

Use Node.js 24 LTS, `npm ci`, `npm run setup` and `npm run dev`. Development listens at **http://localhost:5173** and proxies `/api` and `/media` to the Node server on port 3001. Keep these ports free. The frontend and API must use the configured website origin for form submissions.

For a built local version use `npm run build` and `npm start`, then open **http://localhost:3001**.

## Public hosting

Use a persistent Node.js host or VPS with a writable persistent disk and HTTPS. A frontend-only static host cannot run this backend. A platform that discards its local filesystem can lose the database and uploads.

Set these server environment values, or put them in a private `.env` file:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://your-real-school-domain.example
DATABASE_PATH=/absolute/private/path/school.db
UPLOAD_PATH=/absolute/private/path/uploads
TRUST_PROXY=false
```

`APP_ORIGIN` must match the actual HTTPS website origin exactly, without a path or trailing slash. The production server refuses an HTTP origin. There are no `VITE_` secret values: the browser uses same-origin API requests.

1. Install dependencies with `npm ci` and build with `npm run build`.
2. Run `npm run setup` on the target host to create its database and first administrator.
3. Start `npm start` through your host's process manager.
4. Point your HTTPS reverse proxy at `127.0.0.1:3001`. Keep the Node port private.
5. Back up the database and uploads outside the host as appropriate.
6. Configure confirmed school details and review the initial teacher drafts.

For example, a Caddy reverse-proxy site can forward the domain to `127.0.0.1:3001`. Your domain/DNS and certificate must be configured on that host. Do not invent school domain ownership.

The app trusts the socket address for attempt limits by default. Behind a reverse proxy, set `TRUST_PROXY=true` only if the proxy replaces `X-Forwarded-For` and the Node server cannot be reached directly. Otherwise callers can spoof address-based counters.

## Docker option

`Dockerfile` and `compose.yaml` are provided. Docker was not available in the build workspace, so the container build itself is not part of the verified release checks.

Create a private `.env` in the project folder with `APP_ORIGIN` set to your real HTTPS origin. Compose passes this to the container. Then:

```bash
docker compose build
docker compose run --rm --no-deps school npm run setup
docker compose up -d
```

The Node port binds to the host's loopback address. Put an HTTPS reverse proxy in front of it. Named volumes preserve school data and backups across container rebuilds. Do not remove these volumes when updating the website.

## Backups

```bash
npm run db:backup
```

The script uses SQLite's backup API and copies the uploaded files into a timestamped folder under `backups/`. Uploaded files are immutable and are never physically overwritten when a record is edited. For a fully coordinated snapshot, pause school edits while taking the backup.

For Docker:

```bash
docker compose exec school npm run db:backup
```

Backups contain accounts and private enquiry data. Store them with appropriate access controls and apply your retention rules. Backups are not served by the website and should not be committed to Git.

## Restore a backup

Stop the running server first. Preserve the **entire** current data directory, including any `school.db-wal` / `school.db-shm` files, rather than copying a backup database onto a running database. Start a clean data directory, copy the backup `school.db` and `uploads` folder into the configured locations, then run:

```bash
npm run db:clear-sessions
npm start
```

Clearing sessions prevents old sessions in a restored database from becoming valid again. Existing passwords in the backup are restored; use local password recovery when appropriate. Confirm class content, published media and private inbox access after restoring. Container-volume restores require equivalent stopped-container volume handling by the host administrator.

## Password recovery and staff access

```bash
npm run admin:reset-password
```

Enter the staff email and a new password when prompted. The script updates its password hash and revokes all its sessions. It does not activate a disabled account. Staff with an active administrator account can reactivate accounts in the dashboard.

`npm run setup` will not create another administrator when an active administrator already exists. To add staff, use the Staff accounts page. Never share one administrator account across the entire staff.

## Updating

Back up first, install the locked dependencies with `npm ci`, run the checks, build and restart the process. Preserve the data/upload paths. Schema version 1 is recorded in `schema_migrations`. Future structural changes need explicit migrations; do not replace a populated database with seed/test data.

## Scope

This release is a public school website with a staff content-management portal. It does not integrate a government admissions system, payment provider, student information system, SMTP email delivery, SMS, MFA or automatic data-retention jobs. The school office manages admissions decisions and replies. Such integrations need the school's actual requirements and credentials.
