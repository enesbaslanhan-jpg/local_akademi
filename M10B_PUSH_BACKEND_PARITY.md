# LocalKarar — M10B Backend Device Registration & Push Transport Foundation

- **Backend Base Branch**: `design/localkarar-18`
- **Backend Base Commit**: `55561d58cca4d2dd9259e1f10b713e87cfd9a04a`
- **M10B Branch**: `feature/m10b-push-backend`
- **Mobile M10A Commit**: `ae796339178ad3ecadabf8696ab3f6a27bb4510b`

---

## 1. PushInstallation Model & Database Migration

### Prisma Schema (`prisma/schema.prisma`)
```prisma
model PushInstallation {
  id             String   @id @default(uuid())
  installationId String   @unique
  userId         Int
  platform       String   // "android" | "ios"
  pushToken      String   @unique
  appVersion     String?
  locale         String?  @default("tr")
  enabled        Boolean  @default(true)
  lastSeenAt     DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### Migration (`20260831120000_add_push_installation`)
- Applied and validated across PostgreSQL migration chain without data loss or schema drift.

---

## 2. Device Registration API (`/devices`)

### `PUT /devices/:installationId`
- **Authentication**: JWT required (`fastify.authenticate`).
- **Path Parameter**: `installationId` (1-128 chars, client-generated opaque UUID).
- **Body Schema**:
  ```json
  {
    "pushToken": "fcm-token-string",
    "platform": "android" | "ios",
    "appVersion": "1.0.0",
    "locale": "tr"
  }
  ```
- **Security**: Client cannot supply `userId`, `enabled`, `createdAt`, or ownership fields. `userId` is strictly derived from authenticated JWT context.
- **Idempotency**: Repeated identical requests return 200 OK without creating duplicate database rows.
- **Token Rotation**: When an existing installation submits a new token, the row is updated.
- **Collision Resolution**: If a token is presented that was previously registered on a stale installation, the collision is resolved transactionally with automatic retry on concurrent race (`P2002`).
- **Account Switch**: If a device installation transitions between users (User A -> User B), the installation row is atomically reassigned to the new authenticated user.
- **Response**: Returns non-sensitive installation metadata (`id`, `installationId`, `platform`, `enabled`, `appVersion`, `locale`, `lastSeenAt`), intentionally omitting `pushToken`.

### `DELETE /devices/:installationId`
- **Authentication**: JWT required (`fastify.authenticate`).
- **Semantics**: Deletes only installations owned by the current authenticated user (`where: { installationId, userId }`).
- **Response**: `204 No Content` (idempotent, prevents owner/presence information leaks).

---

## 3. Account Lifecycle & Security

- **`POST /auth/logout-all`**: Automatically purges all `PushInstallation` rows belonging to the user (`deleteMany({ where: { userId } })`).
- **Account Deletion (`DELETE /auth/account`)**: `onDelete: Cascade` on User foreign key automatically purges all device registrations.
- **Single Device Logout (`POST /auth/logout`)**: Cleans up caller refresh token; device unregistration is handled cleanly via `DELETE /devices/:installationId`.

---

## 4. Push Transport & Error Classification

### FCM HTTP v1 Permanent Error Matrix

| HTTP Status | FCM `status` / `errorCode` | Classification | Action | Retryable | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `404` | `UNREGISTERED` / `NOT_FOUND` | `PERMANENT_TOKEN_INVALID` | **DELETE TOKEN** | No | App uninstalled or registration token unregistered |
| `400` | `INVALID_ARGUMENT` (`message.token` invalid) | `PERMANENT_TOKEN_INVALID` | **DELETE TOKEN** | No | Token string explicitly malformed according to FCM |
| `400` | `INVALID_ARGUMENT` (bad payload field) | `PAYLOAD_ERROR` | **KEEP TOKEN** | No | Malformed notification data must NOT delete valid device |
| `401` | `UNAUTHENTICATED` | `PROVIDER_AUTH_ERROR` | **KEEP TOKEN** | No | Server credentials issue; device token is healthy |
| `403` | `PERMISSION_DENIED` / `SENDER_ID_MISMATCH` | `PROVIDER_AUTH_ERROR` | **KEEP TOKEN** | No | Project permission mismatch; device token is healthy |
| `429` | `RESOURCE_EXHAUSTED` / `QUOTA_EXCEEDED` | `RATE_LIMIT` | **KEEP TOKEN** | **Yes** | Temporary rate limit; retry later |
| `500` | `INTERNAL` | `TRANSIENT_SERVER_ERROR` | **KEEP TOKEN** | **Yes** | Internal FCM error; retry later |
| `503` | `UNAVAILABLE` | `TRANSIENT_SERVER_ERROR` | **KEEP TOKEN** | **Yes** | Service unavailable; retry later |
| `0` / Timeout | `NETWORK_ERROR` | `TRANSIENT_NETWORK_ERROR` | **KEEP TOKEN** | **Yes** | Network glitch; keep token |

### Disabled Transport Semantics
- When credentials are absent: `isEnabled = false`.
- `send()` returns `{ success: false, skipped: true, error: 'Push transport is disabled (credentials absent)' }`.
- Operational metrics record `skipped: 1`, `sent: 0` without claiming false delivery or throwing errors.

### RFC 7523 OAuth2 Service Account Assertion
- **Algorithm**: RS256 with native `node:crypto` (`createSign`).
- **Audience**: `https://oauth2.googleapis.com/token`.
- **Scope**: `https://www.googleapis.com/auth/firebase.messaging`.
- **Clock Skew Margin**: 60 seconds buffer before token expiration.
- **Assessment**: `CUSTOM_IMPLEMENTATION_ACCEPTABLE` (Zero external dependencies, zero weight, 100% testable, standard RFC compliant).

