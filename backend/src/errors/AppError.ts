// 自定义业务错误类型，便于统一错误处理
export class AppError extends Error {
  status: number;
  code: string;
  data?: unknown;
  bizCode?: number;
  /**
   * 可选的运行模式字段，用于在日志中标记当前错误是否来自
   * 正常路径、mock 路径或降级路径。
   *
   * 典型取值:
   * - 'normal'   : 正常路径
   * - 'mock'     : Mock 模式
   * - 'degraded' : 降级路径
   */
  mode?: 'normal' | 'mock' | 'degraded';

  constructor(
    status: number,
    code: string,
    message: string,
    data?: unknown,
    bizCode?: number
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.bizCode = bizCode;
  }
}
