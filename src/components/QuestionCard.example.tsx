/**
 * QuestionCard 组件使用示例
 * 展示不同场景下的 QuestionCard 组件用法
 */
import { QuestionCard } from './QuestionCard';
import type { QuestionDTO } from '@/types/dto';

// 示例数据
const sampleQuestions: QuestionDTO[] = [
  {
    id: 'q1',
    title: '如何解一元二次方程 ax² + bx + c = 0？',
    content: '请详细说明配方法和求根公式的推导过程',
    subject: '数学',
    tags: ['代数', '方程', '二次方程'],
    images: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
    ],
    authorId: 'u1',
    authorName: '张老师',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    answerCount: 5,
  },
  {
    id: 'q2',
    title: '英语中现在完成时和过去完成时的区别是什么？',
    content: '请举例说明两种时态的使用场景',
    subject: '英语',
    tags: ['语法', '时态'],
    images: [],
    authorId: 'u2',
    authorName: '李老师',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    answerCount: 3,
  },
  {
    id: 'q3',
    title: '光合作用的过程是怎样的？',
    subject: '生物',
    tags: ['植物', '光合作用'],
    images: ['https://picsum.photos/400/300?random=3'],
    authorId: 'u3',
    authorName: '王老师',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    answerCount: 8,
  },
  {
    id: 'q4',
    title: '这道题怎么做？',
    authorId: 'u4',
    authorName: '赵同学',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhao',
    createdAt: new Date(Date.now() - 1000 * 30).toISOString(), // 30秒前
    updatedAt: new Date(Date.now() - 1000 * 30).toISOString(),
  },
];

export function QuestionCardExamples() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">QuestionCard 组件示例</h1>
        <p className="text-gray-600 mb-6">
          展示不同场景下的问题卡片组件
        </p>
      </div>

      {/* 完整信息的问题卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">完整信息的问题卡片</h2>
        <p className="text-sm text-gray-600 mb-3">
          包含标题、内容、科目、考点、多张图片、作者信息等完整信息
        </p>
        <QuestionCard question={sampleQuestions[0]} />
      </section>

      {/* 无图片的问题卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">无图片的问题卡片</h2>
        <p className="text-sm text-gray-600 mb-3">
          只包含文字信息，没有图片
        </p>
        <QuestionCard question={sampleQuestions[1]} />
      </section>

      {/* 单张图片的问题卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">单张图片的问题卡片</h2>
        <p className="text-sm text-gray-600 mb-3">
          包含一张图片的问题
        </p>
        <QuestionCard question={sampleQuestions[2]} />
      </section>

      {/* 最简信息的问题卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">最简信息的问题卡片</h2>
        <p className="text-sm text-gray-600 mb-3">
          只包含必填字段的问题（标题、作者、时间）
        </p>
        <QuestionCard question={sampleQuestions[3]} />
      </section>

      {/* 自定义样式的问题卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">自定义样式的问题卡片</h2>
        <p className="text-sm text-gray-600 mb-3">
          使用 className 属性添加自定义样式
        </p>
        <QuestionCard 
          question={sampleQuestions[0]} 
          className="border-2 border-blue-500 shadow-lg"
        />
      </section>

      {/* 列表展示 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">列表展示</h2>
        <p className="text-sm text-gray-600 mb-3">
          在列表中使用问题卡片组件
        </p>
        <div className="space-y-4">
          {sampleQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      </section>

      {/* 时间格式化示例 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">时间格式化</h2>
        <p className="text-sm text-gray-600 mb-3">
          组件会自动将时间格式化为相对时间：
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mb-3">
          <li>1分钟内：显示"刚刚"</li>
          <li>1小时内：显示"X分钟前"</li>
          <li>24小时内：显示"X小时前"</li>
          <li>超过24小时：显示具体日期</li>
        </ul>
        <div className="space-y-4">
          {sampleQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default QuestionCardExamples;
