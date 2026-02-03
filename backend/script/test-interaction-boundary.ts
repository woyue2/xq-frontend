
import { prisma } from '../src/config/database';
import { interactionService } from '../src/services/interaction.service';

async function main() {
    console.log('Testing interaction boundary...');

    // 1. Create a Pending Question
    const pendingQuestion = await prisma.question.create({
        data: {
            title: 'Pending Question ' + Date.now(),
            content: 'This question is pending review.',
            authorId: 'user_1',
            authorName: 'Tester',
            status: 'pending',
            subject: 'math',
            tags: [],
            images: [],
            likes: 0,
            favorites: 0,
            comments: 0,
            answers: 0,
            isGoodQuestion: false,
            isPinned: false
        }
    });

    // Let's create a temp user to be safe.
    const user = await prisma.user.upsert({
        where: { id: 'test_user_interaction' },
        update: {},
        create: {
            id: 'test_user_interaction',
            phone: '10000000001',
            nickname: 'Interaction Tester',
            role: 'student',
            isActive: true,
            isBanned: false
        }
    });

    // Update question to use this user
    await prisma.question.update({
        where: { id: pendingQuestion.id },
        data: { authorId: user.id }
    });

    console.log('Created pending question:', pendingQuestion.id);

    // 2. Try to Like
    try {
        await interactionService.toggleQuestionLike({
            questionId: pendingQuestion.id,
            userId: user.id
        });
        console.error('FAIL: Should not be able to like pending question');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('无法对未审核通过的问题进行操作')) {
            console.log('PASS: Like blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error:', err);
            process.exit(1);
        }
    }

    // 3. Try to Favorite
    try {
        await interactionService.toggleQuestionFavorite({
            questionId: pendingQuestion.id,
            userId: user.id
        });
        console.error('FAIL: Should not be able to favorite pending question');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('无法对未审核通过的问题进行操作')) {
            console.log('PASS: Favorite blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error:', err);
            process.exit(1);
        }
    }

    // Cleanup
    await prisma.question.delete({ where: { id: pendingQuestion.id } });
    console.log('Test completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
