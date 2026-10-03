import { describe, expect, it } from 'vitest';
import { COMMENT_MARKER } from '../review.js';
import { upsertComment } from './prComment.js';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

const BOT = { login: 'github-actions[bot]' };
const REPORT = `${COMMENT_MARKER}\nNothing to flag.`;

function github(comments: unknown[], status = 200) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string | URL | Request, init: RequestInit = {}) => {
    const body = init.body === undefined ? undefined : JSON.parse(String(init.body));
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({ url: String(url), method: init.method ?? 'GET', headers, body });
    return Response.json(calls.length === 1 ? comments : {}, { status });
  };
  const target = {
    fetchImpl,
    token: 'gh-token',
    repository: 'rvpanoz/perihelion',
    issueNumber: 149,
  };
  return { calls, target };
}

describe('upsertComment', () => {
  it('edits the bot comment that carries the marker', async () => {
    const { calls, target } = github([
      { id: 1, body: 'Looks good', user: { login: 'rvpanoz' } },
      { id: 2, body: `${COMMENT_MARKER}\nold`, user: BOT },
    ]);
    await upsertComment(target, REPORT);

    expect(calls.map(({ method, url }) => [method, url])).toEqual([
      ['GET', 'https://api.github.com/repos/rvpanoz/perihelion/issues/149/comments?per_page=100'],
      ['PATCH', 'https://api.github.com/repos/rvpanoz/perihelion/issues/comments/2'],
    ]);
    expect(calls[1]?.body).toEqual({ body: REPORT });
  });

  it('adds a comment when there is none, ignoring a person quoting the marker', async () => {
    const { calls, target } = github([
      { id: 3, body: `> ${COMMENT_MARKER}`, user: { login: 'rvpanoz' } },
    ]);
    await upsertComment(target, REPORT);

    expect(calls[1]?.method).toBe('POST');
    expect(calls[1]?.url).toBe(
      'https://api.github.com/repos/rvpanoz/perihelion/issues/149/comments',
    );
  });

  it('sends the token and asks for the GitHub JSON media type', async () => {
    const { calls, target } = github([]);
    await upsertComment(target, REPORT);

    expect(calls[0]?.headers.authorization).toBe('Bearer gh-token');
    expect(calls[0]?.headers.accept).toBe('application/vnd.github+json');
  });

  it('rejects with the status when GitHub refuses', async () => {
    const { target } = github([], 403);
    await expect(upsertComment(target, REPORT)).rejects.toThrow('HTTP 403');
  });
});
