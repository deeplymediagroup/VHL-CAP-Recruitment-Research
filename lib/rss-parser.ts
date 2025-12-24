import axios from 'axios'
import { parseString } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify(parseString)

export interface RSSItem {
  title: string
  link: string
  pubDate: string
  guid: string
}

/**
 * Fetch and parse RSS feed from VHL forum
 */
export async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      timeout: 30000,
    })

    const parsed: any = await parseXML(response.data)

    if (!parsed.rss || !parsed.rss.channel || !parsed.rss.channel[0].item) {
      return []
    }

    const items: RSSItem[] = parsed.rss.channel[0].item.map((item: any) => ({
      title: item.title?.[0] || '',
      link: item.link?.[0] || '',
      pubDate: item.pubDate?.[0] || '',
      guid: item.guid?.[0]?._ || item.guid?.[0] || '',
    }))

    return items
  } catch (error) {
    console.error('Error fetching RSS feed:', error)
    throw error
  }
}
