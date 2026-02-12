import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseOrphanUsers() {
  console.log('🔍 开始诊断孤立的User记录（没有对应UserWhitelist）...\n');

  try {
    // 查找所有白名单的phone集合
    const whitelistPhones = new Set(
      (await prisma.userWhitelist.findMany({
        select: { phone: true },
        where: { deletedAt: null }
      })).map(w => w.phone)
    );

    // 查找所有User
    const users = await prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const orphanUsers = users.filter(u => !whitelistPhones.has(u.phone));

    console.log(`📊 总User数: ${users.length}`);
    console.log(`❌ 孤立User数（无Whitelist）: ${orphanUsers.length}\n`);

    if (orphanUsers.length > 0) {
      console.log('⚠️  发现以下孤立User记录:');
      console.log('='.repeat(80));
      
      for (const user of orphanUsers) {
        console.log(`📱 Phone: ${user.phone}`);
        console.log(`👤 Nickname: ${user.nickname}`);
        console.log(`🎭 Role: ${user.role}`);
        console.log(`📅 Created: ${user.createdAt.toISOString()}`);
        console.log(`🔗 Whitelist: 不存在`);
        console.log('-'.repeat(80));
      }

      console.log('\n💡 建议:');
      console.log('1. 这些用户无法登录（因为登录需要白名单）');
      console.log('2. 应该删除这些记录，或联系管理员添加对应的白名单');
      console.log('3. 可以通过以下SQL查看详情:');
      console.log('   SELECT u.id, u.phone, u.nickname, u.role, u.created_at FROM "User" u LEFT JOIN "UserWhitelist" w ON u.phone = w.phone WHERE w.id IS NULL;');
    } else {
      console.log('✅ 所有User都有对应的UserWhitelist，数据一致性良好！');
    }

    // 检查白名单中存在但User不存在的记录（反向检查）
    console.log('\n');
    console.log('🔍 检查白名单中存在但User不存在的记录...');
    
    const whitelists = await prisma.userWhitelist.findMany({
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isRegistered: true,
        userId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const orphanWhitelists = whitelists.filter(w => !w.userId);

    console.log(`📊 总Whitelist数: ${whitelists.length}`);
    console.log(`⚠️  未关联User的Whitelist数: ${orphanWhitelists.length}\n`);

    if (orphanWhitelists.length > 0) {
      console.log('⚠️  发现以下未关联User的白名单记录:');
      console.log('='.repeat(80));
      
      for (const wl of orphanWhitelists) {
        console.log(`📱 Phone: ${wl.phone}`);
        console.log(`👤 Name: ${wl.name}`);
        console.log(`🎭 Role: ${wl.role}`);
        console.log(`📅 Created: ${wl.createdAt.toISOString()}`);
        console.log(`✅ isRegistered: ${wl.isRegistered}`);
        console.log(`🔗 UserId: ${wl.userId || '未设置'}`);
        console.log('-'.repeat(80));
      }
    } else {
      console.log('✅ 所有白名单都已关联到User！');
    }

    // 统计修复后的效果
    console.log('\n' + '='.repeat(80));
    console.log('📈 数据健康度总结:');
    console.log(`   - User总数: ${users.length}`);
    console.log(`   - Whitelist总数: ${whitelists.length}`);
    console.log(`   - 孤立User: ${orphanUsers.length} (应修复)`);
    console.log(`   - 未关联Whitelist: ${orphanWhitelists.length} (正常，白名单可预先创建)`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseOrphanUsers().then(() => {
  console.log('\n✅ 诊断完成');
  process.exit(0);
});