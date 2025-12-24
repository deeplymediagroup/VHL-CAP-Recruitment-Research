import axios from 'axios'
import { chromium, Browser, Page } from 'playwright'

/**
 * Fetch page content using plain HTTP request with browser-like headers
 */
export async function fetchPagePlain(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      timeout: 30000,
    })

    return response.data
  } catch (error) {
    console.error('Error fetching page (plain):', error)
    throw error
  }
}

/**
 * Fetch page content using Playwright (for bot protection)
 */
export async function fetchPageWithPlaywright(url: string): Promise<string> {
  let browser: Browser | null = null
  try {
    // Check if we have a stored authentication state
    let storageState = undefined
    if (process.env.PLAYWRIGHT_STORAGE_STATE_B64) {
      const decoded = Buffer.from(
        process.env.PLAYWRIGHT_STORAGE_STATE_B64,
        'base64'
      ).toString('utf-8')
      storageState = JSON.parse(decoded)
    }

    browser = await chromium.launch({
      headless: true,
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      ...(storageState && { storageState }),
    })

    const page: Page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    const content = await page.content()
    await browser.close()

    return content
  } catch (error) {
    if (browser) await browser.close()
    console.error('Error fetching page (Playwright):', error)
    throw error
  }
}

/**
 * Fetch page with automatic fallback from plain to Playwright
 */
export async function fetchPage(url: string): Promise<string> {
  try {
    return await fetchPagePlain(url)
  } catch (error) {
    console.log('Plain fetch failed, trying Playwright...')
    return await fetchPageWithPlaywright(url)
  }
}

/**
 * Extract first post content from topic page
 */
export function extractFirstPostContent(html: string): string {
  // Look for the first post content block
  // VHL forum uses various classes, we'll try to extract the content area

  // Try to find the post content area (common patterns)
  const patterns = [
    /<div[^>]*class="[^"]*ipsType_normal[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*cPost_contentWrap[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*class="[^"]*ipsComment[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      // Strip HTML tags and decode entities
      let content = match[1]
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      content = content.replace(/<[^>]+>/g, '\n')
      content = content.replace(/&nbsp;/g, ' ')
      content = content.replace(/&amp;/g, '&')
      content = content.replace(/&lt;/g, '<')
      content = content.replace(/&gt;/g, '>')
      content = content.replace(/&quot;/g, '"')
      return content
    }
  }

  // Fallback: return raw HTML if no pattern matches
  return html
}

/**
 * Extract topic creation date from page
 */
export function extractTopicDate(html: string): Date | null {
  // Try to find the timestamp (ISO format or relative time)
  const isoPattern = /<time[^>]*datetime=["']([^"']+)["']/i
  const match = html.match(isoPattern)

  if (match) {
    return new Date(match[1])
  }

  return null
}
