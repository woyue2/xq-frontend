// 自定义业务错误类型，便于统一错误处理
export class AppError extends Error {
  status: number;
  code: string;
  data?: unknown;
  bizCode?: number;

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
