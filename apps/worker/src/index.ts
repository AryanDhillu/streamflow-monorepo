import cron from 'node-cron';
import { prisma, Status } from '@repo/database';

console.log('👷 Worker Service Started...');

// Schedule: Runs every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`[${now.toISOString()}] ⏰ Checking for scheduled lessons...`);

  try {
    // START TRANSACTION
    await prisma.$transaction(async (tx) => {
      
      // 1. FIND & LOCK (Concurrency Safe)
      // "FOR UPDATE SKIP LOCKED" prevents multiple workers from grabbing the same row
      const lessonsToPublish = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Lesson"
        WHERE status = 'SCHEDULED' 
        AND publish_at <= ${now}
        FOR UPDATE SKIP LOCKED
        LIMIT 50
      `;

      if (lessonsToPublish.length === 0) {
        console.log('   No lessons to publish.');
        return;
      }

      console.log(`   Found ${lessonsToPublish.length} lessons to publish.`);

      // 2. PROCESS UPDATES
      for (const rawLesson of lessonsToPublish) {
        // Update Lesson
        const updatedLesson = await tx.lesson.update({
          where: { id: rawLesson.id },
          data: { 
            status: Status.PUBLISHED,
            published_at: now
          }
        });

        // 3. CHECK PROGRAM STATUS (Requirement: Program publishes if 1 lesson is published)
        const term = await tx.term.findUnique({ where: { id: updatedLesson.term_id } });
        if (term) {
             const program = await tx.program.findUnique({ where: { id: term.program_id } });
             if (program && program.status !== Status.PUBLISHED) {
                await tx.program.update({
                    where: { id: program.id },
                    data: { status: Status.PUBLISHED, published_at: now }
                });
                console.log(`   --> Auto-published Program: ${program.title}`);
             }
        }
        console.log(`   --> Published Lesson: ${updatedLesson.title} (${updatedLesson.id})`);
      }
    });

  } catch (error) {
    console.error('❌ Job failed:', error);
  }
});