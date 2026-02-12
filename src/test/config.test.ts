import { DIFFICULTY_LABELS, BADGE_LABELS, TOAST_MESSAGES, TIME_LABELS } from '../config/app-constants';

describe('App Constants Configuration', () => {
  test('DIFFICULTY_LABELS should have correct keys and values', () => {
    expect(DIFFICULTY_LABELS).toHaveProperty('easy');
    expect(DIFFICULTY_LABELS).toHaveProperty('medium');
    expect(DIFFICULTY_LABELS).toHaveProperty('hard');
    
    expect(DIFFICULTY_LABELS.easy.label).toBe('简单');
    expect(DIFFICULTY_LABELS.medium.label).toBe('中等');
    expect(DIFFICULTY_LABELS.hard.label).toBe('难题');

    expect(DIFFICULTY_LABELS.easy.className).toBeDefined();
    expect(DIFFICULTY_LABELS.medium.className).toBeDefined();
    expect(DIFFICULTY_LABELS.hard.className).toBeDefined();
  });

  test('BADGE_LABELS should have correct keys', () => {
    expect(BADGE_LABELS).toHaveProperty('goodQuestion');
    expect(BADGE_LABELS).toHaveProperty('pinned');
  });

  test('TOAST_MESSAGES should include all interaction messages', () => {
    const requiredKeys = [
      'onlyTeacherCanPin',
      'pinned',
      'unpinned',
      'liked',
      'unliked',
      'favorited',
      'unfavorited'
    ];
    
    requiredKeys.forEach(key => {
      expect(TOAST_MESSAGES).toHaveProperty(key);
      // @ts-ignore
      expect(typeof TOAST_MESSAGES[key]).toBe('string');
      // @ts-ignore
      expect(TOAST_MESSAGES[key].length).toBeGreaterThan(0);
    });
  });

  test('TIME_LABELS should be valid suffixes', () => {
    expect(TIME_LABELS.minutesAgo).toContain('前');
    expect(TIME_LABELS.hoursAgo).toContain('前');
    expect(TIME_LABELS.daysAgo).toContain('前');
  });
});
