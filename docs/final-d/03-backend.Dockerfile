FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY script ./script
COPY static ./static
COPY openapi.yaml ./
RUN npm run build

# 可选：修复 ESM 无扩展名导入（若项目已使用该脚本）
# RUN node script/fix-esm-specifiers.mjs dist

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY --from=build /app/static ./static

EXPOSE 3000

CMD ["node", "--experimental-specifier-resolution=node", "dist/server.js"]
