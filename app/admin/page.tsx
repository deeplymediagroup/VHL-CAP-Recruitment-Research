'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Season {
  id: string
  seasonNumber: number
  startDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}

interface IngestionRun {
  id: string
  runType: string
  startedAt: string
  finishedAt: string | null
  itemsFound: number
  topicsIngested: number
  topicsFailed: number
  errorsJson: any
}

export default function AdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [runs, setRuns] = useState<IngestionRun[]>([])
  const [loading, setLoading] = useState(true)
  const [newSeason, setNewSeason] = useState({
    seasonNumber: '',
    startDate: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/seasons').then((r) => r.json()),
      fetch('/api/ingestion-runs').then((r) => r.json()),
    ])
      .then(([seasonsData, runsData]) => {
        setSeasons(seasonsData.seasons || [])
        setRuns(runsData.runs || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching admin data:', error)
        setLoading(false)
      })
  }, [])

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeason),
      })

      if (response.ok) {
        const data = await response.json()
        setSeasons([data.season, ...seasons])
        setNewSeason({ seasonNumber: '', startDate: '' })
      } else {
        alert('Error creating season')
      }
    } catch (error) {
      console.error('Error creating season:', error)
      alert('Error creating season')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              VHL Recruitment Tracker - Admin
            </h1>
            <nav className="flex gap-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:underline"
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
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-8">
            {/* Seasons */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Seasons
              </h2>

              {/* Create Season Form */}
              <form onSubmit={handleCreateSeason} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Season Number (e.g., 104)"
                    value={newSeason.seasonNumber}
                    onChange={(e) =>
                      setNewSeason({ ...newSeason, seasonNumber: e.target.value })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="date"
                    value={newSeason.startDate}
                    onChange={(e) =>
                      setNewSeason({ ...newSeason, startDate: e.target.value })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Season
                  </button>
                </div>
              </form>

              {/* Seasons List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Season
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        End Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {seasons.map((season) => (
                      <tr key={season.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          S{season.seasonNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(season.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {season.endDate
                            ? new Date(season.endDate).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ingestion Runs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ingestion Runs
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Found
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ingested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Failed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {run.runType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(run.startedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {run.finishedAt ? (
                            <span className="text-green-600 dark:text-green-400">
                              Completed
                            </span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              Running
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {run.itemsFound}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {run.topicsIngested}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {run.topicsFailed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Ingestion Triggers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Manual Ingestion
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Trigger ingestion jobs manually. Note: These jobs may take several
                minutes to complete.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    window.open('/api/ingest/rss', '_blank')
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Run RSS Poll
                </button>
                <button
                  onClick={() =>
                    window.open('/api/ingest/backfill', '_blank')
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Run Backfill
                </button>
                <button
                  onClick={() =>
                    window.open('/api/ingest/light-crawl', '_blank')
                  }
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Run Light Crawl
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
