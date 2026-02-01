export const aiTextConfig = {
  // 首页标语（每5分钟自动轮播）
  headerSlogans: [
    "初中知识问答",
    "随时随地，答疑解惑",
    "连接知识，连接你我",
    "让学习变得更简单",
    "智慧伴你同行",
    "探索知识的海洋",
    "每天进步一点点",
    "学习是最好的投资",
    "勤学苦练，只争朝夕",
    "知识改变命运"
  ],

  // AI审核相关提示语
  auditMessages: {
    pending: "AI正在智能审核您的内容，请稍候...",
    approved: "AI审核通过，内容合规",
    rejected: "内容涉及敏感信息，AI审核未通过",
    warning: "请注意文明用语，共建和谐社区",
    checking: "AI正在分析图片内容...",
    imageApproved: "图片内容安全",
    imageRejected: "图片包含不当内容",
    
    // 昵称/个人信息审核
    nicknameSensitive: "昵称包含敏感词，请修改后重试",
    nicknameTooShort: "昵称至少需要2个字符",
    nicknameTooLong: "昵称最多20个字符",
    nicknameRejected: "昵称审核未通过",
    nicknameUpdated: "昵称已更新",
    
    // 审核操作反馈
    auditComplete: "审核完成",
    statusApproved: "已通过",
    statusRejected: "已驳回",
    statusBanned: "已封禁"
  },

  // 默认提示语
  placeholders: {
    search: "搜索感兴趣的知识点...",
    comment: "写下你的见解...",
    question: "描述你的问题，AI辅助分析中...",
    rejectReason: "请输入驳回原因..."
  }
};

/**
 * 获取当前的标语（基于时间每5分钟变化）
 * @returns string
 */
export const getCurrentSlogan = (): string => {
  const slogans = aiTextConfig.headerSlogans;
  if (!slogans.length) return "";
  
  // 获取当前时间戳（分钟）
  const currentMinutes = Math.floor(Date.now() / 1000 / 60);
  // 每5分钟为一个周期
  const index = Math.floor(currentMinutes / 5) % slogans.length;
  
  return slogans[index];
};
