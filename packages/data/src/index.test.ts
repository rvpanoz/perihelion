import { describe, expect, it } from 'vitest';
import { API_BASE_PATH } from './index';

describe('API_BASE_PATH', () => {
  it('is an absolute path without a trailing slash', () => {
    expect(API_BASE_PATH).toMatch(/^\/[a-z]+$/);
  });
});
