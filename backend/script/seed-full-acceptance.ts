import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 正在初始化全场景深度验收环境...');

    // 1. 初始化老师账号 (管理员)
    const teacherPhone = '11111111111';
    const hashedPassword = await bcrypt.hash('123123123', 10);
    const teacher = await prisma.user.upsert({
        where: { phone: teacherPhone },
        update: { role: 'teacher', passwordHash: hashedPassword, isActive: true },
        create: {
            phone: teacherPhone,
            nickname: '验收管理员(老师)',
            role: 'teacher',
            passwordHash: hashedPassword,
            isActive: true
        }
    });

    // 1.1 初始化系统配置：题目维度 (为后续手动测试配置即时生效做准备)
    await prisma.questionDimension.upsert({
        where: { key: 'method' },
        update: { enabled: true },
        create: {
            key: 'method',
            name: '解题方法',
            enabled: true,
            options: {
                create: [
                    { value: 'formula', label: '公式法', order: 1 },
                    { value: 'graph', label: '图像法', order: 2 }
                ]
            }
        }
    });

    // 2. 初始化家长账号
    const parentPhone = '13300000002';
    const parent = await prisma.user.upsert({
        where: { phone: parentPhone },
        update: { role: 'parent', passwordHash: hashedPassword, isActive: true },
        create: {
            phone: parentPhone,
            nickname: '验收家长-全能爸爸',
            role: 'parent',
            passwordHash: hashedPassword,
            isActive: true
        }
    });

    // 3. 多孩场景：初始化两个绑定的孩子
    const childrenData = [
        { phone: '13300000001', nickname: '子涵(老大)', school: '第一小学' },
        { phone: '13300000003', nickname: '子凡(老二)', school: '实验小学' }
    ];

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    for (const c of childrenData) {
        const student = await prisma.user.upsert({
            where: { phone: c.phone },
            update: { role: 'student', passwordHash: hashedPassword, isActive: true, nickname: c.nickname },
            create: { phone: c.phone, nickname: c.nickname, role: 'student', passwordHash: hashedPassword, isActive: true }
        });

        // 绑定到白名单并设置有效期
        await prisma.userWhitelist.upsert({
            where: { phone: c.phone },
            update: { validUntil: thirtyDaysLater, isRegistered: true, userId: student.id, role: 'student' },
            create: { phone: c.phone, name: c.nickname, role: 'student', validUntil: thirtyDaysLater, isRegistered: true, userId: student.id }
        });

        // 自动建立绑定关系
        await prisma.parentChild.upsert({
            where: { parentId_childId: { parentId: parent.id, childId: student.id } },
            update: {},
            create: { parentId: parent.id, childId: student.id }
        });
    }

    // 4. 过期场景：初始化一个已过期的学生 (模拟欠费拦截)
    const expiredPhone = '13300000004';
    const expiredStudent = await prisma.user.upsert({
        where: { phone: expiredPhone },
        update: { role: 'student', passwordHash: hashedPassword, isActive: true },
        create: { phone: expiredPhone, nickname: '已到期学生(小明)', role: 'student', passwordHash: hashedPassword, isActive: true }
    });

    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 5);
    await prisma.userWhitelist.upsert({
        where: { phone: expiredPhone },
        update: { validUntil: longAgo, isRegistered: true, userId: expiredStudent.id },
        create: { phone: expiredPhone, name: '小明', role: 'student', validUntil: longAgo, isRegistered: true, userId: expiredStudent.id }
    });

    // 5. 驳回/异常场景：初始化一个已驳回的问题
    const student1 = await prisma.user.findUnique({ where: { phone: '13300000001' } });
    if (student1) {
        // 待审核问题
        await prisma.question.create({
            data: {
                title: '待审核：几何辅助线',
                content: '子涵提交的问题。',
                authorId: student1.id,
                authorName: student1.nickname,
                status: 'pending'
            }
        });

        // 已驳回问题
        await prisma.question.create({
            data: {
                title: '已驳回：模糊的物理公式',
                content: '图片太黑，看不清。',
                authorId: student1.id,
                authorName: student1.nickname,
                status: 'rejected',
                aiResult: '图片不清晰，请重新拍摄上传'
            }
        });
    }

    console.log('\n--- 深度验收账号清单 ---');
    console.log('【老师端】 手机: 11111111111  密码: 123123123');
    console.log('【家长端】 手机: 13300000002  密码: 123123123 (已绑定 子涵、子凡)');
    console.log('【正常学生】 手机: 13300000001  密码: 123123123 (子涵)');
    console.log('【正常学生】 手机: 13300000003  密码: 123123123 (子凡)');
    console.log('【过期学生】 手机: 13300000004  密码: 123123123 (用于测试权限拦截)');
    console.log('\n✅ 深度验收环境初始化成功！');
}

main()
    .catch((e) => {
        console.error('初始化失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
