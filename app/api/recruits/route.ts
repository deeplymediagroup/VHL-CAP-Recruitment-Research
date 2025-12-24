import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search') || ''
    const season = searchParams.get('season')
    const source = searchParams.get('source')

    // Build filter
    const where: any = {}

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { playerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (season && season !== 'all') {
      where.seasonNumber = parseInt(season, 10)
    }

    if (source && source !== 'all') {
      where.recruitedFrom = source
    }

    // Get total count
    const total = await prisma.recruit.count({ where })

    // Get recruits
    const recruits = await prisma.recruit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      recruits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Recruits API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
