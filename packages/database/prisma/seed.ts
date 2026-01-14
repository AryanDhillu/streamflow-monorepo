import { PrismaClient, Status, Variant, AssetType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // --- 1. Create a Published Program (Full Stack) ---
  const program1 = await prisma.program.upsert({
    where: { id: 'prog-001' },
    update: {},
    create: {
      id: 'prog-001',
      title: 'Full Stack Web Development',
      description: 'Master Node.js, React, and Postgres.',
      language_primary: 'en',
      languages_available: ['en', 'hi'],
      status: Status.PUBLISHED,
      published_at: new Date('2023-01-01'),
      assets: {
        create: [
          {
            language: 'en',
            variant: Variant.PORTRAIT,
            asset_type: AssetType.POSTER,
            url: 'https://placehold.co/600x800/png?text=FullStack+En',
          },
          {
            language: 'en',
            variant: Variant.LANDSCAPE,
            asset_type: AssetType.POSTER,
            url: 'https://placehold.co/800x600/png?text=FullStack+En',
          },
        ],
      },
    },
  });

  // --- 2. Create a Term for Program 1 ---
  const term1 = await prisma.term.upsert({
    where: { id: 'term-001' },
    update: {},
    create: {
      id: 'term-001',
      program_id: program1.id,
      term_number: 1,
      title: 'Frontend Fundamentals',
    },
  });

  // --- 3. Create Lessons (Mixed Statuses) ---

  // Lesson 1: Published & Paid
  await prisma.lesson.upsert({
    where: { id: 'lesson-001' },
    update: {},
    create: {
      id: 'lesson-001',
      term_id: term1.id,
      lesson_number: 1,
      title: 'Introduction to HTML',
      content_type: 'video',
      duration_ms: 600000, // 10 mins
      is_paid: true,
      content_language_primary: 'en',
      content_languages_available: ['en', 'hi'],
      content_urls_by_language: {
        en: 'https://example.com/video_en.mp4',
        hi: 'https://example.com/video_hi.mp4',
      },
      status: Status.PUBLISHED,
      published_at: new Date('2023-01-02'),
      assets: {
        create: [
          {
            language: 'en',
            variant: Variant.PORTRAIT,
            asset_type: AssetType.THUMBNAIL,
            url: 'https://placehold.co/400x600?text=HTML+Thumb',
          },
        ],
      },
    },
  });

  // Lesson 2: Scheduled (CRITICAL FOR WORKER DEMO)
  // We set publish_at to 2 minutes in the future so we can test the worker
  const futureDate = new Date();
  futureDate.setMinutes(futureDate.getMinutes() + 2); // 2 mins from now

  await prisma.lesson.upsert({
    where: { id: 'lesson-002' },
    update: {
        // If we run seed again, reset it to scheduled so we can test the worker again
        status: Status.SCHEDULED,
        publish_at: futureDate,
        published_at: null 
    },
    create: {
      id: 'lesson-002',
      term_id: term1.id,
      lesson_number: 2,
      title: 'CSS Grid Layouts',
      content_type: 'article',
      content_language_primary: 'en',
      content_languages_available: ['en'],
      content_urls_by_language: { en: 'https://example.com/article.md' },
      status: Status.SCHEDULED,
      publish_at: futureDate, // Scheduled for 2 mins later
    },
  });

  console.log('✅ Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });