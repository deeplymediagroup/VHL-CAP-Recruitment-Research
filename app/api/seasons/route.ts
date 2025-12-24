import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { seasonNumber: 'desc' },
    })
    return NextResponse.json({ seasons })
  } catch (error) {
    console.error('Seasons API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seasonNumber, startDate } = body

    const season = await prisma.season.create({
      data: {
        seasonNumber: parseInt(seasonNumber, 10),
        startDate: new Date(startDate),
      },
    })

    return NextResponse.json({ season })
  } catch (error) {
    console.error('Create season error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
