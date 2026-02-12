# 生产环境部署前，必须配置 CORS_ORIGIN：
# 1. 编辑 backend/.env
# 2. 设置 CORS_ORIGIN=https://your-production-domain.com
# 3. 禁止使用通配符 *（安全风险）
# 4. 如有多域名需求，用逗号分隔