# LocalKarar production delivery

The canonical production branch is `design/localkarar-18`. No other branch is
deleted or renamed by these workflows.

GitHub's repository **default branch must also be set to
`design/localkarar-18`**. `workflow_run` and manual workflow discovery use the
default branch; image publishing will not become active until this repository
setting is changed.

## Flow

1. `Release Gate` validates every push to the canonical branch.
2. A successful push automatically builds one Docker image and publishes it to
   GHCR with both an immutable full-commit-SHA tag and `latest`.
3. `Deploy Production` is started manually with the full SHA. The GitHub
   `production` environment can require an approver.
4. The server fast-forwards its canonical checkout, creates a database backup,
   pulls the immutable image, starts it, and checks `/health` for up to two
   minutes. A failed health check restores the previous application image.

Database migrations run from the image entrypoint. They must remain backward
compatible because application rollback does not reverse a database migration.

## GitHub environment and secrets

Create a GitHub environment named `production`, enable required reviewers, and
add these environment secrets:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_PORT` (optional; defaults to 22)
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_KNOWN_HOSTS` (the pinned host-key line; never use `ssh-keyscan` in CI)
- `PRODUCTION_DEPLOY_PATH` (absolute path of the existing checkout)
- `GHCR_USERNAME`
- `GHCR_READ_TOKEN` (read-only package scope)

Keep the production `.env` only on the server. It is neither copied nor printed
by the workflow. The server checkout must already be on `design/localkarar-18`;
the deployment refuses to switch branches or overwrite local changes.
