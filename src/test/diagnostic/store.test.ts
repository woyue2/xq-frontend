import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';

describe('Diagnostic Store', () => {
  beforeEach(() => {
    useDiagnosticStore.getState().reset();
  });

  it('should have initial state', () => {
    const state = useDiagnosticStore.getState();
    expect(state.results).toEqual([]);
    expect(state.isRunning).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.logs).toEqual([]);
  });

  it('should add logs', () => {
    const store = useDiagnosticStore.getState();
    store.addLog('Test log');
    
    const state = useDiagnosticStore.getState();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toContain('Test log');
  });

  it('should update progress and status', () => {
    const store = useDiagnosticStore.getState();
    store.startTests();
    
    expect(useDiagnosticStore.getState().isRunning).toBe(true);
    expect(useDiagnosticStore.getState().progress).toBe(0);

    store.completeTests();
    expect(useDiagnosticStore.getState().isRunning).toBe(false);
    expect(useDiagnosticStore.getState().progress).toBe(100);
  });

  it('should update specific result', () => {
    useDiagnosticStore.setState({
      results: [
        { id: '1', name: 'Test 1', description: 'Desc', status: 'pending' }
      ]
    });

    const store = useDiagnosticStore.getState();
    store.updateResult('1', { status: 'success', message: 'Passed' });

    const updated = useDiagnosticStore.getState().results[0];
    expect(updated.status).toBe('success');
    expect(updated.message).toBe('Passed');
  });
});
