# Phase 1: Multi-Workspace Architecture

## Overview

Introduce a first-class **Workspace** abstraction that allows a single BusinessProfile user to manage multiple businesses. Every workspace has its own members, contacts, settings, and activity log. Existing services continue reading from `BusinessProfile` via a compatibility bridge; new code targets `BusinessWorkspace`.

---

## Data Model (Prisma)

### New Models

| Model | Table | Key Columns | Purpose |
|---|---|---|---|
| `BusinessWorkspace` | `business_workspaces` | `id`, `name`, `slug`, `businessProfileId`, `ownerId`, `logo`, `isActive` | A business workspace owned by a user |
| `BusinessMember` | `business_members` | `id`, `workspaceId`, `userId`, `role` (OWNER/ADMIN/MEMBER/VIEWER) | Membership + role assignment |
| `BusinessInvitation` | `business_invitations` | `id`, `workspaceId`, `email`, `role`, `token`, `expiresAt`, `acceptedAt` | Pending invitations |
| `BusinessContact` | `business_contacts` | `id`, `workspaceId`, `name`, `email`, `phone`, `notes` | Workspace-scoped contacts |
| `BusinessSetting` | `business_settings` | `id`, `workspaceId`, `key`, `value` | Key-value workspace settings |
| `WorkspaceActivity` | `workspace_activities` | `id`, `workspaceId`, `userId`, `action`, `entityType`, `entityId`, `metadata` | Audit trail |

### Modified Models

- **`UserPreference`**: added `activeWorkspaceId` (nullable FK to `business_workspaces`)
- **`User`**: hasMany `ownedWorkspaces`, `workspaceMemberships`, `workspaceActivities`

### Migration

- `20260727165701_add_business_workspace` — 1 migration, 2 total in `prisma/migrations/`
- Prisma Client v5.22.0 regenerated

---

## Backend Architecture

### Routes (`src/services/workspace.ts`)

All routes registered at `prefix: '/workspaces'` in `src/index.ts` with internal paths relative:

| Method | Path | Handler | Purpose |
|---|---|---|---|
| GET | `/` | `listWorkspacesHandler` | List user's workspaces |
| POST | `/` | `createWorkspaceHandler` | Create workspace + auto-join as OWNER |
| GET | `/:workspaceId` | `getWorkspaceHandler` | Get workspace details |
| PATCH | `/:workspaceId` | `updateWorkspaceHandler` | Update name/logo/description |
| DELETE | `/:workspaceId` | `deleteWorkspaceHandler` | Soft-delete (isActive=false) |
| POST | `/switch` | `switchWorkspaceHandler` | Set active workspace |
| GET | `/:workspaceId/members` | `listMembersHandler` | List workspace members |
| PATCH | `/:workspaceId/members/:memberId` | `updateMemberRoleHandler` | Change member role |
| DELETE | `/:workspaceId/members/:memberId` | `removeMemberHandler` | Remove member |
| GET | `/:workspaceId/invitations` | `listInvitationsHandler` | List pending invitations |
| POST | `/:workspaceId/invitations` | `createInvitationHandler` | Invite user by email |
| DELETE | `/:workspaceId/invitations/:invitationId` | `cancelInvitationHandler` | Cancel invitation |
| POST | `/invitations/:token/accept` | `acceptInvitationHandler` | Accept invitation |
| GET | `/:workspaceId/contacts` | `listContactsHandler` | List workspace contacts |
| POST | `/:workspaceId/contacts` | `createContactHandler` | Add contact |
| PATCH | `/:workspaceId/contacts/:contactId` | `updateContactHandler` | Update contact |
| DELETE | `/:workspaceId/contacts/:contactId` | `deleteContactHandler` | Remove contact |
| GET | `/:workspaceId/settings` | `listSettingsHandler` | Get all settings |
| PUT | `/:workspaceId/settings` | `upsertSettingsHandler` | Bulk-upsert settings |
| GET | `/:workspaceId/activity` | `listActivityHandler` | Activity feed (paginated) |
| POST | `/:workspaceId/sync-legacy-profile` | `syncLegacyBusinessProfile` | Copy BusinessProfile → Workspace |

### Helpers

- `parseJsonArray(raw)` — safe JSON parse for string arrays
- `syncLegacyBusinessProfile(prisma, userId)` — copies `BusinessProfile` fields into the user's default workspace; used by the manual sync endpoint
- `recordWorkspaceActivity(prisma, workspaceId, userId, action, entityType, entityId, metadata)` — inserts a row in `workspace_activities`
- `setActiveWorkspace(prisma, userId, workspaceId)` — updates `UserPreference.activeWorkspaceId`

### Onboarding Integration (`src/services/onboarding.ts`)

