import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Seed seasons
  const seasons = [
    { seasonNumber: 101, startDate: new Date('2025-06-16') },
    { seasonNumber: 102, startDate: new Date('2025-08-26') },
    { seasonNumber: 103, startDate: new Date('2025-11-03') },
  ]

  for (const season of seasons) {
    await prisma.season.upsert({
      where: { seasonNumber: season.seasonNumber },
      update: {},
      create: season,
    })
  }

  console.log('Seeded seasons:', seasons.length)

  // Initialize checkpoints
  const checkpoints = [
    { key: 'rss:last_pubdate', value: '' },
    { key: 'rss:last_seen_topic_id', value: '0' },
    { key: 'backfill:last_page_scanned', value: '0' },
    { key: 'backfill:last_topic_id_scanned', value: '0' },
  ]

  for (const checkpoint of checkpoints) {
    await prisma.checkpoint.upsert({
      where: { key: checkpoint.key },
      update: {},
      create: checkpoint,
    })
  }

  console.log('Seeded checkpoints:', checkpoints.length)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
