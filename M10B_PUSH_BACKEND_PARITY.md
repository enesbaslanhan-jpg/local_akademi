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
- Applied and validated across migration chain without data loss or schema drift.

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
- **Collision Resolution**: If a token is presented that was previously registered on a stale installation, the collision is resolved transactionally ensuring single ownership.
- **Account Switch**: If a device installation transitions between users (User A -> User B), the installation row is safely reassigned to the new authenticated user.
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

## 4. Push Transport & PushService

### Architecture
- **`PushService` (`src/services/push/service.ts`)**: Central business abstraction with multi-device fan-out, failure isolation, and stale token invalidation.
- **`FirebaseHttpV1Transport` (`src/services/push/transport.ts`)**: Implements Google FCM HTTP v1 using zero-dependency built-in crypto JWT signing for Google OAuth2 Service Account authentication.
- **Disabled Mode**: When Firebase credentials are absent in the environment, the transport enters a safe `disabled` state without throwing errors or breaking business flows.
- **Deterministic Test Transport (`FakePushTransport`)**: Allows simulating delivery success, permanent token invalidation (`UNREGISTERED`), and transient 503 errors.

### Semantic Payload Types (`src/services/push/types.ts`)
Discriminated union preventing ambiguous routing:
```ts
export type PushTarget =
  | { target: 'community_post'; postId: string }
  | { target: 'community_thread'; threadId: string }
  | { target: 'workspace_record'; workspaceId: string; recordId: string }
  | { target: 'account' }
```

### Privacy & Data Sanitization
- Push notifications display generic/safe text on lock screens (`"Yeni bir mesajınız var"`, `"Yaklaşan işletme kaydı"`).
- Passwords, access/refresh tokens, full private messages, and customer confidential details are never included in push data payloads.
- Push tokens and service account secrets are redacted/masked in operational logs.

---

## 5. Event Integrations Matrix

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

---

## 6. Test Verification

- **`tests/push-device-registration.test.ts`**: 14 tests covering unauthenticated rejection, Zod validation, idempotency, token rotation, multi-device, account switch, token collision, DELETE semantics, logout-all cleanup, and cascade account deletion.
- **`tests/push-transport-service.test.ts`**: 9 tests covering Firebase HTTP v1 disabled mode, fake transport recording, multi-device fan-out, token permanent invalidation cleanup, transient failure preservation, failure isolation, and payload privacy.
- **`tests/push-event-integration.test.ts`**: 9 tests covering community direct messages, thread invites, post replies, likes (in-app only suppression), business task reminders, and account billing alerts.
- **Full Backend Test Suite**: Over 2,150 automated tests verified without regression.
