# Technical Implementation

## 1. API Service Refactoring
Refactor `src/services/api.ts` to include:
-   `axios.create` with environment variable `VITE_API_BASE`.
-   Request interceptor for `Authorization: Bearer <token>`.
-   Response interceptor for global error handling (401, 403, etc.) and data unpacking (`response.data`).

## 2. Type Definitions
Update `src/types/api.ts` (or `index.ts`) to match the checklist:
-   `ApiResponse<T>`
-   `PaginatedResponse<T>`
-   Specific payload/response types for Auth, Questions, Interactions.

## 3. Proxy Configuration
Update `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // Or backend URL
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

## 4. Testing Strategy
Use `msw` (Mock Service Worker) or simple mock implementations in Vitest to test the service layer.
-   Test success cases (200 OK).
-   Test error cases (4xx, 5xx).
-   Test interceptor logic (Token injection).

## 5. Mock Data Alignment
Ensure `src/lib/mock-data.ts` structures match the new `ApiResponse` format if they are used directly, or update the mock service to return standard responses.
