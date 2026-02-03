
import { whitelistService } from '../src/services/whitelist.service';
import { prisma } from '../src/config/database';

async function testPhase6Hardening() {
    console.log('Testing WhitelistService Search Security...');

    // 1. Test Keyword Length Limit
    const longKeyword = 'w'.repeat(65);
    console.log(`Testing long keyword (length: ${longKeyword.length})...`);
    try {
        await whitelistService.list({ search: longKeyword });
        console.error('FAIL: Should have blocked whitelist search keyword longer than 64 chars');
    } catch (err: any) {
        console.log('PASS: Long keyword blocked in WhitelistService:', err.message);
    }

    // 2. Test Pagination Hardening
    console.log('\nTesting whitelist pagination hardening...');
    const result1 = await whitelistService.list({ page: -5, pageSize: 500 });
    console.log(`PASS: Negative page (-5) and huge pageSize (500) handled in WhitelistService.`);

    // Check if defaults/caps were applied
    if (result1.pagination.page === 1 && result1.pagination.pageSize === 100) {
        console.log('PASS: WhitelistService correctly fell back to page 1 and capped pageSize at 100.');
    } else {
        console.error(`FAIL: Unexpected whitelist pagination values: page=${result1.pagination.page}, pageSize=${result1.pagination.pageSize}`);
    }
}

async function main() {
    await testPhase6Hardening();
    console.log('\nPhase 6 backend security verification complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
