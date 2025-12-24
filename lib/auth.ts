import { NextRequest } from 'next/server'

/**
 * Verify cron secret for API endpoints
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not set, allowing request')
    return true // Allow in development
  }

  const token = authHeader?.replace('Bearer ', '')
  return token === cronSecret
}
