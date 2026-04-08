/**
 * [POS] src/components/AnswerCard.example.tsx
 *   所属：components 层 | 角色：AnswerCard 组件示例
 *   用途：展示 AnswerCard 组件的各种使用场景
 */
import { AnswerCard } from './AnswerCard';
import type { AnswerDTO } from '@/types/dto';

export default function AnswerCardExample() {
  // Example 1: Answer with text only
  const textOnlyAnswer: AnswerDTO = {
    id: '1',
    questionId: 'q1',
    content: '这道题的关键在于理解函数的定义域和值域。首先，我们需要确定函数的定义域...',
    authorId: 'user1',
    authorName: '张老师',
    authorAvatar: '/avatars/notionists-1775390793571.svg',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  };

  // Example 2: Answer with images
  const answerWithImages: AnswerDTO = {
    id: '2',
    questionId: 'q1',
    content: '这道题可以用图解法来理解。请看下面的示意图：',
    images: [
      'https://picsum.photos/seed/answer1/400/300',
      'https://picsum.photos/seed/answer2/400/300'
    ],
    authorId: 'user2',
    authorName: '李同学',
    authorAvatar: '/avatars/notionists-1775390806025.svg',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  };

  // Example 3: Answer without avatar
  const noAvatarAnswer: AnswerDTO = {
    id: '3',
    questionId: 'q1',
    content: '补充一下，这道题还有另一种解法...',
    authorId: 'user3',
    authorName: '王同学',
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 300000).toISOString()
  };

  // Example 4: Long answer with multiple images
  const longAnswer: AnswerDTO = {
    id: '4',
    questionId: 'q1',
    content: `详细解答如下：

第一步：分析题目条件
根据题目给出的条件，我们可以得出...

第二步：建立方程
设未知数为 x，根据题意可以列出方程...

第三步：求解方程
通过移项、合并同类项等步骤，我们可以得到...

第四步：验证答案
将求得的解代入原方程验证...

因此，最终答案为...`,
    images: [
      'https://picsum.photos/seed/step1/400/300',
      'https://picsum.photos/seed/step2/400/300',
      'https://picsum.photos/seed/step3/400/300'
    ],
    authorId: 'user4',
    authorName: '赵老师',
    authorAvatar: '/avatars/notionists-1775390810100.svg',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AnswerCard 组件示例</h1>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. 纯文本回答</h2>
          <AnswerCard answer={textOnlyAnswer} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. 带图片的回答</h2>
          <AnswerCard answer={answerWithImages} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. 无头像的回答</h2>
          <AnswerCard answer={noAvatarAnswer} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. 长回答（多图）</h2>
          <AnswerCard answer={longAnswer} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. 自定义样式</h2>
          <AnswerCard 
            answer={textOnlyAnswer} 
            className="border-2 border-blue-200 shadow-lg"
          />
        </section>
      </div>
    </div>
  );
}
