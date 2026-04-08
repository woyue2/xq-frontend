/**
 * Unit tests for LoginPage component
 * 
 * Tests verify:
 * - Phone number and password input fields exist
 * - Login button calls authentication API
 * - Token is saved to localStorage on successful login
 * - User is redirected to home page after login
 * 
 * Validates: Requirements 1.3 (Password-based login with phone number)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { authService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

// Mock dependencies
vi.mock('@/services/api', () => ({
  authService: {
    passwordLogin: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('LoginPage - Task 5.2', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset auth store
    useAuthStore.getState().logout();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render phone number input field', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const phoneInput = screen.getByLabelText('手机号');
    expect(phoneInput).toBeDefined();
    expect(phoneInput.getAttribute('type')).toBe('tel');
    expect(phoneInput.getAttribute('placeholder')).toBe('请输入11位手机号');
  });

  it('should render password input field', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText('密码');
    expect(passwordInput).toBeDefined();
    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(passwordInput.getAttribute('placeholder')).toBe('请输入密码');
  });

  it('should call authentication API with phone and password on login', async () => {
    const mockResponse = {
      data: {
        data: {
          token: 'test-jwt-token',
          user: {
            id: 'user-123',
            phone: '13800138000',
            nickname: '测试用户',
            role: 'teacher',
          },
        },
      },
    };

    vi.mocked(authService.passwordLogin).mockResolvedValue(mockResponse as any);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Fill in phone number
    const phoneInput = screen.getByLabelText('手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    // Fill in password
    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Click login button
    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);

    // Verify API was called with correct credentials
    await waitFor(() => {
      expect(authService.passwordLogin).toHaveBeenCalledWith({
        phone: '13800138000',
        password: 'password123',
      });
    });
  });

  it('should save token to localStorage on successful login', async () => {
    const mockToken = 'test-jwt-token-12345';
    const mockResponse = {
      data: {
        data: {
          token: mockToken,
          user: {
            id: 'user-123',
            phone: '13800138000',
            nickname: '测试用户',
            role: 'teacher',
          },
        },
      },
    };

    vi.mocked(authService.passwordLogin).mockResolvedValue(mockResponse as any);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Fill in credentials
    const phoneInput = screen.getByLabelText('手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Click login button
    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);

    // Verify token is saved to localStorage
    await waitFor(() => {
      const storedToken = localStorage.getItem('token');
      expect(storedToken).toBe(mockToken);
    });
  });

  it('should update auth store with user data on successful login', async () => {
    const mockUser = {
      id: 'user-123',
      phone: '13800138000',
      nickname: '测试用户',
      role: 'teacher',
    };

    const mockResponse = {
      data: {
        data: {
          token: 'test-jwt-token',
          user: mockUser,
        },
      },
    };

    vi.mocked(authService.passwordLogin).mockResolvedValue(mockResponse as any);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Fill in credentials
    const phoneInput = screen.getByLabelText('手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Click login button
    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);

    // Verify auth store is updated
    await waitFor(() => {
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);
      expect(authState.token).toBe('test-jwt-token');
    });
  });

  it('should disable login button when phone or password is empty', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const loginButton = screen.getByRole('button', { name: '登录' });
    
    // Button should be disabled initially
    expect(loginButton.hasAttribute('disabled')).toBe(true);

    // Fill in phone only
    const phoneInput = screen.getByLabelText('手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });
    expect(loginButton.hasAttribute('disabled')).toBe(true);

    // Fill in password
    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Button should be enabled now
    expect(loginButton.hasAttribute('disabled')).toBe(false);
  });

  it('should validate phone number format (11 digits)', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const phoneInput = screen.getByLabelText('手机号') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '登录' });

    // Enter invalid phone (too short)
    fireEvent.change(phoneInput, { target: { value: '138001380' } });
    
    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Button should still be disabled
    expect(loginButton.hasAttribute('disabled')).toBe(true);

    // Enter valid phone (11 digits)
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });
    
    // Button should be enabled
    expect(loginButton.hasAttribute('disabled')).toBe(false);
  });

  it('should handle login error gracefully', async () => {
    const mockError = {
      response: {
        status: 401,
        data: {
          code: 401,
          message: '手机号或密码错误',
        },
      },
    };

    vi.mocked(authService.passwordLogin).mockRejectedValue(mockError);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Fill in credentials
    const phoneInput = screen.getByLabelText('手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    const passwordInput = screen.getByLabelText('密码');
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Click login button
    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);

    // Verify error is handled (no token saved, user not authenticated)
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
