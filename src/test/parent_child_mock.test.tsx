
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockUsers, mockChildren } from '@/lib/mock-data';
import { parentService } from '@/services/parentService';
import { api } from '@/services/api';

describe('Parent-Child Mock Data Association', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure fresh mock data loading
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should have a default child for every parent in mock-data', () => {
    const parents = mockUsers.filter(u => u.role === 'parent');
    
    parents.forEach(parent => {
      // Find children associated with this parent
      const children = mockChildren.filter(c => c.parentId === parent.id);
      
      // Verify at least one child exists
      expect(children.length).toBeGreaterThan(0);
      
      // Verify child data structure
      children.forEach(child => {
        expect(child.id).toBeDefined();
        expect(child.name).toBeDefined();
        expect(child.age).toBeDefined();
        expect(child.parentId).toBe(parent.id);
        
        // If it's the auto-generated one, verify specific fields
        if (child.id.startsWith('child_auto_')) {
          expect(child.name).toContain('的孩子');
        }
      });
    });
  });

  it('should return all children via API including auto-generated ones', async () => {
    // Mock the API response to return mockChildren directly as the mock adapter does
    // but here we are testing the service -> api -> mock adapter flow.
    // Since we cleared localStorage, the mock adapter should load mockChildren.
    
    const response = await parentService.getChildren();
    const returnedChildren = response.data.data;
    
    // Check if we got children
    expect(returnedChildren.length).toBeGreaterThanOrEqual(mockChildren.length);
    
    // Check if every parent in mockUsers has a child in the returned list
    const parents = mockUsers.filter(u => u.role === 'parent');
    parents.forEach(parent => {
      const child = returnedChildren.find(c => c.parentId === parent.id);
      expect(child).toBeDefined();
      expect(child?.parentId).toBe(parent.id);
    });
  });

  it('should allow binding a new child and persist it', async () => {
    const newChildData = {
      childName: 'New Baby',
      phone: '13812345678',
      code: '123456',
      school: '阳光小学'
    };
    
    // Bind new child
    await parentService.bindChild(newChildData);
    
    // Fetch children again
    const response = await parentService.getChildren();
    const children = response.data.data;
    
    // Verify new child is in the list
    const newChild = children.find(c => c.name === 'New Baby');
    expect(newChild).toBeDefined();
    expect(newChild?.name).toBe('New Baby');
    expect(newChild?.school).toBe('阳光小学');
    // The mock adapter sets parentId to '3' by default for new bindings
    expect(newChild?.parentId).toBe('3');
  });

  it('should allow unbinding a child', async () => {
    // First get existing children
    const initialRes = await parentService.getChildren();
    const childToDelete = initialRes.data.data[0];
    
    // Unbind
    await parentService.unbindChild(childToDelete.id);
    
    // Fetch again
    const finalRes = await parentService.getChildren();
    const finalChildren = finalRes.data.data;
    
    // Verify child is gone
    expect(finalChildren.find(c => c.id === childToDelete.id)).toBeUndefined();
    expect(finalChildren.length).toBe(initialRes.data.data.length - 1);
  });
});
