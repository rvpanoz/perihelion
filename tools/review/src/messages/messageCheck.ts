import type { JevClient, JevRequest, JevResult } from '../typesafe/jevClient.js';
import { commitMessageRequest, lowAnswers, prBodyRequest } from './messageJudgements.js';
import { trailerLines } from './trailers.js';

export interface CommitMessage {
  sha: string;
  message: string;
}

export interface MessageFinding {
  /** The short SHA and first line of a commit, or "PR description". */
  subject: string;
  problem: string;
  /** Jev's Noul for a judged finding; null for one found by code. */
  probability: number | null;
}

export interface MessageReview {
  findings: MessageFinding[];
  jevUnavailable: boolean;
}

interface MessageInput {
  commits: readonly CommitMessage[];
  prBody: string | null;
}

interface Question {
  subject: string;
  request: JevRequest;
}

const PR_SUBJECT = 'PR description';
// GitHub's closing keywords (docs.github.com, "Linking a pull request to an issue"); CLAUDE.md asks for Closes #N.
const CLOSES_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) #\d+/i;

export async function reviewMessages(input: MessageInput, jev: JevClient): Promise<MessageReview> {
  const questions = questionsFor(input);
  const results = await Promise.all(questions.map(({ request }) => jev.ask(request)));
  const judged = questions.flatMap(({ subject }, index) => judgedFindings(subject, results[index]));
  return {
    findings: [...codeFindings(input), ...judged],
    jevUnavailable: results.some((result) => !result.ok),
  };
}

function questionsFor({ commits, prBody }: MessageInput): Question[] {
  const commitQuestions = commits.map((commit) => ({
    subject: subjectOf(commit),
    request: commitMessageRequest(commit.message),
  }));
  if (!prBody?.trim()) return commitQuestions;
  return [...commitQuestions, { subject: PR_SUBJECT, request: prBodyRequest(prBody) }];
}

function judgedFindings(subject: string, result: JevResult | undefined): MessageFinding[] {
  if (!result?.ok) return [];
  return lowAnswers(result.response).map((low) => ({ subject, ...low }));
}

function codeFindings({ commits, prBody }: MessageInput): MessageFinding[] {
  const trailers = commits.flatMap((commit) => {
    const lines = trailerLines(commit.message);
    if (lines.length === 0) return [];
    return [
      {
        subject: subjectOf(commit),
        problem: `ends with trailers: ${lines.join('; ')}`,
        probability: null,
      },
    ];
  });
  if (CLOSES_ISSUE.test(prBody ?? '')) return trailers;
  const missingLink = {
    subject: PR_SUBJECT,
    problem: 'has no `Closes #N` link to its issue',
    probability: null,
  };
  return [...trailers, missingLink];
}

function subjectOf(commit: CommitMessage): string {
  const [firstLine = ''] = commit.message.split('\n');
  return `${commit.sha.slice(0, 7)} ${firstLine}`;
}
