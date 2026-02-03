import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start cleaning orphans...');

    try {
        // 1. Clean orphaned Answers
        // First try with quoted names (Prisma default)
        const countAnswers = await prisma.$executeRawUnsafe(`
      DELETE FROM "Answer" 
      WHERE "questionId" NOT IN (SELECT "id" FROM "Question");
    `);
        console.log(`Deleted ${countAnswers} orphaned Answer(s).`);

        // 2. Clean orphaned Comments
        const countComments = await prisma.$executeRawUnsafe(`
      DELETE FROM "Comment" 
      WHERE "questionId" NOT IN (SELECT "id" FROM "Question");
    `);
        console.log(`Deleted ${countComments} orphaned Comment(s).`);

        console.log('Cleanup finished.');
    } catch (e) {
        console.error('Error cleaning orphans (Quoted names):', e.message);
        console.log('Retrying with lowercase names...');
        try {
            const countAnswers = await prisma.$executeRawUnsafe(`
            DELETE FROM "answer" 
            WHERE "questionId" NOT IN (SELECT "id" FROM "question");
          `);
            console.log(`Deleted ${countAnswers} orphaned Answer(s) (lowercase).`);

            const countComments = await prisma.$executeRawUnsafe(`
            DELETE FROM "comment" 
            WHERE "questionId" NOT IN (SELECT "id" FROM "question");
          `);
            console.log(`Deleted ${countComments} orphaned Comment(s) (lowercase).`);
        } catch (e2) {
            console.error('Failed to clean orphans:', e2);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
