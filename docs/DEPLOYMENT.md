# Deploying to Coolify (individual services)

Guide for deploying VCT Fantasy to a self-hosted Coolify instance by creating each of the 4 services as its own Coolify resource. This gives you independent deploy cycles, clearer logs, and easier scaling/swapping of individual pieces.

All four services live in the **same Coolify project** so they share the internal Docker network and can reach each other by service name.

---

## Service architecture

| Service      | Coolify resource type       | Build source                          | Public?         |
|--------------|-----------------------------|---------------------------------------|-----------------|
| `db`         | **Database** → PostgreSQL   | Coolify-managed                       | Internal only   |
| `vlrapi`     | **Application** → Dockerfile | `vlr-scraper/Dockerfile` in your repo | Internal only   |
| `web`        | **Application** → Dockerfile | `Dockerfile.web` in your repo         | **Public** (domain) |
| `backup`     | **Scheduled Task**          | Command against `db`                  | Internal only   |

---

## 1. Prerequisites

- Coolify 4.x running on your target server.
- Your repo pushed to a git remote (GitHub recommended — `https://github.com/liamdatt/VCT.git`).
- A domain pointing at your Coolify server (e.g. `vctfantasy.yourdomain.com`).
- Your Discord app already created at https://discord.com/developers/applications.
- A Discord webhook URL for your league channel.

---

## 2. Add production redirect URI to Discord

In Discord Dev Portal → your app → **OAuth2** → **Redirects**, add (keep the local one):

```
https://<your-domain>/api/auth/callback/discord
```

Save changes.

---

## 3. Create the Coolify project

1. Coolify dashboard → **+ New Project** → name it `vctfantasy`.
2. Pick the server you want to deploy to.
3. **All four services below live inside this project.** Services in the same project share the same Docker network, so `web` can reach `db` at hostname `db` and `vlrapi` at hostname `vlrapi` automatically.

> **Heads-up on internal hostnames:** Coolify assigns each application/service a network hostname. Sometimes it uses the raw name you gave it (e.g. `vlrapi`); other times it includes a random suffix (e.g. `vlrapi-abc123`). After creating each service, look at its **Connection / Internal URL** field in the service dashboard and **note the exact hostname** — you'll need it when setting `DATABASE_URL` and `VLRAPI_BASE_URL`.

---

## 4. Create the `db` service (PostgreSQL)

1. Inside the project → **+ New Resource** → **Databases** → **PostgreSQL**.
2. Version: **16**.
3. Name: `vctfantasy-db` (or just `db` — Coolify will show the internal hostname afterward).
4. **Credentials** (Coolify generates these; override if you want):
   - `POSTGRES_USER`: `vct`
   - `POSTGRES_PASSWORD`: generate strong (`openssl rand -base64 24`)
   - `POSTGRES_DB`: `vctfantasy`
5. **Persistent storage**: keep enabled. Coolify auto-creates a volume.
6. Click **Deploy**.

Wait for it to be "Running" and "Healthy."

### Copy the connection string

From the db service dashboard, copy the **Internal Connection URL**. It will look like:

```
postgresql://vct:<password>@vctfantasy-db-abc123:5432/vctfantasy
```

Save this — you'll paste it into `DATABASE_URL` for both `web` and `backup`.

---

## 5. Create the `vlrapi` service (Application)

1. Inside the project → **+ New Resource** → **Application** → **Public Repository** (or Private if you connected GitHub).
2. **Repository URL**: `https://github.com/liamdatt/VCT.git`
3. **Branch**: `main` (or whichever you pushed to).
4. **Build Pack**: **Dockerfile**.
5. **Base Directory**: `/vlr-scraper` — this tells Coolify the Dockerfile and build context are inside that folder.
6. **Dockerfile location**: `Dockerfile` (relative to base directory).
7. Name: `vlrapi`.
8. **Network**: confirm it's in the `vctfantasy` project.

### Config

