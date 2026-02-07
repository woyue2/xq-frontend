import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 开始初始化科目配置数据...');

    // 定义初始科目和考点配置
    const subjects = [
        {
            key: 'subject_math',
            name: '数学',
            order: 10,
            description: '数学科目',
            topics: [
                { value: 'math_quadratic_function', label: '二次函数', order: 10 },
                { value: 'math_quadratic_equation', label: '一元二次方程', order: 20 },
                { value: 'math_pythagorean', label: '勾股定理', order: 30 },
                { value: 'math_circle_property', label: '圆的性质', order: 40 },
                { value: 'math_probability', label: '概率与统计', order: 50 },
                { value: 'math_trigonometric', label: '三角函数', order: 60 },
                { value: 'math_parallelogram', label: '平行四边形', order: 70 },
            ]
        },
        {
            key: 'subject_physics',
            name: '物理',
            order: 20,
            description: '物理科目',
            topics: [
                { value: 'physics_newton_first_law', label: '牛顿第一定律', order: 10 },
                { value: 'physics_two_force_balance', label: '二力平衡', order: 20 },
                { value: 'physics_pressure_buoyancy', label: '压强与浮力', order: 30 },
                { value: 'physics_ohm_law', label: '欧姆定律', order: 40 },
                { value: 'physics_electromagnetic', label: '电磁感应', order: 50 },
                { value: 'physics_light_refraction', label: '光的折射', order: 60 },
                { value: 'physics_mechanical_energy', label: '机械能守恒', order: 70 },
            ]
        },
        {
            key: 'subject_chemistry',
            name: '化学',
            order: 30,
            description: '化学科目',
            topics: [
                { value: 'chemistry_oxygen_preparation', label: '氧气的制取', order: 10 },
                { value: 'chemistry_acid_base_salt', label: '酸碱盐', order: 20 },
                { value: 'chemistry_metal_activity', label: '金属活动性顺序', order: 30 },
                { value: 'chemistry_mass_conservation', label: '质量守恒定律', order: 40 },
                { value: 'chemistry_solution_concentration', label: '溶液浓度', order: 50 },
            ]
        }
    ];

    let createdSubjects = 0;
    let createdTopics = 0;

    for (const subject of subjects) {
        // 1. 创建或更新科目维度
        await prisma.questionDimension.upsert({
            where: { key: subject.key },
            update: {
                name: subject.name,
                order: subject.order,
                enabled: true,
                multiSelect: false,
                description: subject.description
            },
            create: {
                key: subject.key,
                name: subject.name,
                order: subject.order,
                enabled: true,
                multiSelect: false,
                description: subject.description
            }
        });

        createdSubjects++;

        // 2. 创建或更新考点选项
        for (const topic of subject.topics) {
            await prisma.questionDimensionOption.upsert({
                where: {
                    id: `${subject.key}_${topic.value}` // 使用复合 ID 确保唯一性
                },
                update: {
                    label: topic.label,
                    order: topic.order,
                    enabled: true
                },
                create: {
                    id: `${subject.key}_${topic.value}`,
                    dimensionKey: subject.key,
                    value: topic.value,
                    label: topic.label,
                    order: topic.order,
                    enabled: true
                }
            });

            createdTopics++;
        }
    }

    console.log('\n--- 初始化完成 ---');
    console.log(`✅ 科目数量: ${createdSubjects}`);
    console.log(`✅ 考点数量: ${createdTopics}`);
    console.log('\n科目列表:');
    subjects.forEach(s => {
        console.log(`  - ${s.name} (${s.key}): ${s.topics.length} 个考点`);
    });
    console.log('\n✅ 科目配置数据初始化成功！');
}

main()
    .catch((e) => {
        console.error('❌ 初始化失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
