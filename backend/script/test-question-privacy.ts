
import { prisma } from '../src/config/database';
import { questionService } from '../src/services/question.service';

async function main() {
    console.log('Testing Question Service privacy protections...');

    // 1. Setup: Create users
    const studentA = await prisma.user.upsert({
        where: { id: 'test_student_a' },
        update: {},
        create: {
            id: 'test_student_a',
            phone: '10000000030',
            nickname: 'Student A',
            role: 'student',
            isActive: true
        }
    });

    const studentB = await prisma.user.upsert({
        where: { id: 'test_student_b' },
        update: {},
        create: {
            id: 'test_student_b',
            phone: '10000000031',
            nickname: 'Student B',
            role: 'student',
            isActive: true
        }
    });

    const teacher = await prisma.user.upsert({
        where: { id: 'test_teacher_audit' },
        update: {},
        create: {
            id: 'test_teacher_audit',
            phone: '10000000032',
            nickname: 'Teacher Audit',
            role: 'teacher',
            isActive: true
        }
    });

    // 2. Setup: Student A creates a pending question
    const pendingQ = await prisma.question.create({
        data: {
            title: 'Sensitive Question',
            content: 'Secret Content',
            authorId: studentA.id,
            authorName: studentA.nickname,
            status: 'pending',
            subject: 'math'
        }
    });

    console.log(`Created pending question: ${pendingQ.id} by Student A`);

    // 3. Test: Student B tries to fetch it (Should FAIL)
    console.log('Test 1: Student B fetching Student A\'s pending question...');
    try {
        await questionService.getById(pendingQ.id, {
            userId: studentB.id,
            role: studentB.role
        });
        console.error('FAIL: Student B should not be able to fetch pending question');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('暂不可见')) {
            console.log('PASS: Student B blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error:', err);
            process.exit(1);
        }
    }

    // 4. Test: Student A (Author) tries to fetch it (Should SUCCEED)
    console.log('Test 2: Student A (Author) fetching own pending question...');
    const authorRes = await questionService.getById(pendingQ.id, {
        userId: studentA.id,
        role: studentA.role
    });
    if (authorRes.id === pendingQ.id) {
        console.log('PASS: Author fetched own pending question.');
    } else {
        console.error('FAIL: Author could not fetch own question.');
        process.exit(1);
    }

    // 5. Test: Teacher tries to fetch it (Should SUCCEED)
    console.log('Test 3: Teacher fetching student\'s pending question...');
    const teacherRes = await questionService.getById(pendingQ.id, {
        userId: teacher.id,
        role: teacher.role
    });
    if (teacherRes.id === pendingQ.id) {
        console.log('PASS: Teacher fetched student pending question.');
    } else {
        console.error('FAIL: Teacher could not fetch student question.');
        process.exit(1);
    }

    // 6. Test: After approval, Student B tries to fetch it (Should SUCCEED)
    console.log('Test 4: Student B fetching Student A\'s APPROVED question...');
    await prisma.question.update({
        where: { id: pendingQ.id },
        data: { status: 'approved' }
    });

    const approvedRes = await questionService.getById(pendingQ.id, {
        userId: studentB.id,
        role: studentB.role
    });
    if (approvedRes.id === pendingQ.id) {
        console.log('PASS: Student B fetched approved question.');
    } else {
        console.error('FAIL: Student B could not fetch approved question.');
        process.exit(1);
    }

    // Cleanup
    await prisma.question.delete({ where: { id: pendingQ.id } });
    console.log('All Question Service privacy tests passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
