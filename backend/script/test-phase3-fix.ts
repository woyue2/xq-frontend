import { classHoursService } from '../src/services/class-hours.service';
import { prisma } from '../src/config/database';

async function testClassHours() {
    console.log('Testing ClassHoursService validation...');
    try {
        await classHoursService.batchUpdate({
            userIds: ['dummy'],
            action: 'extend',
            months: 0
        });
        console.error('FAIL: Should have blocked 0 months');
    } catch (err: any) {
        console.log('PASS: 0 months blocked:', err.message);
    }

    try {
        await classHoursService.batchUpdate({
            userIds: ['dummy'],
            action: 'extend',
            months: 121
        });
        console.error('FAIL: Should have blocked > 120 months');
    } catch (err: any) {
        console.log('PASS: 121 months blocked:', err.message);
    }
}

async function testDimensions() {
    console.log('\nTesting QuestionDimension integrity...');
    const dimA = await prisma.questionDimension.create({
        data: { key: 'TEST_A', name: 'Dimension A' }
    });
    const dimB = await prisma.questionDimension.create({
        data: { key: 'TEST_B', name: 'Dimension B' }
    });
    const optA = await prisma.questionDimensionOption.create({
        data: { dimensionKey: 'TEST_A', value: 'optA', label: 'Option A' }
    });

    try {
        const { questionDimensionService } = await import('../src/services/question-dimension.service');
        await questionDimensionService.updateOption({
            id: optA.id,
            dimensionKey: 'TEST_B', // Wrong dimension key
            label: 'Hacked Label'
        });
        console.error('FAIL: Should have blocked cross-dimension update');
    } catch (err: any) {
        console.log('PASS: Cross-dimension update blocked:', err.message);
    }

    // Cleanup
    await prisma.questionDimensionOption.deleteMany({ where: { dimensionKey: { in: ['TEST_A', 'TEST_B'] } } });
    await prisma.questionDimension.deleteMany({ where: { key: { in: ['TEST_A', 'TEST_B'] } } });
}

async function main() {
    await testClassHours();
    await testDimensions();
    console.log('\nPhase 3 core logic verification complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
