import { NextRequest, NextResponse } from 'next/server'
import { runRSSPoll } from '@/lib/jobs/rss-poll'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runRSSPoll()
    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('RSS Poll API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
