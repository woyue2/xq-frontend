
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

async function main() {
    console.log('Testing internal AI audit callback fix using supertest...');

    const app = createApp();
    const INTERNAL_TOKEN = env.AI_INTERNAL_TOKEN || '4b210a44e896495d8217066a32fec2b8.xktiqzDDCQDmuRqR';

    // 1. Setup: Create a student and a teacher
    const student = await prisma.user.upsert({
        where: { id: 'test_student_callback' },
        update: {},
        create: {
            id: 'test_student_callback',
            phone: '10000000010',
            nickname: 'Student Tester',
            role: 'student',
            isActive: true
        }
    });

    const teacher = await prisma.user.upsert({
        where: { id: 'test_teacher_callback' },
        update: {},
        create: {
            id: 'test_teacher_callback',
            phone: '10000000011',
            nickname: 'Teacher Tester',
            role: 'teacher',
            isActive: true
        }
    });

    // 2. Create questions
    const studentQuestion = await prisma.question.create({
        data: {
            title: 'Student Question',
            content: 'Wait for AI',
            authorId: student.id,
            authorName: student.nickname,
            status: 'pending',
            subject: 'math'
        }
    });

    const teacherQuestion = await prisma.question.create({
        data: {
            title: 'Teacher Question',
            content: 'Wait for AI',
            authorId: teacher.id,
            authorName: teacher.nickname,
            status: 'pending',
            subject: 'math'
        }
    });

    // 3. Test Authentication (Missing/Wrong token)
    console.log('Test 1: Authentication failure (no token)...');
    const resAuth = await request(app)
        .post('/api/internal/ai-check')
        .send({
            targetType: 'question',
            targetId: studentQuestion.id,
            result: { safe: true }
        });
    if (resAuth.status === 403) {
        console.log('PASS: Access denied without token.');
    } else {
        console.error('FAIL: Should have returned 403. Got:', resAuth.status, resAuth.body);
        process.exit(1);
    }

    // 4. Test Student "Safe" content (Should remain PENDING)
    console.log('Test 2: Student safe content (should stay PENDING)...');
    await request(app)
        .post('/api/internal/ai-check')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({
            targetType: 'question',
            targetId: studentQuestion.id,
            result: { safe: true, score: 90 }
        });

    const updatedStudentQ = await prisma.question.findUnique({ where: { id: studentQuestion.id } });
    if (updatedStudentQ?.status === 'pending') {
        console.log('PASS: Student content stayed PENDING after safe AI result.');
    } else {
        console.error('FAIL: Student content became:', updatedStudentQ?.status, 'Expected: pending');
        process.exit(1);
    }

    // 5. Test Teacher "Safe" content (Should be APPROVED)
    console.log('Test 3: Teacher safe content (should be APPROVED)...');
    await request(app)
        .post('/api/internal/ai-check')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({
            targetType: 'question',
            targetId: teacherQuestion.id,
            result: { safe: true, score: 90 }
        });

    const updatedTeacherQ = await prisma.question.findUnique({ where: { id: teacherQuestion.id } });
    if (updatedTeacherQ?.status === 'approved') {
        console.log('PASS: Teacher content became APPROVED after safe AI result.');
    } else {
        console.error('FAIL: Teacher content stayed:', updatedTeacherQ?.status, 'Expected: approved');
        process.exit(1);
    }

    // 6. Test Unsafe content
    console.log('Test 4: Unsafe content (should be REJECTED)...');
    await request(app)
        .post('/api/internal/ai-check')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({
            targetType: 'question',
            targetId: studentQuestion.id,
            result: { safe: false, reason: 'unsafe' }
        });

    const rejectedStudentQ = await prisma.question.findUnique({ where: { id: studentQuestion.id } });
    if (rejectedStudentQ?.status === 'rejected') {
        console.log('PASS: Unsafe content REJECTED.');
    } else {
        console.error('FAIL: Unsafe content status:', rejectedStudentQ?.status);
        process.exit(1);
    }

    // Cleanup
    await prisma.question.deleteMany({
        where: { id: { in: [studentQuestion.id, teacherQuestion.id] } }
    });
    console.log('All internal callback security tests passed via supertest!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
