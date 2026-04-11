#!/bin/sh
set -eu
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
OUT="/backups/vctfantasy-${TS}.sql.gz"
echo "[backup] dumping → $OUT"
pg_dump "$DATABASE_URL" | gzip > "$OUT"
# Keep only last 14 backups
ls -1t /backups/vctfantasy-*.sql.gz | tail -n +15 | xargs -r rm --
