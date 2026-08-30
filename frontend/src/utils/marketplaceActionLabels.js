const ACTION_KEYS = {
  PENDING_SHIPMENT: 'actions.pendingShipment', STALE_ORDER: 'actions.staleOrder',
  LOW_STOCK: 'actions.lowStock', OUT_OF_STOCK: 'actions.outOfStock',
  RETURN_PENDING: 'actions.returnPending', HIGH_RETURN_RATE: 'actions.highReturnRate',
  SYNC_ERROR: 'actions.syncError'
}

export function marketplaceActionLabel(action, t) {
  const key = ACTION_KEYS[action?.type]
  return key ? t(`workspace:${key}`, { count: Number(action?.count || 0) }) : action?.title || ''
}
