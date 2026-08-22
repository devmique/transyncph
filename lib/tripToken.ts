import jwt from 'jsonwebtoken'

// Deliberately does not import from './auth' or 'next/server': server.ts (the
// custom socket.io server) imports this, and should not pull in Next request
// types just to verify a token.

// Read lazily rather than at module load. server.ts imports this file, and
// under tsx that import is evaluated before Next has loaded .env.local, so a
// module-level throw would crash the server on boot.
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

// 12 hours - long enough for a driver's shift, short enough that a leaked link
// stops working the same day.
const TRIP_TOKEN_TTL_SECONDS = 60 * 60 * 12

export interface TripToken {
  /** Discriminator so an operator's session token can never be replayed as a
   *  trip token, and vice versa. Both are signed with the same secret. */
  kind: 'trip'
  scheduleId: string
  operatorId: string
  companyName: string
  vehicleNumber: string
  routeNumber: string
}

export function generateTripToken(claims: Omit<TripToken, 'kind'>): string {
  return jwt.sign({ ...claims, kind: 'trip' }, jwtSecret(), {
    expiresIn: TRIP_TOKEN_TTL_SECONDS,
  })
}

export function verifyTripToken(token: string): TripToken | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as TripToken
    if (!decoded || decoded.kind !== 'trip' || !decoded.scheduleId) return null
    return decoded
  } catch {
    return null
  }
}
