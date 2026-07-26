# PostgreSQL Development Setup

## Prerequisites

- Docker Desktop (Windows) or Docker Engine (Linux/Mac)
- Docker Compose v2+

## Starting PostgreSQL

```bash
# Start PostgreSQL container in background
npm run db:up

# Check container status
npm run db:status

# View PostgreSQL logs
npm run db:logs

# Stop all containers
npm run db:down
```

## Connection Details

### From Host (backend running on your machine)

```
DATABASE_URL="postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi?schema=public"
```

### From Container (backend running inside Docker)

```
DATABASE_URL="postgresql://localakademi:localakademi@postgres:5432/localakademi?schema=public"
```

The hostname differs because containers resolve each other by service name (`postgres`), while host processes connect via `127.0.0.1`.

## Default Credentials (Development Only)

| Variable | Default Value |
|----------|--------------|
| `POSTGRES_USER` | `localakademi` |
| `POSTGRES_PASSWORD` | `localakademi` |
| `POSTGRES_DB` | `localakademi` |

Override via `.env` or shell environment:

```env
DB_PASSWORD=localakademi
```

Do NOT use these defaults for production. Generate a strong password.

## Verifying the Connection

```bash
# Check PostgreSQL health
docker compose ps

# Expected output: localakademi-postgres ... Up (healthy)

# Quick connection test (requires psql client)
psql -h 127.0.0.1 -U localakademi -d localakademi -c "SELECT version();"
```

## Healthcheck

The PostgreSQL service has a built-in healthcheck:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U localakademi -d localakademi"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 10s
```

The container will report as `healthy` once PostgreSQL accepts connections.
On first start this takes 5-15 seconds depending on system performance.

## Data Persistence

PostgreSQL data is stored in a named Docker volume (`postgres-data`).
The data survives container restarts and `docker compose down`.

To reset the database (destructive — deletes all data):

```bash
docker compose down -v    # Deletes the named volume
npm run db:up            # Starts fresh PostgreSQL
```

## Port Exposure

PostgreSQL is exposed on `127.0.0.1:5432` (loopback only).
Remote access is not possible unless the port mapping is changed.

## Initializing the Schema

After starting PostgreSQL:

```bash
# Apply migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate

# Seed demo data
npx tsx prisma/seed.ts
```

## Test Database

The test suite requires the `localakademi_test` database:

```bash
docker compose exec postgres psql -U localakademi -d localakademi -c "CREATE DATABASE localakademi_test"
```

This is created once and reused across all tests. Each test that requires a clean state uses `prisma db push --force-reset` to drop and recreate its schema. Tests run sequentially (`fileParallelism: false`) to avoid interference.

## Running Tests

```bash
# Ensure PostgreSQL is running
npm run db:up

# Run tests
npm test
```

## Migrating Data from SQLite

If you have existing data in `prisma/dev.db`, migrate it to PostgreSQL:

```bash
# Ensure PostgreSQL is running
npm run db:up

# Run migration script
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

The script reads all data from SQLite and upserts it into PostgreSQL.

## Migration History

- Old SQLite migrations are archived in `prisma/migrations-archive/`
- PostgreSQL uses a single baseline migration: `prisma/migrations/20260726000000_postgresql_baseline/`
- The baseline creates all 45 tables from the current Prisma schema

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Container exits immediately | Port 5432 already in use | Stop other PostgreSQL instances |
| Healthcheck never passes | Low memory or slow disk | Increase `start_period` |
| Connection refused | Container not ready | Wait for healthcheck |
| `role "localakademi" does not exist` | DB not initialized | Restart container |

## Useful Commands

```bash
# View PostgreSQL logs
npm run db:logs

# Follow logs
npm run db:logs

# Check container resource usage
docker stats localakademi-postgres

# Execute SQL directly
docker compose exec postgres psql -U localakademi -d localakademi -c "SELECT 1"
```
