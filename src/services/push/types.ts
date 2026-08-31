/**
 * Push bildirimleri anlamsal veri hedefi ve yuk tanimlari.
 *
 * YUK GUVENLIGI VE GIZLILIK:
 * - Parolalar, erisim tokenleri, yenileme tokenleri, hassas musteri verileri,
 *   tam ozel mesaj govdesi veya finansal tutarlar PUSH VERISINE DAHIL EDILMEZ.
 * - Anlamsal hedefler ("target") kesin olarak ayrilmis tiplerdir (discriminated union).
 */

export type PushTarget =
  | { target: 'community_post'; postId: string }
  | { target: 'community_thread'; threadId: string }
  | { target: 'workspace_record'; workspaceId: string; recordId: string }
  | { target: 'account' }

export interface PushNotificationMessage {
  title: string
  body: string
  data: PushTarget
}

export interface PushSendResult {
  success: boolean
  skipped?: boolean
  error?: string
  invalidToken?: boolean
}

export interface PushDeliverySummary {
  attempted: number
  sent: number
  failed: number
  invalidated: number
  skipped: number
}
