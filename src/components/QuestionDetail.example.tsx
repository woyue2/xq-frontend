/**
 * QuestionDetail 组件使用示例
 * 
 * 展示如何使用 QuestionDetail 组件显示问题详情
 */
import { QuestionDetail } from './QuestionDetail';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

// 示例问题数据
const sampleQuestion: QuestionDTO = {
  id: 'q1',
  title: '如何解这道一元二次方程？',
  content: '求解方程 x^2 + 5x + 6 = 0\n\n请详细说明解题步骤。',
  subject: '数学',
  tags: ['代数', '一元二次方程', '因式分解'],
  images: [
    'https://picsum.photos/seed/math1/400/300',
    'https://picsum.photos/seed/math2/400/300'
  ],
  authorId: 'user1',
  authorName: '张三',
  authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  answerCount: 2
};

// 示例回答数据
const sampleAnswers: AnswerDTO[] = [
  {
    id: 'a1',
    questionId: 'q1',
    content: '这是一个一元二次方程，可以使用因式分解法求解：\n\nx^2 + 5x + 6 = 0\n(x + 2)(x + 3) = 0\n\n所以 x = -2 或 x = -3',
    images: ['https://picsum.photos/seed/answer1/400/300'],
    authorId: 'user2',
    authorName: '李四',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a2',
    questionId: 'q1',
    content: '也可以使用求根公式：\n\nx = (-b ± √(b^2 - 4ac)) / 2a\n\n其中 a=1, b=5, c=6\n\nx = (-5 ± √(25 - 24)) / 2\nx = (-5 ± 1) / 2\n\n所以 x = -2 或 x = -3',
    authorId: 'user3',
    authorName: '王五',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分钟前
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

// 示例评论数据
const sampleComments: CommentDTO[] = [
  {
    id: 'c1',
    questionId: 'q1',
    content: '这道题很有意思，感谢分享！',
    authorId: 'user4',
    authorName: '赵六',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45分钟前
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'c2',
    questionId: 'q1',
    content: '我也遇到过类似的问题',
    authorId: 'user5',
    authorName: '孙七',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20分钟前
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  },
  {
    id: 'c3',
    questionId: 'q1',
    content: '讲解得很清楚！',
    image: 'https://picsum.photos/seed/comment1/300/200',
    authorId: 'user6',
    authorName: '周八',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user6',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10分钟前
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
];

// 示例1：完整的问题详情（已登录用户）
export function QuestionDetailLoggedIn() {
  const handleAnswer = () => {
    alert('打开回答对话框');
  };

  const handleComment = () => {
    alert('打开评论对话框');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">示例1：已登录用户视图</h2>
      <QuestionDetail
        question={sampleQuestion}
        answers={sampleAnswers}
        comments={sampleComments}
        isLoggedIn={true}
        onAnswer={handleAnswer}
        onComment={handleComment}
      />
    </div>
  );
}

// 示例2：未登录用户视图（无操作按钮）
export function QuestionDetailGuest() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">示例2：未登录用户视图</h2>
      <QuestionDetail
        question={sampleQuestion}
        answers={sampleAnswers}
        comments={sampleComments}
        isLoggedIn={false}
      />
    </div>
  );
}

// 示例3：只有问题，没有回答和评论
export function QuestionDetailNoAnswers() {
  const handleAnswer = () => {
    alert('成为第一个回答者！');
  };

  const handleComment = () => {
    alert('发表评论');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">示例3：无回答和评论</h2>
      <QuestionDetail
        question={sampleQuestion}
        answers={[]}
        comments={[]}
        isLoggedIn={true}
        onAnswer={handleAnswer}
        onComment={handleComment}
      />
    </div>
  );
}

// 示例4：简单问题（无图片、无标签）
export function QuestionDetailSimple() {
  const simpleQuestion: QuestionDTO = {
    id: 'q2',
    title: '什么是勾股定理？',
    content: '请简单解释一下勾股定理的含义。',
    subject: '数学',
    authorId: 'user1',
    authorName: '张三',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  };

  const simpleAnswers: AnswerDTO[] = [
    {
      id: 'a3',
      questionId: 'q2',
      content: '勾股定理：直角三角形两直角边的平方和等于斜边的平方。\n\n公式：a^2 + b^2 = c^2',
      authorId: 'user2',
      authorName: '李四',
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">示例4：简单问题</h2>
      <QuestionDetail
        question={simpleQuestion}
        answers={simpleAnswers}
        comments={[]}
        isLoggedIn={true}
      />
    </div>
  );
}

// 默认导出：展示所有示例
export default function QuestionDetailExamples() {
  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8">
        QuestionDetail 组件示例
      </h1>
      <QuestionDetailLoggedIn />
      <QuestionDetailGuest />
      <QuestionDetailNoAnswers />
      <QuestionDetailSimple />
    </div>
  );
}
