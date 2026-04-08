# Project Cleanup Plan

## Summary
This document identifies files to delete or archive to make the project clearer and more maintainable.

## Files to DELETE (Redundant Documentation)

### Root Directory - Duplicate/Outdated Documentation
These are temporary documentation files created during development that are now redundant:

1. **API_ENDPOINT_FIXES.md** - Old fix documentation
2. **API_REFERENCE.md** - Outdated API reference
3. **CLAUDE.md** - Development notes
4. **DATABASE_SETUP_GUIDE.md** - Replaced by integration test docs
5. **DEBUGGING_GUIDE.md** - Old debugging notes
6. **FIXES-SUMMARY.md** - Old fix summary
7. **INTEGRATION_TESTS_SUMMARY.md** - Duplicate of SUCCESS doc
8. **LOCAL_DEVELOPMENT.md** - Redundant
9. **MIGRATION_COMPLETE.md** - Old migration notes
10. **MIGRATION_STATUS.md** - Old migration notes
11. **NEXT_STEPS.md** - Temporary planning doc
12. **potential-401-issues.md** - Old debugging notes
13. **QUICK_FIX.md** - Temporary fix notes
14. **README_LOCAL_DEV.md** - Redundant with main README
15. **README_TESTING.md** - Redundant with INTEGRATION_TESTING.md
16. **RESET_DATABASE_PASSWORD.md** - Old troubleshooting
17. **START_HERE.md** - Temporary setup guide
18. **SUPABASE_PROJECT_MISSING.md** - Old troubleshooting
19. **TESTING_PLAN.md** - Planning doc, now implemented
20. **type-check-output.txt** - Temporary output file
21. **running.log** - Temporary log file

### Test Scripts (Redundant)
22. **test-api.ps1** - Manual test script
23. **test-api.sh** - Manual test script
24. **test-db-connection.js** - Manual connection test
25. **run-integration-tests.bat** - Redundant (use npm scripts)
26. **run-integration-tests.sh** - Redundant (use npm scripts)

### Old Test Files (src/test/)
These are old unit tests that are now covered by integration tests:

27. **src/test/integration.test.tsx** - Old integration test (failing)
28. **src/test/AdminSubjectsPage.integration.test.tsx** - Old integration test
29. **src/test/answers.test.ts** - Old unit test
30. **src/test/auth.test.ts** - Old unit test
31. **src/test/comments.test.ts** - Old unit test
32. **src/test/questions.test.ts** - Old unit test
33. **src/test/subjects.test.ts** - Old unit test
34. **src/test/upload.test.ts** - Old unit test
35. **src/test/api.test.ts** - Old API test
36. **src/test/config.test.ts** - Old config test
37. **src/test/CLAUDE.md** - Development notes

### Unused Development Files
38. **dev-server.ts** - Unused (using vercel dev)
39. **docker-compose.yml** - If not using Docker

## Files to KEEP

### Essential Documentation
- **README.md** - Main project documentation
- **INTEGRATION_TESTING.md** - Current testing guide
- **INTEGRATION_TESTS_SUCCESS.md** - Test results and guide

### Configuration Files
- All `.json`, `.ts`, `.js` config files in root
- `.env.*` files
- `.eslintrc.json`, `.prettierrc`, etc.

### Source Code
- All files in `src/`, `api/`, `prisma/`
- Keep component tests (they test UI logic)
- Keep new integration tests in `src/test/integration/`

### Build/Deploy
- `vercel.json`, `package.json`, etc.

## Recommended Actions

### Step 1: Create Archive Folder
```bash
mkdir -p archive/old-docs
mkdir -p archive/old-tests
mkdir -p archive/old-scripts
```

### Step 2: Move Files to Archive
Move all files listed above to appropriate archive folders.

### Step 3: Update README.md
Create a clear, concise README with:
- Project overview
- Setup instructions
- Testing guide (reference INTEGRATION_TESTING.md)
- Development workflow

### Step 4: Clean Up Test Directory
Keep only:
- `src/test/integration/` - New integration tests
- Component tests (*.test.tsx for UI components)
- `src/test/setup.ts` - Test configuration

## Result
After cleanup, the project will have:
- Clear documentation structure
- Only relevant test files
- No redundant or outdated files
- Easy to navigate and understand
