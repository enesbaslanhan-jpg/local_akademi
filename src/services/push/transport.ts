import { createSign } from 'node:crypto'
import type { PushNotificationMessage, PushSendResult } from './types.js'

export interface PushTransport {
  readonly name: string
  readonly isEnabled: boolean
  send(token: string, message: PushNotificationMessage): Promise<PushSendResult>
}

/**
 * Token maskeleme (guvenli gunlukleme icin).
 * Tam push token hicbir zaman gunluklere yazilmaz.
 */
export function maskPushToken(token: string): string {
  if (!token || token.length < 12) return '***'
  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

interface ServiceAccountCredentials {
  projectId: string
  clientEmail: string
  privateKey: string
}

/**
 * Ortam degiskenlerinden Firebase Service Account kimlik bilgilerini cozer.
 */
function resolveFirebaseCredentials(): ServiceAccountCredentials | null {
  try {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    if (rawJson) {
      const parsed = JSON.parse(rawJson)
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key
        }
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()

    if (projectId && clientEmail && privateKey) {
      return { projectId, clientEmail, privateKey }
    }
  } catch {
    // Gecersiz JSON durumunda sessizce null doner
  }
  return null
}

export interface FcmErrorDetail {
  '@type'?: string
  errorCode?: string
  fieldViolations?: Array<{ field?: string; description?: string }>
}

export interface FcmErrorPayload {
  error?: {
    code?: number
    status?: string
    message?: string
    details?: FcmErrorDetail[]
  }
}

/**
 * FCM HTTP v1 Hata Siniflandirici.
 *
 * KRITIK GUVENLIK KURALI:
 * - Bir token yalnizca ve yalnizca sağlayıcı cevabı token'in KESINLIKLE gecersiz/silinmis
 *   oldugunu belirttiginde silinir (UNREGISTERED vb.).
 * - Genel INVALID_ARGUMENT (ornegin yanlis bildirim basligi, payload alan hatasi),
 *   401/403 (sunucu kimlik/yetki hatasi), 429 (hiz siniri), 500/503 (gecici sunucu hatasi)
 *   ve zaman asimlarinda TOKEN ASLA SILINMEZ.
 */
export function classifyFcmError(
  status: number,
  errorBody?: FcmErrorPayload
): { invalidToken: boolean; isRetryable: boolean } {
  if (!errorBody?.error) {
    const isTransient = status === 429 || status >= 500
    return { invalidToken: false, isRetryable: isTransient }
  }

  const details = errorBody.error.details || []
  const fcmErrorDetail = details.find(
    d => d['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError'
  )
  const fcmErrorCode = fcmErrorDetail?.errorCode || ''

  // 1. Kesin kalici token gecersizlik durumlari
  if (fcmErrorCode === 'UNREGISTERED') {
    return { invalidToken: true, isRetryable: false }
  }

  // 2. Token alanina ozgu gecersizlik kontrolu
  const hasTokenFieldViolation = details.some(d =>
    d.fieldViolations?.some(
      fv => fv.field === 'message.token' || fv.field?.includes('token')
    )
  )

  const messageText = (errorBody.error.message || '').toLowerCase()
  const isTokenExplicitlyMalformed =
    hasTokenFieldViolation ||
    (fcmErrorCode === 'INVALID_ARGUMENT' &&
      (messageText.includes('registration token') ||
        messageText.includes('fcm token') ||
        messageText.includes('token is not valid') ||
        messageText.includes('invalid registration token')))

  if (isTokenExplicitlyMalformed) {
    return { invalidToken: true, isRetryable: false }
  }

  // 3. Genel INVALID_ARGUMENT (ornegin payload hatasi) veya DIGER durumlar: TOKEN ASLA SILINMEZ
  const isTransient =
    status === 429 ||
    status === 500 ||
    status === 503 ||
    fcmErrorCode === 'UNAVAILABLE' ||
    fcmErrorCode === 'INTERNAL' ||
    fcmErrorCode === 'QUOTA_EXCEEDED'

  return {
    invalidToken: false,
    isRetryable: isTransient
  }
}

/**
 * Google OAuth2 Access Token yoneticisi (Harici agir kutuphaneler olmadan).
 */
class GoogleOAuth2TokenManager {
  private cachedToken: string | null = null
  private expiresAt: number = 0

  constructor(private readonly creds: ServiceAccountCredentials) {}

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (this.cachedToken && this.expiresAt > now + 60) {
      return this.cachedToken
    }

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const claimSet = Buffer.from(
      JSON.stringify({
        iss: this.creds.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      })
    ).toString('base64url')

    const sign = createSign('RSA-SHA256')
    sign.update(`${header}.${claimSet}`)
    sign.end()
    const signature = sign.sign(this.creds.privateKey, 'base64url')

    const assertion = `${header}.${claimSet}.${signature}`

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Google OAuth2 token exchange failed: ${response.status} ${errText}`)
    }

    const data = (await response.json()) as { access_token: string; expires_in: number }
    this.cachedToken = data.access_token
    this.expiresAt = now + (data.expires_in || 3600)
    return this.cachedToken
  }
}

/**
 * Firebase HTTP v1 standardina uygun push gonderim adaptoru.
 *
 * Kimlik bilgisi eksikse sistem calismaya devam eder (disabled modu).
 */
export class FirebaseHttpV1Transport implements PushTransport {
  readonly name = 'firebase-http-v1'
  private readonly creds: ServiceAccountCredentials | null
  private readonly tokenManager: GoogleOAuth2TokenManager | null

  constructor(credentials?: ServiceAccountCredentials | null) {
    this.creds = credentials !== undefined ? credentials : resolveFirebaseCredentials()
    this.tokenManager = this.creds ? new GoogleOAuth2TokenManager(this.creds) : null
  }

  get isEnabled(): boolean {
    return this.creds !== null && this.tokenManager !== null
  }

  async send(token: string, message: PushNotificationMessage): Promise<PushSendResult> {
    if (!this.isEnabled || !this.creds || !this.tokenManager) {
      return {
        success: false,
        skipped: true,
        error: 'Push transport is disabled (credentials absent)'
      }
    }

    try {
      const accessToken = await this.tokenManager.getAccessToken()
      const url = `https://fcm.googleapis.com/v1/projects/${this.creds.projectId}/messages:send`

      // FCM HTTP v1 veri ve bildirim yapisi
      const fcmPayload = {
        message: {
          token,
          notification: {
            title: message.title,
            body: message.body
          },
          data: {
            ...message.data
          },
          android: {
            priority: 'HIGH',
            notification: {
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      })

      if (response.ok) {
        return { success: true }
      }

      const status = response.status
      const errorBody = (await response.json().catch(() => ({}))) as FcmErrorPayload

      const classification = classifyFcmError(status, errorBody)

      return {
        success: false,
        invalidToken: classification.invalidToken,
        error: errorBody.error?.message || `FCM error HTTP ${status}`
      }
    } catch (error) {
      return {
        success: false,
        invalidToken: false,
        error: error instanceof Error ? error.message : 'Unknown transport error'
      }
    }
  }
}

export interface SentPushRecord {
  token: string
  message: PushNotificationMessage
  sentAt: Date
}

/**
 * Test ve yerel gelistirme icin sahte (fake) transport.
 */
export class FakePushTransport implements PushTransport {
  readonly name = 'fake-push'
  public isEnabled = true
  public sentMessages: SentPushRecord[] = []
  private nextResult: PushSendResult | null = null

  failNextWithInvalidToken(error = 'Requested entity was not found.'): void {
    this.nextResult = { success: false, invalidToken: true, error }
  }

  failNextWithTransientError(error = 'Service Unavailable 503'): void {
    this.nextResult = { success: false, invalidToken: false, error }
  }

  simulateResult(result: PushSendResult): void {
    this.nextResult = result
  }

  clear(): void {
    this.sentMessages = []
    this.nextResult = null
  }

  async send(token: string, message: PushNotificationMessage): Promise<PushSendResult> {
    if (this.nextResult) {
      const res = this.nextResult
      this.nextResult = null
      return res
    }

    if (!this.isEnabled) {
      return {
        success: false,
        skipped: true,
        error: 'Push transport is disabled (credentials absent)'
      }
    }

    this.sentMessages.push({
      token,
      message,
      sentAt: new Date()
    })

    return { success: true }
  }
}
