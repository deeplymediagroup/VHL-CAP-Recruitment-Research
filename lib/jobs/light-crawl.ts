import { extractTopicUrls, extractTopicId } from '../extractors'
import { fetchPage } from '../scraper'
import {
  ingestTopic,
  createIngestionRun,
  finishIngestionRun,
  delay,
} from '../ingestion-service'
import { prisma } from '../db'

const FORUM_BASE_URL = 'https://vhlforum.com/forum/125-create-a-player/'
const PAGES_TO_SCAN = 3
const FORUM_PAGE_DELAY_MS = 1500
const TOPIC_PAGE_DELAY_MS = 2000

export interface LightCrawlResult {
  itemsFound: number
  topicsIngested: number
  topicsFailed: number
  errors: string[]
}

/**
 * Light Crawl Safety Net Job
 * Lightly scan first 1-3 pages daily in case RSS misses items
 */
export async function runLightCrawl(): Promise<LightCrawlResult> {
  const run = await createIngestionRun('LIGHT_CRAWL')
  const errors: string[] = []

  try {
    let topicsIngested = 0
    let topicsFailed = 0
    let totalTopicsFound = 0

    console.log(`Light Crawl: Scanning first ${PAGES_TO_SCAN} pages`)

    // Scan first N pages
    for (let page = 1; page <= PAGES_TO_SCAN; page++) {
      const pageUrl = page === 1 ? FORUM_BASE_URL : `${FORUM_BASE_URL}page/${page}/`

      console.log(`Light Crawl: Scanning page ${page}`)

      try {
        // Fetch forum listing page
        const html = await fetchPage(pageUrl)
        const topicUrls = extractTopicUrls(html)

        console.log(`Light Crawl: Found ${topicUrls.length} topics on page ${page}`)
        totalTopicsFound += topicUrls.length

        // Process each topic
        for (const topicUrl of topicUrls) {
          const topicId = extractTopicId(topicUrl)
          if (!topicId) continue

          // Check if already in database
          const existing = await prisma.recruit.findUnique({
            where: { topicId },
          })

          if (existing) {
            console.log(`Light Crawl: Topic ${topicId} already exists, skipping`)
            continue
          }

          // Ingest topic
          console.log(`Light Crawl: Ingesting topic ${topicId}`)
          const result = await ingestTopic(topicUrl)

          if (result.success) {
            topicsIngested++
            console.log(`Light Crawl: Successfully ingested topic ${topicId}`)
          } else {
            topicsFailed++
            errors.push(`Topic ${topicId}: ${result.error}`)
            console.error(`Light Crawl: Failed to ingest topic ${topicId}: ${result.error}`)
          }

          // Throttle
          await delay(TOPIC_PAGE_DELAY_MS)
        }

        // Throttle between forum pages
        if (page < PAGES_TO_SCAN) {
          await delay(FORUM_PAGE_DELAY_MS)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Page ${page}: ${errorMsg}`)
        console.error(`Light Crawl: Error scanning page ${page}:`, error)
      }
    }

    // Finish run
    await finishIngestionRun(run.id, {
      itemsFound: totalTopicsFound,
      topicsIngested,
      topicsFailed,
      errors,
    })

    return {
      itemsFound: totalTopicsFound,
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
