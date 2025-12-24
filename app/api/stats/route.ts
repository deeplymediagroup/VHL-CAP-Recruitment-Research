import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const source = searchParams.get('source')

    // Build filter
    const where: any = {}

    if (season && season !== 'all') {
      where.seasonNumber = parseInt(season, 10)
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (source && source !== 'all') {
      where.recruitedFrom = source
    }

    // Get total recruits with filter
    const totalRecruits = await prisma.recruit.count({ where })

    // Get current season recruits
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'desc' },
    })
    const currentSeason = seasons[0]
    const currentSeasonRecruits = currentSeason
      ? await prisma.recruit.count({
          where: {
            seasonNumber: currentSeason.seasonNumber,
            ...where,
          },
        })
      : 0

    // Get top recruited_from source
    const sourceStats = await prisma.recruit.groupBy({
      by: ['recruitedFrom'],
      where,
      _count: true,
      orderBy: {
        _count: {
          recruitedFrom: 'desc',
        },
      },
    })

    const topSource = sourceStats[0]
      ? {
          name: sourceStats[0].recruitedFrom || 'Unknown',
          count: sourceStats[0]._count,
        }
      : { name: 'N/A', count: 0 }

    // Get recruits per day
    const recruitsPerDay = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM recruits
      ${where.createdAt ? `WHERE created_at >= ${where.createdAt.gte} AND created_at <= ${where.createdAt.lte}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `

    // Get recruits by source
    const recruitsBySource = sourceStats.map((s) => ({
      source: s.recruitedFrom || 'Unknown',
      count: s._count,
    }))

    return NextResponse.json({
      kpis: {
        totalRecruits,
        currentSeasonRecruits,
        topSource,
      },
      charts: {
        recruitsPerDay: recruitsPerDay.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
        recruitsBySource,
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
