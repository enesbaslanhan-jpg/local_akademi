import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../../lib/prisma.js'
import {
  type PushDeliverySummary,
  type PushNotificationMessage,
  type PushSendResult
} from './types.js'
import {
  type PushTransport,
  FirebaseHttpV1Transport,
  maskPushToken
} from './transport.js'

/**
 * Merkezi Push Bildirim Servisi.
 *
 * IS VE HATA YALITIM PRENSIPLERI:
 * 1. Push gonderimi ikincil bir yan etkidir; birincil veritabani islemini (kayit, begeni, mesaj, odeme)
 *    asla kesintiye ugratmaz ve transaction icinde calistirilmaz.
 * 2. Cihaz token'i gecersizlendiginde (UNREGISTERED vb.) ilgili PushInstallation kaydi guvenle silinir.
 * 3. Gunluklerde token'lar ve gizli bilgiler maskelenir.
 */
export class PushService {
  private transport: PushTransport

  constructor(
    private readonly prisma: PrismaClient = sharedPrisma,
    transport?: PushTransport
  ) {
    this.transport = transport ?? new FirebaseHttpV1Transport()
  }

  setTransport(transport: PushTransport): void {
    this.transport = transport
  }

  getTransport(): PushTransport {
    return this.transport
  }

  /**
   * Belirli bir kullanicinin tum aktif cihazlarina bildirim gonderir.
   */
  async sendToUser(
    userId: number,
    message: PushNotificationMessage
  ): Promise<PushDeliverySummary> {
    const summary: PushDeliverySummary = {
      attempted: 0,
      sent: 0,
      failed: 0,
      invalidated: 0,
      skipped: 0
    }

    try {
      const installations = await this.prisma.pushInstallation.findMany({
        where: {
          userId,
          enabled: true
        }
      })

      if (installations.length === 0) {
        return summary
      }

      summary.attempted = installations.length

      await Promise.all(
        installations.map(async installation => {
          try {
            const result = await this.transport.send(installation.pushToken, message)
            if (result.success) {
              summary.sent += 1
              return
            }

            if (result.skipped) {
              summary.skipped += 1
              return
            }

            if (result.invalidToken) {
              summary.invalidated += 1
              // Gecersiz/silinmis token satiri veritabanindan temizlenir
              await this.prisma.pushInstallation
                .delete({
                  where: { id: installation.id }
                })
                .catch(() => {})
            } else {
              summary.failed += 1
            }
          } catch {
            summary.failed += 1
          }
        })
      )
    } catch {
      // Birincil akisi bozmamak icin tum hatalar yutulur
    }

    return summary
  }

  /**
   * Belirli bir kuruluma tekil bildirim gonderir.
   */
  async sendToInstallation(
    installationId: string,
    message: PushNotificationMessage
  ): Promise<PushSendResult> {
    try {
      const installation = await this.prisma.pushInstallation.findUnique({
        where: { installationId }
      })

      if (!installation || !installation.enabled) {
        return { success: false, error: 'Installation not found or disabled' }
      }

      const result = await this.transport.send(installation.pushToken, message)
      if (result.invalidToken) {
        await this.prisma.pushInstallation
          .delete({
            where: { id: installation.id }
          })
          .catch(() => {})
      }
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown push service error'
      }
    }
  }
}

export const pushService = new PushService(sharedPrisma)
