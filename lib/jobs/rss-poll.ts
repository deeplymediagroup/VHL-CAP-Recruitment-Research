import { fetchRSSFeed } from '../rss-parser'
import { extractTopicId } from '../extractors'
import {
  ingestTopic,
  getCheckpoint,
  setCheckpoint,
  createIngestionRun,
  finishIngestionRun,
  delay,
} from '../ingestion-service'
import { prisma } from '../db'

const RSS_FEED_URL = 'https://vhlforum.com/forum/125-create-a-player.xml?type=rss'
const TOPIC_PAGE_DELAY_MS = 2000

export interface RSSPollResult {
  itemsFound: number
  topicsIngested: number
  topicsFailed: number
  errors: string[]
}

/**
 * RSS Polling Job
 * Continuously detect new Create-a-Player topics with minimal load
 */
export async function runRSSPoll(): Promise<RSSPollResult> {
  const run = await createIngestionRun('RSS_POLL')
  const errors: string[] = []

  try {
    // Fetch RSS feed
    const items = await fetchRSSFeed(RSS_FEED_URL)
    console.log(`RSS Poll: Found ${items.length} items in feed`)

    // Get last seen topic ID
    const lastSeenTopicIdStr = await getCheckpoint('rss:last_seen_topic_id')
    const lastSeenTopicId = parseInt(lastSeenTopicIdStr || '0', 10)

    let topicsIngested = 0
    let topicsFailed = 0
    let newLastSeenTopicId = lastSeenTopicId
    const newTopicIds: number[] = []

    // Process items
    for (const item of items) {
      const topicId = extractTopicId(item.link)
      if (!topicId) continue

      // Skip if already seen
      if (topicId <= lastSeenTopicId) continue

      // Check if already in database
      const existing = await prisma.recruit.findUnique({
        where: { topicId },
      })

      if (existing) {
        console.log(`RSS Poll: Topic ${topicId} already exists, skipping`)
        continue
      }

      newTopicIds.push(topicId)

      // Ingest topic
      console.log(`RSS Poll: Ingesting topic ${topicId}`)
      const pubDate = item.pubDate ? new Date(item.pubDate) : undefined
      const result = await ingestTopic(item.link, pubDate)

      if (result.success) {
        topicsIngested++
        console.log(`RSS Poll: Successfully ingested topic ${topicId}`)
      } else {
        topicsFailed++
        errors.push(`Topic ${topicId}: ${result.error}`)
        console.error(`RSS Poll: Failed to ingest topic ${topicId}: ${result.error}`)
      }

      // Update max topic ID seen
      if (topicId > newLastSeenTopicId) {
        newLastSeenTopicId = topicId
      }

      // Throttle
      await delay(TOPIC_PAGE_DELAY_MS)
    }

    // Update checkpoints
    if (newLastSeenTopicId > lastSeenTopicId) {
      await setCheckpoint('rss:last_seen_topic_id', newLastSeenTopicId.toString())
    }

    if (items.length > 0 && items[0].pubDate) {
      await setCheckpoint('rss:last_pubdate', items[0].pubDate)
    }

    // Finish run
    await finishIngestionRun(run.id, {
      itemsFound: items.length,
      topicsIngested,
      topicsFailed,
      errors,
    })

    return {
      itemsFound: items.length,
      topicsIngested,
      topicsFailed,
      errors,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Fatal error: ${errorMsg}`)

    await finishIngestionRun(run.id, {
      itemsFound: 0,
      topicsIngested: 0,
      topicsFailed: 0,
      errors,
    })

    throw error
  }
}
