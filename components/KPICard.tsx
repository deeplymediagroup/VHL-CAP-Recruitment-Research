'use client'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
}

export default function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {subtitle}
        </p>
      )}
    </div>
  )
}