- `ensureWorkspace(userId, prisma)` — called on onboarding completion; creates default workspace named `${businessName} İşletmesi` if none exists
- `syncProfileToWorkspace(userId, prisma)` — copies `BusinessProfile` fields into the user's default workspace

---

## Compatibility Bridge

Existing services (mentor, learningPath, reports, memory/context-builder) continue reading from `BusinessProfile` directly. The bridge function `syncLegacyBusinessProfile()` provides an explicit one-way sync:

```
BusinessProfile ──syncLegacyBusinessProfile──> BusinessWorkspace
```

No existing query path is modified. New services and pages target `BusinessWorkspace`.

---

## Backfill Script (`scripts/backfill-workspaces.ts`)

Idempotent Node.js script:

| Flag | Default | Purpose |
|---|---|---|
| `--dry-run` | `true` | Print what would be created |
| `--apply` | `false` | Execute inserts |
| `--verify` | `false` | Validate counts match |

Logic: for every `BusinessProfile` without a workspace, create `BusinessWorkspace` + `BusinessMember` (OWNER) + copy profile fields.

---

## Frontend Architecture

### Context (`frontend/src/context/WorkspaceContext.jsx`)

Provides:

| Value | Type | Description |
|---|---|---|
| `workspaces` | Array | All user workspaces |
| `activeWorkspace` | Object | Currently active workspace or null |
| `loading` | Boolean | Initial load |
| `switchWorkspace(id)` | Function | Switch active workspace |
| `createWorkspace(data)` | Function | Create new workspace |
| `refreshActiveWorkspace()` | Function | Re-fetch active workspace |
| `hasWorkspaces` | Boolean | `workspaces.length > 0` |

Wrapped inside `AuthProvider` in `main.jsx`:

```jsx
<AuthProvider>
  <WorkspaceProvider>
    <ToastProvider>
      ...
    </ToastProvider>
  </WorkspaceProvider>
</AuthProvider>
```

### Pages (`frontend/src/pages/Workspaces/`)

| File | CSS Module | Purpose |
|---|---|---|
| `index.jsx` | `index.module.css` | Workspace list + create dialog |
| `WorkspaceLayout.jsx` | `WorkspaceLayout.module.css` | Tabs layout (overview/team/contacts/settings/activity) |
| `Overview.jsx` | `Overview.module.css` | KPI cards (members/contacts/settings count) + business info |
| `Team.jsx` | `Team.module.css` | Member table, role dropdown, invite dialog, cancel invitation |
| `Contacts.jsx` | `Contacts.module.css` | Contact CRUD with dialog form |
| `Settings.jsx` | `Settings.module.css` | Timezone/locale/currency/weekStartsOn |
| `Activity.jsx` | `Activity.module.css` | Activity feed with icons + timeAgo |

### API Methods (`frontend/src/services/api.js`)

```js
workspace.*            — list, create, get, update, delete, switch, syncLegacyProfile
workspace.members.*    — list, updateRole, remove
workspace.invitations.* — list, create, cancel, accept
workspace.contacts.*   — list, create, update, delete
workspace.settings.*   — list, upsert
workspace.activity.*   — list
```

### Router (`frontend/src/router/index.jsx`)

```jsx
<Route path="workspaces" element={<WorkspaceList />} />
<Route path="workspaces/:workspaceId" element={<WorkspaceLayout />}>
  <Route index element={<Overview />} />
  <Route path="team" element={<Team />} />
  <Route path="contacts" element={<Contacts />} />
  <Route path="settings" element={<Settings />} />
  <Route path="activity" element={<Activity />} />
</Route>
```

### Sidebar (`frontend/src/components/layout/Sidebar.jsx`)

Added section "İşletmem" with:
- "İşletmelerim" → `/app/workspaces` (Building2 icon)

---

## Testing

### Backend (`tests/workspace.test.ts`)

65 test cases covering CRUD, role matrix, tenant isolation (6 IDOR tests), invitation security (7 tests), archived/suspended states, regression (no redirect, no DML in GET, archive cleans prefs, effective fallback), and backfill scenarios (6 tests).

All 65 pass. Total: 865/865 pass (47 test files).

### Frontend

- TypeScript build: 0 errors
- Vite build: succeeds

---

## Key Design Decisions

1. **`User.role` is platform role only** — workspace roles live on `BusinessMember` and are never written to `User.role`
2. **Active workspace** stored in `UserPreference.activeWorkspaceId` — read on login, no separate session table
3. **Soft delete** via `isActive=false` — data preservation
4. **Activity audit** — every mutation records a `WorkspaceActivity` row
5. **Invitation tokens** — UUID-based, expiring in 7 days
6. **No cascading deletes** — explicit checks prevent orphaned references
7. **Bridge pattern** — old code untouched, new code uses workspace
8. **Production `localakademi` database never touched** — migrations run only against `localakademi_test`, `localakademi_migration_test`, etc.
