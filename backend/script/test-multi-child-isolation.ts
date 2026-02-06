
import { parentService } from '../src/services/parent.service';
import { prisma } from '../src/config/database';

async function testMultiChildIsolation() {
    console.log('Testing Multi-Child Data Isolation...');

    // 1. 获取已由脚本初始化的数据
    const parent = await prisma.user.findUnique({ where: { phone: '13300000002' } });
    const child1 = await prisma.user.findUnique({ where: { phone: '13300000001' } }); // 子涵
    const child2 = await prisma.user.findUnique({ where: { phone: '13300000003' } }); // 子凡
    const stranger = await prisma.user.upsert({
        where: { phone: '19999999999' },
        update: { role: 'student' },
        create: { phone: '19999999999', nickname: '路人甲', role: 'student' }
    });

    if (!parent || !child1 || !child2) {
        throw new Error('测试基础数据丢失，请先运行 seed-full-acceptance.ts');
    }

    console.log(`Parent: ${parent.nickname}, Child1: ${child1.nickname}, Child2: ${child2.nickname}`);

    // 测试场景 1: 家长查询绑定的孩子 1
    console.log('\nScenario 1: Parent accessing Child 1 questions...');
    const res1 = await parentService.getChildQuestions(parent.id, child1.id);
    console.log(`PASS: Successfully accessed ${child1.nickname}'s questions. Count: ${res1.items.length}`);

    // 测试场景 2: 家长查询绑定的孩子 2
    console.log('\nScenario 2: Parent accessing Child 2 questions...');
    const res2 = await parentService.getChildQuestions(parent.id, child2.id);
    console.log(`PASS: Successfully accessed ${child2.nickname}'s questions.`);

    // 测试场景 3: 家长越权查询未绑定的路人
    console.log('\nScenario 3: Parent attempting to access Unbound Student questions...');
    try {
        await parentService.getChildQuestions(parent.id, stranger.id);
        console.error('FAIL: Parent should NOT be able to access unbound student data');
    } catch (err: any) {
        console.log('PASS: Access blocked correctly:', err.message);
    }
}

async function main() {
    await testMultiChildIsolation();
    console.log('\nPhase 7 service-level isolation verification complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
