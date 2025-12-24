'use client'

import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'
import RecruitsBySourceChart from '@/components/RecruitsBySourceChart'
import RecruitsPerDayChart from '@/components/RecruitsPerDayChart'
import Link from 'next/link'

interface Stats {
  kpis: {
    totalRecruits: number
    currentSeasonRecruits: number
    topSource: {
      name: string
      count: number
    }
  }
  charts: {
    recruitsPerDay: Array<{ date: string; count: number }>
    recruitsBySource: Array<{ source: string; count: number }>
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching stats:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-600">Error loading stats</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              VHL Recruitment Tracker
            </h1>
            <nav className="flex gap-4">
              <Link
                href="/"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href="/recruits"
                className="text-gray-600 dark:text-gray-400 hover:underline"
              >
                Recruits
              </Link>
              <Link
                href="/admin"
                className="text-gray-600 dark:text-gray-400 hover:underline"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Total Recruits"
            value={stats.kpis.totalRecruits}
            subtitle="All time"
          />
          <KPICard
            title="Current Season"
            value={stats.kpis.currentSeasonRecruits}
            subtitle="This season's recruits"
          />
          <KPICard
            title="Top Source"
            value={stats.kpis.topSource.name}
            subtitle={`${stats.kpis.topSource.count} recruits`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecruitsPerDayChart data={stats.charts.recruitsPerDay} />
          <RecruitsBySourceChart data={stats.charts.recruitsBySource} />
        </div>
      </main>
    </div>
  )
}
