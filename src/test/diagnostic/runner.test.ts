import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDiagnosticTests } from '@/lib/test-runner';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';

// Mock the store
vi.mock('@/stores/useDiagnosticStore', async () => {
  const actual = await vi.importActual<any>('@/stores/useDiagnosticStore');
  return {
    ...actual,
    useDiagnosticStore: {
      ...actual.useDiagnosticStore,
      getState: vi.fn(),
      setState: vi.fn(),
    }
  };
});

// Mock sleep to speed up tests
vi.mock('@/lib/utils', () => ({
  sleep: vi.fn().mockResolvedValue(undefined)
}));

describe('Diagnostic Runner', () => {
  // We need a real store for integration logic or mock it heavily
  // Since test-runner uses getState() directly, it's better to use the real store
  // but mock the timing.
  
  // Actually, unmocking the store is better for logic verification
  beforeEach(() => {
    vi.unmock('@/stores/useDiagnosticStore');
    useDiagnosticStore.getState().reset();
  });

  it('should run all tests and update store', async () => {
    const store = useDiagnosticStore.getState();
    
    // Override sleep in test-runner if possible, or just wait
    // Since we can't easily mock the internal sleep in test-runner.ts without export,
    // we'll rely on the fact that tests run sequentially.
    // Total wait time in runner is around 2-3 seconds.
    // We can use vi.useFakeTimers() if needed, but async/await with sleep makes it tricky.
    
    // Let's just run it. It might take 3s.
    const promise = runDiagnosticTests();
    
    // Check if started
    expect(useDiagnosticStore.getState().isRunning).toBe(true);
    
    await promise;
    
    const finalState = useDiagnosticStore.getState();
    expect(finalState.isRunning).toBe(false);
    expect(finalState.progress).toBe(100);
    expect(finalState.results.length).toBeGreaterThan(0);
    
    // Check if logs are populated
    expect(finalState.logs.length).toBeGreaterThan(0);
  });

  it('should handle mock user check', async () => {
     await runDiagnosticTests();
     const results = useDiagnosticStore.getState().results;
     const userTest = results.find(r => r.id === 'auth_user_info');
     expect(userTest).toBeDefined();
     // It might fail or pass depending on mock data, but we expect it to run
     expect(userTest?.status).not.toBe('pending');
  });
});
