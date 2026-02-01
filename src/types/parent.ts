export interface ChildInfo {
  id: string;
  name: string;
  grade: string;
  age: number;
  school?: string;
  avatar?: string;
  boundAt: string;
  lastActiveAt?: string;
  parentId: string; // Added parentId field
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
