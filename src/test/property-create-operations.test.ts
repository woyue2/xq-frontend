/**
 * Property-Based Test: Create Operations Wait for Response
 * 
 * **Validates: Requirements 1.1, 4.1, 4.2**
 * 
 * This test validates that created resources (questions, answers, comments) 
 * are accessible before navigation occurs. It ensures that the API response 
 * is received and contains the resource ID, and that the resource is queryable 
 * after creation.
 * 
 * This test runs with 100 iterations to ensure the property holds across
 * various input combinations and potential race conditions.
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { questionService } from '../services/question.service';
import { answerService } from '../services/admin.service';
import { commentService } from '../services/admin.service';
import type { CreateQuestionPayload } from '../types/api';

describe('Property 1: Create Operations Wait for Response', () => {
  // Test data cleanup tracking
  const createdQuestionIds: string[] = [];
  const createdAnswerIds: string[] = [];
  const createdCommentIds: string[] = [];

  beforeEach(() => {
    // Clear localStorage to ensure clean state for mock mode
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  afterAll(async () => {
    // Cleanup created test data
    // Note: This is best-effort cleanup. In a real scenario, you might want
    // to use a test database or have a cleanup mechanism
    console.log(`Test cleanup: ${createdQuestionIds.length} questions, ${createdAnswerIds.length} answers, ${createdCommentIds.length} comments`);
  });

  it('should ensure question creation response contains ID and resource is queryable', async () => {
    // Generate random question data
    const questionArbitrary = fc.record({
      title: fc.string({ minLength: 5, maxLength: 100 }),
      content: fc.string({ minLength: 10, maxLength: 500 }),
      subject: fc.constantFrom('math', 'english', 'science', 'history', 'geography'),
    });

    await fc.assert(
      fc.asyncProperty(questionArbitrary, async (data) => {
        // Create question
        const response = await questionService.createQuestion(data as CreateQuestionPayload);
        
        // Property 1: Response must contain a valid ID
        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
        expect(typeof response.id).toBe('string');
        expect(response.id.length).toBeGreaterThan(0);
        
        // Track for cleanup
        createdQuestionIds.push(response.id);
        
        // Property 2: Resource must be queryable immediately after creation
        const fetched = await questionService.getQuestionById(response.id);
        expect(fetched).toBeDefined();
        expect(fetched.id).toBe(response.id);
        expect(fetched.title).toBe(data.title);
        expect(fetched.content).toBe(data.content);
        expect(fetched.subject).toBe(data.subject);
      }),
      { 
        numRuns: 100,
        // Add timeout for async operations
        timeout: 30000,
      }
    );
  }, 60000); // 60 second timeout for the entire test

  it('should ensure answer creation response contains ID and resource is queryable', async () => {
    // First, create a question to answer
    const testQuestion = await questionService.createQuestion({
      title: 'Test Question for Answer Property Test',
      content: 'This is a test question for property-based testing of answer creation',
      subject: 'math',
    });
    createdQuestionIds.push(testQuestion.id);

    // Generate random answer data
    const answerArbitrary = fc.record({
      content: fc.string({ minLength: 10, maxLength: 500 }),
    });

    await fc.assert(
      fc.asyncProperty(answerArbitrary, async (data) => {
        // Create answer
        const response = await answerService.create(testQuestion.id, {
          content: data.content,
        });
        
        // Property 1: Response must contain a valid ID
        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
        expect(typeof response.id).toBe('string');
        expect(response.id.length).toBeGreaterThan(0);
        
        // Track for cleanup
        createdAnswerIds.push(response.id);
        
        // Property 2: Resource must be queryable immediately after creation
        const fetchedList = await answerService.listByQuestion(testQuestion.id);
        expect(fetchedList).toBeDefined();
        expect(fetchedList.list).toBeDefined();
        
        // Find the created answer in the list
        const createdAnswer = fetchedList.list.find(a => a.id === response.id);
        expect(createdAnswer).toBeDefined();
        expect(createdAnswer?.content).toBe(data.content);
      }),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  }, 60000);

  it('should ensure comment creation response contains ID and resource is queryable', async () => {
    // First, create a question to comment on
    const testQuestion = await questionService.createQuestion({
      title: 'Test Question for Comment Property Test',
      content: 'This is a test question for property-based testing of comment creation',
      subject: 'science',
    });
    createdQuestionIds.push(testQuestion.id);

    // Generate random comment data
    const commentArbitrary = fc.record({
      content: fc.string({ minLength: 5, maxLength: 200 }),
    });

    await fc.assert(
      fc.asyncProperty(commentArbitrary, async (data) => {
        // Create comment
        const response = await commentService.create(testQuestion.id, {
          content: data.content,
        });
        
        // Property 1: Response must contain a valid ID
        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
        expect(typeof response.id).toBe('string');
        expect(response.id.length).toBeGreaterThan(0);
        
        // Track for cleanup
        createdCommentIds.push(response.id);
        
        // Property 2: Resource must be queryable immediately after creation
        const fetchedList = await commentService.listByQuestion(testQuestion.id);
        expect(fetchedList).toBeDefined();
        expect(fetchedList.list).toBeDefined();
        
        // Find the created comment in the list
        const createdComment = fetchedList.list.find(c => c.id === response.id);
        expect(createdComment).toBeDefined();
        expect(createdComment?.content).toBe(data.content);
      }),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  }, 60000);
});
