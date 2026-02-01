import type { User, Question, Comment } from '@/types';

// 模拟当前用户
export let currentUser: User | null = null;

export const setCurrentUser = (user: User | null) => {
  currentUser = user;
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

// 从本地存储恢复用户
export const restoreUser = () => {
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    currentUser = JSON.parse(stored);
  }
};

// 模拟用户数据库
export const mockUsers: User[] = [
  {
    id: '1',
    phone: '13800138000',
    nickname: '小明同学',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    role: 'student',
  },
  {
    id: '2',
    phone: '13800138001',
    nickname: '李老师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
    role: 'teacher',
  },
  {
    id: '3',
    phone: '13800138002',
    nickname: '王妈妈',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent',
    role: 'parent',
  },
];

// 模拟问题数据
// 模拟问题数据
export const mockQuestions: Question[] = [
  {
    id: '1',
    title: '识媛 提问: 职场新手村，几分藏几分露最合适？？',
    content: '做事高调，做人低调，多把功劳归给别人；比如领导，同事。职业早期以磨练技能，磨练管理能力为主，多增加项目经验，荣誉多争取。这些都是可以带走的。物质奖励可以与他人共享（不太缺钱情况下）。物质和荣誉都占，会被嫉恨。',
    images: [],
    authorId: '1',
    authorName: 'Melody Zhang',
    isGoodQuestion: true,
    subject: 'politics', // Mapping 'workplace' to a generic subject for now or 'politics' as closest
    topics: ['职场技巧', '人际关系'],
    tags: ['职场', '人际关系'],
    difficulty: 'medium',
    stats: {
      likes: 126,
      favorites: 45,
      comments: 23,
      answers: 5,
      views: 1024
    },
    answerCount: 5,
    viewCount: 1024,
    likeCount: 126,
    collectionCount: 45,
    status: 'approved',
    isPinned: true,
    aiResult: '无违规',
    createdAt: '2024-11-15T21:42:00',
  },
  {
    id: 'q_pending_1',
    title: '数学问题：勾股定理如何证明？',
    content: '我记得有很多种方法，除了面积法还有什么？',
    images: ['https://placehold.co/400x300/EEE/31343C?text=Math+Image'],
    authorId: '1',
    authorName: '小明同学',
    isGoodQuestion: false,
    subject: 'math',
    topics: ['勾股定理', '几何证明'],
    stats: {
      likes: 0,
      favorites: 0,
      comments: 0,
      answers: 0
    },
    status: 'pending',
    isPinned: false,
    aiResult: '无违规',
    createdAt: '2026-01-30T10:00:00',
  },
  {
    id: '2',
    title: '初中数学：二次函数的顶点坐标如何求？',
    content: '老师讲了配方法，但是我总是算错，有没有更简单的方法？',
    images: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop'],
    authorId: '1',
    authorName: '小明同学',
    isGoodQuestion: false,
    subject: 'math',
    topics: ['二次函数', '配方法'],
    stats: {
      likes: 45,
      favorites: 12,
      comments: 8,
      answers: 3
    },
    status: 'approved',
    isPinned: false,
    createdAt: '2024-11-16T10:30:00',
  },
  {
    id: '3',
    title: '初中物理：浮力计算题怎么解？',
    content: '有一道题是这样的：一个物体在水中漂浮，已知物体密度0.6g/cm³，求物体露出水面的体积占总体积的比例？',
    images: [
      'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop'
    ],
    authorId: '1',
    authorName: '小明同学',
    isGoodQuestion: true,
    subject: 'physics',
    topics: ['浮力', '密度计算'],
    stats: {
      likes: 89,
      favorites: 34,
      comments: 15,
      answers: 7
    },
    status: 'approved',
    isPinned: false,
    createdAt: '2024-11-14T15:20:00',
  },
  {
    id: '4',
    title: '初中英语：现在完成时和过去完成时有什么区别？',
    content: '我总是分不清这两个时态，能举几个例子说明吗？',
    images: [],
    authorId: '1',
    authorName: '小红',
    isGoodQuestion: false,
    subject: 'english',
    topics: ['英语时态', '语法'],
    stats: {
      likes: 67,
      favorites: 23,
      comments: 12,
      answers: 4
    },
    status: 'approved',
    isPinned: false,
    createdAt: '2024-11-13T09:15:00',
  },
];

