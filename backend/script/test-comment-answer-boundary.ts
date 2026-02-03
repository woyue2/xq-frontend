
import { prisma } from '../src/config/database';
import { commentService } from '../src/services/comment.service';
import { answerService } from '../src/services/answer.service';
import { auditService } from '../src/services/audit.service';

async function main() {
    console.log('Testing Comment/Answer boundary protections...');

    // 1. Setup: Create users
    const student = await prisma.user.upsert({
        where: { id: 'test_student_boundary' },
        update: {},
        create: {
            id: 'test_student_boundary',
            phone: '10000000020',
            nickname: 'Student Boundary',
            role: 'student',
            isActive: true
        }
    });

    const teacher = await prisma.user.upsert({
        where: { id: 'test_teacher_boundary' },
        update: {},
        create: {
            id: 'test_teacher_boundary',
            phone: '10000000021',
            nickname: 'Teacher Boundary',
            role: 'teacher',
            isActive: true
        }
    });

    // 2. Setup: Create a pending question
    const pendingQuestion = await prisma.question.create({
        data: {
            title: 'Pending Question',
            content: 'No one should comment yet',
            authorId: teacher.id,
            authorName: teacher.nickname,
            status: 'pending',
            subject: 'math'
        }
    });

    console.log(`Created pending question: ${pendingQuestion.id}`);

    // 3. Test: Creating comment on pending question (Should FAIL)
    console.log('Test 1: Commenting on PENDING question...');
    try {
        await commentService.create({
            questionId: pendingQuestion.id,
            authorId: student.id,
            content: 'My comment'
        });
        console.error('FAIL: Should not be able to comment on pending question');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('无法在未审核通过的问题下发表评论')) {
            console.log('PASS: Comment blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error:', err);
            process.exit(1);
        }
    }

    // 4. Test: Creating answer on pending question (Should FAIL)
    console.log('Test 2: Answering PENDING question...');
    try {
        await answerService.create({
            questionId: pendingQuestion.id,
            authorId: teacher.id,
            content: 'My answer'
        });
        console.error('FAIL: Should not be able to answer pending question');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('无法在未审核通过的问题下发表回答')) {
            console.log('PASS: Answer blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error:', err);
            process.exit(1);
        }
    }

    // 5. Setup: Approve the question
    await prisma.question.update({
        where: { id: pendingQuestion.id },
        data: { status: 'approved' }
    });
    console.log('Question APPROVED.');

    // 6. Test: Notification Delay for student comment
    console.log('Test 3: Student comment notification delay...');
    const initialNotificationCount = await prisma.notification.count({ where: { userId: teacher.id } });

    const commentData = await commentService.create({
        questionId: pendingQuestion.id,
        authorId: student.id,
        content: 'I am a student'
    });

    const intermediateCount = await prisma.notification.count({ where: { userId: teacher.id } });
    if (intermediateCount === initialNotificationCount) {
        console.log('PASS: No immediate notification for pending student comment.');
    } else {
        console.error(`FAIL: Notification sent prematurely! Expected ${initialNotificationCount}, got ${intermediateCount}`);
        process.exit(1);
    }

    // 7. Test: Notification on comment approval
    console.log('Test 4: Notification on comment approval...');
    await auditService.approveComment({
        id: commentData.id,
        auditorId: teacher.id
    });

    const finalCount = await prisma.notification.count({ where: { userId: teacher.id } });
    if (finalCount > intermediateCount) {
        console.log('PASS: Notification sent after comment was approved.');
    } else {
        console.error('FAIL: No notification sent after approval.');
        process.exit(1);
    }

    // Cleanup
    await prisma.comment.deleteMany({ where: { questionId: pendingQuestion.id } });
    await prisma.question.delete({ where: { id: pendingQuestion.id } });
    console.log('All Comment/Answer boundary and notification tests passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
