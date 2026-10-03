import { describe, expect, it } from 'vitest';
import { commitMessageRequest, prBodyRequest } from './messageJudgements.js';

describe('commitMessageRequest', () => {
  it('asks whether the message is functional only and plain English', () => {
    const request = commitMessageRequest('Add the client');

    expect(request.state).toEqual({ message: 'Add the client' });
    expect(Object.keys(request.questions)).toEqual(['functionalOnly', 'plainEnglish']);
    expect(request.questions.plainEnglish?.instructions).toContain('`message`');
  });
});

describe('prBodyRequest', () => {
  it('asks only whether the description is plain English', () => {
    const request = prBodyRequest('Closes #148');

    expect(request.state).toEqual({ description: 'Closes #148' });
    expect(Object.keys(request.questions)).toEqual(['plainEnglish']);
    expect(request.questions.plainEnglish?.instructions).toContain('`description`');
  });
});
