# 录音功能 HTTPS + Docker + Caddy 部署指南

## 背景

浏览器录音（`getUserMedia`/`MediaRecorder`）只在安全上下文可用：

- `https://` 域名
- `http://localhost`

如果使用 `http://172.x.x.x:5173` 这类局域网 IP，浏览器会拒绝麦克风权限，这是预期行为。

## 目标架构

推荐固定为以下结构（适合未来 Docker 打包）：

`Browser -> Caddy(HTTPS) -> frontend(vite/nginx) + backend(api)`

说明：

- 前后端容器内部仍可使用 HTTP。
- 只在 Caddy 层处理 HTTPS 证书和 TLS。
- 业务代码无需因为 HTTPS 重构。

## 方案 A（推荐）：正式域名 + 自动证书

适用场景：

- 可用公网域名；
- 服务器可被公网访问（用于 ACME 证书签发）。

### 1. DNS

将域名（例如 `qa.example.com`）A 记录指向服务器公网 IP。

### 2. Docker Compose（示例）

```yaml
services:
  caddy:
    image: caddy:2
    container_name: qa-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend

  frontend:
    # 你的前端镜像（可为 vite preview 或 nginx 静态文件）
    image: your-frontend-image
    container_name: qa-frontend
    expose:
      - "5173"

  backend:
    image: your-backend-image
    container_name: qa-backend
    expose:
      - "4000"

volumes:
  caddy_data:
  caddy_config:
```

### 3. Caddyfile（示例）

```caddy
qa.example.com {
  encode gzip

  handle /api/* {
    reverse_proxy backend:4000
  }

  handle {
    reverse_proxy frontend:5173
  }
}
```

### 4. 前端 API 基础路径

确保前端走相对路径 `/api`（当前项目已是此模式），避免前端直接请求 `http://localhost:4000` 触发混合内容或跨域问题。

## 方案 B（内网调试）：自签证书

适用场景：

- 仅局域网验收；
- 无公网域名。

做法：

1. 使用 Caddy/Nginx 配置本地域名（例如 `qa.local`）的 HTTPS；
2. 给测试设备安装并信任该自签根证书；
3. 用 `https://qa.local` 访问，而不是 `http://172.x.x.x`。

注意：未信任证书时，浏览器通常仍会拒绝麦克风权限。

## 方案 C（仅开发机本地）

使用 `http://localhost:5173` 访问，可直接录音。  
此方式仅适合本机开发，不适合手机/其他设备联调。

## Docker 化注意事项

1. 不要在前后端容器里重复配置 HTTPS，统一由网关容器（Caddy）做 TLS 终止。
2. 保留 `X-Forwarded-*` 头，后端如需可记录真实来源。
3. 如有 WebSocket（例如热更新/推送），需要在网关层同时代理对应路径。
4. 生产环境建议固定域名，不建议长期用裸 IP 做前端入口。

## 验收步骤（录音链路）

1. 打开浏览器地址，确认是 `https://...` 且无证书警告。
2. 在浏览器站点权限中确认麦克风为“允许”。
3. 进入老师回答页，点击录音，确认不再出现“非安全环境”提示。
4. 提交录音后检查：
   - 前端请求 `POST /api/upload/audio` 返回 200；
   - 后端可访问 `static/audio/...` 文件；
   - 回答详情可播放该音频。

## 常见失败点

1. 地址是 `http://172.x.x.x`：必然不安全上下文。
2. HTTPS 证书未被设备信任：麦克风仍可能被拦截。
3. 前端把 API 写死成 `http://...`：会触发混合内容，导致上传失败。
4. 网关未转发 `/api`：前端页面可打开但接口全 404/502。
