import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    ],
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
    ],
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
      { value: 'chemistry_carbon_compounds', label: '碳和碳的化合物', order: 40 },
      { value: 'chemistry_solution', label: '溶液与溶解度', order: 50 },
    ],
  },
  {
    key: 'subject_biology',
    name: '生物',
    order: 40,
    description: '生物科目',
    topics: [
      { value: 'biology_cell', label: '细胞结构', order: 10 },
      { value: 'biology_photosynthesis', label: '光合作用', order: 20 },
      { value: 'biology_genetics', label: '遗传与变异', order: 30 },
      { value: 'biology_evolution', label: '生物进化', order: 40 },
      { value: 'biology_ecosystem', label: '生态系统', order: 50 },
    ],
  },
];

async function main() {
  console.log('开始初始化 Subject/Topic 数据...');

  let subjectCount = 0;
  let topicCount = 0;

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { key: s.key },
      update: { name: s.name, order: s.order, description: s.description, enabled: true },
      create: { key: s.key, name: s.name, order: s.order, description: s.description, enabled: true },
    });
    subjectCount++;

    for (const t of s.topics) {
      await prisma.topic.upsert({
        where: { subjectKey_value: { subjectKey: s.key, value: t.value } },
        update: { label: t.label, order: t.order, enabled: true },
        create: { subjectKey: s.key, value: t.value, label: t.label, order: t.order, enabled: true },
      });
      topicCount++;
    }
  }

  console.log(`完成: ${subjectCount} 个科目, ${topicCount} 个考点`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
