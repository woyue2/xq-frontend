
import { authService } from '../src/services/auth.service';
import { prisma } from '../src/config/database';

async function main() {
    console.log('Testing Auth hardening and password reset...');

    const phone = '10000000040';
    const shortPassword = 'short';
    const strongPassword = 'password123';
    const newStrongPassword = 'newPassword123';

    // Cleanup existing user
    const existingUsers = await prisma.user.findMany({ where: { phone } });
    for (const u of existingUsers) {
        await prisma.loginLog.deleteMany({ where: { userId: u.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
    }
    await prisma.verificationCode.deleteMany({ where: { phone } });

    // 1. Setup: Whitelist user for registration
    await prisma.userWhitelist.upsert({
        where: { phone },
        update: { deletedAt: null },
        create: {
            phone,
            name: 'Auth Test User',
            role: 'student'
        }
    });

    // 2. Test: Register with short password (Should FAIL)
    console.log('Test 1: Registering with short password (< 8 chars)...');
    try {
        await authService.register({
            phone,
            code: '123456',
            password: shortPassword
        });
        console.error('FAIL: Should have blocked short password');
        process.exit(1);
    } catch (err: any) {
        if (err.message && err.message.includes('至少需 8 位')) {
            console.log('PASS: Short password blocked correctly.');
        } else {
            console.error('FAIL: Unexpected error message:', err.message);
            process.exit(1);
        }
    }

    // 3. Test: Register with strong password (Should SUCCEED)
    console.log('Test 2: Registering with strong password (>= 8 chars)...');
    const regResult = await authService.register({
        phone,
        code: '123456',
        password: strongPassword
    });
    console.log('PASS: Registered successfully.');

    // 4. Test: Reset password with wrong code (Should FAIL)
    console.log('Test 3: Resetting password with wrong/missing code...');
    try {
        await authService.resetPasswordWithCode({
            phone,
            code: '999999',
            newPassword: newStrongPassword
        });
        console.error('FAIL: Should have blocked reset with wrong code');
        process.exit(1);
    } catch (err: any) {
        console.log('PASS: Wrong code reset blocked.');
    }

    // 5. Test: Reset password with correct code (Should SUCCEED)
    console.log('Test 4: Resetting password with correct code...');
    // Mock the code in DB
    await prisma.verificationCode.create({
        data: {
            phone,
            code: '888888',
            type: 'reset_password',
            expireAt: new Date(Date.now() + 600000)
        }
    });

    await authService.resetPasswordWithCode({
        phone,
        code: '888888',
        newPassword: newStrongPassword
    });
    console.log('PASS: Password reset successful.');

    // 6. Test: Login with OLD password (Should FAIL)
    console.log('Test 5: Logging in with OLD password...');
    try {
        await authService.passwordLogin(phone, strongPassword);
        console.error('FAIL: Old password should not work after reset');
        process.exit(1);
    } catch (err: any) {
        console.log('PASS: Old password rejected.');
    }

    // 7. Test: Login with NEW password (Should SUCCEED)
    console.log('Test 6: Logging in with NEW password...');
    const loginRes = await authService.passwordLogin(phone, newStrongPassword);
    if (loginRes.user.phone === phone) {
        console.log('PASS: New password login successful.');
    } else {
        console.error('FAIL: Login failed.');
        process.exit(1);
    }

    // Cleanup
    const userToDelete = await prisma.user.findUnique({ where: { phone } });
    if (userToDelete) {
        await prisma.loginLog.deleteMany({ where: { userId: userToDelete.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: userToDelete.id } });
        await prisma.user.delete({ where: { id: userToDelete.id } });
    }
    console.log('All Auth hardening and reset tests passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
