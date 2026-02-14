# 当前推荐方案（A）说明：
# - 你项目前端产物已在 /mnt/c/Users/Administrator/Downloads/zsxq-4/dist
# - 推荐由 Caddy 直接挂载 dist 提供静态页面
# - 因此本方案“无需前端独立容器”

# 如果后续要改为方案 B（前端容器化），可使用下面示例 Dockerfile：
#
# FROM nginx:1.27-alpine
# COPY dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
