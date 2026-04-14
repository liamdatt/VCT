# Deploying to Coolify

Guide for deploying VCT Fantasy to a self-hosted Coolify instance (Raspberry Pi or any Linux host). Follow top to bottom on first deploy. For subsequent deploys, only sections **10** (push to trigger) apply.

---

## What's running in production

Three Docker services orchestrated by `docker-compose.prod.yml`:

| Service  | Image/build                          | Purpose                          |
|----------|--------------------------------------|----------------------------------|
| `web`    | Built from `Dockerfile.web`          | Next.js app + scoring worker + SSE |
| `vlrapi` | Built from `vlr-scraper/Dockerfile`  | Custom vlr.gg BS4 scraper with cache |
| `db`     | `postgres:16-alpine`                 | Database                         |
| `backup` | `postgres:16-alpine` + cron script   | Daily `pg_dump` to a volume      |

All four communicate over Coolify's internal Docker network. Only `web` is exposed to the outside world.

---

## 1. Prerequisites

- **Coolify 4.x** installed on your target server (Pi, VPS, etc.). If you don't have it, install it first: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`.
- **A git remote** the Coolify server can pull from. GitHub works best. Push your `master` branch there before continuing.
- **A domain** (or subdomain) pointing to your Coolify server's public IP. You'll attach this to the `web` service. Cloudflare is free and handles DNS + SSL cleanly.
- **A Discord application** at https://discord.com/developers/applications (same one you're already using for local dev — we'll just add a prod redirect URI).
- **A Discord webhook URL** for your league channel (already configured for local dev — you'll reuse it).

### Verify your local repo is ready

```bash
# From the repo root
git status                        # should be clean
git log --oneline | head -5       # should show recent UI commits
git remote -v                     # must show a remote (github origin, typically)
```

If `git remote` is empty, add one:

```bash
git remote add origin git@github.com:<you>/vctfantasy.git
git push -u origin master
```

---

## 2. Decide on a domain

You need one public URL for the web app. Examples:

- `vctfantasy.yourdomain.com` (subdomain — recommended)
- `yourdomain.com/vct` (path — **not recommended**, Coolify is much happier with subdomain-per-app)

Point that DNS A record at your Coolify server's public IP. If behind Cloudflare, set the record to "Proxied" and Coolify will terminate TLS inside its reverse proxy (Traefik).

**Write the final URL down. You'll use it three times below:**
- As `NEXTAUTH_URL` env var
- As a Discord OAuth2 redirect URI
- In Coolify's "Domain" field

---

## 3. Discord app: production redirect URI

In https://discord.com/developers/applications → your app → **OAuth2** → **Redirects**:

Add **both** redirects (leave the local one for dev work):

```
http://localhost:3000/api/auth/callback/discord
https://<your-domain>/api/auth/callback/discord
```

Click **Save Changes**. Discord won't redirect to URIs that aren't on this allowlist.

---

## 4. Create the project in Coolify

1. Log in to your Coolify dashboard.
2. Click **+ New Resource** → **Public Repository** (or Private, if your repo is private — you'll need to connect GitHub via Coolify's GitHub App).
3. **Repository URL:** your git repo URL.
4. **Branch:** `master`.
5. **Build Pack:** choose **Docker Compose**.
6. **Compose file:** `docker-compose.prod.yml`.
7. Click **Continue**.

Coolify will parse the compose file and show you the three services (`web`, `vlrapi`, `db`, `backup`). It'll offer to configure each one.

---

## 5. Service config: `web`

The only service exposed publicly.

### Domain
- Set the domain to `https://<your-domain>` (the one you set up in step 2).
- Coolify auto-provisions TLS via Let's Encrypt.

### Port
- Coolify should detect `3000` from the compose file automatically. If not, set **Port** to `3000`.

### Environment variables

In the **Environment Variables** tab for the `web` service, paste these (**Build Variables** tab if Coolify separates them):

```
DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@db:5432/vctfantasy?schema=public
NEXTAUTH_URL=https://<your-domain>
NEXTAUTH_SECRET=<openssl rand -base64 32>
AUTH_SECRET=<same value as NEXTAUTH_SECRET>
DISCORD_CLIENT_ID=<from Discord dev portal>
DISCORD_CLIENT_SECRET=<from Discord dev portal>
DISCORD_WEBHOOK_URL=<your league channel webhook URL>
VLRAPI_BASE_URL=http://vlrapi:8000
APP_TIMEZONE=America/Jamaica
```

**Important:**
- `DATABASE_URL` uses `db` (the service name) as the hostname and `5432` (internal Docker port) — NOT `localhost:5433` (that's the dev mapping).
- `AUTH_SECRET` **must be the same value as** `NEXTAUTH_SECRET`. NextAuth v5 reads `AUTH_SECRET` by preference.
- Generate a fresh secret with `openssl rand -base64 32`. Do NOT reuse your local dev secret.

---

## 6. Service config: `db`

### Environment variables

```
POSTGRES_USER=vct
POSTGRES_PASSWORD=<PROD_PG_PASSWORD>
POSTGRES_DB=vctfantasy
```

Use a strong random password for `POSTGRES_PASSWORD` (e.g. `openssl rand -base64 24`). This password must appear in `DATABASE_URL` in step 5.

### Volume

Coolify should auto-create a persistent volume for `db_data`. Confirm it's listed under the service's **Volumes** tab. The Postgres data lives here — do NOT let Coolify recreate this volume on redeploy.

### Exposed ports

The `db` service has NO `ports:` mapping in compose — correct, it's internal-only. Do not expose it publicly. If Coolify offers to expose it, skip.

---

## 7. Service config: `vlrapi`

### Environment variables

None required. The scraper is self-contained.

### Build context

Coolify picks this up from compose automatically (`./vlr-scraper`). First build takes ~2 minutes (Python deps).

### DNS

The compose file already adds `8.8.8.8` and `1.1.1.1` DNS servers — needed because vlr.gg won't resolve inside the default Docker network on many hosts. Don't override.

### Exposed ports

None. The scraper is only reachable by `web` over the internal network at `http://vlrapi:8000`. Do not expose publicly.

---

## 8. Service config: `backup`

### Environment variables

```
DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@db:5432/vctfantasy?schema=public
```

Same URL as `web`.

### Volume

Coolify auto-creates `backups`. The sidecar runs `pg_dump` daily and keeps the last 14 dumps as `.sql.gz` files in `/backups`.

**Restoring from a backup** (manual, future-you problem):

```bash
# On the Coolify host, find the backup:
docker volume inspect <project>_backups   # gets the host path
ls /var/lib/docker/volumes/.../\_data

# Copy a dump into the running db container:
docker cp vctfantasy-<ts>.sql.gz $(docker ps -qf name=db):/tmp/
# Shell into db:
docker exec -it $(docker ps -qf name=db) sh
# Inside:
gunzip -c /tmp/vctfantasy-<ts>.sql.gz | psql -U vct -d vctfantasy
```

---

## 9. First deploy

1. In Coolify, click **Deploy**. Watch the build log.
2. First build takes **5-10 minutes** (Node + Prisma generate + Python deps).
3. When all three services are "Running" and `web` shows a green status, visit `https://<your-domain>`.
4. You should see the VCT Fantasy splash page.

### 9a. Run the database migration

The `web` container's startup CMD is:

```sh
sh -c "npx prisma migrate deploy && node server.js"
```

So migrations run automatically on first boot. Verify in logs:

```
✔ Generated Prisma Client (...)
All migrations have been successfully applied.
Starting...
```

If you see `No pending migrations to apply` on the first boot — something is wrong, the db volume has stale data. Reset by destroying the `db_data` volume in Coolify and redeploying.

### 9b. Seed the database

**This is a one-time operation for the Stage 1 league.**

The seed script lives at `scripts/seed-stage1.ts` and has the rosters, captains, and FA history hardcoded.

Open a shell into the `web` container via Coolify's **Terminal** tab (or `docker exec`):

```sh
WORKER_DISABLED=1 npx tsx scripts/seed-stage1.ts
```

Expected output ends with:

```
[seed] populated MatchRoster for N matches
[seed] recomputed all snapshots from MatchRoster
[seed] validating manager totals
[seed]   FAIL  ...
[seed] WARNING: some totals diverge from spreadsheet ...
[seed] Stage 1 bootstrap complete
```

The "FAIL" validation lines are expected and benign — the spreadsheet reflects manual adjustments the app doesn't know about yet. Use the admin audit page (`/admin/leagues/vct-americas-2026-stage-1/audit`) to reconcile per-match rosters.

**DO NOT re-run `seed:stage1` casually.** It wipes and re-creates the league, all matches, snapshots, and FA history. Re-running is safe but destructive if anyone has made changes through the UI in the meantime.

### 9c. First sign-in

Visit `https://<your-domain>` → click **Sign in with Discord** → authorize → you should land on `/leagues` and see the league.

If you see "not in any leagues":
1. Open a shell in the web container.
2. Run: `npx tsx -e "import 'dotenv/config'; import { db } from './src/lib/db'; (async () => { const users = await db.user.findMany({ include: { memberships: true } }); for (const u of users) console.log(u.discordId, u.username, u.memberships.length); })().finally(() => db.\$disconnect());"`
3. Look for a duplicate user with a long numeric `discordId` and 0 memberships — delete it (orphan from auth flow before seed migration) and sign in again.

---

## 10. Subsequent deploys (updating the app)

Once everything is set up, future deploys are:

```bash
# On your laptop
git push origin master
```

If Coolify has **auto-deploy on push** enabled (toggle in the app settings), it redeploys automatically. Otherwise click **Redeploy** in the Coolify dashboard.

Coolify will:
1. Pull latest commit
2. Rebuild images (cached layers = fast)
3. Recreate containers with the new image (rolling restart)
4. Run `prisma migrate deploy` again (no-op if no new migrations)

Downtime is typically 10-30 seconds per service swap.

### Schema changes

If you add a new Prisma migration locally (`npx prisma migrate dev --name xyz`), commit the `prisma/migrations/*` folder. On production deploy, `prisma migrate deploy` picks it up automatically — no manual step.

### Re-ingesting matches after a code change to the scoring engine

Open a shell in `web`:

```sh
WORKER_DISABLED=1 npx tsx -e "
import 'dotenv/config';
import { db } from './src/lib/db';
import { recomputeMatchSnapshots } from './src/lib/scoring/recompute';
(async () => {
  const matches = await db.match.findMany({ select: { id: true } });
  for (const m of matches) await recomputeMatchSnapshots(m.id);
  console.log('recomputed', matches.length, 'matches');
})().finally(() => db.\$disconnect());
"
```

This is safe — it regenerates `ScoringSnapshot` rows from existing `PlayerGameStat` + `MatchRoster` data without re-fetching from vlr.gg.

---

## 11. Operational notes

### Scoring worker

The `web` container starts the scoring worker at boot (via `bootstrapWorker()` in `layout.tsx`). It polls `vlrapi` every 60 seconds for each ACTIVE league. New matches auto-ingest, snapshots auto-compute, SSE pushes to connected browsers.

If you ever need to disable the worker (e.g. to let you run the seed manually), set `WORKER_DISABLED=1` in the web env vars and redeploy. Remove the flag and redeploy to re-enable.

### vlr.gg rate limiting

Our scraper caches completed matches for 24h and event match lists for 5m. vlr.gg rarely rate-limits under normal traffic. If the worker starts spamming errors in `IngestError` table, check `vlrapi` logs — if you see 403/429 from vlr.gg, just wait 15 minutes and it clears.

### Logs

Coolify shows per-service logs in the dashboard. For the web app, filter for `[worker]` to see the scoring worker's tick log.

### Resource expectations (Raspberry Pi 5, 8GB)

- `web`: ~300 MB RAM idle, ~500 MB during matchday
- `db`: ~100 MB RAM
- `vlrapi`: ~80 MB RAM
- `backup`: ~20 MB RAM

Total: ~500 MB. Comfortable on a Pi with 2 GB to spare for the OS.

### Monitoring uptime

Coolify has a built-in "health check" per service. All three services have `restart: unless-stopped` — they'll auto-restart if they crash. The `db` has a pg_isready healthcheck; the `web` container depends on `db` being healthy before starting.

For external monitoring, hit `https://<your-domain>/` (splash page) — expect 200 OK.

---

## 12. Troubleshooting

### `Sign in with Discord` returns to `/` without signing in

- Check the Discord OAuth2 redirects include `https://<your-domain>/api/auth/callback/discord` **exactly** (https, not http, trailing slash match).
- Check `NEXTAUTH_URL` in the web env matches `https://<your-domain>` with no trailing slash.
- Regenerate `NEXTAUTH_SECRET` and `AUTH_SECRET` to matching values and redeploy.

### vlr.gg data not updating

- In Coolify, check `vlrapi` logs for recent successful requests.
- Test directly from the Coolify host: `docker exec -it <web-container> curl http://vlrapi:8000/health` — should return `{"status":"ok"}`.
- If the scraper is unreachable, the web container's `IngestError` table will fill up. Check via admin page or SQL.

### `Bind for 0.0.0.0:3000 failed: port is already allocated`

Coolify's Traefik already proxies port 80/443 to the internal service port. You should NOT expose `3000` on the host. If the `ports:` mapping in compose causes issues, remove it entirely — Coolify will connect to the service via Docker network.

### Postgres won't start

- Check `db` logs — usually a volume permission issue.
- Verify `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` are set in the db env vars.
- Verify the `DATABASE_URL` in web uses those exact values.

### Migration fails on first deploy

- Ensure the `prisma/` directory is committed to git (including `migrations/`). It's NOT gitignored, but double-check.
- If the db volume is blank, migrations apply fine. If it has leftover data from a test, run `npx prisma migrate reset --force` from a shell in the web container (destructive).

---

## Quick reference: env vars checklist

Copy-paste for Coolify:

```
# web service
DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@db:5432/vctfantasy?schema=public
NEXTAUTH_URL=https://<your-domain>
NEXTAUTH_SECRET=<32-byte random base64>
AUTH_SECRET=<same as NEXTAUTH_SECRET>
DISCORD_CLIENT_ID=<from discord>
DISCORD_CLIENT_SECRET=<from discord>
DISCORD_WEBHOOK_URL=<discord channel webhook>
VLRAPI_BASE_URL=http://vlrapi:8000
APP_TIMEZONE=America/Jamaica

# db service
POSTGRES_USER=vct
POSTGRES_PASSWORD=<PROD_PG_PASSWORD>
POSTGRES_DB=vctfantasy

# backup service
DATABASE_URL=postgresql://vct:<PROD_PG_PASSWORD>@db:5432/vctfantasy?schema=public
```

You're done. 🚀
