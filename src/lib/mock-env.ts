const readMockOverride = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('mock-mode-override');
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
};

export const getMockMode = (): boolean => {
  const override = readMockOverride();
  if (override !== null) return override;
  return import.meta.env.VITE_USE_MOCK === 'true';
};

export const USE_MOCK = getMockMode();

const setMockModeOverride = (value: boolean | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem('mock-mode-override');
    } else {
      window.localStorage.setItem('mock-mode-override', value ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
};

// 供设置页调用：修改覆盖值并立即刷新页面，使新的 Mock 模式生效
export const applyMockModeOverride = (value: boolean | null) => {
  if (typeof window === 'undefined') return;
  setMockModeOverride(value);
  window.location.reload();
};

// 仅用于开发/测试环境下的诊断性日志，防止在生产环境误开启 Mock
if (import.meta.env.PROD && USE_MOCK) {
  // eslint-disable-next-line no-console
  console.warn(
    '[MockMode] Mock mode is enabled in production build (VITE_USE_MOCK or override). All API requests may be mocked and will not hit the real backend.'
  );
}
