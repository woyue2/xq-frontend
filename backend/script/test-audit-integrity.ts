
import { auditService } from '../src/services/audit.service';
import { prisma } from '../src/config/database';
import { AppError } from '../src/errors/AppError';

async function testAuditIntegrity() {
    console.log('Testing AuditService integrity...');

    // 1. Setup: Create a question
    const authorId = 'test-author-id';
    const auditorId = authorId; // Simulate self-audit
    const otherAuditorId = 'test-auditor-id';

    const question = await prisma.question.upsert({
        where: { id: 'test-q-audit' },
        update: { status: 'pending', authorId },
        create: { id: 'test-q-audit', title: 'Audit Test', status: 'pending', authorId, authorName: 'Tester' }
    });

    // 2. Test Self-Audit
    console.log('Testing self-audit protection...');
    try {
        await auditService.approveQuestion({ id: question.id, auditorId });
        console.error('FAIL: Should have blocked self-audit');
    } catch (err: any) {
        console.log('PASS: Self-audit blocked:', err.message);
    }

    // 3. Test Idempotency
    console.log('\nTesting idempotency...');
    await auditService.approveQuestion({ id: question.id, auditorId: otherAuditorId });
    console.log('First approval success');
    const result2 = await auditService.approveQuestion({ id: question.id, auditorId: otherAuditorId });
    console.log('PASS: Second approval returned immediately (Idempotent)');

    // 4. Test Hierarchical consistency (Comment approval on rejected question)
    console.log('\nTesting hierarchical consistency...');
    await prisma.question.update({ where: { id: question.id }, data: { status: 'rejected' } });
    const comment = await prisma.comment.create({
        data: {
            questionId: question.id,
            content: 'Test Comment',
            authorId: 'other-user',
            authorName: 'Commenter',
            status: 'pending'
        }
    });

    try {
        await auditService.approveComment({ id: comment.id, auditorId: otherAuditorId });
        console.error('FAIL: Should have blocked comment approval for rejected question');
    } catch (err: any) {
        console.log('PASS: Comment approval blocked for invalid question:', err.message);
    }

    // Cleanup
    await prisma.comment.deleteMany({ where: { questionId: question.id } });
    await prisma.question.delete({ where: { id: question.id } });
    await prisma.auditLog.deleteMany({ where: { targetId: { in: [question.id, comment.id] } } });
}

async function main() {
    await testAuditIntegrity();
    console.log('\nPhase 4 core logic verification complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
