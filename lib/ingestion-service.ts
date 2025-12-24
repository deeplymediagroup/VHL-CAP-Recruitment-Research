import { prisma } from './db'
import {
  extractPlayerData,
  extractTopicId,
  determineSeasonNumber,
} from './extractors'
import {
  fetchPage,
  extractFirstPostContent,
  extractTopicDate,
} from './scraper'

export interface IngestTopicResult {
  success: boolean
  topicId: number
  error?: string
}

/**
 * Ingest a single topic by URL
 */
export async function ingestTopic(
  topicUrl: string,
  rssPubDate?: Date
): Promise<IngestTopicResult> {
  const topicId = extractTopicId(topicUrl)

  if (!topicId) {
    return {
      success: false,
      topicId: 0,
      error: 'Invalid topic URL - could not extract topic ID',
    }
  }

  try {
    // Check if already ingested
    const existing = await prisma.recruit.findUnique({
      where: { topicId },
    })

    // Fetch topic page
    const html = await fetchPage(topicUrl)
    const postContent = extractFirstPostContent(html)

    // Extract player data
    const playerData = extractPlayerData(postContent)

    // Extract topic creation date
    let createdAt = extractTopicDate(html) || rssPubDate || new Date()

    // Determine season number
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'asc' },
    })
    const seasonNumber = determineSeasonNumber(createdAt, seasons)

    // Prepare recruit data
    const recruitData = {
      topicId,
      topicUrl,
      topicTitle: '', // Could extract from HTML if needed
      createdAt,
      seasonNumber,
      username: playerData.username,
      playerName: playerData.playerName,
      recruitedFrom: playerData.recruitedFrom,
      position: playerData.position,
      age: playerData.age,
      heightIn: playerData.heightIn,
      weightLbs: playerData.weightLbs,
      birthplace: playerData.birthplace,
      rawTextSnapshot: postContent,
      ingestedAt: new Date(),
    }

    if (existing) {
      // Upsert: fill missing fields and update recruited_from if changed
      const updateData: any = {}

      if (!existing.username && recruitData.username) {
        updateData.username = recruitData.username
      }
      if (!existing.playerName && recruitData.playerName) {
        updateData.playerName = recruitData.playerName
      }
      if (recruitData.recruitedFrom && existing.recruitedFrom !== recruitData.recruitedFrom) {
        updateData.recruitedFrom = recruitData.recruitedFrom
      }
      if (!existing.position && recruitData.position) {
        updateData.position = recruitData.position
      }
      if (!existing.age && recruitData.age) {
        updateData.age = recruitData.age
      }
      if (!existing.heightIn && recruitData.heightIn) {
        updateData.heightIn = recruitData.heightIn
      }
      if (!existing.weightLbs && recruitData.weightLbs) {
        updateData.weightLbs = recruitData.weightLbs
      }
      if (!existing.birthplace && recruitData.birthplace) {
        updateData.birthplace = recruitData.birthplace
      }
      if (!existing.createdAt && recruitData.createdAt) {
        updateData.createdAt = recruitData.createdAt
      }
      if (!existing.seasonNumber && recruitData.seasonNumber) {
        updateData.seasonNumber = recruitData.seasonNumber
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.recruit.update({
          where: { topicId },
          data: updateData,
        })
      }
    } else {
      // Insert new recruit
      await prisma.recruit.create({
        data: recruitData,
      })
    }

    return {
      success: true,
      topicId,
    }
  } catch (error) {
    console.error(`Error ingesting topic ${topicId}:`, error)
    return {
      success: false,
      topicId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get or create checkpoint
 */
export async function getCheckpoint(key: string): Promise<string> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { key },
  })
  return checkpoint?.value || ''
}

/**
 * Update checkpoint
 */
export async function setCheckpoint(key: string, value: string): Promise<void> {
  await prisma.checkpoint.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

/**
 * Create ingestion run record
 */
export async function createIngestionRun(runType: 'RSS_POLL' | 'BACKFILL' | 'LIGHT_CRAWL') {
  return await prisma.ingestionRun.create({
    data: {
      runType,
      startedAt: new Date(),
    },
  })
}

/**
 * Update ingestion run with results
 */
export async function finishIngestionRun(
  runId: string,
  stats: {
    itemsFound: number
    topicsIngested: number
    topicsFailed: number
    errors?: any[]
  }
) {
  await prisma.ingestionRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      itemsFound: stats.itemsFound,
      topicsIngested: stats.topicsIngested,
      topicsFailed: stats.topicsFailed,
      errorsJson: stats.errors || [],
    },
  })
}

/**
 * Throttle/delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
