
import { questionService } from '../src/services/question.service';
import { prisma } from '../src/config/database';

async function testSearchSecurity() {
    console.log('Testing QuestionService Search Security...');

    // 1. Test Keyword Length Limit
    const longKeyword = 'a'.repeat(65);
    console.log(`Testing long keyword (length: ${longKeyword.length})...`);
    try {
        await questionService.list({ search: longKeyword });
        console.error('FAIL: Should have blocked keyword longer than 64 chars');
    } catch (err: any) {
        console.log('PASS: Long keyword blocked:', err.message);
    }

    // 2. Test Pagination Hardening
    console.log('\nTesting pagination hardening...');
    const result1 = await questionService.list({ page: -1, pageSize: 999 });
    console.log(`PASS: Negative page (-1) and huge pageSize (999) handled.`);
    console.log(`Resulting pagination: page=${result1.pagination.page}, pageSize=${result1.pagination.pageSize}`);

    if (result1.pagination.page === 1 && result1.pagination.pageSize === 100) {
        console.log('PASS: Correctly fell back to page 1 and capped pageSize at 100.');
    } else {
        console.error(`FAIL: Unexpected fallback values: page=${result1.pagination.page}, pageSize=${result1.pagination.pageSize}`);
    }

    const result2 = await questionService.list({ page: 2.5 as any, pageSize: 'abc' as any });
    console.log('\nTesting non-integer/string parameters...');
    console.log(`Resulting pagination: page=${result2.pagination.page}, pageSize=${result2.pagination.pageSize}`);
    if (result2.pagination.page === 1 && result2.pagination.pageSize === 20) {
        console.log('PASS: Correctly fell back to defaults for invalid types.');
    }
}

async function main() {
    await testSearchSecurity();
    console.log('\nPhase 5 core search logic verification complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
