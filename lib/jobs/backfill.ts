import { extractTopicUrls, extractTopicId } from '../extractors'
import { fetchPage } from '../scraper'
import {
  ingestTopic,
  getCheckpoint,
  setCheckpoint,
  createIngestionRun,
  finishIngestionRun,
  delay,
} from '../ingestion-service'
import { prisma } from '../db'

const FORUM_BASE_URL = 'https://vhlforum.com/forum/125-create-a-player/'
const MAX_FORUM_PAGES = 249
const FORUM_PAGE_DELAY_MS = 1500
const TOPIC_PAGE_DELAY_MS = 2000
const MAX_TOPICS_PER_RUN = 200
const MAX_FORUM_PAGES_PER_RUN = 10

export interface BackfillResult {
  pagesScanned: number
  itemsFound: number
  topicsIngested: number
  topicsFailed: number
  completed: boolean
  errors: string[]
}

/**
 * Backfill History Job
 * Scan forum pages 1-249 to ingest all historical recruits
 */
export async function runBackfill(): Promise<BackfillResult> {
  const run = await createIngestionRun('BACKFILL')
  const errors: string[] = []

  try {
    // Get last page scanned
    const lastPageStr = await getCheckpoint('backfill:last_page_scanned')
    let currentPage = parseInt(lastPageStr || '1', 10)

    let pagesScanned = 0
    let topicsIngested = 0
    let topicsFailed = 0
    let totalTopicsFound = 0
    let topicsProcessedThisRun = 0

    console.log(`Backfill: Starting from page ${currentPage}`)

    // Scan forum pages
    while (
      currentPage <= MAX_FORUM_PAGES &&
      pagesScanned < MAX_FORUM_PAGES_PER_RUN &&
      topicsProcessedThisRun < MAX_TOPICS_PER_RUN
    ) {
      const pageUrl =
        currentPage === 1
          ? FORUM_BASE_URL
          : `${FORUM_BASE_URL}page/${currentPage}/`

      console.log(`Backfill: Scanning page ${currentPage}`)

      try {
        // Fetch forum listing page
        const html = await fetchPage(pageUrl)
        const topicUrls = extractTopicUrls(html)

        console.log(`Backfill: Found ${topicUrls.length} topics on page ${currentPage}`)
        totalTopicsFound += topicUrls.length

        // Process each topic
        for (const topicUrl of topicUrls) {
          if (topicsProcessedThisRun >= MAX_TOPICS_PER_RUN) {
            console.log(`Backfill: Reached max topics per run (${MAX_TOPICS_PER_RUN})`)
            break
          }

          const topicId = extractTopicId(topicUrl)
          if (!topicId) continue

          // Check if already in database
          const existing = await prisma.recruit.findUnique({
            where: { topicId },
          })

          if (existing) {
            console.log(`Backfill: Topic ${topicId} already exists, skipping`)
            continue
          }

          // Ingest topic
          console.log(`Backfill: Ingesting topic ${topicId}`)
          const result = await ingestTopic(topicUrl)

          if (result.success) {
            topicsIngested++
            console.log(`Backfill: Successfully ingested topic ${topicId}`)
          } else {
            topicsFailed++
            errors.push(`Topic ${topicId}: ${result.error}`)
            console.error(`Backfill: Failed to ingest topic ${topicId}: ${result.error}`)
          }

          topicsProcessedThisRun++

          // Throttle
          await delay(TOPIC_PAGE_DELAY_MS)
        }

        pagesScanned++
        currentPage++

        // Update checkpoint after each page
        await setCheckpoint('backfill:last_page_scanned', currentPage.toString())

        // Throttle between forum pages
        await delay(FORUM_PAGE_DELAY_MS)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Page ${currentPage}: ${errorMsg}`)
        console.error(`Backfill: Error scanning page ${currentPage}:`, error)

        // Continue to next page
        currentPage++
        await setCheckpoint('backfill:last_page_scanned', currentPage.toString())
      }
    }

    const completed = currentPage > MAX_FORUM_PAGES

    // Mark as completed if we reached the end
    if (completed) {
      await setCheckpoint('backfill:completed', 'true')
      console.log('Backfill: Completed all pages!')
    }

    // Finish run
    await finishIngestionRun(run.id, {
      itemsFound: totalTopicsFound,
      topicsIngested,
      topicsFailed,
      errors,
    })

    return {
      pagesScanned,
      itemsFound: totalTopicsFound,
      topicsIngested,
      topicsFailed,
      completed,
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