---

## 5. Delivery Execution & Reliability Classification

- **Community Notifications (`community-bildirim.ts`)**: `BEST_EFFORT_AWAITED` (Awaited after DB record creation; errors caught and isolated from primary user action).
- **Account / Billing Notifications (`account-notifications.ts`)**: `BEST_EFFORT_AWAITED` (Awaited after `accountNotification` creation; errors caught and isolated).
- **Business Task Reminders (`business-reminder-worker.ts`)**: `DURABLE` + `BEST_EFFORT_AWAITED` (State persisted in `businessReminder` with dedupe key; worker awaits push fan-out per due item).

---

## 6. Event Integrations Matrix

| Event Type | Producer Location | Push Status | Semantic Target | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Direct Message (`message`) | `src/services/community-bildirim.ts` | `PUSH_CONNECTED` | `community_thread` | Triggers push to thread participants excluding sender |
| Thread Invite (`thread_invite`) | `src/services/community-bildirim.ts` | `PUSH_CONNECTED` | `community_thread` | Triggers push to invited user |
| Post Reply (`reply`) | `src/services/community-bildirim.ts` | `PUSH_CONNECTED` | `community_post` | Triggers push to post author excluding self |
| Mentions | Not implemented in backend | `NOT_PRESENT` | N/A | No mention parser in existing backend |
| Community Like / Quote / Follow | `src/services/community-bildirim.ts` | `IN_APP_ONLY` | N/A | In-app notification only |
| Business Due Reminder | `src/services/business-reminder-worker.ts` | `PUSH_CONNECTED` | `workspace_record` | Triggers push to assigned/created user upon due date |
| Critical Billing / Account Alert | `src/services/account-notifications.ts` | `PUSH_CONNECTED` | `account` | Triggers push for `payment_failed`, `trial_ending`, `membership_cancelled` |
| Routine Payment Succeeded | `src/services/account-notifications.ts` | `IN_APP_ONLY` | N/A | In-app notification only |
