// Field extraction utilities with regex patterns

export interface PlayerData {
  username?: string
  playerName?: string
  recruitedFrom?: string
  age?: number
  position?: string
  heightIn?: number
  weightLbs?: number
  birthplace?: string
}

// Regex patterns from spec
const FIELD_PATTERNS = {
  username: /(?im)^\s*Username:\s*(.+)\s*$/,
  playerName: /(?im)^\s*Player\s+Name:\s*(.+)\s*$/,
  recruitedFrom: /(?im)^\s*Recruited\s+From:\s*(.+)\s*$/,
  age: /(?im)^\s*Age:\s*(\d+)\s*$/,
  position: /(?im)^\s*Position:\s*(.+)\s*$/,
  heightIn: /(?im)^\s*Height:\s*(\d+)\s*in\.?\s*$/,
  weightLbs: /(?im)^\s*Weight:\s*(\d+)\s*lbs?\.?\s*$/,
  birthplace: /(?im)^\s*Birthplace:\s*(.+)\s*$/,
}

/**
 * Extract player data from topic page content
 */
export function extractPlayerData(content: string): PlayerData {
  const data: PlayerData = {}

  // Extract username
  const usernameMatch = content.match(FIELD_PATTERNS.username)
  if (usernameMatch) data.username = usernameMatch[1].trim()

  // Extract player name
  const playerNameMatch = content.match(FIELD_PATTERNS.playerName)
  if (playerNameMatch) data.playerName = playerNameMatch[1].trim()

  // Extract recruited from
  const recruitedFromMatch = content.match(FIELD_PATTERNS.recruitedFrom)
  if (recruitedFromMatch) {
    data.recruitedFrom = normalizeRecruitedFrom(recruitedFromMatch[1].trim())
  }

  // Extract age
  const ageMatch = content.match(FIELD_PATTERNS.age)
  if (ageMatch) data.age = parseInt(ageMatch[1], 10)

  // Extract position
  const positionMatch = content.match(FIELD_PATTERNS.position)
  if (positionMatch) data.position = positionMatch[1].trim()

  // Extract height
  const heightMatch = content.match(FIELD_PATTERNS.heightIn)
  if (heightMatch) data.heightIn = parseInt(heightMatch[1], 10)

  // Extract weight
  const weightMatch = content.match(FIELD_PATTERNS.weightLbs)
  if (weightMatch) data.weightLbs = parseInt(weightMatch[1], 10)

  // Extract birthplace
  const birthplaceMatch = content.match(FIELD_PATTERNS.birthplace)
  if (birthplaceMatch) data.birthplace = birthplaceMatch[1].trim()

  return data
}

/**
 * Normalize recruited_from field using alias map
 */
export function normalizeRecruitedFrom(value: string): string {
  if (!value) return 'Other'

  // Trim and collapse whitespace
  let normalized = value.trim().replace(/\s+/g, ' ')

  // Alias map (case-insensitive matching)
  const aliasMap: Record<string, string> = {
    yt: 'YouTube',
    youtube: 'YouTube',
    discord: 'Discord',
    reddit: 'Reddit',
    twitter: 'Twitter/X',
    x: 'Twitter/X',
    friend: 'Friend',
    other: 'Other',
  }

  const lowerValue = normalized.toLowerCase()
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (lowerValue === alias) {
      return canonical
    }
  }

  // If no match, return the normalized value
  return normalized || 'Other'
}

/**
 * Extract topic ID from VHL forum URL
 */
export function extractTopicId(url: string): number | null {
  const match = url.match(/^https?:\/\/vhlforum\.com\/topic\/(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extract topic URLs from forum listing page HTML
 */
export function extractTopicUrls(html: string): string[] {
  const urls: string[] = []
  // Match topic links in the forum listing
  // Example: <a href="https://vhlforum.com/topic/123456-player-name" ...>
  const urlPattern = /href=["'](https?:\/\/vhlforum\.com\/topic\/\d+-[^"']+)["']/gi

  let match
  while ((match = urlPattern.exec(html)) !== null) {
    const url = match[1]
    if (!urls.includes(url)) {
      urls.push(url)
    }
  }

  return urls
}

/**
 * Determine season number for a given date
 */
export function determineSeasonNumber(
  createdAt: Date,
  seasons: Array<{ seasonNumber: number; startDate: Date }>
): number | null {
  // Sort seasons by start date (oldest first)
  const sortedSeasons = [...seasons].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )

  // Find the most recent season whose start_date <= createdAt
  let matchedSeason: number | null = null
  for (const season of sortedSeasons) {
    if (createdAt >= season.startDate) {
      matchedSeason = season.seasonNumber
    } else {
      break
    }
  }

  return matchedSeason
}
