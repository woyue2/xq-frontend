/**
 * API 语义等价类分类器。
 *
 * 本工具类用于在路由/合同比对结果的基础上，对差异进行语义层面的归类，
 * 将其划分为：
 * - NAMING_DIFF: 命名/文案差异（语义一致）；
 * - EXTENDED_FIELDS: 返回体扩展字段（向后兼容的增强）；
 * - EXTENDED_ENDPOINT: 扩展接口/参数（不破坏既有合同的新增能力）；
 * - HARD_ERROR: 硬错误（真正的合同不一致，例如缺少路径、状态码错误等）。
 *
 * 注意：本分类器只关心「差异类型」本身，不从源码或文档中直接解析。
 * 差异检测（例如路由扫描、OpenAPI 对比）应由上游工具完成，再将差异
 * 映射为 ApiDifferenceInput 供本模块消费。
 */

export type SemanticClass =
  | 'NAMING_DIFF'
  | 'EXTENDED_FIELDS'
  | 'EXTENDED_ENDPOINT'
  | 'HARD_ERROR';

export type DifferenceKind =
  | 'MissingEndpoint'
  | 'ExtraEndpoint'
  | 'FieldNameMismatch'
  | 'ExtraFields'
  | 'StatusCodeMismatch'
  | 'RequiredFieldMissing';

export interface ApiDifferenceInput {
  /** 差异类型（由上游检测器产生） */
  kind: DifferenceKind;
  /** HTTP 方法，例如 GET / POST */
  method: string;
  /** 路径，例如 /api/auth/register */
  path: string;
  /** 可选的差异说明，用于日志或报告输出 */
  description?: string;
}

/**
 * 当差异类型未知或未被支持时抛出的错误。
 * 这通常意味着上游检测器升级但未同步更新分类器映射规则。
 */
export class InvalidDifferenceError extends Error {
  readonly diff: ApiDifferenceInput;

  constructor(message: string, diff: ApiDifferenceInput) {
    super(message);
    this.name = 'InvalidDifferenceError';
    this.diff = diff;
  }
}

/**
 * API 语义等价类分类器。
 *
 * 目前规则：
 * - MissingEndpoint / StatusCodeMismatch / RequiredFieldMissing → HARD_ERROR
 * - ExtraEndpoint → EXTENDED_ENDPOINT（典型如新增 /api/auth/register）
 * - FieldNameMismatch → NAMING_DIFF（字段名不同但语义一致）
 * - ExtraFields → EXTENDED_FIELDS（返回体在原合同基础上的 superset）
 */
export class ApiSemanticClassifier {
  classify(diff: ApiDifferenceInput): SemanticClass {
    switch (diff.kind) {
      case 'MissingEndpoint':
      case 'StatusCodeMismatch':
      case 'RequiredFieldMissing':
        return 'HARD_ERROR';
      case 'ExtraEndpoint':
        return 'EXTENDED_ENDPOINT';
      case 'FieldNameMismatch':
        return 'NAMING_DIFF';
      case 'ExtraFields':
        return 'EXTENDED_FIELDS';
      default: {
        // TypeScript 的穷尽检查保护；运行时兜底仍然抛出错误。
        /* istanbul ignore next */
        throw new InvalidDifferenceError(
          `Unsupported difference kind: ${(diff as any).kind}`,
          diff
        );
      }
    }
  }
}

/**
 * 便捷函数：在无需维护分类器实例时，直接对单个差异进行分类。
 */
export const classifySemanticDifference = (
  diff: ApiDifferenceInput
): SemanticClass => {
  const classifier = new ApiSemanticClassifier();
  return classifier.classify(diff);
};

