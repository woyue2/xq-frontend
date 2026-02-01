# Code Standards Compliance Report

**Date**: 2026-02-01T17:26:35.424Z
**Compliance Rate**: 93% (Target: ≥95%)
**Status**: ❌ FAILED

## Summary
- Total Files Scanned: 101
- Compliant Files: 94
- Issues Found: 7

## Issues List (Blocking)

| File | Line | Issue | Fix Example |
|------|------|-------|-------------|
| `src\App.tsx` | 31 | Prefer named export 'export function' over 'export default' | export function MyComponent() {} |
| `src\pages\HomePage.tsx` | 87 | Avoid inline styles, use Tailwind classes | Use className="bg-red-500" |
| `src\pages\CreateQuestionPage.tsx` | 135 | Remove console.log usage | Remove line |
| `src\pages\AuditPage.tsx` | 415 | Avoid inline styles, use Tailwind classes | Use className="bg-red-500" |
| `src\components\ui\progress.tsx` | 25 | Avoid inline styles, use Tailwind classes | Use className="bg-red-500" |
| `src\components\ui\GoodQuestionBadge.tsx` | 0 | UI Component GoodQuestionBadge should be kebab-case (e.g., button.tsx) | Rename to PascalCase (e.g., MyComponent.tsx) |
| `src\components\ui\chart.tsx` | 294 | Avoid inline styles, use Tailwind classes | Use className="bg-red-500" |
