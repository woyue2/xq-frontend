# Changelog

## [Unreleased]

### Fixed
- **App Component Failure**: Fixed a critical `ReferenceError: ParentQuestionPage is not defined` that caused the application to crash on startup.
  - Added missing import `import { ParentQuestionPage } from '@/pages/ParentQuestionPage';` in `src/App.tsx`.
  - Resolved `net::ERR_ABORTED` chunk loading errors caused by the unresolved dependency.
- **Error Handling**:
  - Implemented `ErrorBoundary` component in `src/components/ui/error-boundary.tsx` to catch component tree crashes.
  - Added global error boundary wrapping in `src/App.tsx` with user-friendly fallback UI and `sonner` toast notifications.

### Added
- **Tests**:
  - Added `src/test/app_import.test.tsx` to verify `App` component renders successfully and all routes are valid, preventing regression of import errors.

## [2026-02-02]
- Initial parent-child binding flow implementation.
