import { describe, it, expect } from 'vitest';
import { isMemberActive, PERMISSIONS, getUserPermissions } from './permissions';
import type { User } from '@/types';

// Mock user helper
const createMockUser = (role: 'student' | 'teacher' | 'parent', expiresAt?: string): User => ({
    id: '1',
    nickname: 'Test User',
    avatar: '',
    phone: '13800000000',
    role,
    expiresAt,
    isValidMember: true, // simplified
    permissions: []
});

describe('Permissions Logic', () => {
    it('Teacher should always be active', () => {
        const teacher = createMockUser('teacher');
        expect(isMemberActive(teacher)).toBe(true);
    });

    it('Student with future expiry should be active', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const student = createMockUser('student', futureDate.toISOString());
        expect(isMemberActive(student)).toBe(true);
    });

    it('Student with past expiry should be inactive', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const student = createMockUser('student', pastDate.toISOString());
        expect(isMemberActive(student)).toBe(false);
    });

    it('Student without expiry date should be inactive (strict mode)', () => {
        const student = createMockUser('student');
        expect(isMemberActive(student)).toBe(false);
    });

    it('Active student should have create permissions', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const student = createMockUser('student', futureDate.toISOString());
        const perms = getUserPermissions(student);
        expect(perms).toContain(PERMISSIONS.QUESTION_CREATE);
    });

    it('Inactive student should NOT have create permissions', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const student = createMockUser('student', pastDate.toISOString());
        const perms = getUserPermissions(student);
        expect(perms).not.toContain(PERMISSIONS.QUESTION_CREATE);
    });
});
