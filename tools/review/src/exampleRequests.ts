import type { MessageExample, ToleranceExample } from './examples.js';
import { numberKindRequest } from './groundTruth/toleranceKind.js';
import { commitMessageRequest, prBodyRequest } from './messages/messageJudgements.js';
import type { JevRequest } from './typesafe/jevClient.js';

// One place builds each example's request, so the recordings and the tests that replay them cannot drift apart.

export function toleranceExampleRequest(example: ToleranceExample): JevRequest {
  return numberKindRequest(example.change);
}

export function messageExampleRequest(example: MessageExample): JevRequest {
  return example.kind === 'commit'
    ? commitMessageRequest(example.text)
    : prBodyRequest(example.text);
}
