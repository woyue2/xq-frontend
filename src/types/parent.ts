export interface ChildInfo {
  id: string;
  name: string;        // 显示用的名字（来自nickname）
  realName?: string;   // 真实姓名（来自User.name）- 问题80
  grade: string;
  age?: number;        // 年龄（可选，因为后端可能不返回）- 问题81
  school?: string;
  avatar?: string;
  boundAt?: string;    // 绑定时间（来自parentChild.createdAt）- 问题82
  lastActiveAt?: string;
  parentId?: string;   // 家长ID（可选）
}

export interface BindChildPayload {
  childName: string;
  phone: string;
  code: string;
  school?: string;
}

export interface BindChildResponse {
  child: ChildInfo;
}
