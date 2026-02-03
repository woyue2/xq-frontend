
import { prisma } from '../src/config/database';
import { behaviorLogService } from '../src/services/behavior-log.service';

async function main() {
    console.log('Testing behavior log boundary protection...');

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // 1. Test Future Timestamp (1 day later)
    const futureTime = now + 24 * ONE_HOUR;
    const logFuture = await behaviorLogService.logSingle({
        type: 'test_future',
        timestamp: futureTime,
        metadata: { info: 'Should be corrected to server time' }
    });

    // Check if the saved clientTime is close to "now" instead of "futureTime"
    const diffFuture = Math.abs(logFuture.clientTime!.getTime() - now);
    if (diffFuture < ONE_HOUR) {
        console.log('PASS: Future timestamp corrected to current server time.');
    } else {
        console.error(`FAIL: Future timestamp NOT corrected. Saved: ${logFuture.clientTime}, Expected near: ${new Date(now)}`);
        process.exit(1);
    }

    // 2. Test Extreme Old Timestamp (Year 2000)
    const oldTime = new Date('2000-01-01').getTime();
    const logOld = await behaviorLogService.logSingle({
        type: 'test_old',
        timestamp: oldTime,
        metadata: { info: 'Should be corrected to server time' }
    });

    const diffOld = Math.abs(logOld.clientTime!.getTime() - now);
    if (diffOld < ONE_HOUR) {
        console.log('PASS: Extremely old timestamp corrected to current server time.');
    } else {
        console.error(`FAIL: Old timestamp NOT corrected. Saved: ${logOld.clientTime}, Expected near: ${new Date(now)}`);
        process.exit(1);
    }

    // 3. Test Valid Recent Timestamp (10 mins ago)
    const validTime = now - 10 * 60 * 1000;
    const logValid = await behaviorLogService.logSingle({
        type: 'test_valid',
        timestamp: validTime,
        metadata: { info: 'Should be preserved' }
    });

    const diffValid = Math.abs(logValid.clientTime!.getTime() - validTime);
    if (diffValid < 1000) { // Should be exact or very close
        console.log('PASS: Valid recent timestamp preserved.');
    } else {
        console.error(`FAIL: Valid timestamp was incorrectly changed. Saved: ${logValid.clientTime}, Original: ${new Date(validTime)}`);
        process.exit(1);
    }

    // 4. Test Overly Long Type
    const longType = 'A'.repeat(100);
    const logLong = await behaviorLogService.logSingle({
        type: longType,
        metadata: { info: 'Type should be sliced' }
    });

    if (logLong.eventType.length <= 50) {
        console.log(`PASS: Long event type sliced to ${logLong.eventType.length} chars.`);
    } else {
        console.error('FAIL: Long event type was NOT sliced.');
        process.exit(1);
    }

    // Cleanup
    await prisma.behaviorLog.deleteMany({
        where: {
            eventType: { in: ['test_future', 'test_old', 'test_valid', 'A'.repeat(50)] }
        }
    });

    console.log('All behavior log boundary tests passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
