import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subjects = [
      { 
        key: 'subject_math', 
        name: '数学', 
        order: 1,
        topics: [
          { value: 'math_algebra', label: '代数', order: 10 },
          { value: 'math_geometry', label: '几何', order: 20 },
          { value: 'math_statistics', label: '统计', order: 30 }
        ]
      },
      { 
        key: 'subject_chinese', 
        name: '语文', 
        order: 2,
        topics: [
          { value: 'chinese_reading', label: '阅读', order: 10 },
          { value: 'chinese_writing', label: '写作', order: 20 },
          { value: 'chinese_classical', label: '古文', order: 30 }
        ]
      },
      { 
        key: 'subject_english', 
        name: '英语', 
        order: 3,
        topics: [
          { value: 'english_reading', label: '阅读', order: 10 },
          { value: 'english_writing', label: '写作', order: 20 },
          { value: 'english_grammar', label: '语法', order: 30 }
        ]
      },
      { 
        key: 'subject_physics', 
        name: '物理', 
        order: 4,
        topics: [
          { value: 'physics_mechanics', label: '力学', order: 10 },
          { value: 'physics_electromagnetism', label: '电磁学', order: 20 },
          { value: 'physics_optics', label: '光学', order: 30 }
        ]
      },
      { 
        key: 'subject_chemistry', 
        name: '化学', 
        order: 5,
        topics: [
          { value: 'chemistry_organic', label: '有机化学', order: 10 },
          { value: 'chemistry_inorganic', label: '无机化学', order: 20 },
          { value: 'chemistry_physical', label: '物理化学', order: 30 }
        ]
      }
    ];

    return res.json({ subjects });
  } catch (error) {
    console.error('[Subjects API Error]', error);
    return res.status(500).json({ error: 'Failed to load subjects' });
  }
}
