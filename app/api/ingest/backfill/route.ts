import { NextRequest, NextResponse } from 'next/server'
import { runBackfill } from '@/lib/jobs/backfill'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runBackfill()
    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Backfill API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