// 模拟评论数据
export const mockComments: Record<string, Comment[]> = {
  '1': [
    {
      id: 'c1',
      questionId: '1',
      questionTitle: '识媛 提问: 职场新手村...',
      content: '识媛：党得很赞',
      authorId: '1',
      authorName: '识媛',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shiyan',
      status: 'approved',
      aiResult: '无违规',
      createdAt: '2024-11-15T22:00:00',
    },
    {
      id: 'c_pending_1',
      questionId: '1',
      questionTitle: '识媛 提问: 职场新手村...',
      content: '我也觉得很有道理，下次试试。',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop',
      authorId: '3',
      authorName: '王妈妈',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent',
      status: 'pending',
      aiResult: '无违规',
      createdAt: '2026-01-30T11:00:00',
    },
    {
      id: 'c_pending_2',
      questionId: '1',
      questionTitle: '识媛 提问: 职场新手村...',
      content: '你说的这些都没用，垃圾。',
      authorId: '1',
      authorName: '小明同学',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
      status: 'pending',
      aiResult: '疑似违规（侮辱性词汇）',
      createdAt: '2026-01-30T12:00:00',
    },
    {
      id: 'c2',
      questionId: '1',
      content: '谢谢M姐的方法！我更新一下自己的认识：要把"审时度势"放在第一步，具体来说...',
      authorId: '1',
      authorName: '识媛',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shiyan',
      status: 'approved',
      createdAt: '2024-11-15T22:30:00',
    },
    {
      id: 'c3',
      questionId: '1',
      content: '很好的问题！建议同学们多关注职场沟通技巧，这对未来很有帮助。',
      authorId: '2',
      authorName: '李老师',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
      status: 'approved',
      createdAt: '2024-11-16T09:00:00',
    },
  ],
};



// 用户点赞、收藏数据
export const userLikes = new Set<string>(['1', '3']);
export const userFavorites = new Set<string>(['1', '2']);

// 模拟回答数据
export const mockAnswers: Record<string, any[]> = {
  '1': [
    {
      id: 'a1',
      questionId: '1',
      content: '这是一个很好的问题！在职场新手期，我建议你要做到以下几点：\n\n1. 保持谦虚的态度，虚心向前辈学习\n2. 主动承担工作，展示自己的能力\n3. 适当表现，但不要过于张扬\n4. 建立良好的人际关系\n\n记住，职场是一个长跑，不是短跑。',
      images: ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop'],
      audioUrl: 'mock-answer-audio-1.mp3',
      authorId: '2',
      authorName: '李老师',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
      likes: 45,
      status: 'approved',
      createdAt: '2024-11-16T08:30:00',
    },
    {
      id: 'a2',
      questionId: '1',
      content: '从我多年的职场经验来看，新人最重要的是先做好本职工作，积累经验和能力。功劳可以适当分享，但不要完全让出去，否则别人不知道你的价值。',
      authorId: '2',
      authorName: '王老师',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
      likes: 23,
      status: 'approved',
      createdAt: '2024-11-16T10:15:00',
    }
  ],
  '2': [
    {
      id: 'a3',
      questionId: '2',
      content: '二次函数 y = ax² + bx + c 的顶点坐标公式是：(-b/2a, (4ac-b²)/4a)\n\n其实你可以记住一个更简单的方法：\n1. 横坐标：x = -b/2a\n2. 纵坐标：把横坐标代入原式计算\n\n这样分两步记忆会更容易！',
      images: [
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=400&h=300&fit=crop'
      ],
      authorId: '2',
      authorName: '李老师',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
      likes: 34,
      status: 'approved',
      createdAt: '2024-11-16T11:20:00',
    }
  ],
  '3': [
    {
      id: 'a4',
      questionId: '3',
      content: '这道题的关键是理解漂浮条件：F浮 = G物\n\n因为物体密度是0.6g/cm³，水的密度是1g/cm³，所以：\nρ物/ρ水 = V排/V物 = 0.6\n\n因此露出水面的体积比例 = (V物 - V排)/V物 = 1 - 0.6 = 0.4 = 40%',
      audioUrl: 'mock-answer-audio-4.mp3',
      authorId: '2',
      authorName: '李老师',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
      likes: 56,
      status: 'approved',
      createdAt: '2024-11-14T16:30:00',
    }
  ]
};

// 邀请码验证
export const validInviteCodes = ['ZHISHIXINGQIU2024', 'STUDENT2024', 'TEACHER2024', 'PARENT2024'];