- **Exposed port**: `8000`
- **Domain**: leave blank (internal only).
- **Environment variables**: none.
- **DNS** (needed because vlr.gg doesn't resolve in some Docker defaults): under the service's **Advanced** → **Custom Docker Options**, add:
  ```
  --dns=8.8.8.8 --dns=1.1.1.1
  ```
  (If Coolify doesn't expose custom Docker options, the default DNS usually works on most Linux hosts. If the container can't resolve vlr.gg, come back and add this.)

### Deploy

Click **Deploy**. First build takes ~2 minutes (Python + BeautifulSoup install).

### Note the internal hostname

Once running, check the service dashboard for the internal hostname. It'll look like `vlrapi` or `vlrapi-xyz789`. Save this — you'll use it for `VLRAPI_BASE_URL`.

Verify it works: from Coolify's terminal for the vlrapi service, run:

```sh
curl http://localhost:8000/health
```

Should return `{"status":"ok"}`.

---

## 6. Create the `web` service (Application)

1. **+ New Resource** → **Application** → **Public Repository**.
2. **Repository URL**: `https://github.com/liamdatt/VCT.git`
3. **Branch**: `main`.
4. **Build Pack**: **Dockerfile**.
5. **Base Directory**: `/` (repo root).
6. **Dockerfile location**: `Dockerfile.web`.
7. Name: `web`.

### Config

- **Exposed port**: `3000`
- **Domain**: `https://<your-domain>` — Coolify auto-provisions TLS via Let's Encrypt.
- **Auto-deploy on push**: toggle ON if you want every `git push` to redeploy.

### Environment variables

Paste these into the service's **Environment Variables** tab (replace placeholders with your actual values):

```
DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@<db-internal-hostname>:5432/vctfantasy?schema=public
NEXTAUTH_URL=https://<your-domain>
NEXTAUTH_SECRET=<openssl rand -base64 32>
AUTH_SECRET=<same value as NEXTAUTH_SECRET>
DISCORD_CLIENT_ID=<from Discord dev portal>
DISCORD_CLIENT_SECRET=<from Discord dev portal>
DISCORD_WEBHOOK_URL=<your league channel webhook URL>
VLRAPI_BASE_URL=http://<vlrapi-internal-hostname>:8000
APP_TIMEZONE=America/Jamaica
```

**Critical:**
- `DATABASE_URL` hostname must match the exact internal hostname of the db service you noted in step 4.
- `VLRAPI_BASE_URL` hostname must match the exact internal hostname of the vlrapi service from step 5.
- `AUTH_SECRET` **must equal** `NEXTAUTH_SECRET`. NextAuth v5 prefers `AUTH_SECRET`.
- Do NOT reuse your local dev secret — generate fresh.

### Deploy

Click **Deploy**. First build ~5-10 minutes (Node install + Prisma generate + Next build).

On boot the container auto-runs `npx prisma migrate deploy` before starting the Next server — watch the logs for:

```
All migrations have been successfully applied.
```

Visit `https://<your-domain>` — you should see the VCT Fantasy splash.

---

## 7. Create the `backup` service (Scheduled Task)

Coolify has a native "Scheduled Task" resource that runs a command on a cron.

1. Inside the project → **+ New Resource** → **Scheduled Task**.
2. Name: `pg-backup`.
3. **Schedule** (cron): `0 3 * * *` (daily 3 AM — adjust to your timezone).
4. **Image**: `postgres:16-alpine`
5. **Command**:
   ```sh
   sh -c 'TS=$(date -u +%Y-%m-%dT%H-%M-%SZ); pg_dump "$DATABASE_URL" | gzip > /backups/vctfantasy-${TS}.sql.gz && ls -1t /backups/vctfantasy-*.sql.gz | tail -n +15 | xargs -r rm --'
   ```
6. **Environment variables**:
   ```
   DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@<db-internal-hostname>:5432/vctfantasy?schema=public
   ```
7. **Volume**: add a named volume `backups` mounted at `/backups`.

Save. Coolify will invoke this every day.

**Alternative (simpler):** skip the backup service entirely and rely on Coolify's own database backup feature. On the `db` service dashboard, go to **Backups** tab → enable daily backups. Coolify handles the `pg_dump` for you and stores it in its own storage.

---

## 8. First-time seed

After `web` is running and migrations have applied, run the one-time Stage 1 seed.

In Coolify, open the `web` service → **Terminal** tab. You get a shell inside the running container.

```sh
WORKER_DISABLED=1 npx tsx scripts/seed-stage1.ts
```

Expected tail:

```
[seed] populated MatchRoster for N matches
[seed] recomputed all snapshots from MatchRoster
[seed] validating manager totals
[seed]   FAIL  ...
[seed] WARNING: some totals diverge from spreadsheet ...
[seed] Stage 1 bootstrap complete
```

The "FAIL" validation warnings are expected — reconcile per-match via the admin audit page.

**Do NOT re-run seed:stage1 casually** — it wipes and re-seeds the league.

---

## 9. First sign-in

Visit `https://<your-domain>` → click **Sign in with Discord** → authorize → land on `/leagues`.

If sign-in fails:
- Verify Discord redirect URI (step 2) matches exactly — `https://`, no trailing slash.
- Verify `NEXTAUTH_URL` is `https://<your-domain>` with no trailing slash.
- Verify `AUTH_SECRET` and `NEXTAUTH_SECRET` are identical.

If you land but see "not in any leagues," there may be an orphan user from a pre-seed sign-in. From the web service terminal:

```sh
npx tsx -e "
import 'dotenv/config';
import { db } from './src/lib/db';
(async () => {
  const users = await db.user.findMany({ include: { memberships: true } });
  for (const u of users) console.log(u.discordId, u.username, u.memberships.length);
})().finally(() => db.\$disconnect());
"
```

Delete any user with 0 memberships and a long numeric `discordId`:

```sh
npx tsx -e "
import 'dotenv/config';
import { db } from './src/lib/db';
(async () => {
  await db.user.delete({ where: { discordId: '<the-orphan-snowflake>' } });
  console.log('deleted');
})().finally(() => db.\$disconnect());
"
```

Then sign in again. The auth callback will migrate your seeded username-based record to the real Discord snowflake.

---

## 10. Subsequent deploys

Push to `main`:

```bash
git push origin main
```

If auto-deploy is on, Coolify detects the push and rebuilds **only the services whose source changed** — for UI-only changes, only `web` rebuilds; `vlrapi` and `db` are untouched.

Otherwise click **Redeploy** on the specific service(s) that changed.

Prisma migrations apply automatically on `web` boot via `prisma migrate deploy`.

---

## 11. Env var checklist (for copy-paste)

### db (Coolify-managed, auto-generates)

```
POSTGRES_USER=vct
POSTGRES_PASSWORD=<strong random>
POSTGRES_DB=vctfantasy
```

### vlrapi

No env vars required.

### web

```
DATABASE_URL=postgresql://vct:<password>@<db-internal-hostname>:5432/vctfantasy?schema=public
NEXTAUTH_URL=https://<your-domain>
NEXTAUTH_SECRET=<openssl rand -base64 32>
AUTH_SECRET=<same as NEXTAUTH_SECRET>
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_WEBHOOK_URL=
VLRAPI_BASE_URL=http://<vlrapi-internal-hostname>:8000
APP_TIMEZONE=America/Jamaica
```

### backup (if using custom scheduled task)

```
DATABASE_URL=postgresql://vct:<password>@<db-internal-hostname>:5432/vctfantasy?schema=public
```

---

## 12. Troubleshooting

### `web` can't reach `db`

- Double-check the `<db-internal-hostname>` in `DATABASE_URL` matches exactly what Coolify shows under the db service → **Connection URL**.
- Confirm both services are in the **same project** — services across projects don't share the network.
- Restart the `web` service after env var changes.

### `web` can't reach `vlrapi`

Same as above but for the vlrapi hostname. Test from the web container's terminal:

```sh
curl -v http://<vlrapi-internal-hostname>:8000/health
```

Expect `{"status":"ok"}`.

### `vlrapi` 502 / DNS errors when scraping vlr.gg

Add `--dns=8.8.8.8 --dns=1.1.1.1` to the vlrapi service's Docker options. Some hosts use a default Docker DNS that can't resolve external names.

### `Sign in with Discord` bounces back to `/`

- Discord redirect URIs must include `https://<your-domain>/api/auth/callback/discord` verbatim.
- `NEXTAUTH_URL` no trailing slash.
- `AUTH_SECRET === NEXTAUTH_SECRET`.

### Scoring worker seems stuck

Check the `web` service logs for `[worker]` lines. If silent, `WORKER_DISABLED` may be set — remove it from env vars and redeploy. If there are errors, usually `vlrapi` is unreachable (see previous).

---

Done. 🚀
