/**
 * [POS] src/services/subjectConfig.service.ts
 *   所属：services 层 | 角色：学科/话题维度配置 API 服务
 *   兄弟：admin.service.ts / api.ts（re-export 桶）
 *
 * [INPUT]
 *   - ./api             → api（axios 实例）
 *   - @/config/taxonomy → TAXONOMY / SubjectConfig
 *   - @/types/api       → SubjectDto / TopicDto
 *
 * [OUTPUT]
 *   - subjectConfigService（学科配置 API 调用对象）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/services/CLAUDE.md 的文件清单
 */
import { api } from './api';
import type { SubjectDto, TopicDto } from '@/types/api';
import type { SubjectConfig } from '@/config/taxonomy';
import { TAXONOMY } from '@/config/taxonomy';

/**
 * 科目配置服务
 * 优先从后端加载，失败时降级到本地 TAXONOMY
 */
class SubjectConfigService {
  private cache: SubjectDto[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取科目配置（带缓存和降级）
   */
  async getSubjects(): Promise<SubjectDto[]> {
    // 1. 检查缓存
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // 2. 请求后端
      const response = await api.get<{ subjects: SubjectDto[] }>('/subjects');
      const subjects = (response.data as any).subjects as SubjectDto[];

      if (!Array.isArray(subjects)) {
        throw new Error('Invalid subjects response');
      }

      // 更新缓存
      this.cache = subjects;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return subjects;
    } catch (error) {
      console.warn(
        '[SubjectConfigService] Failed to load subjects from backend, falling back to static config:',
        error,
      );

      // 3. 降级：转换本地 TAXONOMY 为 SubjectDto 格式
      const fallback = this.transformTaxonomyToDto(TAXONOMY);
      return fallback;
    }
  }

  /**
   * 获取科目简化列表（用于筛选器）
   */
  async getSubjectOptions(): Promise<{ key: string; name: string; order: number }[]> {
    const subjects = await this.getSubjects();
    return subjects.map((s) => ({ key: s.key, name: s.name, order: s.order }));
  }

  /**
   * 根据 key 获取单个科目的考点列表
   */
  async getTopicsBySubject(subjectKey: string): Promise<TopicDto[]> {
    const subjects = await this.getSubjects();
    const subject = subjects.find((s) => s.key === subjectKey);
    return subject?.topics || [];
  }

  /**
   * 清除缓存（用于管理端更新后刷新）
   */
  clearCache() {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * 将后端数据转换为 TAXONOMY 格式（保持向后兼容）
   */
  async getTaxonomyConfig(): Promise<Record<string, SubjectConfig>> {
    const subjects = await this.getSubjects();

    const taxonomy: Record<string, SubjectConfig> = {};

    for (const subject of subjects) {
      // 提取科目 value（移除 subject_ 前缀）
      const subjectValue = subject.key.replace('subject_', '');

      taxonomy[subjectValue] = {
        label: subject.name,
        value: subjectValue,
        topics: subject.topics.map((t) => t.label),
        methods: [], // methods 来自另一个维度
      };
    }

    return taxonomy;
  }

  /**
   * 降级：转换本地 TAXONOMY 为 SubjectDto 格式
   */
  private transformTaxonomyToDto(taxonomy: Record<string, SubjectConfig>): SubjectDto[] {
    return Object.entries(taxonomy).map(([value, config]) => ({
      key: `subject_${value}`,
      name: config.label,
      order: 0,
      topics: config.topics.map((topic, index) => ({
        value: `${value}_${topic.toLowerCase().replace(/\s+/g, '_')}`,
        label: topic,
        order: index * 10,
      })),
    }));
  }
}

export const subjectConfigService = new SubjectConfigService();
