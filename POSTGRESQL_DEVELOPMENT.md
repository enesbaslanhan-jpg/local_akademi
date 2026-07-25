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

## Current Status

This phase sets up only the PostgreSQL container infrastructure.
The following are NOT yet in place:

- Prisma provider still uses `sqlite` (FAZ 6C)
- PostgreSQL baseline migration (FAZ 6C)
- Data migration from SQLite (FAZ 6D)
- Test infrastructure on PostgreSQL (FAZ 6E)
- Production cutover (FAZ 6F)
- The application still runs on SQLite during development
- SQLite database files are preserved and unchanged

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
