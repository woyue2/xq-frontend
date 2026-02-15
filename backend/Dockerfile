FROM node:20-alpine AS build

WORKDIR /app

# 先安装依赖，利用 Docker 缓存减少重复构建时间
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# 再复制源码并编译
COPY tsconfig.json ./
COPY src ./src
COPY script ./script
COPY openapi.yaml ./
COPY static ./static
RUN npm run build
# 修改原因：编译产物默认保留无扩展名 ESM 导入，Node 运行时会解析失败；构建阶段统一补全 .js 扩展。
RUN node script/fix-esm-specifiers.mjs dist

FROM mcr.microsoft.com/playwright:v1.58.1-jammy AS runtime

WORKDIR /app
ENV NODE_ENV=production

# 运行时只保留生产依赖
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

# 修改原因：显式安装 Chromium，确保容器内可执行 page.pdf（仅安装 chromium，避免额外体积）。
RUN npx playwright install chromium

# 拷贝构建产物与静态资源
COPY --from=build /app/dist ./dist
COPY --from=build /app/static ./static

EXPOSE 3000

# 修改原因：后端编译产物为 ESM 且内部使用无扩展名导入，容器内 Node 需启用兼容解析。
CMD ["node", "--experimental-specifier-resolution=node", "dist/server.js"]
