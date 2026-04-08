# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - V3 API Response Parsing with code field
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to successful V3 API responses with `code: 200` and `data.url` present
  - Test that uploadToOSS correctly parses responses with `result.code === 200` (from Bug Condition in design)
  - Mock imgurl.org V3 API to return `{ code: 200, data: { url: "https://example.com/image.png" } }`
  - The test assertions should verify that the URL is extracted from `result.data.url`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with "Invalid response format" error (this is correct - it proves the bug exists)
  - Document counterexamples found: successful API responses are rejected because code checks `result.status` (undefined) instead of `result.code`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Error Handling and Validation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (validation errors, auth errors, API errors)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test file size validation: files >5MB return 400 error "图片大小不能超过 5MB"
  - Test file format validation: unsupported formats return 400 error with format list
  - Test authentication: unauthenticated requests return 401 error "需要登录"
  - Test cleanup: temporary files are deleted after upload attempts
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix V3 API response parsing in uploadToOSS

  - [x] 3.1 Update response parsing logic
    - Change line 91 from `if (result.status === 200 && result.data?.url)` to `if (result.code === 200 && result.data?.url)`
    - Update comment on line 90 from `// imgurl.org 返回格式: { status: 200, data: { url: "..." } }` to `// imgurl.org V3 API 返回格式: { code: 200, data: { url: "..." } }`
    - This aligns with the actual imgurl.org V3 API response format
    - _Bug_Condition: isBugCondition(input) where input.response.ok === true AND input.parsedJSON.code === 200 AND input.parsedJSON.data?.url EXISTS_
    - _Expected_Behavior: uploadToOSS returns input.parsedJSON.data.url without throwing error_
    - _Preservation: File validation, authentication, error handling, and cleanup behavior unchanged_
    - _Requirements: 1.2, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - V3 API Response Parsing with code field
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that successful V3 API responses with `code: 200` are now correctly parsed
    - Verify that the URL is extracted from `result.data.url`
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Error Handling and Validation Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm file size validation still works (>5MB rejected)
    - Confirm file format validation still works (unsupported formats rejected)
    - Confirm authentication still works (401 for unauthenticated)
    - Confirm cleanup still works (temp files deleted)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests (bug condition + preservation)
  - Verify no regressions in error handling or validation
  - Ask the user if questions arise
