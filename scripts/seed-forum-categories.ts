import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding forum categories...')

  const categories = [
    {
      name: 'General Discussion',
      slug: 'general-discussion',
      description: 'A place for anything and everything related to exams, studying, and learning.',
      order: 10,
    },
    {
      name: 'Mizoram Board Exams (MBSE)',
      slug: 'mbse-discussion',
      description: 'Discuss MBSE syllabus, past papers, exam patterns, and tips.',
      order: 20,
    },
    {
      name: 'Competitive Exams',
      slug: 'competitive-exams',
      description: 'Discussions on NEET, JEE, CUET, and other competitive entrances.',
      order: 30,
    },
    {
      name: 'Study Resources & Notes',
      slug: 'study-resources',
      description: 'Share and discover helpful study materials, links, and strategies.',
      order: 40,
    },
    {
      name: 'Help & Support',
      slug: 'help-support',
      description: 'Need help with the platform? Found a bug? Let us know here.',
      order: 50,
    },
  ]

  for (const category of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    })
    console.log(`Created/Updated category: ${category.name}`)
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
