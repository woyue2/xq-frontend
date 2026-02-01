# 知识星球问答小程序 (Knowledge Planet Q&A)

Based on Figma Design: [知识星球问答小程序](https://www.figma.com/design/YKefQxNgBrSpfSBWWHYqED/%E7%9F%A5%E8%AF%86%E6%98%9F%E7%90%83%E9%97%AE%E7%AD%94%E5%B0%8F%E7%A8%8B%E5%BA%8F)

## 📖 Project Overview
A modern interactive Q&A platform designed for students, teachers, and parents. It features subject-specific categorization, role-based permissions, and a seamless mobile-first user experience.

## 🛠 Tech Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS (v4) + Shadcn UI + Framer Motion
- **Routing**: React Router DOM v7
- **State Management**: Zustand (Auth & Global State)
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios

## ✨ Key Features
- **Dynamic Routing**: Fully client-side routing with protected routes (`AuthLayout` & `MainLayout`).
- **Role-Based Access**: Specialized views and permissions for Students, Teachers, and Parents.
- **Configurable Taxonomy**: Centralized subject/topic configuration in `src/config/taxonomy.ts`.
- **Infinite Feed**: High-performance scrolling list with optimistic UI updates.
- **Glassmorphism UI**: modern visual aesthetic with sticky headers and bottom navigation.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view in browser.

### Build
```bash
npm run build
```

## 🧪 Testing & Verification

We follow a rigorous verification process. Test cases are documented in [FRONTEND_TEST_CASES.md](./FRONTEND_TEST_CASES.md).

### Current Test Coverage (Manual & Static)

| Module | Features Verified | Status |
|--------|-------------------|--------|
| **Infrastructure** | Build Process, Type Safety, Tailwind Integration | ✅ Passed |
| **Routing** | Auth Redirection, Protected Routes, 404 Handling | ✅ Passed |
| **Authentication** | Login (Mock), Role Switching, Logout, Persistence | ✅ Passed |
| **Home Feed** | Infinite Scroll, Taxonomy Filtering, Optimistic Like/Fav | ✅ Passed |
| **Creation** | Structured Input, Image Upload (UI), Form Validation | ✅ Passed |
| **Audit** | Admin Dashboard, Permission Gates | ✅ Passed |

### How to Verify
1.  **Static Analysis**: Run `npm run build` to check for TypeScript errors.
2.  **Manual Verification**: Follow the checklist in `FRONTEND_TEST_CASES.md`.
    *   **Login**: Use phone `13800000000` + code `1234` (Mock).
    *   **Roles**: Toggle roles in `ProfilePage` or use invite codes (`TEACHER2024`).
    *   **Responsive**: Test on Mobile view in Chrome DevTools.

## 📂 Project Structure
```
src/
├── app/            # Framework specific entry & components
├── config/         # App-wide configurations (Taxonomy, Constants)
├── hooks/          # Custom React Hooks (useQuestions)
├── layouts/        # Layout Wrappers (Main, Auth)
├── lib/            # Utilities & Mock Data
├── pages/          # Route Page Components
├── services/       # API Service Layer
├── stores/         # Global State (Zustand)
└── types/          # TypeScript Interfaces
```

## 📝 License
Proprietary - Internal Use Only.