import { NextRequest, NextResponse } from 'next/server'
import { runLightCrawl } from '@/lib/jobs/light-crawl'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runLightCrawl()
    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Light Crawl API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
