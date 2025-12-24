import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VHL Recruitment Tracker',
  description: 'Track Victory Hockey League recruitment metrics and sources',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
