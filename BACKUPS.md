# Database Backups

SiteFlo now includes local PostgreSQL backup and restore scripts.

## Back up the database

Run:

```bash
npm run db:backup
```

This script:

- reads `DATABASE_URL` from `.env.local`
- creates a PostgreSQL custom-format dump in `backups/db/`
- uses PostgreSQL's built-in compression at level `9` by default
- writes metadata to `backups/db/latest-backup.json`
- keeps the latest 10 backups by default
- deletes backups older than 14 days by default

Optional environment variables:

```bash
BACKUP_DIR=/absolute/path/to/backups
RETENTION_DAYS=30
KEEP_LATEST=20
COMPRESSION_LEVEL=9
ENV_FILE=/absolute/path/to/.env.local
```

## Restore the latest backup

Run:

```bash
npm run db:restore
```

Or restore a specific dump:

```bash
./scripts/restore-db.sh backups/db/siteflo_YYYY-MM-DD_HH-MM-SS.dump
```

## Recommended cron schedule

Run backups every 6 hours on the server that hosts the database access:

```bash
0 */6 * * * cd /path/to/SiteFlow && ./scripts/backup-db.sh >> /var/log/siteflo-db-backup.log 2>&1
```

For higher safety, use hourly backups:

```bash
0 * * * * cd /path/to/SiteFlow && ./scripts/backup-db.sh >> /var/log/siteflo-db-backup.log 2>&1
```

## Verify backups

After a successful run, check:

- `backups/db/latest-backup.json`
- the newest `.dump` file in `backups/db/`

Note:

- `.dump` files created with `pg_dump --format=custom` are already compressed and are the right format for `pg_restore`.

The health-check route also warns if backups are missing or stale.
