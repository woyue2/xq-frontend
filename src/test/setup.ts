import '@testing-library/jest-dom';

// Enable mock mode for tests
if (typeof window !== 'undefined') {
  window.localStorage.setItem('mock-mode-override', 'true');
}
