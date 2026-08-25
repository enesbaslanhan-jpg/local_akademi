import type { IntegrationConnection, PrismaClient } from '@prisma/client'
import { decryptSecret, redactSecrets } from '../../lib/crypto.js'
import type { ProviderCredentials } from './types.js'

/*
 * CREDENTIAL COZUMLEME VE GIZLI BILGI TEMIZLIGI.
 *
 * Sifreli alanlar yalnizca sync/validate aninda cozulur; API
 * cevaplarina ASLA eklenmez. Cozumleme sonrasi uretilen her hata
 * mesaji redactSecrets'ten gecer.
 */

export function decryptConnectionCredentials(connection: IntegrationConnection): ProviderCredentials {
  const apiKey = connection.encryptedApiKey ? decryptSecret(connection.encryptedApiKey) : null
  const apiSecret = connection.encryptedApiSecret ? decryptSecret(connection.encryptedApiSecret) : null
  const accessToken = connection.encryptedAccessToken ? decryptSecret(connection.encryptedAccessToken) : null
  const refreshToken = connection.encryptedRefreshToken ? decryptSecret(connection.encryptedRefreshToken) : null
  return {
    externalAccountId: connection.externalAccountId,
    apiKey,
    apiSecret,
    accessToken,
    refreshToken
  }
}

export function secretsFromCredentials(credentials: ProviderCredentials): string[] {
  return [credentials.apiKey, credentials.apiSecret, credentials.accessToken, credentials.refreshToken]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function safeErrorMessage(message: string, credentials: ProviderCredentials): string {
  return redactSecrets(message, secretsFromCredentials(credentials))
}

/** Frontend'e donen baglanti gorunumu — hicbir credential materyali tasimaz. */
export function publicConnectionView(connection: IntegrationConnection) {
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    provider: connection.provider,
    externalAccountId: connection.externalAccountId,
    displayName: connection.displayName,
    status: connection.status,
    hasStoredCredentials: Boolean(connection.encryptedApiKey || connection.encryptedAccessToken),
    lastSyncedAt: connection.lastSyncedAt,
    lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt,
    lastErrorCode: connection.lastErrorCode,
    lastErrorAt: connection.lastErrorAt,
    syncEnabled: connection.syncEnabled,
    syncIntervalMinutes: connection.syncIntervalMinutes,
    /* Kullanicinin girdigi odeme vadesi; gizli bilgi degil. */
    payoutDelayDays: connection.payoutDelayDays,
    createdAt: connection.createdAt
  }
}

export async function findConnection(
  prisma: PrismaClient,
  workspaceId: string,
  provider: string,
  externalAccountId?: string
) {
  return prisma.integrationConnection.findFirst({
    where: {
      workspaceId,
      provider: provider as any,
      ...(externalAccountId ? { externalAccountId } : {})
    }
  })
}
