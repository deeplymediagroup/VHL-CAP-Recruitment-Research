import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const runs = await prisma.ingestionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('Ingestion runs API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
