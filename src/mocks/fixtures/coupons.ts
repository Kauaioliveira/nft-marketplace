export type CouponRecord = {
  code: string
  percentOff: number
  expiresAt: string
}

export function createCouponFixtures(): CouponRecord[] {
  return [
    { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
    { code: 'SELVA25', percentOff: 25, expiresAt: '2099-12-31T23:59:59.000Z' },
    { code: 'VENCIDO15', percentOff: 15, expiresAt: '2025-01-01T00:00:00.000Z' },
  ]
}
