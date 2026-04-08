/**
 * [POS] src/components/CommentCard.example.tsx
 *   所属：components 层 | 角色：CommentCard 组件示例
 *   用途：展示 CommentCard 组件的各种使用场景
 */
import { CommentCard } from './CommentCard';
import type { CommentDTO } from '@/types/dto';

export default function CommentCardExample() {
  // Example 1: Comment with text only
  const textOnlyComment: CommentDTO = {
    id: '1',
    questionId: 'q1',
    content: '这个解答很清晰，谢谢老师！',
    authorId: 'user1',
    authorName: '张同学',
    authorAvatar: '/avatars/notionists-1775390793571.svg',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  };

  // Example 2: Comment with image
  const commentWithImage: CommentDTO = {
    id: '2',
    questionId: 'q1',
    content: '我也遇到了类似的问题，这是我的解题过程：',
    image: 'https://picsum.photos/seed/comment1/400/300',
    authorId: 'user2',
    authorName: '李同学',
    authorAvatar: '/avatars/notionists-1775390806025.svg',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  };

  // Example 3: Comment without avatar
  const noAvatarComment: CommentDTO = {
    id: '3',
    questionId: 'q1',
    content: '补充一点：这道题还可以用另一种方法...',
    authorId: 'user3',
    authorName: '王同学',
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 300000).toISOString()
  };

  // Example 4: Long comment with image
  const longComment: CommentDTO = {
    id: '4',
    questionId: 'q1',
    content: `非常感谢老师的详细解答！

我之前一直不理解这个知识点，看了您的讲解后终于明白了。

特别是第二步的推导过程，讲得很透彻。

我自己也做了一些笔记，分享给大家参考。`,
    image: 'https://picsum.photos/seed/notes/400/300',
    authorId: 'user4',
    authorName: '赵同学',
    authorAvatar: '/avatars/notionists-1775390810100.svg',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  };

  // Example 5: Recent comment
  const recentComment: CommentDTO = {
    id: '5',
    questionId: 'q1',
    content: '刚刚看到这道题，正好我也在学这个！',
    authorId: 'user5',
    authorName: '孙同学',
    authorAvatar: '/avatars/notionists-1775390812760.svg',
    createdAt: new Date().toISOString(), // Just now
    updatedAt: new Date().toISOString()
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">CommentCard 组件示例</h1>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. 纯文本评论</h2>
          <CommentCard comment={textOnlyComment} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. 带图片的评论</h2>
          <CommentCard comment={commentWithImage} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. 无头像的评论</h2>
          <CommentCard comment={noAvatarComment} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. 长评论（带图）</h2>
          <CommentCard comment={longComment} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. 刚刚发布的评论</h2>
          <CommentCard comment={recentComment} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">6. 自定义样式</h2>
          <CommentCard 
            comment={textOnlyComment} 
            className="border-2 border-blue-200 shadow-lg"
          />
        </section>
      </div>
    </div>
  );
}
