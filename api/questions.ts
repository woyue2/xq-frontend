import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import helpers - use dynamic import to avoid circular dependencies
let prisma: any;
let authenticateToken: any;
let AppError: any;

async function loadHelpers() {
  if (!prisma) {
    const helpers = await import('./_helpers');
    prisma = helpers.prisma;
    authenticateToken = helpers.authenticateToken;
    AppError = helpers.AppError;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await loadHelpers();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // List questions with pagination
      const { 
        page = '1', 
        pageSize = '10',
        subject,
        topic,
        dimension,
        authorId,
        search
      } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      const where: any = {};
      if (subject && subject !== '') where.subject = subject as string;
      if (topic && topic !== '') where.topic = topic as string;
      if (dimension && dimension !== '') where.dimension = dimension as string;
      if (authorId) where.authorId = parseInt(authorId as string);
      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { content: { contains: search as string } }
        ];
      }

      const [items, total] = await Promise.all([
        prisma.question.findMany({
          where,
          skip,
          take: pageSizeNum,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.question.count({ where })
      ]);

      // Get user's likes and favorites if authenticated
      let userLikes: number[] = [];
      let userFavorites: number[] = [];
      
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const user = authenticateToken(authHeader);
          const [likes, favorites] = await Promise.all([
            prisma.like.findMany({
              where: {
                userId: user.userId,
                questionId: { in: items.map(q => q.id) }
              },
              select: { questionId: true }
            }),
            prisma.favorite.findMany({
              where: {
                userId: user.userId,
                questionId: { in: items.map(q => q.id) }
              },
              select: { questionId: true }
            })
          ]);
          userLikes = likes.map(l => l.questionId);
          userFavorites = favorites.map(f => f.questionId);
        } catch (err) {
          // Ignore auth errors for list endpoint
        }
      }

      const formattedItems = items.map(q => ({
        id: q.id,
        title: q.title,
        content: q.content,
        subject: q.subject,
        topic: q.topic,
        dimension: q.dimension,
        images: q.images,
        authorId: q.authorId,
        authorName: q.authorName,
        authorAvatar: q.authorAvatar,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        answerCount: q.answers,
        likeCount: q.likes,
        favoriteCount: q.favorites,
        isLiked: userLikes.includes(q.id),
        isFavorited: userFavorites.includes(q.id)
      }));

      return res.json({
        items: formattedItems,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum)
      });
    }

    // Other methods require authentication
    const user = authenticateToken(req.headers.authorization);

    if (req.method === 'POST') {
      // Create question - handled by content.ts
      // Forward to content API
      const contentModule = await import('./content');
      return contentModule.default(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Questions API Error]', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
