import {
  ApiSemanticClassifier,
  classifySemanticDifference,
  InvalidDifferenceError,
  type ApiDifferenceInput
} from '../../utils/api-semantic-classifier';

describe('ApiSemanticClassifier', () => {
  const classifier = new ApiSemanticClassifier();

  const makeDiff = (overrides: Partial<ApiDifferenceInput>): ApiDifferenceInput =>
    ({
      kind: 'ExtraFields',
      method: 'GET',
      path: '/api/example',
      ...overrides
    });

  it('classifies ExtraEndpoint as EXTENDED_ENDPOINT', () => {
    const diff = makeDiff({
      kind: 'ExtraEndpoint',
      method: 'POST',
      path: '/api/auth/register'
    });

    expect(classifier.classify(diff)).toBe('EXTENDED_ENDPOINT');
  });

  it('classifies FieldNameMismatch as NAMING_DIFF', () => {
    const diff = makeDiff({
      kind: 'FieldNameMismatch',
      path: '/api/behavior/log'
    });

    expect(classifier.classify(diff)).toBe('NAMING_DIFF');
  });

  it('classifies ExtraFields as EXTENDED_FIELDS', () => {
    const diff = makeDiff({
      kind: 'ExtraFields',
      path: '/api/auth/send-code'
    });

    expect(classifier.classify(diff)).toBe('EXTENDED_FIELDS');
  });

  it('classifies MissingEndpoint as HARD_ERROR', () => {
    const diff = makeDiff({
      kind: 'MissingEndpoint',
      method: 'GET',
      path: '/api/interactions/like'
    });

    expect(classifier.classify(diff)).toBe('HARD_ERROR');
  });

  it('classifies StatusCodeMismatch as HARD_ERROR', () => {
    const diff = makeDiff({
      kind: 'StatusCodeMismatch',
      method: 'POST',
      path: '/api/auth/login'
    });

    expect(classifier.classify(diff)).toBe('HARD_ERROR');
  });

  it('classifies RequiredFieldMissing as HARD_ERROR', () => {
    const diff = makeDiff({
      kind: 'RequiredFieldMissing',
      method: 'POST',
      path: '/api/questions'
    });

    expect(classifier.classify(diff)).toBe('HARD_ERROR');
  });

  it('throws InvalidDifferenceError for unsupported kind (defensive)', () => {
    const diff = makeDiff({
      // @ts-expect-error: 强制注入非法 kind 以测试错误处理分支
      kind: 'UnknownKind'
    });

    expect(() => classifier.classify(diff as any)).toThrow(InvalidDifferenceError);
  });

  it('exposes convenience function classifySemanticDifference', () => {
    const diff = makeDiff({
      kind: 'ExtraEndpoint',
      path: '/api/users/me/likes'
    });

    const result = classifySemanticDifference(diff);
    expect(result).toBe('EXTENDED_ENDPOINT');
  });
});

