import { z } from 'zod';
import { COMMENT_MARKER } from '../review.js';

const GITHUB_API = 'https://api.github.com';
// The workflow token posts as this account; only its comments are ours to edit.
const WORKFLOW_BOT_LOGIN = 'github-actions[bot]';

const commentListSchema = z.array(
  z.object({
    id: z.number().int(),
    body: z.string().nullable().optional(),
    user: z.object({ login: z.string() }).nullable(),
  }),
);

export interface CommentTarget {
  fetchImpl: typeof fetch;
  token: string;
  repository: string;
  issueNumber: number;
}

interface GitHubRequest {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: string;
}

/** One review comment per PR, edited in place; a PR has far fewer than 100 comments here. */
export async function upsertComment(target: CommentTarget, body: string): Promise<void> {
  const existingId = await findReviewComment(target);
  const issuePath = `/repos/${target.repository}/issues`;
  const request: GitHubRequest =
    existingId === null
      ? { method: 'POST', path: `${issuePath}/${target.issueNumber}/comments` }
      : { method: 'PATCH', path: `${issuePath}/comments/${existingId}` };
  await callGitHub(target, { ...request, body: JSON.stringify({ body }) });
}

async function findReviewComment(target: CommentTarget): Promise<number | null> {
  const path = `/repos/${target.repository}/issues/${target.issueNumber}/comments?per_page=100`;
  const comments = commentListSchema.parse(await callGitHub(target, { method: 'GET', path }));
  const ours = comments.find(
    (comment) =>
      comment.user?.login === WORKFLOW_BOT_LOGIN && (comment.body ?? '').includes(COMMENT_MARKER),
  );
  return ours?.id ?? null;
}

async function callGitHub(target: CommentTarget, request: GitHubRequest): Promise<unknown> {
  const response = await target.fetchImpl(`${GITHUB_API}${request.path}`, {
    method: request.method,
    headers: {
      authorization: `Bearer ${target.token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: request.body,
  });
  if (!response.ok)
    throw new Error(`GitHub ${request.method} ${request.path}: HTTP ${response.status}`);
  return response.json();
}
